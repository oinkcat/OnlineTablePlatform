using System;
using System.Collections.Generic;
using OnlinePlatform.Platform.Primitives;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Метаданные представления сцены
    /// </summary>
    public class SceneMetadata
    {
        /// <summary>
        /// Имя сцены
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Текстура окружения
        /// </summary>
        public string SkyboxName { get; set; }

        /// <summary>
        /// Точка, на которую смотрит камера
        /// </summary>
        public Vector LookAtPoint { get; set; }

        /// <summary>
        /// Расстояние до камеры
        /// </summary>
        public double Distance { get; set; }

        /// <summary>
        /// Позиции мест за игровым столом
        /// </summary>
        public List<Vector> Seats { get; set; }

        /// <summary>
        /// Позиции обзора игроков
        /// </summary>
        public List<PointOfView> PointsOfView { get; set; }

        /// <summary>
        /// Источники света
        /// </summary>
        public List<Light> Lights { get; set; }

        public SceneMetadata()
        {
            LookAtPoint = new Vector(0, 0, 0);
        }
    }
}
