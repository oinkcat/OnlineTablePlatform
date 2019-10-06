define(["require", "exports", "three"], function (require, exports, three_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Полезные функции
    var ANIMATION_FPS = 60;
    /** Выполняет обновление анимации */
    var Animator = /** @class */ (function () {
        function Animator() {
            // Выполняющиеся в данный момент анимации
            this.currentlyRunning = {};
        }
        /** Имеются ли активные анимации */
        Animator.prototype.isAnimating = function (id) {
            if (id != null) {
                return this.currentlyRunning[id] != null;
            }
            else {
                return Object.keys(this.currentlyRunning).length > 0;
            }
        };
        /** Обновить состояние активных анимаций */
        Animator.prototype.update = function () {
            for (var _i = 0, _a = Object.keys(this.currentlyRunning); _i < _a.length; _i++) {
                var animId = _a[_i];
                var anim = this.currentlyRunning[animId];
                anim.update();
                if (anim.isDone()) {
                    delete this.currentlyRunning[animId];
                }
            }
        };
        /**
         * Запустить анимацию
         * @param animation Анимация для запуска
         * @param id Идентификатор анимации
         */
        Animator.prototype.runAnimation = function (animation, id) {
            var animId = id != null ? id : this.newAnimId();
            this.currentlyRunning[animId] = animation;
        };
        /**
         * Запустить анимацию векторов
         * @param start Начальный вектор
         * @param end Конечный вектор
         * @param time Время анимации
         * @deprecated
         */
        Animator.prototype.animateVectors = function (start, end, time) {
            var autoId = this.newAnimId();
            this.currentlyRunning[autoId] = new VectorAnimation(start, end, time);
        };
        // Выдать новый идентификатор анимации
        Animator.prototype.newAnimId = function () {
            var num = Math.floor(Math.random() * 10000);
            return "anim_" + num;
        };
        return Animator;
    }());
    exports.Animator = Animator;
    /** Менеджер анимации по умолчанию */
    exports.animations = new Animator();
    /** Анимация компонентов трехмерного вектора */
    var VectorAnimation = /** @class */ (function () {
        function VectorAnimation(from, to, duration) {
            this.from = from;
            this.to = to;
            this.duration = duration;
            this.target = from;
            this.nStepsLeft = duration / ANIMATION_FPS;
            var dx = (to.x - from.x) / this.nStepsLeft;
            var dy = (to.y - from.y) / this.nStepsLeft;
            var dz = (to.z - from.z) / this.nStepsLeft;
            this.deltas = new three_1.Vector3(dx, dy, dz);
        }
        /** Изменить координаты вектора на шаг изменения */
        VectorAnimation.prototype.update = function () {
            this.target.addVectors(this.target, this.deltas);
            this.nStepsLeft--;
        };
        /** Анимация завершена? */
        VectorAnimation.prototype.isDone = function () {
            return this.nStepsLeft <= 0;
        };
        return VectorAnimation;
    }());
    exports.VectorAnimation = VectorAnimation;
    /** Произвольная анимация */
    var CustomAnimation = /** @class */ (function () {
        function CustomAnimation(stepCb, checkCb) {
            this.updateCallback = stepCb;
            this.checkDoneCallback = checkCb;
            this.tick = 0;
        }
        /** Шаг анимации */
        CustomAnimation.prototype.update = function () {
            this.updateCallback(this.tick);
            this.tick++;
        };
        /** Анимация завершена? */
        CustomAnimation.prototype.isDone = function () {
            return this.checkDoneCallback();
        };
        return CustomAnimation;
    }());
    exports.CustomAnimation = CustomAnimation;
    /**
     * Установить компоненты вектора в заданные значения
     * @param target Вектор, компоненты которого установить
     * @param newValues Новые значения компонентов
     */
    function setVector(target, newValues) {
        target.set(newValues.x, newValues.y, newValues.z);
    }
    exports.setVector = setVector;
    /**
     * Преобразовать данные вектора в тип вектора
     * @param v Данные вектора, загруженные с сервера
     */
    function data2Vector(v) {
        return new three_1.Vector3(v.x, v.y, v.z);
    }
    exports.data2Vector = data2Vector;
});
//# sourceMappingURL=utils.js.map