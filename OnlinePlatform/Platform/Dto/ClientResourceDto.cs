using System;

namespace OnlinePlatform.Platform.Dto
{
    /// <summary>
    /// Объект передачи данных для клиентского ресурса
    /// </summary>
    public class ClientResourceDto
    {
        /// <summary>
        /// Идентификатор ресурса
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Идентификатор типа ресурса
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        /// Содержимое ресурса
        /// </summary>
        public object Content { get; set; }
    }
}
