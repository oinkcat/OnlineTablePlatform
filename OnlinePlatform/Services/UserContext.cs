using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using OnlinePlatform.Platform;

namespace OnlinePlatform.Services
{
    /// <summary>
    /// Контекст пользователя сайта
    /// </summary>
    public class UserContext
    {
        private const string NameClaimType = ClaimsIdentity.DefaultNameClaimType;
        private const string RoleClaimType = ClaimsIdentity.DefaultRoleClaimType;

        const string AuthScheme = CookieAuthenticationDefaults.AuthenticationScheme;

        // Ключ сеанса - логин пользователя
        private const string SessionLoginKey = "login";

        // Ключ сеанса - идентификатор игрока
        private const string SessionGuidKey = "player_guid";

        // Ключ сеанса - идентификатор игрового сеанса
        private const string SessionSidKey = "session_id";

        private const string DefaultRole = "player";

        // Контекст запроса HTTP
        private IHttpContextAccessor httpAccessor;

        // Управляет сеансами игры
        private SessionsManager sessionsManager;

        // Контекст текущего запроса
        private HttpContext CurrentHttpContext
        {
            get { return httpAccessor.HttpContext; }
        }

        // Сеанс HTTP
        private ISession Session
        {
            get { return CurrentHttpContext.Session; }
        }

        /// <summary>
        /// Выполнен ли вход в систему
        /// </summary>
        public bool IsLoggedIn
        {
            get { return CurrentHttpContext.User.Identity.IsAuthenticated; }
        }

        /// <summary>
        /// Вошел ли пользователь в игру
        /// </summary>
        public bool IsInGame
        {
            get { return Session.GetString(SessionGuidKey) != null; }
        }

        /// <summary>
        /// Имя входа текущего пользователя
        /// </summary>
        public string Login
        {
            get { return CurrentHttpContext.User.Identity.Name; }
        }

        /// <summary>
        /// Идентификатор игрока
        /// </summary>
        public Guid PlayerId
        {
            get
            {
                string pId = Session.GetString(SessionGuidKey);
                return pId != null ? Guid.Parse(pId) : Guid.Empty;
            }
        }

        /// <summary>
        /// Идентификатор игрового сеанса
        /// </summary>
        public Guid GameSessionId
        {
            get
            {
                string sId = Session.GetString(SessionSidKey);
                return sId != null ? Guid.Parse(sId) : Guid.Empty;
            }
        }

        /// <summary>
        /// Выдать сеанс игры пользователя
        /// </summary>
        /// <returns>Сеанс игры пользователя</returns>
        public GameSession GetGameSession()
        {
            if(GameSessionId != Guid.Empty)
            {
                return sessionsManager.GetSessionById(GameSessionId);
            }
            else
            {
                throw new NullReferenceException("Игровая сессия не открыта!");
            }
        }

        /// <summary>
        /// Выполнить вход в систему
        /// </summary>
        /// <param name="login">Имя входа пользователя</param>
        public async Task PerformLogin(string login)
        {
            const string NameType = ClaimsIdentity.DefaultNameClaimType;
            const string RoleType = ClaimsIdentity.DefaultRoleClaimType;

            // Выполнение входа
            var userClaims = new List<Claim>()
            {
                new Claim(NameClaimType, login),
                new Claim(RoleClaimType, DefaultRole)
            };

            var id = new ClaimsIdentity(userClaims, AuthScheme, NameType, RoleType);

            await CurrentHttpContext.SignInAsync(AuthScheme, new ClaimsPrincipal(id));

            // Записать в данные сеанса
            Session.SetString(SessionLoginKey, login);
        }

        /// <summary>
        /// Сохранить в сеансе информацию об игре
        /// </summary>
        /// <param name="gameSession">Игровой сеанс</param>
        /// <param name="player">Игрок</param>
        public void StoreGameInfo(GameSession gameSession, Player player)
        {
            Session.SetString(SessionSidKey, gameSession.Id.ToString());
            Session.SetString(SessionGuidKey, player.Id.ToString());
        }

        /// <summary>
        /// Выполнить выход из системы
        /// </summary>
        public async Task PerformLogout()
        {
            await CurrentHttpContext.SignOutAsync();
            Session.Clear();
        }

        public UserContext(IHttpContextAccessor accessor, SessionsManager sessionsMgr)
        {
            httpAccessor = accessor;
            sessionsManager = sessionsMgr;
        }
    }
}
