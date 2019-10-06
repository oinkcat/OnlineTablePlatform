import { loadedRoom } from "room";

// Пользовательский интерфейс

const MAX_POPUPS: number = 5;
const POPUP_TIME: number = 3;
const POPUP_SIZE: number = 30;
const POPUP_OFFSET: number = 50;
const POPUP_MARGIN: number = 5;

/** HTML диалог */
export class Dialog {

    private backdrop: HTMLElement;

    private buttonCallbacks: any;

    private closeCallback = this.close.bind(this);

    public element: HTMLElement;

    /** Открыть диалог */
    public open(): void {
        this.element.classList.add("shown");
        this.backdrop.classList.add("shown");

        this.backdrop.addEventListener("click", this.closeCallback);
    }

    /** Закрыть диалог */
    public close(): void {
        this.element.classList.remove("shown");
        this.backdrop.classList.remove("shown");

        this.backdrop.removeEventListener("click", this.closeCallback);
    }

    constructor(elementSelector: string, callbacks?: any) {
        this.element = document.querySelector(elementSelector);
        this.backdrop = document.querySelector(".otgp-backdrop");
        this.buttonCallbacks = callbacks;
    }
}

/** Панель аватаров игроков */
class AvatarsPanel {

    // Корневой элемент
    private root: HTMLElement;

    // Идентификаторы показанных аватаров
    private shownIds: string[];

    // Идентификатор текущего активного игрока
    private activeId: string;

    // Вставить элемент, отображающий аватар игрока
    private insertAvatarElement(elem: HTMLElement, place: number): void {
        if (this.root.children.length > 0) {
            let nextElem = null;

            for (let i = 0; i < this.root.children.length; i++) {
                let anElem = this.root.children[i];
                let elemIdx = parseInt(anElem.id.substr(1));
                if (elemIdx > place) {
                    nextElem = anElem;
                    break;
                }
            }

            if (nextElem != null) {
                this.root.insertBefore(elem, nextElem);
            } else {
                this.root.appendChild(elem);
            }
        } else {
            this.root.appendChild(elem);
        }
    }

    /** Обновить иконки игроков */
    public updateIcons(): void {
        let newPlayers = loadedRoom.players.filter(p => {
            return this.shownIds[p.seatIndex] == null;
        });

        newPlayers.forEach(p => {
            let newElem = document.createElement("div");
            newElem.className = `av-holder s${p.seatIndex + 1}`;
            newElem.textContent = `#${p.seatIndex}`;
            newElem.id = `p${p.seatIndex}`;
            this.insertAvatarElement(newElem, p.seatIndex);
            this.shownIds[p.seatIndex] = p.id;
        });
    }

    constructor(selector: string) {
        this.root = $(selector);
        this.shownIds = new Array<string>();
    }
}

/** Loading screen */
export var loadingSection: HTMLElement;

/** Main screen */
export var mainSection: HTMLElement;

var sidePanel: HTMLElement;
var bottomPanel: HTMLElement;

// При изменении размеров окна
var windowResized: () => void;

/** Показанные всплывающие сообщения */
var shownPopups: HTMLElement[] = [];

/** Отображаемое информационное сообщение */
var textMessage: HTMLElement;

/** Хэндл интервала удаления элементов */
var popupRemoveInterval: number;

/** Элемент, отображающий состояние связи WebRTC */
var rtcIndicator: HTMLElement;

/** Панель аватаров */
var playerAvatars: AvatarsPanel;

/** Выдать HTML элемент по селектору */
function $(selector: string): HTMLElement {
    return document.querySelector(selector);
}

/** Показать диалоговое сообщение о потере связи с сервером */
export function showDisconnectDialog(): void {
    let dialog = new Dialog("#connectErrorDialog");
    dialog.open();
}

/** Задать обработчик изменения размеров окна */
export function setResizeHandler(handler: () => void): void {
    windowResized = handler;
}

/** Выдать доступный размер области вывода */
export function getOutputSize(): { w: number, h: number } {
    const MIN_HEIGHT: number = 480;
    
    return {
        w: window.innerWidth,
        h: window.innerHeight > MIN_HEIGHT ? window.innerHeight : MIN_HEIGHT
    }
}

/** 
 * Показать заставку загрузки
 * @param isLoading Производится ли загрузка
 * */
export function toggleLoading(isLoading: boolean): void {
    loadingSection.style.display = isLoading ? "block" : "none";
    mainSection.style.display = isLoading ? "none" : "block";
}

/**
 * Показать/скрыть курсор мыши для выбора элементов
 * @param isPickable Можно ли выбрать объект
 */
export function togglePickCursor(isPickable: boolean): void {
    let rendererElem = mainSection.querySelector(".render");
    if (isPickable) {
        rendererElem.classList.add("pickable");
    } else {
        rendererElem.classList.remove("pickable");
    }
}

/**
 * Отобразить прогресс загрузки
 * @param progress Прогресс загрузки
 */
export function setLoadingProgress(progress: number): void {
    let text = loadingSection.querySelector(".load-title > span");
    let bar = <HTMLElement>loadingSection.querySelector(".pg-bar");
    let barFill = <HTMLElement>bar.querySelector(".pg-bar-fill");
    
    text.innerHTML = "Загрузка...";

    bar.style.display = "block";
    barFill.style.width = `${progress}%`;
}

export function setLoadingMsg(message: string): void {
    let text = loadingSection.querySelector(".load-title > span");
    text.innerHTML = `Загрузка (${message})...`;
}

/** Добавить элемент, в который производится отрисовка */
export function appendRenderer(renderCanvas: HTMLCanvasElement): void {
    mainSection.appendChild(renderCanvas);
}

/**
 * Показать всплывающее сообщение
 * @param text Текст сообщения
 */
export function showPopup(text: string): void {
    clearInterval(popupRemoveInterval);

    // Удалить лишние, если слишком много
    if (shownPopups.length == MAX_POPUPS) {
        let popupToDelete = shownPopups.pop();
        mainSection.removeChild(popupToDelete);
    }

    // Создать новый элемент
    let popupElem = document.createElement("div");
    popupElem.className = "popup";
    popupElem.innerHTML = text;
    popupElem.style.top = `${POPUP_OFFSET}px`;
    mainSection.appendChild(popupElem);
    shownPopups.unshift(popupElem);

    for (let i = 0; i < shownPopups.length; i++) {
        let popup = shownPopups[i];
        let popupY = i * POPUP_SIZE + POPUP_MARGIN + POPUP_OFFSET;
        popup.style.top = `${popupY}px`;
    }

    // Удалить элемент по прошествии времени
    popupRemoveInterval = setInterval(() => {
        if (shownPopups.length > 0) {
            let lastPopup = shownPopups.pop();
            mainSection.removeChild(lastPopup);
        } else {
            clearInterval(popupRemoveInterval);
        }
    }, POPUP_TIME * 1000);
}

/**
 * Отобразить информационное сообщение
 * @param text Текст сообщения
 * @param duration Длительность показа
 */
export function showMessage(text: string, duration?: number): void {
    let textSpan = textMessage.querySelector(".text");
    textSpan.textContent = text;
    textMessage.classList.remove("hidden");

    // Анимировать появление
    if (!textMessage.classList.contains("showing")) {
        textMessage.classList.add("showing");
    }

    if (duration != null) {
        setTimeout(hideMessage, duration);
    }
}

/** Скрыть информационное сообщение */
export function hideMessage(): void {
    textMessage.classList.add("hiding");

    // Анимировать исчезание
    setTimeout(() => {
        textMessage.classList.add("hidden");
        textMessage.classList.remove("hiding");
    }, 500);
}

/**
 * Изменить вид индикатора состояния связи WebRTC
 * @param ok Соединение установлено
 */
export function setRTCStatus(ok: boolean): void {
    if (ok) {
        rtcIndicator.classList.add("connected");
        rtcIndicator.classList.remove("error");
    } else {
        rtcIndicator.classList.add("error");
        rtcIndicator.classList.remove("connected");
    }
}

/** Обновить иконки аватаров игроков */
export function updatePlayerAvatars(): void {
    playerAvatars.updateIcons();
}

/** Инициализация интерфейса */
export function initialize() {
    loadingSection = $("#loading");
    mainSection = $("#main");
    sidePanel = $("#sidePanel");
    bottomPanel = $("#bottomPanel");
    textMessage = $("#message");
    rtcIndicator = $("#rtcStateIndicator");

    playerAvatars = new AvatarsPanel("#avatars");

    rtcIndicator.addEventListener("selectstart", e => e.preventDefault());
    window.addEventListener("resize", () => windowResized());
}