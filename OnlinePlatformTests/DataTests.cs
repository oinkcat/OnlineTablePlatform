using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OnlinePlatform.Platform;

namespace OnlinePlatformTests
{
    /// <summary>
    /// Тесты данных
    /// </summary>
    [TestClass]
    public class DataTests
    {
        // Базовый путь к каталогу данных
        const string BasePath = @"C:\Users\softc\Documents\Visual Studio 2017\" +
                                @"Projects\OnlinePlatform\OnlinePlatform\Storage";

        /// <summary>
        /// Тестирование перечисления доступных игр
        /// </summary>
        [TestMethod]
        public void TestGameListing()
        {
            var availableGames = GamePackage.ListAvailable();

            Assert.AreNotEqual(0, availableGames.Count);
        }

        public DataTests()
        {
            Config.Initialize(BasePath);
        }
    }
}
