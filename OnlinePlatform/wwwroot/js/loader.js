define(["require", "exports", "room", "three", "resources", "ui"], function (require, exports, Room, THREE, Resources, ui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Загрузчик данных и объектов
    /** URL загрузки состояния игры */
    var SCENE_LOAD_URL = "/Game/GetGameState";
    /** URL загрузки файлового ресурса */
    var ASSET_LOAD_URL = "/Game/GetAsset/";
    /** Имя модуля игры */
    var GAME_MODULE_NAME = "game/test";
    // При завершении всех загрузок
    var allDataLoaded;
    // Приписывать к концу ссылки случайных хэш
    var appendRndHash;
    /** Загрузчик данных с помощью XMLHttpRequest */
    var XHRDataLoader = /** @class */ (function () {
        function XHRDataLoader(url, isPost) {
            if (isPost === void 0) { isPost = true; }
            this.url = url;
            this.isPost = isPost;
            this.xhr = new XMLHttpRequest();
            this.xhr.open(isPost ? "post" : "get", url);
            this.xhr.onreadystatechange = this.stateChanged.bind(this);
        }
        /**
         * Зарегистрировать функцию обработки результата
         * @param callback
         */
        XHRDataLoader.prototype.then = function (callback) {
            this.successCallback = callback;
            return this;
        };
        /**
         * Послать запрос загрузки данных
         * @param data Отправляемые данные
         */
        XHRDataLoader.prototype.go = function (data) {
            this.xhr.send(data);
        };
        /** Изменено состояние загрузки */
        XHRDataLoader.prototype.stateChanged = function () {
            if (this.xhr.readyState == this.xhr.DONE) {
                this.successCallback(this.xhr);
            }
        };
        return XHRDataLoader;
    }());
    exports.XHRDataLoader = XHRDataLoader;
    /** Выдать URL к ресурсу со случайным хэшем */
    function getHashedUrl(url) {
        if (appendRndHash) {
            return url + "?r=" + Math.random();
        }
        else {
            return url;
        }
    }
    /**
     * Загрузить системные модули (Этап 0)
     * @param onDone Обратный вызов продолжения загрузки
     * */
    function loadSystemModules(onDone) {
        new XHRDataLoader("/js/OrbitControls.js", false).then(function (resp) {
            var script = resp.responseText;
            eval(script);
            onDone();
        }).go();
    }
    /** Загрузить модули игры (Этап 1) */
    function loadGameModules(onDone) {
        var require = window["require"];
        require([GAME_MODULE_NAME], function (game) {
            exports.gameModule = game;
            onDone();
        });
    }
    /**
     * Загрузить данные игры (Этап 2)
     */
    function loadGame() {
        // Модули игры загружены
        var gameModulesLoaded = function () {
            ui_1.setLoadingProgress(10);
            loadSceneInfo();
        };
        loadGameModules(gameModulesLoaded);
    }
    /**
     * Загрузить информацию о сцене (Этап 3)
     */
    function loadSceneInfo() {
        // Объекты сцены загружены
        var objectsLoaded = function () {
            ui_1.setLoadingProgress(80);
        };
        // Текстуры окружения загружены
        var environmentLoaded = function () {
            ui_1.setLoadingProgress(50);
            loadObjects(objectsLoaded);
        };
        // Информация о сцене загружена
        var infoLoaded = function (xhr) {
            ui_1.setLoadingProgress(20);
            var sceneInfo = JSON.parse(xhr.responseText);
            exports.serverUri = sceneInfo["messageServerUri"];
            Room.createFromData(sceneInfo);
            // Загрузка ресурсов сцены (TODO: асинхронно)
            loadClientResources(sceneInfo["clientResources"]);
            loadEnvironment(environmentLoaded);
        };
        new XHRDataLoader(SCENE_LOAD_URL).then(infoLoaded).go();
    }
    /**
     * Загрузить клиентские ресурсы
     * @param definitions определения ресурсов
     */
    function loadClientResources(definitions) {
        var textureLoader = new THREE.TextureLoader().setPath(ASSET_LOAD_URL);
        for (var _i = 0, definitions_1 = definitions; _i < definitions_1.length; _i++) {
            var info = definitions_1[_i];
            var id = info["id"];
            var type = info["type"];
            if (type == "image") {
                var loadedTexture = textureLoader.load(info["content"]);
                Resources.putRawResource(type, id, loadedTexture);
            }
            else {
                Resources.putRawResource(type, id, info["content"]);
            }
        }
    }
    /** Загрузить текстуры окружения (Этап 3.1) */
    function loadEnvironment(loaded) {
        var cubeMapLoader = new THREE.CubeTextureLoader();
        var textures = new Array();
        for (var i = 0; i < 6; i++) {
            var sideUrl = Room.loadedScene.skyBoxName + "_" + (i + 1) + ".jpg";
            textures.push(getHashedUrl(sideUrl));
        }
        cubeMapLoader.setPath(ASSET_LOAD_URL).load(textures, function (cubemap) {
            Room.loadedScene.scene3d.background = cubemap;
            loaded();
        });
    }
    /** Загрузить трехмерные объекты (Этап 3.2) */
    function loadObjects(loaded) {
        var loadQueue = Room.loadedRoom.definitions.filter(function (def) { return def.needLoading; })
            .map(function (def) { return def.name; });
        var itemIdx = 0;
        var loader = new THREE.JSONLoader();
        loader.setTexturePath(ASSET_LOAD_URL);
        // Загрузить следующий элемент в очереди
        var loadNextItem = function () {
            var objName = loadQueue.shift();
            var objUrl = "" + ASSET_LOAD_URL + objName + ".json";
            console.log("Loading 3D object: " + objName + "...");
            loader.load(getHashedUrl(objUrl), function (geo, mats) {
                var object3d = new THREE.Mesh(geo, mats);
                Room.loadedRoom.getDefinition(objName).geometry = object3d;
                if (loadQueue.length > 0) {
                    loadNextItem();
                }
                else {
                    loaded();
                }
            });
        };
        loadNextItem();
    }
    /** Финальный этап загрузки (Этап 4) */
    function loadFinishingStep() {
        ui_1.setLoadingProgress(100);
        setTimeout(allDataLoaded, 300);
    }
    /** Установить функцию обратного вызова окончания загрузки */
    function setDataLoadedHandler(handler) {
        allDataLoaded = handler;
    }
    exports.setDataLoadedHandler = setDataLoadedHandler;
    /** Загрузить состояние игры */
    function loadGameState(forceReload) {
        if (forceReload === void 0) { forceReload = false; }
        appendRndHash = forceReload;
        // Показ прогресса загрузки
        THREE.DefaultLoadingManager.onProgress = function (_, loaded, total) {
            ui_1.setLoadingMsg(loaded + "/" + total);
        };
        // Окончание загрузки
        THREE.DefaultLoadingManager.onLoad = function () {
            THREE.DefaultLoadingManager.onProgress = null;
            THREE.DefaultLoadingManager.onLoad = null;
            loadFinishingStep();
        };
        // Системные модули загружены
        var sysModulesLoaded = function () {
            ui_1.setLoadingProgress(0);
            loadGame();
        };
        loadSystemModules(sysModulesLoaded);
    }
    exports.loadGameState = loadGameState;
});
//# sourceMappingURL=loader.js.map