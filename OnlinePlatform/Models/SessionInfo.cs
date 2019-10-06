using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Platform;

namespace OnlinePlatform.Models
{
    /// <summary>
    /// Информация о сеансе игры
    /// </summary>
    public class SessionInfo
    {
        /// <summary>
        /// Идентификатор сеанса
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Идентификатор игры
        /// </summary>
        public string GameName { get; set; }

        /// <summary>
        /// Дата/время начала сеанса
        /// </summary>
        public DateTime StartedAt { get; set; }

        /// <summary>
        /// Число игроков
        /// </summary>
        public int PlayersCount { get; set; }

        /// <summary>
        /// Максимальное число игроков
        /// </summary>
        public int MaxPlayersCount { get; set; }

        /// <summary>
        /// Имя ведущего
        /// </summary>
        public string GameMasterName { get; set; }

        /// <summary>
        /// Создать из данных об игровом сеансе
        /// </summary>
        /// <param name="session">Игровой сеанс</param>
        /// <returns>Информация о сеансе</returns>
        public static SessionInfo FromGameSession(GameSession session)
        {
            return new SessionInfo()
            {
                Id = session.Id,
                GameName = session.GameId,
                PlayersCount = session.Players.Count,
                MaxPlayersCount = session.Room.PlayerSeats.Length,
                StartedAt = session.StartedAt,
                GameMasterName = session.Master.Name
            };
        }
    }
}
