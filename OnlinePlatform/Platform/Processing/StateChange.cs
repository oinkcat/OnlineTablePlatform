using System;
using OnlinePlatform.Platform.Interaction;

namespace OnlinePlatform.Platform.Processing
{
    /// <summary>
    /// Цель отправки сообщения
    /// </summary>
    public enum SendTargetType
    {
        NoOne,
        Everyone,
        Some
    }

    /// <summary>
    /// Объект, представляющий изменение состояния
    /// </summary>
    public class StateChange
    {
        /// <summary>
        /// Сообщение изменения состояния
        /// </summary>
        public OutgoingMessage ChangeMessage { get; set; }

        /// <summary>
        /// Тип цели для отправки сообщения
        /// </summary>
        public SendTargetType TargetType { get; set; }

        /// <summary>
        /// Игроки, которым послать сообщение
        /// </summary>
        public Player[] SendTargets { get; set; }

        /// <summary>
        /// Создать объект изменения состояния для внутреннего использования
        /// </summary>
        /// <param name="message">Сообщение изменения</param>
        /// <returns>Объект изменения состояния</returns>
        public static StateChange CreateInternal(OutgoingMessage message)
        {
            return new StateChange(message)
            {
                TargetType = SendTargetType.NoOne
            };
        }

        /// <summary>
        /// Создать объект изменения состояния для передачи всем клиентам
        /// </summary>
        /// <param name="message">Сообщение изменения</param>
        /// <returns>Объект изменения состояния</returns>
        public static StateChange CreateBroadcast(OutgoingMessage message)
        {
            return new StateChange(message)
            {
                TargetType = SendTargetType.Everyone
            };
        }

        /// <summary>
        /// Создать объект изменения состояния для передачи некоторым клиентам
        /// </summary>
        /// <param name="message">Сообщение изменения</param>
        /// <param name="targets">Игроки-получатели сообщения</param>
        /// <returns></returns>
        public static StateChange CreateFor(OutgoingMessage message, Player[] targets)
        {
            return new StateChange(message)
            {
                TargetType = SendTargetType.Some,
                SendTargets = targets
            };
        }

        public StateChange(OutgoingMessage message)
        {
            ChangeMessage = message;
        }
    }
}
