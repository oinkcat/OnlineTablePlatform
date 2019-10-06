using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace OnlinePlatform.Platform.Interaction
{
    /// <summary>
    /// Обработчик сообщений клиента
    /// </summary>
    public class ClientHandler : IDisposable
    {
        // Сеанс игры клиента
        private GameSession session;

        // Данные игрока, представляющие клиента
        private Player player;

        // Отправитель сообщений
        private IMessageSender msgSender;

        /// <summary>
        /// Уникальный идентификатор
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Обработать полученное игровое сообщение
        /// </summary>
        /// <param name="incomingMsg">Входящее сообщение</param>
        public async Task ProcessMessage(IncomingMessage incomingMsg)
        {
            bool needScriptProcessing = true;

            if(incomingMsg is ClientInitialized)
            {
                // Оповестить всех клиентов о новом подключении
                var newPlayer = session.GetPlayerById(incomingMsg.SenderId);
                newPlayer.IsActive = true;
                var notifyMsg = new ClientConnected(newPlayer);
                await msgSender.BroadcastMessage(session, notifyMsg);
            }
            else if(incomingMsg is WebRtcMessage rtcMessage)
            {
                // Передать сообщение WebRTC целевому клиенту
                await msgSender.SendMessage(rtcMessage.TargetId, rtcMessage);
                needScriptProcessing = false;
            }

            // Отправить сообщение на обработку скриптом игры
            if(needScriptProcessing)
            {
                session.ProcessGameMessage(incomingMsg);
            }
        }

        /// <summary>
        /// Обработка отсоединения клиента
        /// </summary>
        public async Task ProcessDisconnect()
        {
            player.IsActive = false;
            var disconnectMessage = new ClientDisconnected(player);
            await msgSender.BroadcastMessage(session, disconnectMessage);
        }

        /// <summary>
        /// Освободить ресурсы
        /// </summary>
        public void Dispose()
        {
            session.GotMessageToSend -= GotMessageToSend;
        }
        
        // Поступило сообщение для отправки из игрового сеанса
        private void GotMessageToSend(object sender, MessageEventArgs e)
        {
            if(e.TargetPlayers == null || e.TargetPlayers.Contains(player))
            {
                msgSender.SendMessage(player.Id, e.Message);
            }
        }

        public ClientHandler(Player player, GameSession session, IMessageSender sender)
        {
            this.player = player;
            this.session = session;
            this.msgSender = sender;
            this.Id = new Random().Next();

            session.GotMessageToSend += GotMessageToSend;
        }
    }
}
