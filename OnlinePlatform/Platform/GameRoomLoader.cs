using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json;
using OnlinePlatform.Platform.Dto;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Загружает игровую комнату
    /// </summary>
    public class GameRoomLoader
    {
        // Пакет игры
        private GamePackage package;

        /// <summary>
        /// Загрузить данные игровой комнаты
        /// </summary>
        /// <param name="manager">Менеджер объектов</param>
        /// <returns>Загруженная игровая комната</returns>
        public async Task<GameRoom> Load(ObjectsManager manager)
        {
            string contents = await package.ReadSceneDescription();

            var converter = new VectorConverter();
            var dto = JsonConvert.DeserializeObject<GameSceneDto>(contents, converter);

            return GameRoom.CreateFromDto(dto, manager);
        }

        public GameRoomLoader(GamePackage pkg)
        {
            package = pkg;
        }
    }
}
