import { Vector3 } from "three";

// Полезные функции

const ANIMATION_FPS: number = 60;

/** Выполняет обновление анимации */
export class Animator {

    // Выполняющиеся в данный момент анимации
    private currentlyRunning: { [id: string]: IAnimation } = {};

    /** Имеются ли активные анимации */
    public isAnimating(id?: string): boolean {
        if (id != null) {
            return this.currentlyRunning[id] != null;
        } else {
            return Object.keys(this.currentlyRunning).length > 0;
        }
    }

    /** Обновить состояние активных анимаций */
    public update(): void {
        for (let animId of Object.keys(this.currentlyRunning)) {
            let anim: IAnimation = this.currentlyRunning[animId];

            anim.update();
            if (anim.isDone()) {
                delete this.currentlyRunning[animId];
            }
        }
    }

    /**
     * Запустить анимацию
     * @param animation Анимация для запуска
     * @param id Идентификатор анимации
     */
    public runAnimation(animation: IAnimation, id?: string): void {
        let animId = id != null ? id : this.newAnimId();
        this.currentlyRunning[animId] = animation;
    }

    /**
     * Запустить анимацию векторов
     * @param start Начальный вектор
     * @param end Конечный вектор
     * @param time Время анимации
     * @deprecated
     */
    public animateVectors(start: Vector3, end: Vector3, time: number): void {
        let autoId = this.newAnimId();
        this.currentlyRunning[autoId] = new VectorAnimation(start, end, time);
    }

    // Выдать новый идентификатор анимации
    private newAnimId(): string {
        let num = Math.floor(Math.random() * 10000);
        return `anim_${num}`;
    }
}

/** Менеджер анимации по умолчанию */
export var animations: Animator = new Animator();

/** Базовый класс анимации */
export interface IAnimation {

    /** Обновить анимацию */
    update(): void;

    /** Анимация завершена? */
    isDone(): boolean;
}

/** Анимация компонентов трехмерного вектора */
export class VectorAnimation implements IAnimation {

    public target: Vector3;

    private nStepsLeft: number;

    private deltas: Vector3;

    /** Изменить координаты вектора на шаг изменения */
    public update(): void {
        this.target.addVectors(this.target, this.deltas);
        this.nStepsLeft--;
    }

    /** Анимация завершена? */
    public isDone(): boolean {
        return this.nStepsLeft <= 0;
    }

    constructor(
        public from: Vector3,
        public to: Vector3,
        public duration: number) {

        this.target = from;
        this.nStepsLeft = duration / ANIMATION_FPS;

        let dx = (to.x - from.x) / this.nStepsLeft;
        let dy = (to.y - from.y) / this.nStepsLeft;
        let dz = (to.z - from.z) / this.nStepsLeft;
        this.deltas = new Vector3(dx, dy, dz);
    }
}

/** Произвольная анимация */
export class CustomAnimation implements IAnimation {

    private updateCallback: (tick: number) => void;

    private checkDoneCallback: () => boolean;

    private tick: number;

    /** Шаг анимации */
    public update(): void {
        this.updateCallback(this.tick);
        this.tick++;
    }

    /** Анимация завершена? */
    public isDone(): boolean {
        return this.checkDoneCallback();
    }

    constructor(stepCb: (t: number) => void, checkCb: () => boolean) {
        this.updateCallback = stepCb;
        this.checkDoneCallback = checkCb;
        this.tick = 0;
    }
}

/**
 * Установить компоненты вектора в заданные значения
 * @param target Вектор, компоненты которого установить
 * @param newValues Новые значения компонентов
 */
export function setVector(target: Vector3, newValues: Vector3): void {
    target.set(newValues.x, newValues.y, newValues.z);
}

/**
 * Преобразовать данные вектора в тип вектора
 * @param v Данные вектора, загруженные с сервера
 */
export function data2Vector(v: any) {
    return new Vector3(v.x, v.y, v.z);
}