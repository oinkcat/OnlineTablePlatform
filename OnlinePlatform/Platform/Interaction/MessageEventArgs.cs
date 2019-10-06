using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using OnlinePlatform.Platform.Processing;

namespace OnlinePlatform.Platform.Interaction
{
    /// <summary>
    /// Аргумент события наличия сообщения для отправки клиентам
    /// </summary>
    public class MessageEventArgs : EventArgs
    {
        /// <summary>
        /// Адресаты сообщения
        /// </summary>
        public ISet<Player> TargetPlayers { get; set; }

        /// <summary>
        /// Сообщения для отправки
        /// </summary>
        public OutgoingMessage Message { get; set; }

        /// <summary>
        /// Создать из данных объекта изменения состояния
        /// </summary>
        /// <param name="change">Объект изменения состояния</param>
        /// <returns>Аргумент события отправки сообщения клиенту</returns>
        public static MessageEventArgs CreateFromChange(StateChange change)
        {
            if (change.TargetType == SendTargetType.Everyone)
            {
                return new MessageEventArgs(change.ChangeMessage);
            }
            else
            {
                return new MessageEventArgs(change.ChangeMessage, change.SendTargets);
            }
        }

        public MessageEventArgs(OutgoingMessage message, IList<Player> targets)
        {
            Message = message;
            TargetPlayers = new HashSet<Player>(targets);
        }

        public MessageEventArgs(OutgoingMessage message)
        {
            Message = message;
        }
    }
}
