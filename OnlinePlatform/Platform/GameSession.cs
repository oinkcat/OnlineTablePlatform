using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using OnlinePlatform.Platform.Interaction;
using OnlinePlatform.Platform.Processing;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Состояние игрового сеанса
    /// </summary>
    public enum SessionState
    {
        Created,
        Started,
        Ended
    }

    /// <summary>
    /// Сообщение текстового чата
    /// </summary>
    public class TextChatMessage
    {
        /// <summary>
        /// Отправитель сообщения
        /// </summary>
        public Player Sender { get; set; }

        /// <summary>
        /// Текст сообщения
        /// </summary>
        public string Text { get; set; }
    }

    /// <summary>
    /// Сеанс игры
    /// </summary>
    public class GameSession
    {
        // Обработчик сообщений игры
        private GameMessagesProcessor messagesProcessor;

        // Пакет данных игры
        private GamePackage package;

        /// <summary>
        /// Идентификатор сеанса
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Идентификатор игры
        /// </summary>
        public string GameId { get; set; }

        /// <summary>
        /// Временная метка начала игры
        /// </summary>
        public DateTime StartedAt { get; set; }

        /// <summary>
        /// Состояние сеанса
        /// </summary>
        public SessionState State { get; set; }

        /// <summary>
        /// Ведущий
        /// </summary>
        public GameMaster Master { get; set; }

        /// <summary>
        /// Участвующие игроки
        /// </summary>
        public List<Player> Players { get; private set; }

        /// <summary>
        /// Игрок, чей сейчас ход
        /// </summary>
        public Player ActivePlayer { get; set; }

        /// <summary>
        /// Менеджер ресурсов
        /// </summary>
        public ObjectsManager ResourceManager { get; set; }

        /// <summary>
        /// Игровая "комната"
        /// </summary>
        public GameRoom Room { get; set; }

        /// <summary>
        /// Дополнительные свойства
        /// </summary>
        public Dictionary<string, string> PropertyBag { get; set; }

        /// <summary>
        /// Текстовые сообщения чата
        /// </summary>
        public List<TextChatMessage> ChatMessages { get; set; }

        /// <summary>
        /// Поступило сообщение для отправки клиентам
        /// </summary>
        public event EventHandler<MessageEventArgs> GotMessageToSend;

        /// <summary>
        /// Выдать игрока его идентификатору
        /// </summary>
        /// <param name="id">Идентификатор игрока</param>
        /// <returns>Игрок с заданным идентификатором</returns>
        public Player GetPlayerById(Guid id)
        {
            return Players.FirstOrDefault(p => p.Id == id);
        }

        /// <summary>
        /// Добавить нового игрока
        /// </summary>
        /// <param name="newPlayer">Добавляемый игрок</param>
        public void AddPlayer(Player newPlayer)
        {
            // Найти свободное место
            var freeSeats = Room.PlayerSeats.Select((p, i) => (p, i).ToTuple())
                .Where(pair => pair.Item1 == null)
                .Select(pair => pair.Item2).ToArray();

            if (freeSeats.Length > 0)
            {
                newPlayer.SeatIndex = freeSeats[new Random().Next(freeSeats.Length)];
                Room.PlayerSeats[newPlayer.SeatIndex] = newPlayer;
            }
            else
            {
                throw new InvalidOperationException("No free seats!");
            }

            Players.Add(newPlayer);
        }

        /// <summary>
        /// Удалить игрока
        /// </summary>
        /// <param name="playerToRemove">Удаляемый игрок</param>
        public void RemovePlayer(Player playerToRemove)
        {
            Players.Remove(playerToRemove);
            Room.PlayerSeats[playerToRemove.SeatIndex] = null;
        }

        /// <summary>
        /// Обработать игровое сообщение и изменить состояние сеанса
        /// </summary>
        /// <param name="message">Игровое сообщение для обработки</param>
        public void ProcessGameMessage(IncomingMessage message)
        {
            messagesProcessor.Process(message);
        }

        /// <summary>
        /// Начать игровой сеанс
        /// </summary>
        public void StartInteractivity()
        {
            messagesProcessor.LoadAndRunScript(package.OpenServerScriptFile());
        }

        // Применить изменение
        private void ApplyChange(OutgoingMessage changeMessage)
        {
            if(changeMessage is AddObjects addObjMsg)
            {
                // Добавление новых сущностей
                var objectsToAdd = addObjMsg.GetOrigObjects();
                Room.Entities.AddRange(objectsToAdd);
            }
            else if(changeMessage is RemoveObjects delObjMsg)
            {
                // Удаление сущностей
                var objectsToRemove = Room.GetEntitiesById(delObjMsg.ObjectIds);
                foreach(var obj in objectsToRemove)
                {
                    Room.Entities.Remove(obj);
                }
            }
            else if(changeMessage is SessionPropertyChange propMsg)
            {
                // Изменение свойства
                PropertyBag[propMsg.Name] = propMsg.Value;
            }
            else if(changeMessage is MoveObject moveMsg)
            {
                // Перемещение объекта
                var gameObj = Room.GetEntitiesById(moveMsg.ObjectId).First();

                if(moveMsg.TargetPosition != null)
                {
                    gameObj.Position = moveMsg.TargetPosition;
                }
                if(moveMsg.TargetRotation != null)
                {
                    gameObj.Rotation = moveMsg.TargetRotation;
                }
                if(moveMsg.TargetLayoutId != null)
                {
                    gameObj.LayoutId = moveMsg.TargetLayoutId;
                }
            }
            else if(changeMessage is PlayerTurn turnMsg)
            {
                // Смена очередности хода
                ActivePlayer = GetPlayerById(turnMsg.PlayerId);
            }
            else if(changeMessage is AddDefinitions newDefsMsg)
            {
                // Добавление новых определений
                string tmpl = newDefsMsg.TemplateDefName;
                ResourceManager.AddDefinitionClones(tmpl, newDefsMsg.NewDefNames);
            }
        }

        // Игровое сообщение обработано
        private void MessageProcessed(object sender, MessageProcessedEventArgs e)
        {
            // Аргументы сообщений, которые будут отправлены позже
            var changesForClients = new List<StateChange>();

            // Изменить состояние сервера
            foreach(var change in e.Changes)
            {
                ApplyChange(change.ChangeMessage);

                // Добавить к отправляемым сообщениям
                if(change.TargetType != SendTargetType.NoOne)
                {
                    changesForClients.Add(change);
                }
            }

            // Отправить сообщения клиентам
            foreach(var clientChange in changesForClients)
            {
                var args = MessageEventArgs.CreateFromChange(clientChange);
                GotMessageToSend?.Invoke(this, args);
            }
        }

        public GameSession(GamePackage gamePkg)
        {
            this.package = gamePkg;

            Id = Guid.NewGuid();
            GameId = gamePkg.Name;
            StartedAt = DateTime.Now;
            Players = new List<Player>();
            PropertyBag = new Dictionary<string, string>();
            ChatMessages = new List<TextChatMessage>();

            messagesProcessor = new GameMessagesProcessor(this);
            messagesProcessor.MessageProcessed += MessageProcessed;
        }
    }
}
