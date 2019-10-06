using System;
using System.Collections.Generic;
using System.Linq;

namespace OnlinePlatform.Platform.Dto
{
    /// <summary>
    /// Объект передачи данных для состояния игры
    /// </summary>
    public class GameStateDto
    {
        /// <summary>
        /// Идентификатор сеанса
        /// </summary>
        public Guid SessionId { get; set; }

        /// <summary>
        /// Идентификатор текущего игрока
        /// </summary>
        public Guid PlayerId { get; set; }

        /// <summary>
        /// Идентификатор игрока, чей сейчас ход
        /// </summary>
        public Guid? ActivePlayerId { get; set; }

        /// <summary>
        /// URI сервера пересылки сообщений
        /// </summary>
        public string MessageServerUri { get; set; }

        /// <summary>
        /// Ведущий игры
        /// </summary>
        public GameMaster Master { get; set; }

        /// <summary>
        /// Игроки
        /// </summary>
        public IEnumerable<Player> Players { get; set; }

        /// <summary>
        /// Определения объектов
        /// </summary>
        public IEnumerable<ObjectDefinition> ObjectDefinitions { get; set; }

        /// <summary>
        /// Игровая сцена
        /// </summary>
        public GameSceneDto RoomScene { get; set; }

        /// <summary>
        /// Клиентские ресурсы
        /// </summary>
        public IEnumerable<ClientResourceDto> ClientResources { get; set; }

        /// <summary>
        /// Дополнительные свойства
        /// </summary>
        public Dictionary<string, string> PropertyBag { get; set; }

        /// <summary>
        /// Создать из сеанса игры
        /// </summary>
        /// <param name="session">Сеанс игры</param>
        /// <param name="player">Игрок, для которого выдать данные</param>
        /// <returns>Объект передачи данных состояния</returns>
        public static GameStateDto CreateFromSession(GameSession session, Player player)
        {
            var allDefinitions = session.ResourceManager.GetAllDefinitions();

            return new GameStateDto()
            {
                SessionId = session.Id,
                Master = session.Master,
                Players = session.Players,
                PlayerId = player.Id,
                ActivePlayerId = session.ActivePlayer?.Id,
                PropertyBag = session.PropertyBag,
                ObjectDefinitions = allDefinitions,
                ClientResources = session.ResourceManager.ClientResources,
                RoomScene = GameSceneDto.CreateFromRoom(session.Room, player)
            };
        }
    }
}
