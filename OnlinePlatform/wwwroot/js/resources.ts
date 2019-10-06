import * as THREE from "three";

// Клиентские ресурсы (строки текста, изображения и т. п.)

/** Все ресурсы */
var allResources: { [key: string]: ClientResource } = {};

/** Клиентский ресурс */
export abstract class ClientResource {

    /** Идентификатор ресурса */
    public id: string;

    /** Содержимое */
    protected content: any;
}

/** Ресурс текстовой строки */
export class TextResource extends ClientResource {

    /** Текстовое сообщение */
    public get text(): string {
        return <string>this.content;
    }

    constructor(id: string, content: any) {
        super();
        this.id = id;
        this.content = content;
    }
}

/** Ресурс текстуры */
export class TextureResource extends ClientResource {

    /** Изображение */
    public get image(): HTMLImageElement {
        return <HTMLImageElement>this.content.image;
    }

    constructor(id: string, content: any) {
        super();
        this.id = id;
        this.content = content;
    }
}

/** Произвольный ресурс */
export class CustomResource extends ClientResource {

    /** Произвольное содержимое */
    public get object(): any {
        return this.content;
    }

    constructor(id: string, content: any) {
        super();
        this.id = id;
        this.content = content;
    }
}

/**
 * Выдать ресурс по идентификатору
 * @param id Идентификатор ресурса
 */
export function getResourceById<T extends ClientResource>(id: string): T {
    return <T>allResources[id];
}

/**
 * Поместить новый ресурс на хранение
 * @param type Тип ресурса
 * @param id Идентификатор ресурса
 * @param content Содержимое ресурса
 */
export function putRawResource(type: string, id: string, content: any): void {
    let newResource: ClientResource;

    if (type == "string") {
        newResource = new TextResource(id, content);
    } else if (type == "image") {
        newResource = new TextureResource(id, content);
    } else {
        newResource = new CustomResource(id, content);
    }

    allResources[newResource.id] = newResource;
}