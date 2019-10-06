import * as THREE from "three";
import { data2Vector, setVector } from "utils";

// Объекты игровой комнаты

type ThreeCoords = { x: number; y: number; z: number }
type Vector = THREE.Vector3;

/** Загруженная комната */
export var loadedRoom: GameRoom;

/** Загруженная сцена */
export var loadedScene: GameScene;

/** Текущий игрок */
export var currentPlayer: GamePlayer;

/** Точка обзора игроков */
export class PointOfView {

    /** Название */
    public name: string;

    /** Позиции игроков */
    public positions: Vector[] = null;

    /** Позиции обозреваемых объектов */
    public targets: Vector[] = null;

    constructor(data: any) {
        this.name = data["name"];

        if (data["positions"] != null) {
            this.positions = data["positions"].map(data2Vector);
        }

        if (data["targets"] != null) {
            this.targets = data["targets"].map(data2Vector);
        }
    }
}

/** Раскладка объектов */
export class ObjectsLayout extends THREE.Group {

    public layoutType: number;

    public spacing: number;

    public radius: number;

    /**
     * Добавить новый объект
     * @param object Добавляемый объект
     */
    public add(object: THREE.Object3D): void {
        super.add(object);

        if (this.layoutType == 0) {
            this.arrangeContentsLinear();
        } else {
            this.arrangeContentsCircular();
        }
    }

    // Разместить содержимое в горизонтальную линию
    private arrangeContentsLinear(): void {

        let totalWidth = this.children.reduce<number>((prev, cur) => {
            return prev + (<Vector>cur.userData.size).x + this.spacing;
        }, 0) - this.spacing;
        let objectX = -totalWidth / 2;

        for (let child of this.children) {
            let width = (<Vector>child.userData.size).x;
            child.position.x = objectX + width / 2;
            objectX += width;

            if (child != this.children[this.children.length - 1]) {
                objectX += this.spacing;
            }
        }
    }

    // Разместить содержимое по окружности
    private arrangeContentsCircular(): void {
        if (this.children.length == 1) {
            this.children[0].position.set(0, 0, 0);
        } else if (this.children.length > 1) {
            let sectorAngle = Math.PI * 2 / this.children.length;
            let angle = 0;

            for (let child of this.children) {
                child.position.x = Math.cos(angle) * this.radius;
                child.position.z = Math.sin(angle) * this.radius;

                angle += sectorAngle;
            }
        }
    }

    constructor(info: any) {
        super();

        this.layoutType = info["Type"] || 0;
        this.spacing = info["Spacing"];
        this.radius = info["Radius"];
    }
}

/** Игрок */
export class GamePlayer {

    /** Идентификатор */
    public id: string;

    /** Имя игрока */
    public name: string;

    /** Индекс места за столом */
    public seatIndex: number;

    /** Дополнительные свойства */
    public props: any;

    constructor(data: any) {
        this.id = data["id"];
        this.name = data["name"];
        this.seatIndex = data["seatIndex"];
        this.props = data["propertyBag"];
    }
}

/** Определение игрового объекта */
export class GameObjectDefinition {

    /** Имя класса объектов */
    public name: string;

    /** Измерения по 3-м осям */
    public dimensions: Vector;

    /** Объект загружается с сервера */
    public loadable: boolean;

    /** Дополнительные свойства */
    public params: any;

    /** Является ли раскладкой */
    public isLayout: boolean;

    /** Трехмерный объект */
    public geometry: THREE.Object3D;

    /** Нужна ли загрузка с сервера */
    public get needLoading(): boolean {
        return !this.isLayout && this.loadable;
    }

    /**
     * Создать трехмерный объект для сцены
     * @param info Информация о создаваемом объекте
     */
    public createObject(info: any): THREE.Object3D {

        let newObject = !this.isLayout ? this.geometry.clone()
                                       : new ObjectsLayout(this.params);
        
        newObject.name = info["id"];

        let pos: ThreeCoords = info["position"];
        newObject.position.set(pos.x, pos.y, pos.z);

        let rot: ThreeCoords = info["rotation"];
        newObject.rotation.set(rot.x, rot.y, rot.z);

        newObject.userData.size = this.dimensions;

        return newObject;
    }

    /** Создать копию объекта */
    public clone(): GameObjectDefinition {
        let copyData = {
            name: this.name,
            dimensions: this.dimensions,
            groupName: this.isLayout ? "_layout" : "other",
            params: this.params
        };

        return new GameObjectDefinition(copyData);
    }

    constructor(data: any) {
        this.name = data["name"];
        this.loadable = data["loadable"];

        let dims = data["dimensions"];
        if (dims != null) {
            this.dimensions = new THREE.Vector3(dims.x, dims.y, dims.z);
        }

        this.isLayout = data["groupName"] == "_layout";
        this.params = data["params"];
    }
}

/** Игровая сцена */
export class GameScene {

    // Информация о загруженных с сервера объектах
    private infoToCreate = {
        objects: new Array<any>(),
        lights: new Array<any>()
    };

    // Измерения сцены по трем осям
    private dimensions: Vector;

    // Все объекты сцены
    private allObjectsById: any = {};

    /** Идентификатор */
    public id: string;

    /** Имя текстуры окружения */
    public skyBoxName: string;

    /** Точка, на которую направлена камера */
    public cameraTarget: Vector;

    /** Расстояние до камеры */
    public cameraDistance: number;

    /** Трехмерная сцена */
    public scene3d: THREE.Scene;

    /** Места за столом */
    public seats: Vector[];

    /** Точки обзора игроков */
    public povs: PointOfView[];

    /**
     * Выдать точки обзора для указанного места за столом
     * @param name Название позиции обзора
     * @param seat Индекс места за столом
     */
    public getPovPoints(name: string, seat: number): {
        position: Vector, target: Vector
    } {
        let found = this.povs.filter(p => p.name == name);

        if (found.length > 0) {
            let pov = found[0];

            return {
                position: pov.positions ? pov.positions[seat] : this.seats[seat],
                target: pov.targets ? pov.targets[seat] : this.cameraTarget
            };

        } else {
            throw new Error(`POV '${name}' not found!`);
        }
    }

    /**
     * Ограничить координаты точки пределами сцены
     * @param point Точка, координаты которой нужно ограничить
     */
    public restrictPointInScene(point: Vector): void {
        const MARGIN: number = 1;

        if (this.dimensions == null)
            return;

        let halfX = this.dimensions.x / 2 - MARGIN;
        let halfZ = this.dimensions.z / 2 - MARGIN;
        let height = this.dimensions.y - MARGIN;

        // Ось X
        if (point.x < -halfX) { point.x = -halfX + MARGIN; }
        if (point.x > halfX) { point.x = halfX - MARGIN; }

        // Ось Y
        if (point.y < MARGIN) { point.y = MARGIN; }
        if (point.y > height) { point.y = height - MARGIN; }

        // Ось Z
        if (point.z < -halfZ) { point.z = -halfZ + MARGIN; }
        if (point.z > halfZ) { point.z = halfZ - MARGIN; }
    }

    /**
     * Выдать объект сцены по его идентификатору
     * @param id Идентификатор объекта
     */
    public getObjectById<T extends THREE.Object3D>(id: string): T {
        return <T>this.allObjectsById[id];
    }

    /**
     * Добавить объект на сцену
     * @param newObject Добавляемый объект
     */
    public addObject(newObject: THREE.Object3D, group?: THREE.Group): void {
        let parent = group != null ? group : this.scene3d;
        parent.add(newObject);
        this.allObjectsById[newObject.name] = newObject;
    }

    /**
     * Добавить объект, созданный из данных, на сцену
     * @param objInfo Данные добавляемого объекта
     */
    public addObjectFromInfo(objInfo: any): THREE.Object3D {
        let definition = loadedRoom.getDefinition(objInfo["name"]);
        let obj3d = definition.createObject(objInfo);

        if (objInfo["layoutId"] == null) {
            this.addObject(obj3d);
        } else {
            let layout = this.scene3d.getObjectByName(objInfo["layoutId"]);
            this.addObject(obj3d, layout);
        }

        this.allObjectsById[obj3d.name] = obj3d;

        return obj3d;
    }

    /**
     * Создать новый трехмерный объект с параметрами по умолчанию
     * @param name Имя типа объекта
     * @param id Идентификатор объекта
     */
    public createObject(name: string, objId: string): THREE.Object3D {
        let objInfo = {
            id: objId,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        };

        return loadedRoom.getDefinition(name).createObject(objInfo);
    }

    /**
     * Удалить объект со сцены
     * @param objToDelete Удаляемый объект
     */
    public removeObject(objToDelete: THREE.Object3D): void {
        if (objToDelete.parent != null) {
            objToDelete.parent.remove(objToDelete);
        } else {
            this.scene3d.remove(objToDelete);
        }
        delete this.allObjectsById[objToDelete.name];
    }

    /** Поместить загруженные объекты на сцену */
    public constructScene(): void {
        // Источники света
        for (let lightInfo of this.infoToCreate.lights) {
            let light = this.createLight(lightInfo);
            let pos: ThreeCoords = lightInfo["position"];
            light.position.set(pos.x, pos.y, pos.z);
            this.scene3d.add(light);
        }

        // Объекты
        for (let objInfo of this.infoToCreate.objects) {
            this.addObjectFromInfo(objInfo);
        }

        // Размеры сцены
        let sceneObject = this.scene3d.getObjectByName("scene");
        if (sceneObject != null) {
            this.dimensions = sceneObject.userData.size;
        }
    }

    // Создать источник света
    private createLight(info: any): THREE.Light {
        let color: string = info["color"];
        let intensity: number = info["intensity"];

        switch (info["type"]) {
            case "ambient":
                return new THREE.AmbientLight(color, intensity);
            case "directional":
                return new THREE.DirectionalLight(color, intensity);
            case "point":
                return new THREE.PointLight(color, intensity);
            case "spot":
                return new THREE.SpotLight(color, intensity);
            default:
                throw new Error(`Invalid light type: ${info["type"]}`);
        }
    }

    constructor(data: any) {
        this.id = data["id"];
        this.skyBoxName = data["skyboxName"];
        this.infoToCreate.lights = <any[]>data["lights"];
        this.infoToCreate.objects = <any[]>data["objects"];

        let lookAt: ThreeCoords = data["cameraTarget"];
        this.cameraTarget = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
        this.cameraDistance = data["distance"];

        this.seats = data["seats"].map(data2Vector);
        this.povs = data["poVs"].map(data => new PointOfView(data));

        this.scene3d = new THREE.Scene();
    }
}

/** Текущая игровая комната */
export class GameRoom {

    // Информация о загруженных с сервера определениях объектов
    private defsDictionary: any;

    /** Идентификатор сеанса */
    public sessionId: string;

    /** Активная сцена */
    public scene: GameScene;

    /** Текущий игрок */
    public player: GamePlayer;

    /** Игрок, чей сейчас ход */
    public activePlayer: GamePlayer;

    /** Ведущий */
    public master: GamePlayer;

    /** Игроки */
    public players: GamePlayer[];

    /** Определения объектов */
    public definitions: GameObjectDefinition[];

    /** Дополнительные свойства */
    public props: any;

    /** Выдать определение объекта */
    public getDefinition(name: string): GameObjectDefinition {
        return <GameObjectDefinition>this.defsDictionary[name];
    }

    /**
     * Поместить новое определение объекта
     * @param newDef Определение объекта
     */
    public putNewDefinition(newDef: GameObjectDefinition): void {
        this.defsDictionary[newDef.name] = newDef;
    }

    /**
     * Выдать игрока по его идентификатору
     * @param id Идентификатор запрашиваемого игрока
     */
    public getPlayerById(id: string): GamePlayer {
        let found = this.players.filter(p => p.id == id);

        if (found.length > 0) {
            return found[0];
        } else {
            return null;
        }
    }

    /**
     * Добавить игрока в игру
     * @param player Добавляемый игрок
     */
    public addPlayer(player: GamePlayer): void {
        if (this.getPlayerById(player.id) == null) {
            this.players.push(player);
        }

        // 3D - объект, представляющий игрока
        let playerObjId = `player${player.seatIndex}`;
        if (this.scene.getObjectById(playerObjId) == null) {
            let newPlayerObj = this.scene.createObject("player", playerObjId);

            // Скрыть аватар текущего игрока
            if (player.id == currentPlayer.id) {
                newPlayerObj.visible = false;
            }

            let pov = this.scene.getPovPoints("Default", player.seatIndex);
            setVector(newPlayerObj.position, pov.position);
            newPlayerObj.lookAt(pov.target);
            this.scene.addObject(newPlayerObj);
        }
    }

    constructor(data: any) {
        this.sessionId = data["sessionId"];
        this.scene = new GameScene(data["roomScene"]);
        this.props = data["propertyBag"];
        
        this.master = new GamePlayer(data["master"]);
        this.players = (<any[]>data["players"]).map(pData => {
            return new GamePlayer(pData);
        });

        // Текущий игрок
        this.player = this.players.filter(p => p.id == data["playerId"])[0];

        this.defsDictionary = {};
        this.definitions = (<Array<any>>data["objectDefinitions"]).map(def => {
            let newObjDefinition = new GameObjectDefinition(def);
            this.defsDictionary[newObjDefinition.name] = newObjDefinition;
            return newObjDefinition;
        });
    }
}

/**
 * Создать сцену из загруженных с сервера данных
 * @param sceneData Загруженные данные сцены
 */
export function createFromData(roomData: any): void {
    loadedRoom = new GameRoom(roomData);
    loadedScene = loadedRoom.scene;
    currentPlayer = loadedRoom.player;
}