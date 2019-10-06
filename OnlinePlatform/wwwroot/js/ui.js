define(["require", "exports", "room"], function (require, exports, room_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Пользовательский интерфейс
    var MAX_POPUPS = 5;
    var POPUP_TIME = 3;
    var POPUP_SIZE = 30;
    var POPUP_OFFSET = 50;
    var POPUP_MARGIN = 5;
    /** HTML диалог */
    var Dialog = /** @class */ (function () {
        function Dialog(elementSelector, callbacks) {
            this.closeCallback = this.close.bind(this);
            this.element = document.querySelector(elementSelector);
            this.backdrop = document.querySelector(".otgp-backdrop");
            this.buttonCallbacks = callbacks;
        }
        /** Открыть диалог */
        Dialog.prototype.open = function () {
            this.element.classList.add("shown");
            this.backdrop.classList.add("shown");
            this.backdrop.addEventListener("click", this.closeCallback);
        };
        /** Закрыть диалог */
        Dialog.prototype.close = function () {
            this.element.classList.remove("shown");
            this.backdrop.classList.remove("shown");
            this.backdrop.removeEventListener("click", this.closeCallback);
        };
        return Dialog;
    }());
    exports.Dialog = Dialog;
    /** Панель аватаров игроков */
    var AvatarsPanel = /** @class */ (function () {
        function AvatarsPanel(selector) {
            this.root = $(selector);
            this.shownIds = new Array();
        }
        // Вставить элемент, отображающий аватар игрока
        AvatarsPanel.prototype.insertAvatarElement = function (elem, place) {
            if (this.root.children.length > 0) {
                var nextElem = null;
                for (var i = 0; i < this.root.children.length; i++) {
                    var anElem = this.root.children[i];
                    var elemIdx = parseInt(anElem.id.substr(1));
                    if (elemIdx > place) {
                        nextElem = anElem;
                        break;
                    }
                }
                if (nextElem != null) {
                    this.root.insertBefore(elem, nextElem);
                }
                else {
                    this.root.appendChild(elem);
                }
            }
            else {
                this.root.appendChild(elem);
            }
        };
        /** Обновить иконки игроков */
        AvatarsPanel.prototype.updateIcons = function () {
            var _this = this;
            var newPlayers = room_1.loadedRoom.players.filter(function (p) {
                return _this.shownIds[p.seatIndex] == null;
            });
            newPlayers.forEach(function (p) {
                var newElem = document.createElement("div");
                newElem.className = "av-holder s" + (p.seatIndex + 1);
                newElem.textContent = "#" + p.seatIndex;
                newElem.id = "p" + p.seatIndex;
                _this.insertAvatarElement(newElem, p.seatIndex);
                _this.shownIds[p.seatIndex] = p.id;
            });
        };
        return AvatarsPanel;
    }());
    var sidePanel;
    var bottomPanel;
    // При изменении размеров окна
    var windowResized;
    /** Показанные всплывающие сообщения */
    var shownPopups = [];
    /** Отображаемое информационное сообщение */
    var textMessage;
    /** Хэндл интервала удаления элементов */
    var popupRemoveInterval;
    /** Элемент, отображающий состояние связи WebRTC */
    var rtcIndicator;
    /** Панель аватаров */
    var playerAvatars;
    /** Выдать HTML элемент по селектору */
    function $(selector) {
        return document.querySelector(selector);
    }
    /** Показать диалоговое сообщение о потере связи с сервером */
    function showDisconnectDialog() {
        var dialog = new Dialog("#connectErrorDialog");
        dialog.open();
    }
    exports.showDisconnectDialog = showDisconnectDialog;
    /** Задать обработчик изменения размеров окна */
    function setResizeHandler(handler) {
        windowResized = handler;
    }
    exports.setResizeHandler = setResizeHandler;
    /** Выдать доступный размер области вывода */
    function getOutputSize() {
        var MIN_HEIGHT = 480;
        return {
            w: window.innerWidth,
            h: window.innerHeight > MIN_HEIGHT ? window.innerHeight : MIN_HEIGHT
        };
    }
    exports.getOutputSize = getOutputSize;
    /**
     * Показать заставку загрузки
     * @param isLoading Производится ли загрузка
     * */
    function toggleLoading(isLoading) {
        exports.loadingSection.style.display = isLoading ? "block" : "none";
        exports.mainSection.style.display = isLoading ? "none" : "block";
    }
    exports.toggleLoading = toggleLoading;
    /**
     * Показать/скрыть курсор мыши для выбора элементов
     * @param isPickable Можно ли выбрать объект
     */
    function togglePickCursor(isPickable) {
        var rendererElem = exports.mainSection.querySelector(".render");
        if (isPickable) {
            rendererElem.classList.add("pickable");
        }
        else {
            rendererElem.classList.remove("pickable");
        }
    }
    exports.togglePickCursor = togglePickCursor;
    /**
     * Отобразить прогресс загрузки
     * @param progress Прогресс загрузки
     */
    function setLoadingProgress(progress) {
        var text = exports.loadingSection.querySelector(".load-title > span");
        var bar = exports.loadingSection.querySelector(".pg-bar");
        var barFill = bar.querySelector(".pg-bar-fill");
        text.innerHTML = "Загрузка...";
        bar.style.display = "block";
        barFill.style.width = progress + "%";
    }
    exports.setLoadingProgress = setLoadingProgress;
    function setLoadingMsg(message) {
        var text = exports.loadingSection.querySelector(".load-title > span");
        text.innerHTML = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 (" + message + ")...";
    }
    exports.setLoadingMsg = setLoadingMsg;
    /** Добавить элемент, в который производится отрисовка */
    function appendRenderer(renderCanvas) {
        exports.mainSection.appendChild(renderCanvas);
    }
    exports.appendRenderer = appendRenderer;
    /**
     * Показать всплывающее сообщение
     * @param text Текст сообщения
     */
    function showPopup(text) {
        clearInterval(popupRemoveInterval);
        // Удалить лишние, если слишком много
        if (shownPopups.length == MAX_POPUPS) {
            var popupToDelete = shownPopups.pop();
            exports.mainSection.removeChild(popupToDelete);
        }
        // Создать новый элемент
        var popupElem = document.createElement("div");
        popupElem.className = "popup";
        popupElem.innerHTML = text;
        popupElem.style.top = POPUP_OFFSET + "px";
        exports.mainSection.appendChild(popupElem);
        shownPopups.unshift(popupElem);
        for (var i = 0; i < shownPopups.length; i++) {
            var popup = shownPopups[i];
            var popupY = i * POPUP_SIZE + POPUP_MARGIN + POPUP_OFFSET;
            popup.style.top = popupY + "px";
        }
        // Удалить элемент по прошествии времени
        popupRemoveInterval = setInterval(function () {
            if (shownPopups.length > 0) {
                var lastPopup = shownPopups.pop();
                exports.mainSection.removeChild(lastPopup);
            }
            else {
                clearInterval(popupRemoveInterval);
            }
        }, POPUP_TIME * 1000);
    }
    exports.showPopup = showPopup;
    /**
     * Отобразить информационное сообщение
     * @param text Текст сообщения
     * @param duration Длительность показа
     */
    function showMessage(text, duration) {
        var textSpan = textMessage.querySelector(".text");
        textSpan.textContent = text;
        textMessage.classList.remove("hidden");
        // Анимировать появление
        if (!textMessage.classList.contains("showing")) {
            textMessage.classList.add("showing");
        }
        if (duration != null) {
            setTimeout(hideMessage, duration);
        }
    }
    exports.showMessage = showMessage;
    /** Скрыть информационное сообщение */
    function hideMessage() {
        textMessage.classList.add("hiding");
        // Анимировать исчезание
        setTimeout(function () {
            textMessage.classList.add("hidden");
            textMessage.classList.remove("hiding");
        }, 500);
    }
    exports.hideMessage = hideMessage;
    /**
     * Изменить вид индикатора состояния связи WebRTC
     * @param ok Соединение установлено
     */
    function setRTCStatus(ok) {
        if (ok) {
            rtcIndicator.classList.add("connected");
            rtcIndicator.classList.remove("error");
        }
        else {
            rtcIndicator.classList.add("error");
            rtcIndicator.classList.remove("connected");
        }
    }
    exports.setRTCStatus = setRTCStatus;
    /** Обновить иконки аватаров игроков */
    function updatePlayerAvatars() {
        playerAvatars.updateIcons();
    }
    exports.updatePlayerAvatars = updatePlayerAvatars;
    /** Инициализация интерфейса */
    function initialize() {
        exports.loadingSection = $("#loading");
        exports.mainSection = $("#main");
        sidePanel = $("#sidePanel");
        bottomPanel = $("#bottomPanel");
        textMessage = $("#message");
        rtcIndicator = $("#rtcStateIndicator");
        playerAvatars = new AvatarsPanel("#avatars");
        rtcIndicator.addEventListener("selectstart", function (e) { return e.preventDefault(); });
        window.addEventListener("resize", function () { return windowResized(); });
    }
    exports.initialize = initialize;
});
//# sourceMappingURL=ui.js.map