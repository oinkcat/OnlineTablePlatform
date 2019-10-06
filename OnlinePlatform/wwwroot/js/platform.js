define(["require", "exports", "three", "stats.min", "ui", "loader", "controls", "connection", "rtc", "room", "utils", "connection"], function (require, exports, THREE, Stats, UI, Loader, Controls, Connection, RTC, room_1, utils_1, connection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var renderer;
    var camera;
    var scene;
    /** Абстракция текущей игры */
    var game;
    var stats;
    var clock;
    /** Установить новые размеры области вывода */
    function setRenderSize() {
        var canvasSize = UI.getOutputSize();
        camera.aspect = canvasSize.w / canvasSize.h;
        renderer.setSize(canvasSize.w, canvasSize.h);
        camera.updateProjectionMatrix();
    }
    /** Отобразить сцену на экране */
    function render() {
        // Анимации
        utils_1.animations.update();
        if (utils_1.animations.isAnimating("position")) {
            Controls.update();
        }
        Controls.restrictCameraInScene();
        // Выдача
        renderer.render(scene, camera);
        stats.update();
        var frameTime = clock.getDelta();
        window.requestAnimationFrame(render);
    }
    /** Инициализировать объекты рендеринга */
    function initializeRenderer() {
        renderer = new THREE.WebGLRenderer();
        renderer.setClearColor("#dddddd");
        var outputSize = UI.getOutputSize();
        var aspect = outputSize.w / outputSize.h;
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
    function onRTCStateChange(connected) {
        UI.setRTCStatus(connected);
    }
    /** Соединение с сервером успешно */
    function connectionOK() {
        Controls.initialize(camera, renderer.domElement);
        game.initializeResources();
        // Создать объекты сцены
        room_1.loadedScene.constructScene();
        Controls.placePlayer(room_1.loadedRoom.player.seatIndex, 0);
        game.initialize();
        // Применение всех свойств
        for (var pName in room_1.loadedRoom.props) {
            game.propertyChanged(pName, room_1.loadedRoom.props[pName]);
        }
        // Интерфейс и RTC
        var rtcCallbacks = {
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
    function connectionError() {
        UI.showDisconnectDialog();
    }
    /**
     * Получено сообщение от сервера
     * @param message Серверное игровое сообщение
     */
    function gameMessageReceived(message) {
        if (message instanceof Connection.ClientConnected) {
            // Игрок подсоединен
            room_1.loadedRoom.addPlayer(message.player);
            UI.updatePlayerAvatars();
        }
        else if (message instanceof Connection.ShowMessage) {
            // Игровое сообщение
            UI.showMessage(message.text, message.duration);
        }
        else if (message instanceof Connection.AddObjects) {
            // Добавление объектов
            for (var _i = 0, _a = message.objectsData; _i < _a.length; _i++) {
                var objInfo = _a[_i];
                var newObject = room_1.loadedScene.addObjectFromInfo(objInfo);
                game.objectAdded(newObject);
            }
        }
        else if (message instanceof connection_1.RemoveObjects) {
            // Удаление объектов
            for (var _b = 0, _c = message.objectIds; _b < _c.length; _b++) {
                var objId = _c[_b];
                var objectToRemove = room_1.loadedScene.getObjectById(objId);
                room_1.loadedScene.removeObject(objectToRemove);
                game.objectRemoved(objectToRemove);
            }
        }
        else if (message instanceof Connection.PropChanged) {
            // Изменение свойств
            room_1.loadedRoom.props[message.name] = message.newValue;
            game.propertyChanged(message.name, message.newValue);
        }
        else if (message instanceof Connection.MoveObject) {
            // Объект перемещен
            var objToMove = room_1.loadedScene.getObjectById(message.objectId);
            if (message.position != null) {
                utils_1.setVector(objToMove.position, message.position);
            }
            if (message.rotation != null) {
                objToMove.rotation.setFromVector3(message.rotation);
            }
            if (message.layoutId != null) {
                room_1.loadedScene.removeObject(objToMove);
                var newLayout = room_1.loadedScene.getObjectById(message.layoutId);
                room_1.loadedScene.addObject(objToMove, newLayout);
            }
        }
        else if (message instanceof Connection.ChangeTurn) {
            // Ход перешел к другому игроку
            if (message.playerId != null) {
                var newActivePlayer = room_1.loadedRoom.getPlayerById(message.playerId);
                room_1.loadedRoom.activePlayer = newActivePlayer;
                game.turnChanged(newActivePlayer);
            }
            else {
                room_1.loadedRoom.activePlayer = null;
            }
            UI.updatePlayerAvatars();
        }
        else if (message instanceof Connection.RTCMessage) {
            // Сообщение обмена данными о подключении WebRTC
            RTC.processMessage(message);
        }
    }
    /** Все данные и ресурсы игры загружены */
    function gameLoaded() {
        scene = room_1.loadedScene.scene3d;
        game = Loader.gameModule;
        // Соединиться с сервером
        var connectionCallbacks = {
            connected: connectionOK,
            error: connectionError,
            resume: null,
            message: gameMessageReceived
        };
        Connection.initialize(Loader.serverUri, connectionCallbacks);
    }
    /** Произвести общую инициализацию */
    function initialize() {
        UI.initialize();
        initializeRenderer();
        renderer.domElement.className = "render";
        UI.appendRenderer(renderer.domElement);
        UI.appendRenderer(stats.domElement);
        UI.setResizeHandler(setRenderSize);
        // Загрузка игры
        Loader.setDataLoadedHandler(gameLoaded);
        // Тест
        var query = window.location.search;
        var reCreate = query.indexOf("reCreate=true") > -1;
        Loader.loadGameState(reCreate);
    }
    /**
     * Установить обработчики игровых событий
     * @param handlers Все обработчики событий для игрового модуля
     */
    function setEventHandlers(handlers) {
        Controls.setHandlers(handlers.control);
    }
    exports.setEventHandlers = setEventHandlers;
    /** Проверить, выполняется ли ход текущего игрока */
    function isMyTurn() {
        return room_1.loadedRoom.player == room_1.loadedRoom.activePlayer;
    }
    exports.isMyTurn = isMyTurn;
    initialize();
});
//# sourceMappingURL=platform.js.map