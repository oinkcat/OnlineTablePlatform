using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Управляет игровыми сеансами
    /// </summary>
    public class SessionsManager
    {
        // Активные игровые сеансы
        private List<GameSession> activeSessions;

        /// <summary>
        /// Выдать список всех активных сеансов
        /// </summary>
        /// <returns>Активные сеансы игры</returns>
        public IReadOnlyList<GameSession> GetSessions()
        {
            return (activeSessions as List<GameSession>).AsReadOnly();
        }

        /// <summary>
        /// Создать новую игровую сессию
        /// </summary>
        /// <param name="name">Название игры</param>
        /// <param name="gameMaster"></param>
        /// <returns>Новый игровой сеанс</returns>
        public async Task<GameSession> StartNewGame(string name, GameMaster master)
        {
            var gamePkg = new GamePackage(name);

            var objManager = new ObjectsManager(gamePkg);
            await objManager.LoadDefinitions();
            await objManager.LoadClientResources();

            var newSession = new GameSession(gamePkg)
            {
                Room = await (new GameRoomLoader(gamePkg)).Load(objManager),
                Master = master,
                ResourceManager = objManager
            };

            // Запустить сценарий игры
            newSession.StartInteractivity();

            activeSessions.Add(newSession);

            return newSession;
        }

        /// <summary>
        /// Завершить игровой сеанс
        /// </summary>
        /// <param name="session">Сеанс для завершения</param>
        public void TerminateSession(GameSession session)
        {
            activeSessions.Remove(session);
        }

        /// <summary>
        /// Выдать активный сеанс по его идентификатору
        /// </summary>
        /// <param name="id">Идентификатор сеанса</param>
        /// <returns>Активный сеанс игры с заданным идентификатором</returns>
        public GameSession GetSessionById(Guid id)
        {
            return activeSessions.FirstOrDefault(s => s.Id == id);
        }

        /// <summary>
        /// Выдать активный сеанс игры с заданным ведущим
        /// </summary>
        /// <param name="master">Ведущий игры</param>
        /// <returns>Активный сеанс игры с заданным ведущим</returns>
        public GameSession GetSessionByMaster(GameMaster master)
        {
            return activeSessions.FirstOrDefault(s => s.Master.Id == master.Id);
        }

        public SessionsManager()
        {
            activeSessions = new List<GameSession>();
        }
    }
}
