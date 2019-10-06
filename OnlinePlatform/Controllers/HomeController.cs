using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using OnlinePlatform.Models;
using OnlinePlatform.ViewModels;
using OnlinePlatform.Services;
using OnlinePlatform.Platform;

namespace OnlinePlatform.Controllers
{
    /// <summary>
    /// Контроллер главных страниц
    /// </summary>
    public class HomeController : Controller
    {
        // Контекст данных пользователя
        private UserContext userCtx;

        // Управляет игровыми сеансами
        private SessionsManager sessionsManager;

        /// <summary>
        /// Обработчик главной страницы
        /// </summary>
        public async Task<IActionResult> Index()
        {
            var model = new HomeIndexModel()
            {
                AvailableGames = GamePackage.ListAvailable()
                    .Select(pkg => GameInfo.FromGamePackage(pkg))
                    .ToList(),
                ActiveSessions = sessionsManager.GetSessions()
                    .Select(s => SessionInfo.FromGameSession(s))
                    .OrderBy(si => si.StartedAt)
                    .ToList()
            };

            if(model.IsSigned)
            {
                try
                {
                    var playerSession = userCtx.GetGameSession();
                    model.PlayerSession = SessionInfo.FromGameSession(playerSession);
                    model.IsSigned = true;
                }
                catch(NullReferenceException)
                {
                    await userCtx.PerformLogout();
                }
            }

            return View(model);
        }

        /// <summary>
        /// Обработчик действия создания нового сеанса
        /// </summary>
        public async Task<IActionResult> NewSession(string id)
        {
            var rnd = new Random();
            string randomLogin = $"user_{rnd.Next(1000)}";

            await userCtx.PerformLogin(randomLogin);

            return RedirectToAction("Index", "Game");
        }

        public IActionResult Error()
        {
            return View(new ErrorViewModel {
                RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier
            });
        }

        public HomeController(UserContext userCtx, SessionsManager sessionsMgr)
        {
            this.userCtx = userCtx;
            this.sessionsManager = sessionsMgr;
        }
    }
}
