define(["require", "exports", "three", "room", "utils", "ui"], function (require, exports, THREE, room_1, utils_1, ui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Варианты управления камерой
    var orbitControls;
    var viewControls;
    var currentCameraControls;
    /** Названия позиций обзора */
    var povNames;
    /** Позиция обзора игрока */
    var playerView = {
        seatIndex: -1,
        povIndex: -1
    };
    /** Проверяет попадание указателя мыши на объект */
    var raycaster;
    /** Объекты, выбор которых возможен */
    var pickableObjects = [];
    /** Текущий выбранный с помощью мыши объект */
    var currentPicked;
    /** Обработчик выбора объекта прохождением указателя мыши */
    var onHoverHandler;
    /** Обработчик щелчка объекта мышью */
    var onPickedHandler;
    /** Тип управления камерой */
    var CameraControlsType;
    (function (CameraControlsType) {
        CameraControlsType[CameraControlsType["Free"] = 0] = "Free";
        CameraControlsType[CameraControlsType["FixedToSeat"] = 1] = "FixedToSeat";
    })(CameraControlsType || (CameraControlsType = {}));
    /** Управление взглядом с помощью мыши */
    var ViewControls = /** @class */ (function () {
        function ViewControls(camera, element) {
            this.camera = camera;
            this.element = element;
            this.target = new THREE.Vector3(0, 0, 0);
            this.object = camera;
            this.enabled = true;
            this.setEventListeners();
        }
        Object.defineProperty(ViewControls.prototype, "normPointerPos", {
            /** Выдать нормализованные координаты указателя мыши */
            get: function () {
                return new THREE.Vector3(this.normX, this.normY, 0);
            },
            enumerable: true,
            configurable: true
        });
        /** Обновить вид */
        ViewControls.prototype.update = function () {
            this.camera.lookAt(this.target);
        };
        /** Установить обработчики событий ввода */
        ViewControls.prototype.setEventListeners = function () {
            var moveHandler = this.mouseMoved.bind(this);
            this.element.addEventListener("mousemove", moveHandler);
        };
        /** Обработчик перемещения мыши */
        ViewControls.prototype.mouseMoved = function (e) {
            var CHANGE_AMOUNT = 5;
            this.normX = (e.x / this.element.clientWidth) * 2 - 1;
            this.normY = -(e.y / this.element.clientHeight) * 2 + 1;
            if (!this.enabled)
                return;
            var horizChange = -this.normX * CHANGE_AMOUNT;
            var vertChange = this.normY * CHANGE_AMOUNT;
            var nPos = this.object.position.clone().normalize();
            var normal = nPos.cross(new THREE.Vector3(0, 1, 0));
            var newX = this.target.x + normal.x * horizChange;
            var newY = this.target.y + vertChange;
            var newZ = this.target.z + normal.z * horizChange;
            this.camera.lookAt(new THREE.Vector3(newX, newY, newZ));
            // Двигать камеру, если расстояние небольшое
            if (this.camera.position.distanceTo(this.target) < 10) {
                var posHorizChange = horizChange / 1.5;
                var posVertChange = vertChange / 2;
                var origPos = this.position;
                this.camera.position.setX(origPos.x + normal.x * posHorizChange);
                this.camera.position.setY(origPos.y + posVertChange);
                this.camera.position.setZ(origPos.z + normal.z * posHorizChange);
            }
        };
        return ViewControls;
    }());
    /**
     * Установить тип управления камерой
     * @param type Новый тип управления
     */
    function setCameraView(type) {
        var isFree = type == CameraControlsType.Free;
        orbitControls.enabled = isFree;
        viewControls.enabled = !isFree;
        currentCameraControls = isFree ? orbitControls : viewControls;
        currentCameraControls.update();
        // Объект игрока
        var playerObj = room_1.loadedScene.getObjectById("player" + playerView.seatIndex);
        if (playerObj != null) {
            playerObj.visible = isFree;
        }
    }
    /** Была нажата клавиша */
    function keyPressed(e) {
        if (e.keyCode == 0x20) {
            var camera = currentCameraControls.object;
            console.log(camera.position);
        }
        else if (e.keyCode >= "1".charCodeAt(0) &&
            e.keyCode <= "9".charCodeAt(0)) {
            var seatNumber = e.keyCode - "0".charCodeAt(0) - 1;
            if (seatNumber < room_1.loadedScene.seats.length) {
                placePlayer(seatNumber, 0);
            }
        }
        else if (e.keyCode == 13) {
            if (currentCameraControls == orbitControls) {
                setCameraView(CameraControlsType.FixedToSeat);
            }
            else {
                setCameraView(CameraControlsType.Free);
                ui_1.showPopup("Выбрана свободная камера");
            }
            currentCameraControls.update();
        }
        else if (e.key == "=") {
            var newPovIdx = (playerView.povIndex + 1) % povNames.length;
            placePlayer(playerView.seatIndex, newPovIdx);
        }
    }
    /** Выдать объект из списка доступных, на которых указывает мышь */
    function getPickedObject() {
        var point = viewControls.normPointerPos.unproject(viewControls.camera);
        var direction = point.sub(viewControls.camera.position).normalize();
        raycaster.set(viewControls.camera.position, direction);
        var results = raycaster.intersectObjects(pickableObjects, true);
        return results.length > 0 ? results[0].object : null;
    }
    /** Был перемещен указатель мыши */
    function mouseMoved(e) {
        if (pickableObjects.length <= 0)
            return;
        var pick = getPickedObject();
        if (pick != currentPicked) {
            if (onHoverHandler != null) {
                onHoverHandler(pick);
            }
        }
        currentPicked = pick;
    }
    /** Была нажата клавиша мыши */
    function mousePressed(e) {
        if (pickableObjects.length <= 0)
            return;
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
    function placePlayer(seatIndex, povIndex) {
        var currentSeat = playerView.seatIndex;
        var currentPov = playerView.povIndex;
        var isChanged = seatIndex != currentSeat || povIndex != currentPov;
        if (isChanged && !utils_1.animations.isAnimating("position")) {
            playerView.seatIndex = seatIndex;
            playerView.povIndex = povIndex;
            // Позиции для анимации
            var prevPos = currentCameraControls.object.position;
            var prevTarget = currentCameraControls.target;
            var newPoints = room_1.loadedScene.getPovPoints(povNames[povIndex], seatIndex);
            var posAnim = new utils_1.VectorAnimation(prevPos, newPoints.position, 2000);
            utils_1.animations.runAnimation(posAnim, "position");
            var targetAnim = new utils_1.VectorAnimation(prevTarget, newPoints.target, 2000);
            utils_1.animations.runAnimation(targetAnim, "target");
            viewControls.position = newPoints.position;
            currentCameraControls.update();
            ui_1.showPopup("POV: " + povNames[povIndex] + ", \u043C\u0435\u0441\u0442\u043E \u2116 " + (seatIndex + 1));
        }
    }
    exports.placePlayer = placePlayer;
    /**
     * Изменить точку обзора игрока
     * @param povName Название точки обзора
     */
    function changePointOfView(povName) {
        var povIndex = povNames.indexOf(povName);
        if (povIndex > -1) {
            placePlayer(playerView.seatIndex, povIndex);
        }
    }
    exports.changePointOfView = changePointOfView;
    /** Обновить состояние */
    function update() {
        currentCameraControls.update();
    }
    exports.update = update;
    /** Ограничить движение камеры сценой */
    function restrictCameraInScene() {
        var camera = viewControls.camera;
        if (currentCameraControls == orbitControls) {
            room_1.loadedScene.restrictPointInScene(camera.position);
            currentCameraControls.update();
        }
    }
    exports.restrictCameraInScene = restrictCameraInScene;
    /**
     * Установить заданные объекты как доступные для выбора мышью
     * @param objects Объекты, выбор которых возможен
     */
    function setPickableObjects(objects) {
        pickableObjects = objects;
        currentPicked = null;
    }
    exports.setPickableObjects = setPickableObjects;
    /**
     * Установить обработчики событий управления
     * @param handlers Обработчики событий
     */
    function setHandlers(handlers) {
        onHoverHandler = handlers.onHovered;
        onPickedHandler = handlers.onPicked;
    }
    exports.setHandlers = setHandlers;
    /**
     * Инициализация управления
     * @param camera Камера, управление которой производится
     * @param element HTML элемент, в который производится рендеринг
     */
    function initialize(camera, element) {
        orbitControls = new THREE.OrbitControls(camera, element);
        viewControls = new ViewControls(camera, element);
        setCameraView(CameraControlsType.FixedToSeat);
        utils_1.setVector(currentCameraControls.target, room_1.loadedScene.cameraTarget);
        window.addEventListener("keydown", keyPressed);
        // Для выбора элементов мышью
        raycaster = new THREE.Raycaster();
        window.addEventListener("mousemove", mouseMoved);
        window.addEventListener("mousedown", mousePressed);
        povNames = room_1.loadedScene.povs.map(function (p) { return p.name; });
    }
    exports.initialize = initialize;
});
//# sourceMappingURL=controls.js.map