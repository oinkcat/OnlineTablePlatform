using System;
using System.Collections.Generic;
using OnlinePlatform.Platform.Primitives;
using OnlinePlatform.Platform.Dto;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Тип игрового объекта
    /// </summary>
    public enum ObjectType
    {
        Static, Entity
    }

    /// <summary>
    /// Игровой объект
    /// </summary>
    public class GameObject
    {
        /// <summary>
        /// Идентификатор объекта
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Тип объекта
        /// </summary>
        public ObjectType Type { get; set; }

        /// <summary>
        /// Идентификатор раскладки, в которую помещен объект
        /// </summary>
        public string LayoutId { get; set; }

        /// <summary>
        /// Определение объекта
        /// </summary>
        public ObjectDefinition Definition { get; set; }

        /// <summary>
        /// Положение объекта
        /// </summary>
        public Vector Position { get; set; }

        /// <summary>
        /// Вращение объекта
        /// </summary>
        public Vector Rotation { get; set; }

        /// <summary>
        /// Единственный владелец объекта
        /// </summary>
        public Player PrivateOwner { get; set; }

        /// <summary>
        /// Проверить на соответствие другому игровому объекту
        /// </summary>
        /// <param name="obj">ПРоверяемый игровой объект</param>
        /// <returns>Соответствие игровому объекту</returns>
        public override bool Equals(object obj)
        {
            if(obj is GameObject gameObj)
            {
                return this.Id == gameObj.Id;
            }
            else
            {
                return false;
            }
        }

        /// <summary>
        /// Выдать уникальный хэш-код игрового объекта
        /// </summary>
        /// <returns>Хэш-код объекта</returns>
        public override int GetHashCode()
        {
            return this.Id.GetHashCode();
        }

        /// <summary>
        /// Переместить объект
        /// </summary>
        /// <param name="newPosition">Новое положение объекта</param>
        public void Move(Vector newPosition)
        {
            Position = newPosition;
        }
    }
}
