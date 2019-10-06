using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Net.WebSockets;
using Microsoft.Extensions.Logging;
using OnlinePlatform.Platform;
using OnlinePlatform.Platform.Interaction;

namespace OnlinePlatform.Services
{
    /// <summary>
    /// Управляет подключениями WebSocket к серверу
    /// </summary>
    public class WSManager : IMessageSender
    {
        // Размер буфера сообщений
        private const int MessageBufferSize = 4096;

        // Активные соединения
        private ConcurrentDictionary<Guid, (WebSocket, ClientHandler)> connections;

        // Контекст данных пользователя
        private UserContext userCtx;

        // Записывает информацию в лог (TODO!!!)
        private ILogger logger;

        /// <summary>
        /// Отправить сообщение клиенту
        /// </summary>
        /// <param name="playerId">Идентификатор игрока</param>
        /// <param name="message">Сообщение для отправки</param>
        public async Task SendMessage(Guid playerId, GameMessage message)
        {
            if(connections.ContainsKey(playerId))
            {
                var (client, _) = connections[playerId];
                await SendBytes(client, message.ToBytes());
            }
        }

        /// <summary>
        /// Послать сообщение всем клиентам
        /// </summary>
        /// <param name="session">Сеанс для отправки</param>
        /// <param name="message">Сообщение для отправки</param>
        public async Task BroadcastMessage(GameSession session, GameMessage message)
        {
            byte[] data = message.ToBytes();

            foreach(var player in session.Players)
            {
                if(connections.ContainsKey(player.Id))
                {
                    var (client, _) = connections[player.Id];
                    await SendBytes(client, data);
                }
            }
        }

        /// <summary>
        /// Принимать сообщения от подключенного клиента
        /// </summary>
        /// <param name="client">Клиент WebSocket</param>
        public async Task HandleClientMessages(WebSocket client)
        {
            // Информация о клиенте
            var clientGameSession = userCtx.GetGameSession();
            var player = clientGameSession.GetPlayerById(userCtx.PlayerId);
            var msgHandler = new ClientHandler(player, clientGameSession, this);

            // Добавить обработчик соединения
            var connInfo = (client, msgHandler);
            connections.AddOrUpdate(player.Id, connInfo, (_id, _prev) => connInfo);

            try
            {
                await ClientDataLoop(client, msgHandler);
            }
            finally
            {
                // Удалить обработчик соединения
                connections.Remove(player.Id, out var _dummy);
                await msgHandler.ProcessDisconnect();
                msgHandler.Dispose();
            }
        }

        // Цикл получений и ответов на сообщения
        private async Task ClientDataLoop(WebSocket client, ClientHandler handler)
        {
            bool running = true;

            do
            {
                var buffer = new byte[MessageBufferSize];
                var piece = new ArraySegment<byte>(new byte[MessageBufferSize]);

                WebSocketReceiveResult resp = null;
                bool fullMessageReceived = false;
                int receivedTotal = 0;

                // Принимать все фрагменты сообщения
                while (!fullMessageReceived)
                {
                    resp = await client.ReceiveAsync(piece, CancellationToken.None);
                    Array.Copy(piece.Array, 0, buffer, receivedTotal, resp.Count);
                    receivedTotal += resp.Count;
                    fullMessageReceived = resp.EndOfMessage;
                }

                if (resp.MessageType == WebSocketMessageType.Text)
                {
                    var message = GameMessage.FromBytes(buffer);
                    await handler.ProcessMessage(message);
                }
                else if (resp.MessageType == WebSocketMessageType.Close)
                {
                    running = false;
                }
            }
            while (running);
        }

        // Отправить массив данных клиенту
        private async Task SendBytes(WebSocket client, byte[] data)
        {
            var buffer = new ArraySegment<byte>(data);
            var ct = CancellationToken.None;
            await client.SendAsync(buffer, WebSocketMessageType.Text, true, ct);
        }

        public WSManager(UserContext userCtx)
        {
            connections = new ConcurrentDictionary<Guid, (WebSocket, ClientHandler)>();
            this.userCtx = userCtx;
        }
    }
}
