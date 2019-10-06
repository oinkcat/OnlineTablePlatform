import * as THREE from "three";
import { loadedScene } from "room";
import { setVector, animations, VectorAnimation } from "utils";
import { showPopup } from "ui";

/** Обратный вызов выбора объекта мышью */
type PickCallback = (obj: THREE.Object3D) => void;

// Варианты управления камерой
var orbitControls: THREE.OrbitControls;
var viewControls: ViewControls;

var currentCameraControls: THREE.OrbitControls | ViewControls;

/** Названия позиций обзора */
var povNames: string[];

/** Позиция обзора игрока */
var playerView = {
    seatIndex: -1,
    povIndex: -1
};

/** Проверяет попадание указателя мыши на объект */
var raycaster: THREE.Raycaster;

/** Объекты, выбор которых возможен */
var pickableObjects: THREE.Object3D[] = [];

/** Текущий выбранный с помощью мыши объект */
var currentPicked: THREE.Object3D;

/** Обработчик выбора объекта прохождением указателя мыши */
var onHoverHandler: PickCallback;

/** Обработчик щелчка объекта мышью */
var onPickedHandler: PickCallback;

/** Тип управления камерой */
enum CameraControlsType {
    Free,
    FixedToSeat
}

/** Обработчики событий управления */
export interface IControlHandlers {
    onHovered: (obj: THREE.Object3D) => void;
    onPicked: (obj: THREE.Object3D) => void;
}

/** Управление взглядом с помощью мыши */
class ViewControls {

    private normX: number;
    private normY: number;

    public enabled: boolean;

    public position: THREE.Vector3;

    public target: THREE.Vector3;

    public object: THREE.Object3D;

    /** Выдать нормализованные координаты указателя мыши */
    public get normPointerPos(): THREE.Vector3 {
        return new THREE.Vector3(this.normX, this.normY, 0);
    }

    /** Обновить вид */
    public update() {
        this.camera.lookAt(this.target);
    }

    /** Установить обработчики событий ввода */
    private setEventListeners(): void {
        let moveHandler = this.mouseMoved.bind(this);
        this.element.addEventListener("mousemove", moveHandler);
    }

    /** Обработчик перемещения мыши */
    private mouseMoved(e: MouseEvent): void {
        const CHANGE_AMOUNT = 5;

        this.normX = (e.x / this.element.clientWidth) * 2 - 1;
        this.normY = -(e.y / this.element.clientHeight) * 2 + 1;

        if (!this.enabled) return;
        
        let horizChange = -this.normX * CHANGE_AMOUNT;
        let vertChange = this.normY * CHANGE_AMOUNT;

        let nPos = this.object.position.clone().normalize();
        let normal = nPos.cross(new THREE.Vector3(0, 1, 0));
        
        let newX = this.target.x + normal.x * horizChange;
        let newY = this.target.y + vertChange;
        let newZ = this.target.z + normal.z * horizChange;

        this.camera.lookAt(new THREE.Vector3(newX, newY, newZ));

        // Двигать камеру, если расстояние небольшое
        if (this.camera.position.distanceTo(this.target) < 10) {
            let posHorizChange = horizChange / 1.5;
            let posVertChange = vertChange / 2;
            let origPos = this.position;
            this.camera.position.setX(origPos.x + normal.x * posHorizChange);
            this.camera.position.setY(origPos.y + posVertChange);
            this.camera.position.setZ(origPos.z + normal.z * posHorizChange);
        }
    }

    constructor(public camera: THREE.Camera, public element: HTMLElement) {
        this.target = new THREE.Vector3(0, 0, 0);
        this.object = camera;
        this.enabled = true;

        this.setEventListeners();
    }
}

/**
 * Установить тип управления камерой
 * @param type Новый тип управления
 */
function setCameraView(type: CameraControlsType): void {
    let isFree = type == CameraControlsType.Free;

    orbitControls.enabled = isFree;
    viewControls.enabled = !isFree;
    currentCameraControls = isFree ? orbitControls : viewControls;
    currentCameraControls.update();

    // Объект игрока
    let playerObj = loadedScene.getObjectById(`player${playerView.seatIndex}`);
    if (playerObj != null) {
        playerObj.visible = isFree;
    }
}

/** Была нажата клавиша */
function keyPressed(e: KeyboardEvent): void {
    if (e.keyCode == 0x20) {
        let camera = currentCameraControls.object;
        console.log(camera.position);
    } else if (e.keyCode >= "1".charCodeAt(0) &&
        e.keyCode <= "9".charCodeAt(0)) {

        let seatNumber = e.keyCode - "0".charCodeAt(0) - 1;
        if (seatNumber < loadedScene.seats.length) {
            placePlayer(seatNumber, 0);
        }
    } else if (e.keyCode == 13) {
        if (currentCameraControls == orbitControls) {
            setCameraView(CameraControlsType.FixedToSeat);
        } else {
            setCameraView(CameraControlsType.Free);
            showPopup("Выбрана свободная камера");
        }
        currentCameraControls.update();
    } else if (e.key == "=") {
        let newPovIdx = (playerView.povIndex + 1) % povNames.length;
        placePlayer(playerView.seatIndex, newPovIdx);
    }
}

/** Выдать объект из списка доступных, на которых указывает мышь */
function getPickedObject(): THREE.Object3D {
    let point = viewControls.normPointerPos.unproject(viewControls.camera);
    let direction = point.sub(viewControls.camera.position).normalize();

    raycaster.set(viewControls.camera.position, direction);
    
    let results = raycaster.intersectObjects(pickableObjects, true);
    
    return results.length > 0 ? results[0].object : null;
}

/** Был перемещен указатель мыши */
function mouseMoved(e: MouseEvent) {
    if (pickableObjects.length <= 0) return;

    let pick = getPickedObject();

    if (pick != currentPicked) {
        if (onHoverHandler != null) {
            onHoverHandler(pick);
        }
    }

    currentPicked = pick;
}

/** Была нажата клавиша мыши */
function mousePressed(e: MouseEvent) {
    if (pickableObjects.length <= 0) return;

    if (e.button == 0) {
        currentPicked = getPickedObject();

        if (onPickedHandler != null) {
            onPickedHandler(currentPicked);
        }
    }
}

/**
 * Поместить игрока на место за столом
 * @param seatIndex Индекс места
 * @param povIndex Индекс позиции обзора
 */
export function placePlayer(seatIndex: number, povIndex: number): void {
    let currentSeat = playerView.seatIndex;
    let currentPov = playerView.povIndex;
    let isChanged = seatIndex != currentSeat || povIndex != currentPov;

    if (isChanged && !animations.isAnimating("position")) {
        playerView.seatIndex = seatIndex;
        playerView.povIndex = povIndex;

        // Позиции для анимации
        let prevPos = currentCameraControls.object.position;
        let prevTarget = currentCameraControls.target;
        let newPoints = loadedScene.getPovPoints(povNames[povIndex], seatIndex);

        let posAnim = new VectorAnimation(prevPos, newPoints.position, 2000);
        animations.runAnimation(posAnim, "position");
        let targetAnim = new VectorAnimation(prevTarget, newPoints.target, 2000);
        animations.runAnimation(targetAnim, "target");

        viewControls.position = newPoints.position;

        currentCameraControls.update();
        showPopup(`POV: ${povNames[povIndex]}, место № ${seatIndex + 1}`);
    }
}

/**
 * Изменить точку обзора игрока
 * @param povName Название точки обзора
 */
export function changePointOfView(povName: string): void {
    let povIndex = povNames.indexOf(povName);

    if (povIndex > -1) {
        placePlayer(playerView.seatIndex, povIndex);
    }
}

/** Обновить состояние */
export function update(): void {
    currentCameraControls.update();
} 

/** Ограничить движение камеры сценой */
export function restrictCameraInScene(): void {
    let camera = viewControls.camera;

    if (currentCameraControls == orbitControls) {
        loadedScene.restrictPointInScene(camera.position);
        currentCameraControls.update();
    }
}

/**
 * Установить заданные объекты как доступные для выбора мышью
 * @param objects Объекты, выбор которых возможен
 */
export function setPickableObjects(objects: THREE.Object3D[]): void {
    pickableObjects = objects;
    currentPicked = null;
}

/**
 * Установить обработчики событий управления
 * @param handlers Обработчики событий
 */
export function setHandlers(handlers: IControlHandlers): void {
    onHoverHandler = handlers.onHovered;
    onPickedHandler = handlers.onPicked;
}

/**
 * Инициализация управления
 * @param camera Камера, управление которой производится
 * @param element HTML элемент, в который производится рендеринг
 */
export function initialize(camera: THREE.Camera, element: HTMLElement): void {
    orbitControls = new THREE.OrbitControls(camera, element);
    viewControls = new ViewControls(camera, element);
    setCameraView(CameraControlsType.FixedToSeat);

    setVector(currentCameraControls.target, loadedScene.cameraTarget);

    window.addEventListener("keydown", keyPressed);

    // Для выбора элементов мышью
    raycaster = new THREE.Raycaster();

    window.addEventListener("mousemove", mouseMoved);
    window.addEventListener("mousedown", mousePressed);

    povNames = loadedScene.povs.map(p => p.name);
}