using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using OnlinePlatform.Platform.Dto;
using OnlinePlatform.Platform.Primitives;

namespace OnlinePlatform.Platform.Interaction
{
    #region Базовые определения
    /// <summary>
    /// Элемент обмена данными с клиентом
    /// </summary>
    public abstract class GameMessage
    {
        private static MessageConverter converter;

        public const string TagSessionStarted = "session_start";
        public const string TagClientReady = "init_done";
        public const string TagClientConnected = "connected";
        public const string TagClientDisconnected = "away";
        public const string TagMessage = "text_message";
        public const string TagPlayerTurn = "turn";
        public const string TagAddObjects = "add_objects";
        public const string TagRemoveObjects = "remove_objects";
        public const string TagMoveObject = "move_object";
        public const string TagPropertyChanged = "prop_change";
        public const string TagRtcMessage = "rtc";

        /// <summary>
        /// Идентификатор отправителя
        /// </summary>
        public Guid SenderId { get; set; }

        /// <summary>
        /// Преобразовать сообщение в массив байтов
        /// </summary>
        /// <returns>Байты данных, представляющие сообщение</returns>
        public byte[] ToBytes()
        {
            var settings = new JsonSerializerSettings()
            {
                Converters = new[] { converter },
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            };
            string msgJson = JsonConvert.SerializeObject(this, settings);

            return Encoding.UTF8.GetBytes(msgJson);
        }

        /// <summary>
        /// Создать сообщение из байтов данных
        /// </summary>
        /// <param name="data">Данные сообщения</param>
        /// <returns>Входящее игровое сообщение</returns>
        public static IncomingMessage FromBytes(byte[] data)
        {
            string msgJson = Encoding.UTF8.GetString(data).TrimEnd('\0');

            // Преобразовать JSON в игровое сообщение
            return JsonConvert.DeserializeObject<IncomingMessage>(msgJson, converter);
        }

        static GameMessage()
        {
            converter = new MessageConverter();
        }
    }

    /// <summary>
    /// Входящее сообщение (для обработки)
    /// </summary>
    public abstract class IncomingMessage : GameMessage
    {
        /// <summary>
        /// Преобразовать в словарь данных
        /// </summary>
        /// <returns>Словарь данных для обработки скриптом</returns>
        public abstract Dictionary<string, object> ToDictionary();
    }

    /// <summary>
    /// Исходящее сообщение (после обработки)
    /// </summary>
    public abstract class OutgoingMessage : GameMessage
    {
        /// <summary>
        /// Отметка о типе сообщения
        /// </summary>
        public string Tag { get; set; }
    }
    #endregion

    #region Входящие сообщения
    /// <summary>
    /// Наступил таймаут
    /// </summary>
    public class TimeoutElapsed : IncomingMessage
    {
        /// <summary>
        /// Сколько секунд прошло
        /// </summary>
        public int Seconds { get; set; }

        /// <summary>
        /// Преобразовать в словарь данных
        /// </summary>
        /// <returns>Словарь данных для скрипта</returns>
        public override Dictionary<string, object> ToDictionary()
        {
            return new Dictionary<string, object> { { "seconds", Seconds } };
        }

        public TimeoutElapsed(int seconds)
        {
            Seconds = seconds;
        }
    }

    /// <summary>
    /// Клиент инициализирован
    /// </summary>
    public class ClientInitialized : IncomingMessage
    {
        /// <summary>
        /// Преобразовать в словарь данных
        /// </summary>
        /// <returns>Словарь данных для скрипта</returns>
        public override Dictionary<string, object> ToDictionary()
        {
            return new Dictionary<string, object>();
        }
    }

    /// <summary>
    /// Игровой сеанс запущен
    /// </summary>
    public class SessionStarted : IncomingMessage
    {
        /// <summary>
        /// Преобразовать в словарь данных
        /// </summary>
        /// <returns>Словарь данных для скрипта</returns>
        public override Dictionary<string, object> ToDictionary()
        {
            return new Dictionary<string, object>();
        }
    }

    /// <summary>
    /// Произвольное игровое сообщение
    /// </summary>
    public class CustomMessage : IncomingMessage
    {
        /// <summary>
        /// Идентификатор сообщения
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Полезная нагрузка сообщения
        /// </summary>
        public Dictionary<string, object> Payload { get; set; }

        /// <summary>
        /// Преобразовать в словарь данных
        /// </summary>
        /// <returns>Словарь данных для скрипта</returns>
        public override Dictionary<string, object> ToDictionary() => Payload;
    }

    /// <summary>
    /// Сообщение клиента WebRTC
    /// </summary>
    public class WebRtcMessage : IncomingMessage
    {
        /// <summary>
        /// Определитель типа
        /// </summary>
        public string Tag { get; set; }

        /// <summary>
        /// Тип сообщения
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        /// Полезная нагрузка
        /// </summary>
        public object Payload { get; set; }

        /// <summary>
        /// Получатель сообщения
        /// </summary>
        public Guid TargetId { get; set; }

        /// <summary>
        /// Преобразовать в словарь данных
        /// </summary>
        /// <returns>Не поддерживается</returns>
        public override Dictionary<string, object> ToDictionary() =>
            throw new NotImplementedException();

        public WebRtcMessage()
        {
            this.Tag = GameMessage.TagRtcMessage;
        }
    }
    #endregion

    #region Исходящие сообщения
    /// <summary>
    /// Подключен новый клиент
    /// </summary>
    public class ClientConnected : OutgoingMessage
    {
        /// <summary>
        /// Информация о подключенном клиенте
        /// </summary>
        public Player NewPlayer { get; set; }

        public ClientConnected(Player player)
        {
            SenderId = player.Id;
            NewPlayer = player;
            Tag = TagClientConnected;
        }
    }

    /// <summary>
    /// Клиент отключился (временно)
    /// </summary>
    public class ClientDisconnected : OutgoingMessage
    {
        public ClientDisconnected(Player player)
        {
            this.SenderId = player.Id;
            Tag = TagClientDisconnected;
        }
    }

    /// <summary>
    /// Отправить сообщение игроку (игрокам)
    /// </summary>
    public class ShowMessage : OutgoingMessage
    {
        /// <summary>
        /// Текст сообщения для показа
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// Длительность показа (секунд)
        /// </summary>
        public int? Duration { get; set; }

        public ShowMessage(string text, int? showDuration)
        {
            this.Message = text;
            this.Duration = showDuration;
            this.Tag = TagMessage;
        }
    }

    /// <summary>
    /// К игроку перешел ход
    /// </summary>
    public class PlayerTurn : OutgoingMessage
    {
        /// <summary>
        /// Идентификатор игрока, к которому перешел ход
        /// </summary>
        public Guid PlayerId { get; set; }

        public PlayerTurn(Player player)
        {
            PlayerId = player.Id;
            Tag = TagPlayerTurn;
        }
    }

    /// <summary>
    /// Изменение свойства сеанса
    /// </summary>
    public class SessionPropertyChange : OutgoingMessage
    {
        /// <summary>
        /// Название свойства
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Значение измененного свойства
        /// </summary>
        public string Value { get; set; }

        public SessionPropertyChange(string name, string value)
        {
            this.Tag = TagPropertyChanged;
            this.Name = name;
            this.Value = value;
        }
    }

    /// <summary>
    /// Добавить объект(ы) на поле
    /// </summary>
    public class AddObjects : OutgoingMessage
    {
        // Оригинальные объекты для добавления
        private List<GameObject> objects;

        /// <summary>
        /// Идентификатор игрока, которому добавляются объекты
        /// </summary>
        public Guid? PlayerId { get; set; }

        /// <summary>
        /// Добавляемые на сцену объекты
        /// </summary>
        public List<GameObjectDto> AddingObjects { get; set; }

        /// <summary>
        /// Выдать оригинальную информацию добавляемых общектов
        /// </summary>
        /// <returns>Список добавляех объектов</returns>
        public IList<GameObject> GetOrigObjects() => objects;

        public AddObjects(List<GameObject> objects)
        {
            Tag = TagAddObjects;
            this.objects = objects;

            var dtos = objects.Select(o => GameObjectDto.CreateFromObject(o)).ToList();
            AddingObjects = dtos;
        }
    }

    /// <summary>
    /// Удалить объект(ы) с поля
    /// </summary>
    public class RemoveObjects : OutgoingMessage
    {
        /// <summary>
        /// Идектификаторы удаляемых объектов
        /// </summary>
        public string[] ObjectIds { get; set; }

        public RemoveObjects(string[] objectIds)
        {
            Tag = TagRemoveObjects;
            ObjectIds = objectIds;
        }
    }

    /// <summary>
    /// Переместить объект
    /// </summary>
    public class MoveObject : OutgoingMessage
    {
        /// <summary>
        /// Идентификатор перемещаемого объекта
        /// </summary>
        public string ObjectId { get; set; }

        /// <summary>
        /// Конечная координата
        /// </summary>
        public Vector TargetPosition { get; set; }

        /// <summary>
        /// Коненый угол поворота
        /// </summary>
        public Vector TargetRotation { get; set; }

        /// <summary>
        /// Идентификатор новой раскладки, куда помещается объект
        /// </summary>
        public string TargetLayoutId { get; set; }

        public MoveObject(string objectId)
        {
            Tag = TagMoveObject;
            this.ObjectId = objectId;
        }
    }

    /// <summary>
    /// Добавить определения новых объектов
    /// </summary>
    public class AddDefinitions : OutgoingMessage
    {
        /// <summary>
        /// Имя определения-шаблона
        /// </summary>
        public string TemplateDefName { get; set; }

        /// <summary>
        /// Имена новых определений
        /// </summary>
        public string[] NewDefNames { get; set; }

        public AddDefinitions(string tmpl, string[] names)
        {
            TemplateDefName = tmpl;
            NewDefNames = names;
        }
    }
    #endregion
}
