import * as Platform from "platform";
import * as Controls from "controls";
import * as UI from "ui";
import * as Resources from "resources";
import * as THREE from "three";
import { getResourceById } from "resources";
import { animations, CustomAnimation } from "utils";
import { GamePlayer, loadedScene, currentPlayer, loadedRoom } from "room";
import { Object3D, MeshLambertMaterial } from "three";
import { GameMessage, sendMessage } from "connection";

// Тестовый игровой модуль

/** Информация о карте */
interface ICardInfo {
    title: string;
    text: string;
    kind: number;
}

/** Генерирует изображения карт */
class CardsRenderer {

    private readonly WIDTH: number = 512;
    private readonly HEIGHT: number = 768;
    private readonly CANVAS_HEIGHT: number = 1024;

    private readonly TITLE_BASELINE: number = 150;
    private readonly IMAGE_POS: number = 350;
    private readonly TEXT_BASELINE: number = 550;
    private readonly TEXT_SPACING: number = 32;

    // Холст для рендера
    private canvas: HTMLCanvasElement;

    // Контекст рисования
    private ctx: CanvasRenderingContext2D;

    // Фон изображения карты
    private cardBack: HTMLImageElement;

    // Изображения для разных мастей
    private kindImages: Array<HTMLImageElement>;

    /** Отрендеренные текстуры */
    public renderedTextures: Array<THREE.Texture>;

    /** Начать подготовку текстур карт */
    public renderTextures(): void {
        this.prepareCanvas();

        let back: Resources.TextureResource = getResourceById("card_back");
        this.cardBack = back.image;

        this.kindImages = [1, 2, 3, 4].map(n => {
            let tex: Resources.TextureResource = getResourceById(`k${n}`);
            return tex.image;
        });

        let renderFunc = this.renderCardTexture.bind(this);
        this.renderedTextures = this.info.map(renderFunc);
    }

    // Отрисовать изображение карты
    private renderCardTexture(info: ICardInfo): THREE.Texture {
        // Фон
        this.ctx.drawImage(this.cardBack, 0, 0);

        let centerX = this.WIDTH / 2;

        // "Масть"
        let kindImg = this.kindImages[info.kind];
        let kX = centerX - kindImg.width / 2;
        let kY = this.IMAGE_POS - kindImg.height / 2;
        this.ctx.drawImage(kindImg, kX, kY);

        // Название
        this.ctx.textAlign = "center";
        this.ctx.font = "48px Tahoma";
        let maxWidth = this.WIDTH - 25;
        this.ctx.fillText(info.title, centerX, this.TITLE_BASELINE, maxWidth);

        // Текст карты
        let textLines = info.text.split("__nl__");
        let textY = this.TEXT_BASELINE;
        this.ctx.font = "24px Tahoma";

        for (let i in textLines) {
            this.ctx.fillText(textLines[i], centerX, textY);
            textY += this.TEXT_SPACING;
        }

        // Текущее нарисованное изображение
        let currentImage = new Image();
        currentImage.id = info.title;
        currentImage.src = this.canvas.toDataURL();

        return new THREE.CanvasTexture(currentImage);
    }

    // Подготовить холст для рисования
    private prepareCanvas(): void {
        this.canvas.setAttribute("width", this.WIDTH.toString());
        this.canvas.setAttribute("height", this.CANVAS_HEIGHT.toString());
    }

    constructor(private info: ICardInfo[]) {
        let canvasElem = document.getElementById("textureCanvas");
        this.canvas = <HTMLCanvasElement>canvasElem;
        this.ctx = this.canvas.getContext("2d");
    }
}

// Запрос карты с сервера
class CardRequest extends GameMessage {

    /** Определитель типа */
    public tag: string = "card";
}

// Передача объекта другому игроку
class GiveObject extends GameMessage {

    /** Определитель типа */
    public tag: string = "give_object";

    constructor(public objId: string, public sectNumber: number) {
        super();
    }
}

var sectorSelectors: Array<THREE.Mesh> = [];

/** Выбранный объект */
var selectedObject: THREE.Object3D;

/** Номер места текущего игрока */
var seatNumber: number;

var playerPickableObjects: THREE.Mesh[];

// Показать карту
function showCard(card: THREE.Mesh): void {
    let cardDlg = new UI.Dialog("#testDialog");
    let cardImage = cardDlg.element.querySelector("img");

    //cardImage.src = card.material[1].map.image.src;
    cardDlg.open();
}

// Анимировать кристалл
function animateGem(gem: THREE.Mesh): void {
    if (animations.isAnimating(gem.name)) { return; }

    let origPos = gem.position.clone();
    let timeLeft = 1000;

    let step = (tick: number) => {
        let dy = Math.abs(Math.sin(tick / 20));
        gem.position.setY(origPos.y + dy);
        gem.rotateY(0.02);
        timeLeft--;
    };

    let isDone = () => {
        let ended = timeLeft <= 0;
        if (ended) {
            gem.position.setY(origPos.y);
        }

        return ended;
    }

    let gemAnim = new CustomAnimation(step, isDone);
    animations.runAnimation(gemAnim, gem.name);
}

// На объект сцены наведен указатель мыши
function objectHovered(obj: THREE.Object3D): void {
    UI.togglePickCursor(obj != null);
}

// Объект сцены щелкнут мышью
function objectPicked(obj: THREE.Object3D): void {
    if (obj == null) { return; }

    if (obj.name.indexOf("$card") > -1) {
        showCard(<THREE.Mesh>obj);
    } else if (obj.name.indexOf("$gem") > -1) {
        selectedObject = obj;
        animateGem(<THREE.Mesh>obj);
        setTimeout(promptForSector, 500);
    } else if (obj.name.indexOf("sector") > -1) {
        let sectorNumber = parseInt(obj.name.charAt(obj.name.length - 1));
        moveGemToScore(selectedObject, sectorNumber);
        sectorSelected();
    } else if (obj.name == "td") {
        // Взять карту из колоды
        let cardRequest = new CardRequest().ofCurrentPlayer();
        sendMessage(cardRequest);
    }
}

/**
 * Переместить кристалл в кружок
 * @param gem Перемещаемый кристалл
 * @param targetNumber Номер кружка
 */
function moveGemToScore(gem: Object3D, targetNumber: number): void {
    let giveRequest = new GiveObject(gem.name, targetNumber);
    sendMessage(giveRequest.ofCurrentPlayer());
}

/** Запросить сектор */
function promptForSector(): void {
    Controls.changePointOfView("Table");

    // Отобразить селекторы секторов и сделать их выбираемыми
    let playerSectorId = `sector_${seatNumber}`;

    sectorSelectors.forEach(s => {
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
    sectorSelectors.forEach(s => s.visible = false);

    setTimeout(() => Controls.changePointOfView("Default"), 1000);
}

/** Инициализация элементов выбора сектора */
function initializeSectors(): void {
    for (let i = 1; i <= 7; i++) {
        let aSector = loadedScene.getObjectById<THREE.Mesh>(`sector_${i}`);
        sectorSelectors.push(aSector);
        let material = <THREE.Material>aSector.material[0];
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
        loadedScene.getObjectById("td")
    ];
}

/** Подготовить изображения карт */
function renderCards(): void {
    let cardsInfo: Resources.CustomResource = getResourceById("cards_def");
    let renderer = new CardsRenderer(<ICardInfo[]>cardsInfo.object);
    renderer.renderTextures();

    // Поместить новые определения объектов
    let cardDef = loadedRoom.getDefinition("card");
    let idx = 0;

    for (let cardTex of renderer.renderedTextures) {
        let newCardDef = cardDef.clone();
        newCardDef.name = `card${idx}`;
        
        let cardMesh: THREE.Mesh = <THREE.Mesh>cardDef.geometry.clone(true);
        let frontMaterial = cardMesh.material[0].clone();
        (<THREE.MeshLambertMaterial>frontMaterial).map = cardTex;
        cardMesh.material = [frontMaterial, cardMesh.material[1]];

        newCardDef.geometry = cardMesh;
        loadedRoom.putNewDefinition(newCardDef);

        idx++;
    }
}

/**
 * Обработать игровое сообщение
 * @param message Сообщение игры
 */
function gameMessageReceived(message: GameMessage): void {

}

/** Инициализация ресурсов */
export function initializeResources(): void {
    // Сгенерировать изображения карт
    UI.setLoadingMsg("Генерация карт");
    renderCards();
}

/** Инициализация игры */
export function initialize(): void {
    console.log("ТЕСТ: инициализация");

    seatNumber = currentPlayer.seatIndex + 1;

    // Обработчики событий
    let handlers: Platform.IGameEventHandlers = {
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
    let testDeckLayout = loadedScene.getObjectById(`score_${seatNumber}`);
    let deck = loadedScene.createObject("card_deck", "td");
    loadedScene.addObject(deck, testDeckLayout);

    // Тестирование выбора элементов
    setPickablePlayerObjects();
}

/** Обновление состояния */
export function update(): void {

}

/**
 * Очередность хода игроков изменена
 * @param player Игрок, чей ход сейчас
 */
export function turnChanged(player: GamePlayer): void {

}

/**
 * Изменено свойство сцены
 * @param key Название свойства
 * @param value Значение свойства
 */
export function propertyChanged(key: string, value: string): void {
    if (key == "stage" && value == "select_sector") {
        promptForSector();
    }
}

/**
 * Новый объект был добавлен на сцену
 * @param object Добавленный объект
 */
export function objectAdded(object: Object3D): void {
    let parentId = object.parent != null ? object.parent.name : null;

    if (parentId != null) {
        let addingSeat = parseInt(parentId.split("_")[1]);

        if (addingSeat == seatNumber && object.name.indexOf("$gem") > -1) {
            playerPickableObjects.push(<THREE.Mesh>object);
            Controls.setPickableObjects(playerPickableObjects);
        }
    }
}

/**
 * Объект был удален со сцены
 * @param object Удаленный объект
 */
export function objectRemoved(object: Object3D): void {

}