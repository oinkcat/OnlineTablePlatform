using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OnlinePlatform.Platform;

namespace OnlinePlatformTests
{
    /// <summary>
    /// Тесты загрузок объектов
    /// </summary>
    [TestClass]
    public class LoadingTests
    {
        // Базовый путь к каталогу данных
        const string BasePath = @"C:\Users\softc\Documents\Visual Studio 2017\" +
                                @"Projects\OnlinePlatform\OnlinePlatform\Storage";

        // Имя пакета данных игры
        const string GamePackageName = "Example";

        /// <summary>
        /// Тест загрузки объектов
        /// </summary>
        [TestMethod]
        public async Task TestObjectsLoading()
        {
            var pkg = new GamePackage(GamePackageName);
            var objManager = new ObjectsManager(pkg);
            await objManager.LoadDefinitions();

            var fieldObject = objManager.CreateObject("field");

            Assert.IsTrue(fieldObject.Type == ObjectType.Static);
        }

        /// <summary>
        /// Тест загрузки комнаты
        /// </summary>
        [TestMethod]
        public async Task TestSceneLoading()
        {
            var pkg = new GamePackage(GamePackageName);

            var objManager = new ObjectsManager(pkg);
            await objManager.LoadDefinitions();

            var roomLoader = new GameRoomLoader(pkg);
            var room = await roomLoader.Load(objManager);

            Assert.AreNotEqual(0, room.Interior.Count);
            Assert.AreNotEqual(0, room.PresentationMetadata.PointsOfView.Count);
        }

        public LoadingTests()
        {
            Config.Initialize(BasePath);
        }
    }
}
