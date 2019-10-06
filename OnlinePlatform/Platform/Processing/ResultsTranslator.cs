using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Platform.Interaction;
using OnlinePlatform.Platform.Primitives;

using ChangeData = System.Collections.Generic.Dictionary<string, object>;

namespace OnlinePlatform.Platform.Processing
{
    /// <summary>
    /// Агрументы события запроса таймаута
    /// </summary>
    public class TimeoutEventArgs : EventArgs
    {
        /// <summary>
        /// Число секунд ожидания
        /// </summary>
        public int SecondsDelay { get; set; }

        public TimeoutEventArgs(int seconds)
        {
            this.SecondsDelay = seconds;
        }
    }

    /// <summary>
    /// Транслятор результатов обработки игровых сообщений
    /// </summary>
    public class ResultsTranslator
    {
        // Поле - тип изменения
        private const string ChangeTypeField = "type";

        // Сеанс игры
        private GameSession session;

        /// <summary>
        /// Был запрошен таймаут
        /// </summary>
        public event EventHandler<TimeoutEventArgs> TimeoutRequested;

        /// <summary>
        /// Перевести результаты обработки в объекты изменения состояния
        /// </summary>
        /// <param name="results">Результаты обработки</param>
        /// <returns>Изменения состояния сервера</returns>
        public IList<StateChange> Translate(object[] results)
        {
            var allChanges = new List<StateChange>();

            foreach (var item in results)
            {
                if (item is ChangeData changeItem)
                {
                    string type = changeItem[ChangeTypeField] as string;
                    var changes = TranslateChange(type, changeItem);
                    allChanges.AddRange(changes);
                }
            }

            return allChanges;
        }

        // Перевети один результат в изменения состояния
        private IList<StateChange> TranslateChange(string type, ChangeData data)
        {
            switch (type)
            {
                case "message":
                    // Показ сообщения клиенту
                    return CreateMessageChanges(data);
                case "new_entity":
                    // Новые объекты
                    return CreateNewEntitiesChanges(data);
                case "remove_entity":
                    // Удаление объектов
                    return CreateRemoveEntitiesChanges(data);
                case "property":
                    // Изменение свойств
                    return CreatePropertyChanges(data);
                case "timeout":
                    // Таймаут
                    int delay = (int)(double)data["seconds"];
                    TimeoutRequested?.Invoke(this, new TimeoutEventArgs(delay));
                    return Array.Empty<StateChange>();
                case "move_entity":
                    // Переместить объект
                    return CreateMoveEntityChanges(data);
                case "turn":
                    // Изменение очередности хода
                    return CreateTurnChange(data);
                case "new_definitions":
                    // Добавление определений объектов
                    return CreateNewEntityDefsChange(data);
                default:
                    throw new NotImplementedException();
            }
        }

        // Создать изменения для отображения сообщения
        private IList<StateChange> CreateMessageChanges(ChangeData data)
        {
            string msgText = data["message"] as string;
            double? duration = data["duration"] as double?;

            if (duration.HasValue)
            {
                duration *= 1000;
            }

            var msgAnswer = new ShowMessage(msgText, (int?)duration);

            return new StateChange[] { CreateChange(msgAnswer, data) };
        }

        // Создать изменения для добавления сущностей на поле
        private IList<StateChange> CreateNewEntitiesChanges(ChangeData data)
        {
            // Создать один объект из его данных
            GameObject createEntityFromData(ChangeData objData)
            {
                string type = objData["name"] as string;
                string id = objData["id"] as string;

                var newEntity = session.ResourceManager.CreateObject(type, id);
                newEntity.LayoutId = objData["layout"] as string;

                newEntity.Position = ConvertCoordsToVector(objData["position"]);
                newEntity.Rotation = ConvertCoordsToVector(objData["rotation"]);

                return newEntity;
            }

            // Создать несколько объектов, либо один
            var newEntities = new List<GameObject>();

            if(data.ContainsKey("entities") && data["entities"] is object[] defs)
            {
                foreach(var entityDef in defs)
                {
                    newEntities.Add(createEntityFromData(entityDef as ChangeData));
                }
            }
            else
            {
                newEntities.Add(createEntityFromData(data));
            }

            var message = new AddObjects(newEntities);

            return new StateChange[] { CreateChange(message, data) };
        }

        // Создать изменения для удаления сущностей
        private IList<StateChange> CreateRemoveEntitiesChanges(ChangeData data)
        {
            var ids = data["entityIds"] as string[];
            var message = new RemoveObjects(ids);

            return new StateChange[] { CreateChange(message, data) };
        }

        // Создать изменения для перемещение сущности
        private IList<StateChange> CreateMoveEntityChanges(ChangeData data)
        {
            string objId = data["entityId"] as string;

            var moveMessage = new MoveObject(objId)
            {
                TargetPosition = ConvertCoordsToVector(data["targetPosition"], false),
                TargetRotation = ConvertCoordsToVector(data["targetRotation"], false),
                TargetLayoutId = data["targetLayout"] as string
            };

            return new StateChange[] { CreateChange(moveMessage, data) };
        }

        // Создать изменения для изменения свойства
        private IList<StateChange> CreatePropertyChanges(ChangeData data)
        {
            string propKey = data["key"] as string;
            string propVal = data["value"] as string;
            var message = new SessionPropertyChange(propKey, propVal);

            return new StateChange[] { CreateChange(message, data) };
        }

        // Создать изменения для изменения очередности хода
        private IList<StateChange> CreateTurnChange(ChangeData data)
        {
            int seatIdx = (int)data["seatIdx"];
            var message = new PlayerTurn(session.Room.PlayerSeats[seatIdx]);

            return new StateChange[] { CreateChange(message, data) };
        }

        // Создать изменения для добавления новых определений сущностей
        private IList<StateChange> CreateNewEntityDefsChange(ChangeData data)
        {
            string templateName = data["template"] as string;
            var defNames = (data["defNames"] as object[]).Cast<string>().ToArray();
            var message = new AddDefinitions(templateName, defNames);

            return new StateChange[] { StateChange.CreateInternal(message) };
        }

        // Создать изменение состояния для заданного сообщения
        private StateChange CreateChange(OutgoingMessage message, ChangeData data)
        {
            object receivers = data["to"];

            if (receivers == null || (receivers as string) == "*")
            {
                return StateChange.CreateBroadcast(message);
            }
            else if (receivers is double[] seatIdxs)
            {
                var targetPlayers = seatIdxs.Cast<int>().Select(idx =>
                {
                    return session.Room.PlayerSeats[idx];
                }).ToArray();
                return StateChange.CreateFor(message, targetPlayers);
            }
            else
            {
                int targetSeatIdx = (int)(double)receivers; // Unboxing
                var targetPlayer = session.Room.PlayerSeats[targetSeatIdx];
                return StateChange.CreateFor(message, new[] { targetPlayer });
            }
        }

        // Преобразовать объект координат в вектор
        private Vector ConvertCoordsToVector(object coords, bool defaultObj = true)
        {
            // Создать вектор из объекта-массива координат
            Vector coordsToVector()
            {
                if (coords is object[] coordsArr)
                {
                    var components = coordsArr.Cast<double>().ToArray();
                    return new Vector(components[0], components[1], components[2]);
                }

                return null;
            }

            if(defaultObj)
            {
                return coordsToVector() ?? new Vector(0, 0, 0);
            }
            else
            {
                return coordsToVector();
            }
        }

        public ResultsTranslator(GameSession session)
        {
            this.session = session;
        }
    }
}
