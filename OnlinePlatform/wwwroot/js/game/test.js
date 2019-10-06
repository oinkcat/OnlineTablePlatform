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
define(["require", "exports", "platform", "controls", "ui", "three", "resources", "utils", "room", "connection"], function (require, exports, Platform, Controls, UI, THREE, resources_1, utils_1, room_1, connection_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** Генерирует изображения карт */
    var CardsRenderer = /** @class */ (function () {
        function CardsRenderer(info) {
            this.info = info;
            this.WIDTH = 512;
            this.HEIGHT = 768;
            this.CANVAS_HEIGHT = 1024;
            this.TITLE_BASELINE = 150;
            this.IMAGE_POS = 350;
            this.TEXT_BASELINE = 550;
            this.TEXT_SPACING = 32;
            var canvasElem = document.getElementById("textureCanvas");
            this.canvas = canvasElem;
            this.ctx = this.canvas.getContext("2d");
        }
        /** Начать подготовку текстур карт */
        CardsRenderer.prototype.renderTextures = function () {
            this.prepareCanvas();
            var back = resources_1.getResourceById("card_back");
            this.cardBack = back.image;
            this.kindImages = [1, 2, 3, 4].map(function (n) {
                var tex = resources_1.getResourceById("k" + n);
                return tex.image;
            });
            var renderFunc = this.renderCardTexture.bind(this);
            this.renderedTextures = this.info.map(renderFunc);
        };
        // Отрисовать изображение карты
        CardsRenderer.prototype.renderCardTexture = function (info) {
            // Фон
            this.ctx.drawImage(this.cardBack, 0, 0);
            var centerX = this.WIDTH / 2;
            // "Масть"
            var kindImg = this.kindImages[info.kind];
            var kX = centerX - kindImg.width / 2;
            var kY = this.IMAGE_POS - kindImg.height / 2;
            this.ctx.drawImage(kindImg, kX, kY);
            // Название
            this.ctx.textAlign = "center";
            this.ctx.font = "48px Tahoma";
            var maxWidth = this.WIDTH - 25;
            this.ctx.fillText(info.title, centerX, this.TITLE_BASELINE, maxWidth);
            // Текст карты
            var textLines = info.text.split("__nl__");
            var textY = this.TEXT_BASELINE;
            this.ctx.font = "24px Tahoma";
            for (var i in textLines) {
                this.ctx.fillText(textLines[i], centerX, textY);
                textY += this.TEXT_SPACING;
            }
            // Текущее нарисованное изображение
            var currentImage = new Image();
            currentImage.id = info.title;
            currentImage.src = this.canvas.toDataURL();
            return new THREE.CanvasTexture(currentImage);
        };
        // Подготовить холст для рисования
        CardsRenderer.prototype.prepareCanvas = function () {
            this.canvas.setAttribute("width", this.WIDTH.toString());
            this.canvas.setAttribute("height", this.CANVAS_HEIGHT.toString());
        };
        return CardsRenderer;
    }());
    // Запрос карты с сервера
    var CardRequest = /** @class */ (function (_super) {
        __extends(CardRequest, _super);
        function CardRequest() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            /** Определитель типа */
            _this.tag = "card";
            return _this;
        }
        return CardRequest;
    }(connection_1.GameMessage));
    // Передача объекта другому игроку
    var GiveObject = /** @class */ (function (_super) {
        __extends(GiveObject, _super);
        function GiveObject(objId, sectNumber) {
            var _this = _super.call(this) || this;
            _this.objId = objId;
            _this.sectNumber = sectNumber;
            /** Определитель типа */
            _this.tag = "give_object";
            return _this;
        }
        return GiveObject;
    }(connection_1.GameMessage));
    var sectorSelectors = [];
    /** Выбранный объект */
    var selectedObject;
    /** Номер места текущего игрока */
    var seatNumber;
    var playerPickableObjects;
    // Показать карту
    function showCard(card) {
        var cardDlg = new UI.Dialog("#testDialog");
        var cardImage = cardDlg.element.querySelector("img");
        //cardImage.src = card.material[1].map.image.src;
        cardDlg.open();
    }
    // Анимировать кристалл
    function animateGem(gem) {
        if (utils_1.animations.isAnimating(gem.name)) {
            return;
        }
        var origPos = gem.position.clone();
        var timeLeft = 1000;
        var step = function (tick) {
            var dy = Math.abs(Math.sin(tick / 20));
            gem.position.setY(origPos.y + dy);
            gem.rotateY(0.02);
            timeLeft--;
        };
        var isDone = function () {
            var ended = timeLeft <= 0;
            if (ended) {
                gem.position.setY(origPos.y);
            }
            return ended;
        };
        var gemAnim = new utils_1.CustomAnimation(step, isDone);
        utils_1.animations.runAnimation(gemAnim, gem.name);
    }
    // На объект сцены наведен указатель мыши
    function objectHovered(obj) {
        UI.togglePickCursor(obj != null);
    }
    // Объект сцены щелкнут мышью
    function objectPicked(obj) {
        if (obj == null) {
            return;
        }
        if (obj.name.indexOf("$card") > -1) {
            showCard(obj);
        }
        else if (obj.name.indexOf("$gem") > -1) {
            selectedObject = obj;
            animateGem(obj);
            setTimeout(promptForSector, 500);
        }
        else if (obj.name.indexOf("sector") > -1) {
            var sectorNumber = parseInt(obj.name.charAt(obj.name.length - 1));
            moveGemToScore(selectedObject, sectorNumber);
            sectorSelected();
        }
        else if (obj.name == "td") {
            // Взять карту из колоды
            var cardRequest = new CardRequest().ofCurrentPlayer();
            connection_1.sendMessage(cardRequest);
        }
    }
    /**
     * Переместить кристалл в кружок
     * @param gem Перемещаемый кристалл
     * @param targetNumber Номер кружка
     */
    function moveGemToScore(gem, targetNumber) {
        var giveRequest = new GiveObject(gem.name, targetNumber);
        connection_1.sendMessage(giveRequest.ofCurrentPlayer());
    }
    /** Запросить сектор */
    function promptForSector() {
        Controls.changePointOfView("Table");
        // Отобразить селекторы секторов и сделать их выбираемыми
        var playerSectorId = "sector_" + seatNumber;
        sectorSelectors.forEach(function (s) {
            if (s.name != playerSectorId) {
                s.visible = true;
            }
        });
        Controls.setPickableObjects(sectorSelectors);
        UI.showMessage("Выберите сектор для передачи кристалла");
    }
    /** Сектор был выбран */
    function sectorSelected() {
        UI.hideMessage();
        sectorSelectors.forEach(function (s) { return s.visible = false; });
        setTimeout(function () { return Controls.changePointOfView("Default"); }, 1000);
    }
    /** Инициализация элементов выбора сектора */
    function initializeSectors() {
        for (var i = 1; i <= 7; i++) {
            var aSector = room_1.loadedScene.getObjectById("sector_" + i);
            sectorSelectors.push(aSector);
            var material = aSector.material[0];
            material.transparent = true;
            material.opacity = 0.2;
            aSector.renderOrder = 1;
            aSector.visible = false;
        }
    }
    /** Сделать объекты игрока доступными для выбора */
    function setPickablePlayerObjects() {
        playerPickableObjects = [
            // Колода карт
            room_1.loadedScene.getObjectById("td")
        ];
    }
    /** Подготовить изображения карт */
    function renderCards() {
        var cardsInfo = resources_1.getResourceById("cards_def");
        var renderer = new CardsRenderer(cardsInfo.object);
        renderer.renderTextures();
        // Поместить новые определения объектов
        var cardDef = room_1.loadedRoom.getDefinition("card");
        var idx = 0;
        for (var _i = 0, _a = renderer.renderedTextures; _i < _a.length; _i++) {
            var cardTex = _a[_i];
            var newCardDef = cardDef.clone();
            newCardDef.name = "card" + idx;
            var cardMesh = cardDef.geometry.clone(true);
            var frontMaterial = cardMesh.material[0].clone();
            frontMaterial.map = cardTex;
            cardMesh.material = [frontMaterial, cardMesh.material[1]];
            newCardDef.geometry = cardMesh;
            room_1.loadedRoom.putNewDefinition(newCardDef);
            idx++;
        }
    }
    /**
     * Обработать игровое сообщение
     * @param message Сообщение игры
     */
    function gameMessageReceived(message) {
    }
    /** Инициализация ресурсов */
    function initializeResources() {
        // Сгенерировать изображения карт
        UI.setLoadingMsg("Генерация карт");
        renderCards();
    }
    exports.initializeResources = initializeResources;
    /** Инициализация игры */
    function initialize() {
        console.log("ТЕСТ: инициализация");
        seatNumber = room_1.currentPlayer.seatIndex + 1;
        // Обработчики событий
        var handlers = {
            control: {
                onHovered: objectHovered,
                onPicked: objectPicked
            },
            onCustomMessage: gameMessageReceived
        };
        Platform.setEventHandlers(handlers);
        // Инициализация секторов
        initializeSectors();
        // Тестовое размещение колоды
        var testDeckLayout = room_1.loadedScene.getObjectById("score_" + seatNumber);
        var deck = room_1.loadedScene.createObject("card_deck", "td");
        room_1.loadedScene.addObject(deck, testDeckLayout);
        // Тестирование выбора элементов
        setPickablePlayerObjects();
    }
    exports.initialize = initialize;
    /** Обновление состояния */
    function update() {
    }
    exports.update = update;
    /**
     * Очередность хода игроков изменена
     * @param player Игрок, чей ход сейчас
     */
    function turnChanged(player) {
    }
    exports.turnChanged = turnChanged;
    /**
     * Изменено свойство сцены
     * @param key Название свойства
     * @param value Значение свойства
     */
    function propertyChanged(key, value) {
        if (key == "stage" && value == "select_sector") {
            promptForSector();
        }
    }
    exports.propertyChanged = propertyChanged;
    /**
     * Новый объект был добавлен на сцену
     * @param object Добавленный объект
     */
    function objectAdded(object) {
        var parentId = object.parent != null ? object.parent.name : null;
        if (parentId != null) {
            var addingSeat = parseInt(parentId.split("_")[1]);
            if (addingSeat == seatNumber && object.name.indexOf("$gem") > -1) {
                playerPickableObjects.push(object);
                Controls.setPickableObjects(playerPickableObjects);
            }
        }
    }
    exports.objectAdded = objectAdded;
    /**
     * Объект был удален со сцены
     * @param object Удаленный объект
     */
    function objectRemoved(object) {
    }
    exports.objectRemoved = objectRemoved;
});
//# sourceMappingURL=test.js.map