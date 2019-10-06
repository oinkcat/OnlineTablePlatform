using System;
using System.Collections.Generic;
using System.Linq;
using OnlinePlatform.Platform.Dto;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Игровая "комната"
    /// </summary>
    public class GameRoom
    {
        /// <summary>
        /// Дополнительная информация для представления сцены
        /// </summary>
        public SceneMetadata PresentationMetadata { get; set; }

        /// <summary>
        /// Статические объекты (интерьер комнаты)
        /// </summary>
        public List<GameObject> Interior { get; set; }

        /// <summary>
        /// Игровые сущности
        /// </summary>
        public List<GameObject> Entities { get; set; }

        /// <summary>
        /// Имя текущей точки обзора
        /// </summary>
        public string PovName { get; set; }

        /// <summary>
        /// Места игроков
        /// </summary>
        public Player[] PlayerSeats { get; set; }

        /// <summary>
        /// Выдать игровые сущности по их идентификаторам
        /// </summary>
        /// <param name="ids">Идентификаторы запрошенных сущностей</param>
        /// <returns>Запрошенные сущности</returns>
        public IList<GameObject> GetEntitiesById(params string[] ids)
        {
            return Entities.Where(e => ids.Contains(e.Id)).ToArray();
        }

        /// <summary>
        /// Создать из объекта передачи данных
        /// </summary>
        /// <param name="dto">Объект передачи данных</param>
        /// <param name="manager">Менеджер объектов</param>
        /// <returns>Игровая комната</returns>
        public static GameRoom CreateFromDto(GameSceneDto dto, ObjectsManager manager)
        {
            // Преобразование всех объектов
            var allObjects = dto.Objects.Select(o => {
                var newObj = manager.CreateObject(o.Name, o.Id);
                newObj.LayoutId = o.LayoutId;
                newObj.Position = o.Position;
                newObj.Rotation = o.Rotation;
                return newObj;
            });

            var room = new GameRoom(dto.Id)
            {
                Interior = allObjects.Where(o => o.Type == ObjectType.Static).ToList(),
                Entities = allObjects.Where(o => o.Type == ObjectType.Entity).ToList()
            };

            // Параметры представления сцены
            room.PresentationMetadata.LookAtPoint = dto.CameraTarget;
            room.PresentationMetadata.Distance = dto.Distance;
            room.PresentationMetadata.SkyboxName = dto.SkyboxName;
            room.PresentationMetadata.Seats = dto.Seats.ToList();
            room.PresentationMetadata.PointsOfView = dto.POVs.ToList();
            room.PresentationMetadata.Lights = dto.Lights.ToList();

            room.PovName = room.PresentationMetadata.PointsOfView[0].Name;

            // Места для игроков
            room.PlayerSeats = new Player[room.PresentationMetadata.Seats.Count];

            return room;
        }

        public GameRoom(string name)
        {
            PresentationMetadata = new SceneMetadata { Name = name };
        }
    }
}
