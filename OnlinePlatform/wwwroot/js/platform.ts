import * as THREE from "three";
import * as Stats from "stats.min";
import * as UI from "ui";
import * as Loader from "loader";
import * as Controls from "controls";
import * as Connection from "connection";
import * as RTC from "rtc";
import { loadedScene, loadedRoom, GamePlayer } from "room";
import { animations, setVector } from "utils";
import { RemoveObjects } from "connection";
import { Object3D } from "three";

// Онлайн-платформа настольных игр

/** Игровой модуль */
export interface IGameModule {
    initializeResources(): void;
    initialize(): void;
    update(): void;
    turnChanged(player: GamePlayer): void;
    propertyChanged(key: string, value: string): void;
    objectAdded(object: Object3D): void;
    objectRemoved(object: Object3D): void;
}

/** Обработчики игровых событий */
export interface IGameEventHandlers {
    control: Controls.IControlHandlers,
    onCustomMessage: (message: Connection.GameMessage) => void
}

var renderer: THREE.WebGLRenderer;
var camera: THREE.PerspectiveCamera;
var scene: THREE.Scene;

/** Абстракция текущей игры */
var game: IGameModule;

var stats: any;
var clock: THREE.Clock;

/** Установить новые размеры области вывода */
function setRenderSize(): void {
    let canvasSize = UI.getOutputSize();
    camera.aspect = canvasSize.w / canvasSize.h;
    renderer.setSize(canvasSize.w, canvasSize.h);
    camera.updateProjectionMatrix();
}

/** Отобразить сцену на экране */
function render(): void {
    // Анимации
    animations.update();
    if (animations.isAnimating("position")) {
        Controls.update();
    }

    Controls.restrictCameraInScene();

    // Выдача
    renderer.render(scene, camera);
    stats.update();
    let frameTime = clock.getDelta();

    window.requestAnimationFrame(render);
}

/** Инициализировать объекты рендеринга */
function initializeRenderer(): void {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor("#dddddd");

    let outputSize = UI.getOutputSize();
    let aspect = outputSize.w / outputSize.h;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    camera.position.set(20, 20, 20);

    // Вспомогательное
    stats = Stats();
    clock = new THREE.Clock();
    clock.getDelta();
}

/**
 * Изменено состояние подключения RTC
 * @param connected Состояние подключения
 */
function onRTCStateChange(connected: boolean): void {
    UI.setRTCStatus(connected);
}

/** Соединение с сервером успешно */
function connectionOK(): void {
    Controls.initialize(camera, renderer.domElement);
    game.initializeResources();

    // Создать объекты сцены
    loadedScene.constructScene();
    Controls.placePlayer(loadedRoom.player.seatIndex, 0);

    game.initialize();

    // Применение всех свойств
    for (let pName in loadedRoom.props) {
        game.propertyChanged(pName, loadedRoom.props[pName]);
    }

    // Интерфейс и RTC
    let rtcCallbacks: RTC.IRTCCallbacks = {
        connected: onRTCStateChange.bind(this, true),
        error: onRTCStateChange.bind(this, false)
    };
    RTC.initialize(rtcCallbacks);

    // Завершение инициализации
    Connection.notifyClientReady();
    UI.toggleLoading(false);
    setRenderSize();

    render();

    // Запуск аудио-соединения
    RTC.start();
}

/** Связь с сервером прервалась */
function connectionError(): void {
    UI.showDisconnectDialog();
}

/**
 * Получено сообщение от сервера
 * @param message Серверное игровое сообщение
 */
function gameMessageReceived(message: Connection.GameMessage): void {
    if (message instanceof Connection.ClientConnected) {
        // Игрок подсоединен
        loadedRoom.addPlayer(message.player);
        UI.updatePlayerAvatars();
    } else if (message instanceof Connection.ShowMessage) {
        // Игровое сообщение
        UI.showMessage(message.text, message.duration);
    } else if (message instanceof Connection.AddObjects) {
        // Добавление объектов
        for (let objInfo of message.objectsData) {
            let newObject = loadedScene.addObjectFromInfo(objInfo);
            game.objectAdded(newObject);
        }
    } else if (message instanceof RemoveObjects) {
        // Удаление объектов
        for (let objId of message.objectIds) {
            let objectToRemove = loadedScene.getObjectById(objId);
            loadedScene.removeObject(objectToRemove);
            game.objectRemoved(objectToRemove);
        }
    } else if (message instanceof Connection.PropChanged) {
        // Изменение свойств
        loadedRoom.props[message.name] = message.newValue;
        game.propertyChanged(message.name, message.newValue);
    } else if (message instanceof Connection.MoveObject) {
        // Объект перемещен
        let objToMove = loadedScene.getObjectById(message.objectId);

        if (message.position != null) {
            setVector(objToMove.position, message.position);
        }
        if (message.rotation != null) {
            objToMove.rotation.setFromVector3(message.rotation);
        }
        if (message.layoutId != null) {
            loadedScene.removeObject(objToMove);
            let newLayout = loadedScene.getObjectById(message.layoutId);
            loadedScene.addObject(objToMove, newLayout);
        }
    } else if (message instanceof Connection.ChangeTurn) {
        // Ход перешел к другому игроку
        if (message.playerId != null) {
            let newActivePlayer = loadedRoom.getPlayerById(message.playerId);
            loadedRoom.activePlayer = newActivePlayer;
            game.turnChanged(newActivePlayer);
        } else {
            loadedRoom.activePlayer = null;
        }
        UI.updatePlayerAvatars();
    } else if (message instanceof Connection.RTCMessage) {
        // Сообщение обмена данными о подключении WebRTC
        RTC.processMessage(message);
    }
}

/** Все данные и ресурсы игры загружены */
function gameLoaded(): void {
    scene = loadedScene.scene3d;
    game = <IGameModule>Loader.gameModule;

    // Соединиться с сервером
    var connectionCallbacks: Connection.IConnectionCallbacks = {
        connected: connectionOK,
        error: connectionError,
        resume: null,
        message: gameMessageReceived
    };
    Connection.initialize(Loader.serverUri, connectionCallbacks);
}

/** Произвести общую инициализацию */
function initialize(): void {
    UI.initialize();
    initializeRenderer();

    renderer.domElement.className = "render";
    UI.appendRenderer(renderer.domElement);
    UI.appendRenderer(stats.domElement);
    UI.setResizeHandler(setRenderSize);

    // Загрузка игры
    Loader.setDataLoadedHandler(gameLoaded);

    // Тест
    let query = window.location.search;
    let reCreate = query.indexOf("reCreate=true") > -1;
    Loader.loadGameState(reCreate);
}

/**
 * Установить обработчики игровых событий
 * @param handlers Все обработчики событий для игрового модуля
 */
export function setEventHandlers(handlers: IGameEventHandlers): void {
    Controls.setHandlers(handlers.control);
}

/** Проверить, выполняется ли ход текущего игрока */
export function isMyTurn(): Boolean {
    return loadedRoom.player == loadedRoom.activePlayer;
}

initialize();