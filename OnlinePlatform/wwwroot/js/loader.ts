import * as Room from "room";
import * as THREE from "three";
import * as Resources from "resources";
import { IGameModule } from "platform";
import { setLoadingProgress, setLoadingMsg } from "ui";

// Загрузчик данных и объектов

/** URL загрузки состояния игры */
const SCENE_LOAD_URL = "/Game/GetGameState";

/** URL загрузки файлового ресурса */
const ASSET_LOAD_URL = "/Game/GetAsset/";

/** Имя модуля игры */
const GAME_MODULE_NAME = "game/test";

type Callback = () => void;
type LoaderCallback = (loader: XMLHttpRequest) => void;

/** Прототип функции RequireJS */
type RequireJSFn = (names: string[], callback: (loaded: any) => void) => void;

// При завершении всех загрузок
var allDataLoaded: Callback;

// Приписывать к концу ссылки случайных хэш
var appendRndHash: boolean;

/** Загруженный модуль игры (TBD) */
export var gameModule: IGameModule;

/** Адрес сервера сообщений */
export var serverUri: string;

/** Загрузчик данных с помощью XMLHttpRequest */
export class XHRDataLoader {

    private xhr: XMLHttpRequest;

    private successCallback: LoaderCallback;

    /**
     * Зарегистрировать функцию обработки результата
     * @param callback
     */
    public then(callback: LoaderCallback): XHRDataLoader {
        this.successCallback = callback;
        return this;
    }

    /**
     * Послать запрос загрузки данных
     * @param data Отправляемые данные
     */
    public go(data?: any): void {
        this.xhr.send(data);
    }

    /** Изменено состояние загрузки */
    private stateChanged(): void {
        if (this.xhr.readyState == this.xhr.DONE) {
            this.successCallback(this.xhr);
        }
    }

    constructor(public url: string, public isPost: boolean = true) {
        this.xhr = new XMLHttpRequest();
        this.xhr.open(isPost ? "post" : "get", url);
        this.xhr.onreadystatechange = this.stateChanged.bind(this);
    }
}

/** Выдать URL к ресурсу со случайным хэшем */
function getHashedUrl(url: string): string {
    if (appendRndHash) {
        return `${url}?r=${Math.random()}`;
    } else {
        return url;
    }
}

/** 
 * Загрузить системные модули (Этап 0)
 * @param onDone Обратный вызов продолжения загрузки
 * */
function loadSystemModules(onDone: Callback): void {
    new XHRDataLoader("/js/OrbitControls.js", false).then(resp => {
        let script = resp.responseText;
        eval(script);
        onDone();
    }).go();
}

/** Загрузить модули игры (Этап 1) */
function loadGameModules(onDone: Callback): void {
    let require = <RequireJSFn>window["require"];
    require([GAME_MODULE_NAME], (game: any) => {
        gameModule = <IGameModule>game;
        onDone();
    });
}

/**
 * Загрузить данные игры (Этап 2)
 */
function loadGame(): void {
    // Модули игры загружены
    let gameModulesLoaded: Callback = () => {
        setLoadingProgress(10);
        loadSceneInfo();
    };

    loadGameModules(gameModulesLoaded);
}

/**
 * Загрузить информацию о сцене (Этап 3)
 */
function loadSceneInfo(): void {
    // Объекты сцены загружены
    let objectsLoaded: Callback = () => {
        setLoadingProgress(80);
    };

    // Текстуры окружения загружены
    let environmentLoaded: Callback = () => {
        setLoadingProgress(50);
        loadObjects(objectsLoaded);
    };

    // Информация о сцене загружена
    let infoLoaded = (xhr: XMLHttpRequest) => {
        setLoadingProgress(20);

        let sceneInfo = JSON.parse(xhr.responseText);
        serverUri = sceneInfo["messageServerUri"];
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
function loadClientResources(definitions: any[]): void {
    let textureLoader = new THREE.TextureLoader().setPath(ASSET_LOAD_URL);

    for (let info of definitions) {
        let id: string = info["id"];
        let type = info["type"];

        if (type == "image") {
            let loadedTexture = textureLoader.load(info["content"]);
            Resources.putRawResource(type, id, loadedTexture);
        } else {
            Resources.putRawResource(type, id, info["content"])
        }
    }
}

/** Загрузить текстуры окружения (Этап 3.1) */
function loadEnvironment(loaded: Callback): void {
    let cubeMapLoader = new THREE.CubeTextureLoader();

    let textures = new Array<string>();
    for (let i = 0; i < 6; i++) {
        let sideUrl = `${Room.loadedScene.skyBoxName}_${i + 1}.jpg`;
        textures.push(getHashedUrl(sideUrl));
    }

    cubeMapLoader.setPath(ASSET_LOAD_URL).load(textures, cubemap => {
        Room.loadedScene.scene3d.background = cubemap;
        loaded();
    });
}

/** Загрузить трехмерные объекты (Этап 3.2) */
function loadObjects(loaded: Callback): void {
    let loadQueue = Room.loadedRoom.definitions.filter(def => def.needLoading)
                                               .map(def => def.name);
    let itemIdx: number = 0;

    let loader = new THREE.JSONLoader();
    loader.setTexturePath(ASSET_LOAD_URL);

    // Загрузить следующий элемент в очереди
    let loadNextItem = function () {
        let objName = loadQueue.shift();
        let objUrl = `${ASSET_LOAD_URL}${objName}.json`;

        console.log(`Loading 3D object: ${objName}...`);

        loader.load(getHashedUrl(objUrl), (geo, mats) => {
            let object3d = new THREE.Mesh(geo, mats);
            Room.loadedRoom.getDefinition(objName).geometry = object3d;
            if (loadQueue.length > 0) {
                loadNextItem();
            } else {
                loaded();
            }
        });
    };

    loadNextItem();
}

/** Финальный этап загрузки (Этап 4) */
function loadFinishingStep(): void {
    setLoadingProgress(100);
    setTimeout(allDataLoaded, 300);
}

/** Установить функцию обратного вызова окончания загрузки */
export function setDataLoadedHandler(handler: Callback): void {
    allDataLoaded = handler;
}

/** Загрузить состояние игры */
export function loadGameState(forceReload: boolean = false) {
    appendRndHash = forceReload;

    // Показ прогресса загрузки
    THREE.DefaultLoadingManager.onProgress = (_, loaded, total) => {
        setLoadingMsg(`${loaded}/${total}`);
    };

    // Окончание загрузки
    THREE.DefaultLoadingManager.onLoad = () => {
        THREE.DefaultLoadingManager.onProgress = null;
        THREE.DefaultLoadingManager.onLoad = null;
        loadFinishingStep();
    };

    // Системные модули загружены
    let sysModulesLoaded = () => {
        setLoadingProgress(0);
        loadGame();
    };

    loadSystemModules(sysModulesLoaded);
} 