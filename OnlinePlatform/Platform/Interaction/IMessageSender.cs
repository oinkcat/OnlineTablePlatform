using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace OnlinePlatform.Platform.Interaction
{
    /// <summary>
    /// Отправитель сообщений клиентам
    /// </summary>
    public interface IMessageSender
    {
        /// <summary>
        /// Отправить сообщение клиенту
        /// </summary>
        /// <param name="playerId">Идентификатор клиента</param>
        /// <param name="message">Сообщение для отправки</param>
        Task SendMessage(Guid playerId, GameMessage message);

        /// <summary>
        /// Отправить сообщение всем клиентам сеанса
        /// </summary>
        /// <param name="session">Игровой сеанс</param>
        /// <param name="message">Сообщение для отправки</param>
        Task BroadcastMessage(GameSession session, GameMessage message);
    }
}
