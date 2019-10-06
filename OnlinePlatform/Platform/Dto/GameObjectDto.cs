using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Platform.Primitives;

namespace OnlinePlatform.Platform.Dto
{
    /// <summary>
    /// Объект передачи данных для игрового объекта
    /// </summary>
    public class GameObjectDto
    {
        /// <summary>
        /// Идентификатор объекта
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Имя объекта
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Идентификатор раскладки
        /// </summary>
        public string LayoutId { get; set; }

        /// <summary>
        /// Является ли статическим объектом
        /// </summary>
        public bool IsStatic { get; set; }

        /// <summary>
        /// Позиция объекта
        /// </summary>
        public Vector Position { get; set; }

        /// <summary>
        /// Вращение объекта по осям
        /// </summary>
        public Vector Rotation { get; set; }

        /// <summary>
        /// Создать объект передачи данных из данных объекта
        /// </summary>
        /// <param name="obj">Игровой объект</param>
        /// <returns>Объект передачи данных игрового объекта</returns>
        public static GameObjectDto CreateFromObject(GameObject obj)
        {
            return new GameObjectDto()
            {
                Id = obj.Id,
                Name = obj.Definition.Name,
                LayoutId = obj.LayoutId,
                IsStatic = obj.Type == ObjectType.Static,
                Position = obj.Position,
                Rotation = obj.Rotation
            };
        }
    }
}
