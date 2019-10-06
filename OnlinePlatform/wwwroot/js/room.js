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
define(["require", "exports", "three", "utils"], function (require, exports, THREE, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** Точка обзора игроков */
    var PointOfView = /** @class */ (function () {
        function PointOfView(data) {
            /** Позиции игроков */
            this.positions = null;
            /** Позиции обозреваемых объектов */
            this.targets = null;
            this.name = data["name"];
            if (data["positions"] != null) {
                this.positions = data["positions"].map(utils_1.data2Vector);
            }
            if (data["targets"] != null) {
                this.targets = data["targets"].map(utils_1.data2Vector);
            }
        }
        return PointOfView;
    }());
    exports.PointOfView = PointOfView;
    /** Раскладка объектов */
    var ObjectsLayout = /** @class */ (function (_super) {
        __extends(ObjectsLayout, _super);
        function ObjectsLayout(info) {
            var _this = _super.call(this) || this;
            _this.layoutType = info["Type"] || 0;
            _this.spacing = info["Spacing"];
            _this.radius = info["Radius"];
            return _this;
        }
        /**
         * Добавить новый объект
         * @param object Добавляемый объект
         */
        ObjectsLayout.prototype.add = function (object) {
            _super.prototype.add.call(this, object);
            if (this.layoutType == 0) {
                this.arrangeContentsLinear();
            }
            else {
                this.arrangeContentsCircular();
            }
        };
        // Разместить содержимое в горизонтальную линию
        ObjectsLayout.prototype.arrangeContentsLinear = function () {
            var _this = this;
            var totalWidth = this.children.reduce(function (prev, cur) {
                return prev + cur.userData.size.x + _this.spacing;
            }, 0) - this.spacing;
            var objectX = -totalWidth / 2;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                var width = child.userData.size.x;
                child.position.x = objectX + width / 2;
                objectX += width;
                if (child != this.children[this.children.length - 1]) {
                    objectX += this.spacing;
                }
            }
        };
        // Разместить содержимое по окружности
        ObjectsLayout.prototype.arrangeContentsCircular = function () {
            if (this.children.length == 1) {
                this.children[0].position.set(0, 0, 0);
            }
            else if (this.children.length > 1) {
                var sectorAngle = Math.PI * 2 / this.children.length;
                var angle = 0;
                for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    child.position.x = Math.cos(angle) * this.radius;
                    child.position.z = Math.sin(angle) * this.radius;
                    angle += sectorAngle;
                }
            }
        };
        return ObjectsLayout;
    }(THREE.Group));
    exports.ObjectsLayout = ObjectsLayout;
    /** Игрок */
    var GamePlayer = /** @class */ (function () {
        function GamePlayer(data) {
            this.id = data["id"];
            this.name = data["name"];
            this.seatIndex = data["seatIndex"];
            this.props = data["propertyBag"];
        }
        return GamePlayer;
    }());
    exports.GamePlayer = GamePlayer;
    /** Определение игрового объекта */
    var GameObjectDefinition = /** @class */ (function () {
        function GameObjectDefinition(data) {
            this.name = data["name"];
            this.loadable = data["loadable"];
            var dims = data["dimensions"];
            if (dims != null) {
                this.dimensions = new THREE.Vector3(dims.x, dims.y, dims.z);
            }
            this.isLayout = data["groupName"] == "_layout";
            this.params = data["params"];
        }
        Object.defineProperty(GameObjectDefinition.prototype, "needLoading", {
            /** Нужна ли загрузка с сервера */
            get: function () {
                return !this.isLayout && this.loadable;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Создать трехмерный объект для сцены
         * @param info Информация о создаваемом объекте
         */
        GameObjectDefinition.prototype.createObject = function (info) {
            var newObject = !this.isLayout ? this.geometry.clone()
                : new ObjectsLayout(this.params);
            newObject.name = info["id"];
            var pos = info["position"];
            newObject.position.set(pos.x, pos.y, pos.z);
            var rot = info["rotation"];
            newObject.rotation.set(rot.x, rot.y, rot.z);
            newObject.userData.size = this.dimensions;
            return newObject;
        };
        /** Создать копию объекта */
        GameObjectDefinition.prototype.clone = function () {
            var copyData = {
                name: this.name,
                dimensions: this.dimensions,
                groupName: this.isLayout ? "_layout" : "other",
                params: this.params
            };
            return new GameObjectDefinition(copyData);
        };
        return GameObjectDefinition;
    }());
    exports.GameObjectDefinition = GameObjectDefinition;
    /** Игровая сцена */
    var GameScene = /** @class */ (function () {
        function GameScene(data) {
            // Информация о загруженных с сервера объектах
            this.infoToCreate = {
                objects: new Array(),
                lights: new Array()
            };
            // Все объекты сцены
            this.allObjectsById = {};
            this.id = data["id"];
            this.skyBoxName = data["skyboxName"];
            this.infoToCreate.lights = data["lights"];
            this.infoToCreate.objects = data["objects"];
            var lookAt = data["cameraTarget"];
            this.cameraTarget = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
            this.cameraDistance = data["distance"];
            this.seats = data["seats"].map(utils_1.data2Vector);
            this.povs = data["poVs"].map(function (data) { return new PointOfView(data); });
            this.scene3d = new THREE.Scene();
        }
        /**
         * Выдать точки обзора для указанного места за столом
         * @param name Название позиции обзора
         * @param seat Индекс места за столом
         */
        GameScene.prototype.getPovPoints = function (name, seat) {
            var found = this.povs.filter(function (p) { return p.name == name; });
            if (found.length > 0) {
                var pov = found[0];
                return {
                    position: pov.positions ? pov.positions[seat] : this.seats[seat],
                    target: pov.targets ? pov.targets[seat] : this.cameraTarget
                };
            }
            else {
                throw new Error("POV '" + name + "' not found!");
            }
        };
        /**
         * Ограничить координаты точки пределами сцены
         * @param point Точка, координаты которой нужно ограничить
         */
        GameScene.prototype.restrictPointInScene = function (point) {
            var MARGIN = 1;
            if (this.dimensions == null)
                return;
            var halfX = this.dimensions.x / 2 - MARGIN;
            var halfZ = this.dimensions.z / 2 - MARGIN;
            var height = this.dimensions.y - MARGIN;
            // Ось X
            if (point.x < -halfX) {
                point.x = -halfX + MARGIN;
            }
            if (point.x > halfX) {
                point.x = halfX - MARGIN;
            }
            // Ось Y
            if (point.y < MARGIN) {
                point.y = MARGIN;
            }
            if (point.y > height) {
                point.y = height - MARGIN;
            }
            // Ось Z
            if (point.z < -halfZ) {
                point.z = -halfZ + MARGIN;
            }
            if (point.z > halfZ) {
                point.z = halfZ - MARGIN;
            }
        };
        /**
         * Выдать объект сцены по его идентификатору
         * @param id Идентификатор объекта
         */
        GameScene.prototype.getObjectById = function (id) {
            return this.allObjectsById[id];
        };
        /**
         * Добавить объект на сцену
         * @param newObject Добавляемый объект
         */
        GameScene.prototype.addObject = function (newObject, group) {
            var parent = group != null ? group : this.scene3d;
            parent.add(newObject);
            this.allObjectsById[newObject.name] = newObject;
        };
        /**
         * Добавить объект, созданный из данных, на сцену
         * @param objInfo Данные добавляемого объекта
         */
        GameScene.prototype.addObjectFromInfo = function (objInfo) {
            var definition = exports.loadedRoom.getDefinition(objInfo["name"]);
            var obj3d = definition.createObject(objInfo);
            if (objInfo["layoutId"] == null) {
                this.addObject(obj3d);
            }
            else {
                var layout = this.scene3d.getObjectByName(objInfo["layoutId"]);
                this.addObject(obj3d, layout);
            }
            this.allObjectsById[obj3d.name] = obj3d;
            return obj3d;
        };
        /**
         * Создать новый трехмерный объект с параметрами по умолчанию
         * @param name Имя типа объекта
         * @param id Идентификатор объекта
         */
        GameScene.prototype.createObject = function (name, objId) {
            var objInfo = {
                id: objId,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            };
            return exports.loadedRoom.getDefinition(name).createObject(objInfo);
        };
        /**
         * Удалить объект со сцены
         * @param objToDelete Удаляемый объект
         */
        GameScene.prototype.removeObject = function (objToDelete) {
            if (objToDelete.parent != null) {
                objToDelete.parent.remove(objToDelete);
            }
            else {
                this.scene3d.remove(objToDelete);
            }
            delete this.allObjectsById[objToDelete.name];
        };
        /** Поместить загруженные объекты на сцену */
        GameScene.prototype.constructScene = function () {
            // Источники света
            for (var _i = 0, _a = this.infoToCreate.lights; _i < _a.length; _i++) {
                var lightInfo = _a[_i];
                var light = this.createLight(lightInfo);
                var pos = lightInfo["position"];
                light.position.set(pos.x, pos.y, pos.z);
                this.scene3d.add(light);
            }
            // Объекты
            for (var _b = 0, _c = this.infoToCreate.objects; _b < _c.length; _b++) {
                var objInfo = _c[_b];
                this.addObjectFromInfo(objInfo);
            }
            // Размеры сцены
            var sceneObject = this.scene3d.getObjectByName("scene");
            if (sceneObject != null) {
                this.dimensions = sceneObject.userData.size;
            }
        };
        // Создать источник света
        GameScene.prototype.createLight = function (info) {
            var color = info["color"];
            var intensity = info["intensity"];
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
                    throw new Error("Invalid light type: " + info["type"]);
            }
        };
        return GameScene;
    }());
    exports.GameScene = GameScene;
    /** Текущая игровая комната */
    var GameRoom = /** @class */ (function () {
        function GameRoom(data) {
            var _this = this;
            this.sessionId = data["sessionId"];
            this.scene = new GameScene(data["roomScene"]);
            this.props = data["propertyBag"];
            this.master = new GamePlayer(data["master"]);
            this.players = data["players"].map(function (pData) {
                return new GamePlayer(pData);
            });
            // Текущий игрок
            this.player = this.players.filter(function (p) { return p.id == data["playerId"]; })[0];
            this.defsDictionary = {};
            this.definitions = data["objectDefinitions"].map(function (def) {
                var newObjDefinition = new GameObjectDefinition(def);
                _this.defsDictionary[newObjDefinition.name] = newObjDefinition;
                return newObjDefinition;
            });
        }
        /** Выдать определение объекта */
        GameRoom.prototype.getDefinition = function (name) {
            return this.defsDictionary[name];
        };
        /**
         * Поместить новое определение объекта
         * @param newDef Определение объекта
         */
        GameRoom.prototype.putNewDefinition = function (newDef) {
            this.defsDictionary[newDef.name] = newDef;
        };
        /**
         * Выдать игрока по его идентификатору
         * @param id Идентификатор запрашиваемого игрока
         */
        GameRoom.prototype.getPlayerById = function (id) {
            var found = this.players.filter(function (p) { return p.id == id; });
            if (found.length > 0) {
                return found[0];
            }
            else {
                return null;
            }
        };
        /**
         * Добавить игрока в игру
         * @param player Добавляемый игрок
         */
        GameRoom.prototype.addPlayer = function (player) {
            if (this.getPlayerById(player.id) == null) {
                this.players.push(player);
            }
            // 3D - объект, представляющий игрока
            var playerObjId = "player" + player.seatIndex;
            if (this.scene.getObjectById(playerObjId) == null) {
                var newPlayerObj = this.scene.createObject("player", playerObjId);
                // Скрыть аватар текущего игрока
                if (player.id == exports.currentPlayer.id) {
                    newPlayerObj.visible = false;
                }
                var pov = this.scene.getPovPoints("Default", player.seatIndex);
                utils_1.setVector(newPlayerObj.position, pov.position);
                newPlayerObj.lookAt(pov.target);
                this.scene.addObject(newPlayerObj);
            }
        };
        return GameRoom;
    }());
    exports.GameRoom = GameRoom;
    /**
     * Создать сцену из загруженных с сервера данных
     * @param sceneData Загруженные данные сцены
     */
    function createFromData(roomData) {
        exports.loadedRoom = new GameRoom(roomData);
        exports.loadedScene = exports.loadedRoom.scene;
        exports.currentPlayer = exports.loadedRoom.player;
    }
    exports.createFromData = createFromData;
});
//# sourceMappingURL=room.js.map