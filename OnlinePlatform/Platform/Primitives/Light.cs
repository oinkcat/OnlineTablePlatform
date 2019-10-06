using System;
using System.Collections.Generic;
using System.Linq;

namespace OnlinePlatform.Platform.Primitives
{
    /// <summary>
    /// Информация об источнике света
    /// </summary>
    public class Light
    {
        /// <summary>
        /// Тип источника света
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        /// Цвет источника света
        /// </summary>
        public string Color { get; set; }

        /// <summary>
        /// Интенсивность источника света
        /// </summary>
        public double Intensity { get; set; }

        /// <summary>
        /// Позиция источника света
        /// </summary>
        public Vector Position { get; set; }

        /// <summary>
        /// Параметры источника света
        /// </summary>
        public Dictionary<string, object> Params { get; set; }
    }
}
