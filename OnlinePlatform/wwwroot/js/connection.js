var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "room", "utils"], function (require, exports, room_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Сетевое соединение с сервером WebSocket
    var OUT_TAG_INIT_DONE = "init_done";
    var INC_TAG_PLAYERAWAY = "away";
    var INC_TAG_CONNECTED = "connected";
    var INC_TAG_MESSAGE = "text_message";
    var INC_TAG_ADDOBJECTS = "add_objects";
    var INC_TAG_DELOBJECTS = "remove_objects";
    var INC_TAG_PROP_CHANGE = "prop_change";
    var INC_TAG_MOVEOBJECT = "move_object";
    var INC_TAG_CHANGETURN = "turn";
    var INC_OUT_TAG_RTC = "rtc";
    /** Сообщение для обмена данными с сервером */
    var GameMessage = /** @class */ (function () {
        function GameMessage() {
        }
        /** Добавить идентификатор текущего игрока */
        GameMessage.prototype.ofCurrentPlayer = function () {
            this.senderId = room_1.currentPlayer.id;
            return this;
        };
        /** Преобразовать сообщение в строку */
        GameMessage.prototype.toString = function () {
            return JSON.stringify(this);
        };
        return GameMessage;
    }());
    exports.GameMessage = GameMessage;
    /** Клиент инициализирован */
    var ClientInitialized = /** @class */ (function (_super) {
        __extends(ClientInitialized, _super);
        function ClientInitialized() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /** Определитель типа */
            _this.tag = OUT_TAG_INIT_DONE;
            return _this;
        }
        return ClientInitialized;
    }(GameMessage));
    exports.ClientInitialized = ClientInitialized;
    /** Новый клиент подключен  */
    var ClientConnected = /** @class */ (function (_super) {
        __extends(ClientConnected, _super);
        function ClientConnected(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_CONNECTED;
            _this.player = new room_1.GamePlayer(data["newPlayer"]);
            return _this;
        }
        return ClientConnected;
    }(GameMessage));
    exports.ClientConnected = ClientConnected;
    /** Показать текстовое сообщение */
    var ShowMessage = /** @class */ (function (_super) {
        __extends(ShowMessage, _super);
        function ShowMessage(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_MESSAGE;
            _this.text = data["message"];
            _this.duration = data["duration"];
            return _this;
        }
        return ShowMessage;
    }(GameMessage));
    exports.ShowMessage = ShowMessage;
    /** Добавить новые объекты на сцену */
    var AddObjects = /** @class */ (function (_super) {
        __extends(AddObjects, _super);
        function AddObjects(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_ADDOBJECTS;
            _this.objectsData = data["addingObjects"];
            return _this;
        }
        return AddObjects;
    }(GameMessage));
    exports.AddObjects = AddObjects;
    /** Удалить объекты со сцены */
    var RemoveObjects = /** @class */ (function (_super) {
        __extends(RemoveObjects, _super);
        function RemoveObjects(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_DELOBJECTS;
            _this.objectIds = data["objectIds"];
            return _this;
        }
        return RemoveObjects;
    }(GameMessage));
    exports.RemoveObjects = RemoveObjects;
    /** Изменение состояния сцены */
    var PropChanged = /** @class */ (function (_super) {
        __extends(PropChanged, _super);
        function PropChanged(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_PROP_CHANGE;
            _this.name = data["name"];
            _this.newValue = data["value"];
            return _this;
        }
        return PropChanged;
    }(GameMessage));
    exports.PropChanged = PropChanged;
    /** Перемещение объекта */
    var MoveObject = /** @class */ (function (_super) {
        __extends(MoveObject, _super);
        function MoveObject(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_MOVEOBJECT;
            _this.objectId = data["objectId"];
            var pos = data["targetPosition"];
            _this.position = pos != null ? utils_1.data2Vector(pos) : null;
            var angles = data["targetRotation"];
            _this.rotation = angles != null ? utils_1.data2Vector(angles) : null;
            _this.layoutId = data["targetLayoutId"];
            return _this;
        }
        return MoveObject;
    }(GameMessage));
    exports.MoveObject = MoveObject;
    /** Ход перешел к другому игроку */
    var ChangeTurn = /** @class */ (function (_super) {
        __extends(ChangeTurn, _super);
        function ChangeTurn(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_TAG_CHANGETURN;
            _this.playerId = data["playerId"];
            return _this;
        }
        return ChangeTurn;
    }(GameMessage));
    exports.ChangeTurn = ChangeTurn;
    /** Сообщение обмена данными WebRTC */
    var RTCMessage = /** @class */ (function (_super) {
        __extends(RTCMessage, _super);
        function RTCMessage(data) {
            var _this = _super.call(this) || this;
            /** Определитель типа */
            _this.tag = INC_OUT_TAG_RTC;
            _this.type = data["type"];
            _this.targetId = data["targetId"];
            _this.senderId = data["senderId"];
            _this.payload = data["payload"];
            return _this;
        }
        return RTCMessage;
    }(GameMessage));
    exports.RTCMessage = RTCMessage;
    /** Все функции обратного вызова */
    var callbacks;
    /** Соединение с сервером */
    var connection;
    /**
     * Преобразовать JSON представление сообщения в сообщение
     * @param json Данные о сообщении в формате JSON
     */
    function parseMessageJson(json) {
        switch (json["tag"]) {
            case INC_TAG_CONNECTED:
                return new ClientConnected(json);
            case INC_TAG_PLAYERAWAY:
                return null; // TODO!!!
            case INC_TAG_MESSAGE:
                return new ShowMessage(json);
            case INC_TAG_ADDOBJECTS:
                return new AddObjects(json);
            case INC_TAG_DELOBJECTS:
                return new RemoveObjects(json);
            case INC_TAG_PROP_CHANGE:
                return new PropChanged(json);
            case INC_TAG_MOVEOBJECT:
                return new MoveObject(json);
            case INC_TAG_CHANGETURN:
                return new ChangeTurn(json);
            case INC_OUT_TAG_RTC:
                return new RTCMessage(json);
            default:
                throw new Error("Invalid message type!");
        }
    }
    /** Установлено соединение с сервером */
    function connectedToServer() {
        console.log("Connected to server!");
        callbacks.connected();
    }
    /** Произошла ошибка соединения */
    function connectionError() {
        console.log("Connection error!");
        callbacks.error();
    }
    /** Соединение с сервером закрыто */
    function connectionClosed() {
        console.log("Connection closed!");
    }
    /** Получено сообщение сервера */
    function messageReceived(e) {
        if (e.type == "message") {
            var json = JSON.parse(e.data);
            var incomingMessage = parseMessageJson(json);
            callbacks.message(incomingMessage);
        }
        else {
            throw new Error("Invalid message format!");
        }
    }
    /**
     * Отправить игровое сообщение
     * @param message Сообщение для отправки
     */
    function sendMessage(message) {
        connection.send(message.toString());
    }
    exports.sendMessage = sendMessage;
    /**
     * Инициализация сетевого соединения
     * @param serverAddress Адрес сервера WebSocket
     */
    function initialize(serverUri, cb) {
        connection = new WebSocket(serverUri);
        connection.onopen = connectedToServer;
        connection.onerror = connectionError;
        connection.onmessage = messageReceived;
        callbacks = cb;
    }
    exports.initialize = initialize;
    /** Оповестить сервер о готовности клиента */
    function notifyClientReady() {
        var doneMsg = new ClientInitialized().ofCurrentPlayer();
        sendMessage(doneMsg);
    }
    exports.notifyClientReady = notifyClientReady;
});
//# sourceMappingURL=connection.js.map