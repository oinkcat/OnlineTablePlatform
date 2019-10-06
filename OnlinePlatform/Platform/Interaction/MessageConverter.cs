using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using AnyDict = System.Collections.Generic.Dictionary<string, object>;

namespace OnlinePlatform.Platform.Interaction
{
    /// <summary>
    /// Преобразовать игровое сообщение в JSON и обратно
    /// </summary>
    public class MessageConverter : JsonConverter
    {
        // Название поля идентификатора клиента
        private const string SenderIdField = "senderId";

        /// <summary>
        /// Возможно ли использовать конвертер
        /// </summary>
        /// <param name="objectType">Тип конвертируемого объекта</param>
        public override bool CanConvert(Type objectType)
        {
            return objectType == typeof(IncomingMessage);
        }

        /// <summary>
        /// Преобразовать строковое представление в игровое сообщение
        /// </summary>
        public override object ReadJson(JsonReader reader, Type objectType,
                                        object existingValue,
                                        JsonSerializer serializer)
        {
            var jsonObj = JObject.Load(reader);
            var objReader = jsonObj.CreateReader();
            string typeTag = jsonObj["tag"].Value<string>();

            // Распознать входящее сообщение по тегу типа
            if(typeTag == GameMessage.TagClientReady)
            {
                return serializer.Deserialize<ClientInitialized>(objReader);
            }
            else if(typeTag == GameMessage.TagRtcMessage)
            {
                return serializer.Deserialize<WebRtcMessage>(objReader);
            }
            else
            {
                var customMsg = new CustomMessage()
                {
                    Id = typeTag,
                    SenderId = Guid.Parse(jsonObj[SenderIdField].Value<String>())
                };
                customMsg.Payload = serializer.Deserialize<AnyDict>(objReader);

                // Удалить ненужные поля
                customMsg.Payload.Remove(SenderIdField);

                return customMsg;
            }
        }

        /// <summary>
        /// Преобразовать игровое сообщение в строковое сообщение
        /// </summary>
        /// <param name="writer"></param>
        /// <param name="value"></param>
        /// <param name="serializer"></param>
        public override void WriteJson(JsonWriter writer, object value,
                                       JsonSerializer serializer)
        {
            throw new NotImplementedException();
        }
    }
}
