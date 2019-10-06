using System;
using System.Collections.Generic;
using System.Linq;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Конфигурационные настройки
    /// </summary>
    public class Config
    {
        /// <summary>
        /// Единичный экземпляр
        /// </summary>
        public static Config Instance { get; private set; }

        /// <summary>
        /// Базовый путь к данным
        /// </summary>
        public string StoragePath { get; set; }

        /// <summary>
        /// Инициализировать настройки
        /// </summary>
        /// <param name="basePath">Путь к данным</param>
        public static void Initialize(string basePath)
        {
            Instance = new Config(basePath);
        }

        private Config(string path)
        {
            StoragePath = path;
        }
    }
}
