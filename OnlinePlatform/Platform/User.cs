using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Пользователь системы
    /// </summary>
    public abstract class User
    {
        /// <summary>
        /// Идентификатор пользователя
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Имя пользователя
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Дополнительные свойства
        /// </summary>
        public Dictionary<string, string> PropertyBag { get; set; }

        /// <summary>
        /// Проверить на соответствие другому объекту пользователя
        /// </summary>
        /// <param name="obj">Проверяемый объект</param>
        /// <returns>Соответствие по идентификатору пользователя</returns>
        public override bool Equals(object obj)
        {
            if(obj is User otherUser)
            {
                return this.Id == otherUser.Id;
            }
            else
            {
                return false;
            }
        }

        /// <summary>
        /// Получить хэш-код объекта
        /// </summary>
        /// <returns>Уникальный код объекта</returns>
        public override int GetHashCode()
        {
            return this.Id.GetHashCode();
        }

        /// <summary>
        /// Создать нового игрока
        /// </summary>
        /// <param name="name">Имя игрока</param>
        /// <returns>Пользователь-игрок</returns>
        public static Player CreatePlayer(string name) => new Player {
            Id = Guid.NewGuid(),
            Name = name
        };

        /// <summary>
        /// Создать нового ведущего игры
        /// </summary>
        /// <param name="name">Имя ведущего</param>
        /// <returns>Пользователь-ведущий игры</returns>
        public static GameMaster CreateGameMaster(string name) => new GameMaster {
            Id = Guid.NewGuid(),
            Name = name
        };
    }

    /// <summary>
    /// Игрок
    /// </summary>
    public class Player : User
    {
        /// <summary>
        /// Индекс места за столом
        /// </summary>
        public int SeatIndex { get; set; }

        /// <summary>
        /// Активен ли пользователь
        /// </summary>
        public bool IsActive { get; set; }

        public Player()
        {
            PropertyBag = new Dictionary<string, string>();
            IsActive = true;
        }
    }

    /// <summary>
    /// Ведущий игры
    /// </summary>
    public class GameMaster : User
    {
        public GameMaster()
        {
            PropertyBag = new Dictionary<string, string>();
        }
    }
}
