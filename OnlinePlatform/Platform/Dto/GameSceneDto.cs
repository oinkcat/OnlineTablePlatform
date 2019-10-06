using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using OnlinePlatform.Platform.Primitives;

namespace OnlinePlatform.Platform.Dto
{
    /// <summary>
    /// Объект передачи данных для игровой сцены
    /// </summary>
    public class GameSceneDto
    {
        /// <summary>
        /// Идентификатор сцены
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Объект окружения
        /// </summary>
        public string SkyboxName { get; set; }

        /// <summary>
        /// Точка, на которую направлена камера
        /// </summary>
        public Vector CameraTarget { get; set; }

        /// <summary>
        /// Начальная дистанция от центра поля
        /// </summary>
        public double Distance { get; set; }

        /// <summary>
        /// Координаты мест за игровым столом
        /// </summary>
        public IEnumerable<Vector> Seats { get; set; }

        /// <summary>
        /// Точки обзора
        /// </summary>
        public IEnumerable<PointOfView> POVs { get; set; }

        /// <summary>
        /// Информация об источниках света
        /// </summary>
        public IEnumerable<Light> Lights { get; set; }

        /// <summary>
        /// Объекты на поле
        /// </summary>
        public IEnumerable<GameObjectDto> Objects { get; set; }

        /// <summary>
        /// Создать объект передачи данных из информации о "комнате"
        /// </summary>
        /// <param name="room">Игровая "комната"</param>
        /// <param name="player">Игрок, для которого выдать данные</param>
        /// <returns>Объект передачи данных о сцене</returns>
        public static GameSceneDto CreateFromRoom(GameRoom room, Player player)
        {
            var playerEntities = room.Entities.Where(e => e.PrivateOwner == null ||
                                                          e.PrivateOwner == player);

            var allObjects = room.Interior.Concat(playerEntities)
                .Select(obj => GameObjectDto.CreateFromObject(obj));

            return new GameSceneDto()
            {
                Id = room.PresentationMetadata.Name,
                SkyboxName = room.PresentationMetadata.SkyboxName,
                CameraTarget = room.PresentationMetadata.LookAtPoint,
                Distance = room.PresentationMetadata.Distance,
                Seats = room.PresentationMetadata.Seats,
                POVs = room.PresentationMetadata.PointsOfView,
                Lights = room.PresentationMetadata.Lights,
                Objects = allObjects
            };
        }
    }
}
