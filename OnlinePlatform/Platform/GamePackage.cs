using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Threading.Tasks;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Совокупность данных об игре
    /// </summary>
    public class GamePackage
    {
        // Имя каталога данных
        private const string DataDir = "Data";

        // Имя каталога ресурсов
        private const string AssetsDir = "Assets";

        // Имя каталога серверного скрипта
        private const string ServerScriptDir = "ServerScript";

        // Путь к файлу описания сцены
        private string SceneDescriptionFilePath
        {
            get
            {
                return Path.Combine(DirectoryPath, DataDir, "scene.json");
            }
        }

        // Путь к файлу описания объектов
        private string ObjectDescriptionsFilePath
        {
            get
            {
                return Path.Combine(DirectoryPath, DataDir, "objects.json");
            }
        }

        // Путь к файлу ресурсов
        private string ResourcesFilePath
        {
            get
            {
                return Path.Combine(DirectoryPath, DataDir, "resources.json");
            }
        }

        // Путь к файлу серверного сценария
        private string ServerScriptFilePath
        {
            get
            {
                return Path.Combine(DirectoryPath, "ServerScript\\main.lb");
            }
        }

        /// <summary>
        /// Идентификатор игры
        /// </summary>
        public string Name { get; private set; }

        /// <summary>
        /// Путь к каталогу данных
        /// </summary>
        public string DirectoryPath { get; private set; }

        /// <summary>
        /// Проверить валидность пакета игры
        /// </summary>
        /// <returns>Может ли пакет быть использован</returns>
        public bool Validate()
        {
            bool sceneDefExists = File.Exists(SceneDescriptionFilePath);
            bool objectsDefExists = File.Exists(ObjectDescriptionsFilePath);
            bool scriptFileExists = File.Exists(ServerScriptFilePath);

            return sceneDefExists && objectsDefExists && scriptFileExists;
        }

        /// <summary>
        /// Прочитать файл описания сцены
        /// </summary>
        /// <returns>Содержимое файла описания сцены</returns>
        public async Task<string> ReadSceneDescription()
        {
            return await File.ReadAllTextAsync(SceneDescriptionFilePath);
        }

        /// <summary>
        /// Прочитать файл описания объектов
        /// </summary>
        /// <returns>Содержимое файла описаний объектов</returns>
        public async Task<string> ReadObjectDescriptions()
        {
            return await File.ReadAllTextAsync(ObjectDescriptionsFilePath);
        }

        /// <summary>
        /// Прочитать файл клиентских ресурсов
        /// </summary>
        /// <returns>Содержимое файла ресурсов</returns>
        public async Task<string> ReadClientResources()
        {
            return await File.ReadAllTextAsync(ResourcesFilePath);
        }

        /// <summary>
        /// Открыть файл ресурсов
        /// </summary>
        /// <param name="assetName">Имя файла ресурсов</param>
        /// <returns>Поток данных файла ресурса</returns>
        public Stream OpenAssetFile(string assetName)
        {
            return File.OpenRead(Path.Combine(DirectoryPath, AssetsDir, assetName));
        }

        /// <summary>
        /// Открыть файл серверного сценария
        /// </summary>
        /// <returns>Поток данных серверного сценария</returns>
        public Stream OpenServerScriptFile()
        {
            return File.OpenRead(ServerScriptFilePath);
        }

        /// <summary>
        /// Перечислить доступные игры
        /// </summary>
        /// <returns>Список доступных игр</returns>
        public static List<GamePackage> ListAvailable()
        {
            return Directory.GetDirectories(Config.Instance.StoragePath)
                .Select(name => new GamePackage(Path.GetFileName(name)))
                .ToList();
        }

        public GamePackage(string name)
        {
            Name = name;
            DirectoryPath = Path.Combine(Config.Instance.StoragePath, Name);
        }
    }
}
