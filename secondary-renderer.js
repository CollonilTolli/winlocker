// Упрощенный renderer для дополнительных мониторов
// Только блокировка без возможности ввода пароля

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
    
    // Блокировка всех остальных клавиш
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
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
window.addEventListener('blur', function() {
    window.focus();
});

// Блокировка печати
window.addEventListener('beforeprint', function(e) {
    e.preventDefault();
    return false;
});

// Отключение консоли
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

// Агрессивная постоянная проверка фокуса
setInterval(function() {
    if (!document.hasFocus()) {
        window.focus();
    }
    
    // Блокировка попыток изменения видимости страницы
    if (document.hidden || document.visibilityState === 'hidden') {
        window.focus();
    }
}, 50);

// Дополнительные обработчики для предотвращения обхода
document.addEventListener('keyup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
});

document.addEventListener('keypress', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
});

// Блокировка изменения видимости
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        window.focus();
    }
});

// Блокировка потери фокуса окна
window.addEventListener('focusout', function() {
    setTimeout(() => window.focus(), 1);
});

// Переопределение методов для предотвращения обхода
Object.defineProperty(document, 'hidden', {
    get: function() { return false; },
    configurable: false
});

Object.defineProperty(document, 'visibilityState', {
    get: function() { return 'visible'; },
    configurable: false
});

// Агрессивная блокировка всех событий мыши
document.addEventListener('mousedown', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
}, true);

document.addEventListener('mouseup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
}, true);

document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
}, true);

// Блокировка попыток изменения стилей
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
    return;
};

// Блокировка изменения CSS
const originalAddRule = CSSStyleSheet.prototype.insertRule;
CSSStyleSheet.prototype.insertRule = function() {
    return;
};