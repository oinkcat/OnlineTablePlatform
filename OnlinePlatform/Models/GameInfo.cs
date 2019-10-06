using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Platform;

namespace OnlinePlatform.Models
{
    /// <summary>
    /// Информация о доступной игре
    /// </summary>
    public class GameInfo
    {
        /// <summary>
        /// Идентификатор игры
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Путь к каталогу данных
        /// </summary>
        public string Path { get; set; }

        /// <summary>
        /// Все ли файлы в наличии
        /// </summary>
        public bool IsValid { get; set; }

        /// <summary>
        /// Создать из информации о пакете игры
        /// </summary>
        /// <param name="pkg">Пакет данных игры</param>
        /// <returns>Информация об игре</returns>
        public static GameInfo FromGamePackage(GamePackage pkg)
        {
            return new GameInfo()
            {
                Name = pkg.Name,
                Path = pkg.DirectoryPath,
                IsValid = pkg.Validate()
            };
        }
    }
}
