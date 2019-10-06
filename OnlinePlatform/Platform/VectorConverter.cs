using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using OnlinePlatform.Platform.Primitives;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Конвертирует трехэлементный массив в вектор
    /// </summary>
    public class VectorConverter : JsonConverter
    {
        public override bool CanConvert(Type objectType)
        {
            return objectType == typeof(Vector);
        }

        public override object ReadJson(JsonReader reader, Type objectType,
                                        object existingValue, JsonSerializer serializer)
        {
            var array = JArray.Load(reader);
            return new Vector(array[0].Value<double>(),
                              array[1].Value<double>(),
                              array[2].Value<double>());
        }

        public override void WriteJson(JsonWriter writer, object value,
                                       JsonSerializer serializer)
        {
            var vectorValue = value as Vector;

            writer.WriteStartArray();
            writer.WriteValue(vectorValue.X);
            writer.WriteValue(vectorValue.Y);
            writer.WriteValue(vectorValue.Z);
            writer.WriteEndArray();
        }
    }
}
