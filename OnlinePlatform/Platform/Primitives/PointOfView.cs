using System;
using System.Collections.Generic;

namespace OnlinePlatform.Platform.Primitives
{
    /// <summary>
    /// Позиции обзора игроков
    /// </summary>
    public class PointOfView
    {
        /// <summary>
        /// Идентификатор позиции обзора
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Координаты позиций игроков
        /// </summary>
        public List<Vector> Positions { get; set; }

        /// <summary>
        /// Координаты обозреваемых объектов
        /// </summary>
        public List<Vector> Targets { get; set; }
    }
}
