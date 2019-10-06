import { currentPlayer, GamePlayer } from "room"
import { Vector3 } from "three"
import { data2Vector } from "utils"

// Сетевое соединение с сервером WebSocket

const OUT_TAG_INIT_DONE = "init_done";
const INC_TAG_PLAYERAWAY = "away";
const INC_TAG_CONNECTED = "connected";
const INC_TAG_MESSAGE = "text_message";
const INC_TAG_ADDOBJECTS = "add_objects";
const INC_TAG_DELOBJECTS = "remove_objects";
const INC_TAG_PROP_CHANGE = "prop_change";
const INC_TAG_MOVEOBJECT = "move_object";
const INC_TAG_CHANGETURN = "turn";
const INC_OUT_TAG_RTC = "rtc";

/** Обратные вызовы */
export interface IConnectionCallbacks {
    connected: () => void,
    error: () => void,
    resume: () => void,
    message: (message: GameMessage) => void
}

/** Сообщение для обмена данными с сервером */
export abstract class GameMessage {

    /** Отметка о типе сообщения */
    public abstract tag: string;

    /** Идентификатор игрока-отправителя */
    public senderId: string;

    /** Добавить идентификатор текущего игрока */
    public ofCurrentPlayer(): GameMessage {
        this.senderId = currentPlayer.id;
        return this;
    }

    /** Преобразовать сообщение в строку */
    public toString(): string {
        return JSON.stringify(this);
    }
}

/** Клиент инициализирован */
export class ClientInitialized extends GameMessage {

    /** Определитель типа */
    public tag: string = OUT_TAG_INIT_DONE;
}

/** Новый клиент подключен  */
export class ClientConnected extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_CONNECTED;

    /** Данные игрока */
    public player: GamePlayer;

    constructor(data: any) {
        super();
        this.player = new GamePlayer(data["newPlayer"]);
    }
}

/** Показать текстовое сообщение */
export class ShowMessage extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_MESSAGE;

    /** Текст сообщения */
    public text: string;

    /** Длительность показа */
    public duration?: number;

    constructor(data: any) {
        super();
        this.text = data["message"];
        this.duration = data["duration"];
    }
}

/** Добавить новые объекты на сцену */
export class AddObjects extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_ADDOBJECTS;

    /** Данные добавляемых объектов */
    public objectsData: Array<any>;

    constructor(data: any) {
        super();
        this.objectsData = data["addingObjects"];
    }
}

/** Удалить объекты со сцены */
export class RemoveObjects extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_DELOBJECTS;

    public objectIds: Array<string>;

    constructor(data: any) {
        super();
        this.objectIds = data["objectIds"];
    }
}

/** Изменение состояния сцены */
export class PropChanged extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_PROP_CHANGE;

    /** Имя свойства */
    public name: string;

    /** Новое значение свойства */
    public newValue: string;

    constructor(data: any) {
        super();
        this.name = data["name"];
        this.newValue = data["value"];
    }
}

/** Перемещение объекта */
export class MoveObject extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_MOVEOBJECT;

    /** Идентификатор объекта */
    public objectId: string;

    /** Конечная позиция */
    public position: Vector3;

    /** Конечный угол поворота */
    public rotation: Vector3;

    /** Новая раскладка */
    public layoutId: string;

    constructor(data: any) {
        super();
        this.objectId = data["objectId"];

        let pos = data["targetPosition"];
        this.position = pos != null ? data2Vector(pos) : null;

        let angles = data["targetRotation"];
        this.rotation = angles != null ? data2Vector(angles) : null;

        this.layoutId = data["targetLayoutId"];
    }
}

/** Ход перешел к другому игроку */
export class ChangeTurn extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_TAG_CHANGETURN;

    /** Идентификатор нового активного игрока */
    public playerId: string;

    constructor(data: any) {
        super();
        this.playerId = data["playerId"];
    }
}

/** Сообщение обмена данными WebRTC */
export class RTCMessage extends GameMessage {

    /** Определитель типа */
    public tag: string = INC_OUT_TAG_RTC;

    /** Тип сообщения RTC */
    public type: string;

    /** Получатель сообщения */
    public targetId: string;

    /** Полезная нагрузка */
    public payload: any;

    constructor(data: any) {
        super();
        this.type = data["type"];
        this.targetId = data["targetId"];
        this.senderId = data["senderId"];
        this.payload = data["payload"];
    }
}

/** Все функции обратного вызова */
var callbacks: IConnectionCallbacks;

/** Соединение с сервером */
var connection: WebSocket;

/**
 * Преобразовать JSON представление сообщения в сообщение
 * @param json Данные о сообщении в формате JSON
 */
function parseMessageJson(json: any) {
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
function connectedToServer(): void {
    console.log("Connected to server!");
    callbacks.connected();
}

/** Произошла ошибка соединения */
function connectionError(): void {
    console.log("Connection error!");
    callbacks.error();
}

/** Соединение с сервером закрыто */
function connectionClosed(): void {
    console.log("Connection closed!");
}

/** Получено сообщение сервера */
function messageReceived(e: MessageEvent): void {
    if (e.type == "message") {
        var json = JSON.parse(e.data);
        var incomingMessage = parseMessageJson(json);
        callbacks.message(incomingMessage);
    } else {
        throw new Error("Invalid message format!");
    }
}

/**
 * Отправить игровое сообщение
 * @param message Сообщение для отправки
 */
export function sendMessage(message: GameMessage): void {
    connection.send(message.toString());
}

/**
 * Инициализация сетевого соединения
 * @param serverAddress Адрес сервера WebSocket
 */
export function initialize(serverUri: string, cb: IConnectionCallbacks): void {
    connection = new WebSocket(serverUri);
    connection.onopen = connectedToServer;
    connection.onerror = connectionError;
    connection.onmessage = messageReceived;

    callbacks = cb;
}

/** Оповестить сервер о готовности клиента */
export function notifyClientReady(): void {
    let doneMsg = new ClientInitialized().ofCurrentPlayer();
    sendMessage(doneMsg);
}