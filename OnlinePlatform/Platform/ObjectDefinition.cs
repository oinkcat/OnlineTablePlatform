using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Platform.Primitives;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Определение игрового объекта
    /// </summary>
    public class ObjectDefinition : ICloneable
    {
        // Имена типов статических объектов
        private static HashSet<string> staticTypes;

        // Имена типов игровых сущностей
        private static HashSet<string> entityTypes;

        /// <summary>
        /// Имя объекта
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Имя группы
        /// </summary>
        public string GroupName { get; set; }

        /// <summary>
        /// Загружаемый с сервера
        /// </summary>
        public bool Loadable { get; set; }

        /// <summary>
        /// Размерность объекта
        /// </summary>
        public Vector Dimensions { get; set; }

        /// <summary>
        /// Дополнительные параметры
        /// </summary>
        public Dictionary<string, object> Params { get; set; }

        /// <summary>
        /// Создать объект по его определению
        /// </summary>
        /// <param name="id">Идентификатор создаваемого объекта</param>
        /// <returns>Игровой объект</returns>
        public GameObject CreateObject(string id)
        {
            ObjectType type;

            if (staticTypes.Contains(GroupName))
            {
                type = ObjectType.Static;
            }
            else if (entityTypes.Contains(GroupName))
            {
                type = ObjectType.Entity;
            }
            else
                throw new ArgumentException("Неизвестный тип объекта");

            return new GameObject()
            {
                Id = id,
                Type = type,
                Definition = this
            };
        }

        /// <summary>
        /// Создать копию определения
        /// </summary>
        /// <returns>Копия этого определения</returns>
        public object Clone()
        {
            return new ObjectDefinition()
            {
                Name = this.Name,
                GroupName = this.GroupName,
                Dimensions = this.Dimensions,
                Params = this.Params
            };
        }

        static ObjectDefinition()
        {
            staticTypes = new HashSet<string> { "_layout", "static", "field" };
            entityTypes = new HashSet<string> { "resource" };
        }
    }
}
