using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Models;

namespace OnlinePlatform.ViewModels
{
    /// <summary>
    /// Модель представления главной страницы
    /// </summary>
    public class HomeIndexModel
    {
        /// <summary>
        /// Вошел ли пользователь в какую-либо игру
        /// </summary>
        public bool IsSigned { get; set; }

        /// <summary>
        /// Сеанс игры текущего игрока
        /// </summary>
        public SessionInfo PlayerSession { get; set; }

        /// <summary>
        /// Список доступных игр
        /// </summary>
        public IList<GameInfo> AvailableGames { get; set; }

        /// <summary>
        /// Активные игровые сеансы
        /// </summary>
        public IList<SessionInfo> ActiveSessions { get; set; }
    }
}
