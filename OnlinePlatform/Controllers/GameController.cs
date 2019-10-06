using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using OnlinePlatform.Services;
using OnlinePlatform.Platform;
using OnlinePlatform.Platform.Dto;

using GameUser = OnlinePlatform.Platform.Player;

namespace OnlinePlatform.Controllers
{
    /// <summary>
    /// Контроллер страниц и данных игры
    /// </summary>
    public class GameController : Controller
    {
        // Менеджер сеансов
        private SessionsManager sessionMgr;

        // Контекст данных пользователя
        private UserContext userCtx;

        // Имя (идентификатор) игры
        private const string GameName = "Example";

        // Тестовый ведущий
        private static GameMaster testGameMaster;

        /// <summary>
        /// Обработчик запроса тестовой страницы
        /// </summary>
        public async Task<IActionResult> Index()
        {
            // Только вошедшие в систему пользователи
            if (!userCtx.IsLoggedIn)
                return RedirectToAction("Index", "Home");

            // Запустить игровую сессию
            var gameSession = await EnsureSessionStarted();

            // Зарегистрировать пользователя
            if(!userCtx.IsInGame)
            {
                var newPlayer = GameUser.CreatePlayer(userCtx.Login);
                gameSession.AddPlayer(newPlayer);
                userCtx.StoreGameInfo(gameSession, newPlayer);
            }

            return View();
        }

        /// <summary>
        /// Обработчик запроса состояния игры
        /// </summary>
        [HttpPost]
        public JsonResult GetGameState()
        {
            var gameSession = sessionMgr.GetSessionById(userCtx.GameSessionId);
            var currentPlayer = gameSession.GetPlayerById(userCtx.PlayerId);
            var stateDto = GameStateDto.CreateFromSession(gameSession, currentPlayer);

            // URI сервера WebSocket
            stateDto.MessageServerUri = $"ws://{Request.Host.Value}/messages";

            return Json(stateDto);
        }

        /// <summary>
        /// Обработчик действия выдачи ресурса
        /// </summary>
        [HttpGet]
        [Route("/Game/GetAsset/{name}")]
        public async Task<FileResult> GetAsset(string name)
        {
            const string DefaultMime = "application/octet-stream";

            var ext2MimeMap = new Dictionary<string, string>
            {
                [".json"] = "text/json",
                [".png"] = "image/png",
                [".jpg"] = "image/jpeg"
            };

            var pkg = new GamePackage(GameName);

            using (var file = pkg.OpenAssetFile(name))
            {
                var contents = new byte[file.Length];
                await file.ReadAsync(contents, 0, contents.Length);

                // Определить тип содержимого
                string ext = Path.GetExtension(name);
                if(!ext2MimeMap.TryGetValue(ext, out string contentType))
                {
                    contentType = DefaultMime;
                }

                return File(contents, contentType);
            }
        }

        // Запустить игровой сеанс, если еще не запущен
        private async Task<GameSession> EnsureSessionStarted()
        {
            var existingSession = sessionMgr.GetSessionByMaster(testGameMaster);

            if (existingSession == null)
            {
                return await CreateTestSession();
            }
            else
            {
                return existingSession;
            }
        }

        // Создать тестовый игровой сеанс
        private async Task<GameSession> CreateTestSession()
        {
            return await sessionMgr.StartNewGame(GameName, testGameMaster);
        }

        public GameController(SessionsManager sessionMgr, UserContext userCtx)
        {
            this.sessionMgr = sessionMgr;
            this.userCtx = userCtx;
        }

        static GameController()
        {
            testGameMaster = GameUser.CreateGameMaster("test");
        }
    }
}
