using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OnlinePlatform.Platform;
using OnlinePlatform.Platform.Dto;

namespace OnlinePlatformTests
{
    /// <summary>
    /// Тест сеансов
    /// </summary>
    [TestClass]
    public class SessionTests
    {
        // Базовый путь к каталогу данных
        const string BasePath = @"C:\Users\softc\Documents\Visual Studio 2017\" +
                                @"Projects\OnlinePlatform\OnlinePlatform\Storage";

        // Название игры
        const string GameName = "Example";

        private SessionsManager manager;
        private GameMaster testGameMaster;

        /// <summary>
        /// Тест создания сеанса
        /// </summary>
        [TestMethod]
        public async Task CreateSessionTest()
        {
            await manager.StartNewGame(GameName, testGameMaster);

            Assert.AreNotEqual(0, manager.GetSessions().Count);
        }

        /// <summary>
        /// Тест создания объекта передачи данных состояния игры
        /// </summary>
        [TestMethod]
        public async Task GameStateDtoTest()
        {
            var newSession = await manager.StartNewGame(GameName, testGameMaster);
            var testPlayer = Player.CreatePlayer("Player One");
            newSession.AddPlayer(testPlayer);

            var stateDto = GameStateDto.CreateFromSession(newSession, testPlayer);

            Assert.AreNotEqual(Guid.Empty, stateDto.SessionId);
            Assert.IsNotNull(stateDto.Master);
            Assert.AreNotEqual(0, stateDto.ObjectDefinitions.Count());
            Assert.AreNotEqual(0, stateDto.Players.Count());
            Assert.AreNotEqual(0, stateDto.RoomScene.Objects.Count());
        }

        public SessionTests()
        {
            Config.Initialize(BasePath);

            manager = new SessionsManager();
            testGameMaster = Player.CreateGameMaster("TestMaster");
        }
    }
}
