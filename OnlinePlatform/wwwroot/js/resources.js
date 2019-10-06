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
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Клиентские ресурсы (строки текста, изображения и т. п.)
    /** Все ресурсы */
    var allResources = {};
    /** Клиентский ресурс */
    var ClientResource = /** @class */ (function () {
        function ClientResource() {
        }
        return ClientResource;
    }());
    exports.ClientResource = ClientResource;
    /** Ресурс текстовой строки */
    var TextResource = /** @class */ (function (_super) {
        __extends(TextResource, _super);
        function TextResource(id, content) {
            var _this = _super.call(this) || this;
            _this.id = id;
            _this.content = content;
            return _this;
        }
        Object.defineProperty(TextResource.prototype, "text", {
            /** Текстовое сообщение */
            get: function () {
                return this.content;
            },
            enumerable: true,
            configurable: true
        });
        return TextResource;
    }(ClientResource));
    exports.TextResource = TextResource;
    /** Ресурс текстуры */
    var TextureResource = /** @class */ (function (_super) {
        __extends(TextureResource, _super);
        function TextureResource(id, content) {
            var _this = _super.call(this) || this;
            _this.id = id;
            _this.content = content;
            return _this;
        }
        Object.defineProperty(TextureResource.prototype, "image", {
            /** Изображение */
            get: function () {
                return this.content.image;
            },
            enumerable: true,
            configurable: true
        });
        return TextureResource;
    }(ClientResource));
    exports.TextureResource = TextureResource;
    /** Произвольный ресурс */
    var CustomResource = /** @class */ (function (_super) {
        __extends(CustomResource, _super);
        function CustomResource(id, content) {
            var _this = _super.call(this) || this;
            _this.id = id;
            _this.content = content;
            return _this;
        }
        Object.defineProperty(CustomResource.prototype, "object", {
            /** Произвольное содержимое */
            get: function () {
                return this.content;
            },
            enumerable: true,
            configurable: true
        });
        return CustomResource;
    }(ClientResource));
    exports.CustomResource = CustomResource;
    /**
     * Выдать ресурс по идентификатору
     * @param id Идентификатор ресурса
     */
    function getResourceById(id) {
        return allResources[id];
    }
    exports.getResourceById = getResourceById;
    /**
     * Поместить новый ресурс на хранение
     * @param type Тип ресурса
     * @param id Идентификатор ресурса
     * @param content Содержимое ресурса
     */
    function putRawResource(type, id, content) {
        var newResource;
        if (type == "string") {
            newResource = new TextResource(id, content);
        }
        else if (type == "image") {
            newResource = new TextureResource(id, content);
        }
        else {
            newResource = new CustomResource(id, content);
        }
        allResources[newResource.id] = newResource;
    }
    exports.putRawResource = putRawResource;
});
//# sourceMappingURL=resources.js.map