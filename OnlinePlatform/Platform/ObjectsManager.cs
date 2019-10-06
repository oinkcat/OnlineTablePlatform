using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Threading.Tasks;
using Newtonsoft.Json;

using ClientResource = OnlinePlatform.Platform.Dto.ClientResourceDto;

namespace OnlinePlatform.Platform
{
    /// <summary>
    /// Управляет загрузкой и инициализацией объектов
    /// </summary>
    public class ObjectsManager
    {
        // Счетчик объектов для автоматического именования
        private int objectsCounter;

        // Пакет данных игры
        private GamePackage package;

        // Загруженные определения объектов
        private Dictionary<string, ObjectDefinition> definitions;

        /// <summary>
        /// Ресурсы для клиента
        /// </summary>
        public ClientResource[] ClientResources { get; set; }

        /// <summary>
        /// Выдать список всех определений объектов
        /// </summary>
        /// <returns>Список определений</returns>
        public IReadOnlyList<ObjectDefinition> GetAllDefinitions()
        {
            return definitions.Values.ToList().AsReadOnly();
        }

        /// <summary>
        /// Создать игровой объект с заданным именем
        /// </summary>
        /// <param name="name">Имя создаваемого объекта</param>
        /// <param name="id">Идентификатор создаваемого объекта</param>
        /// <returns>Созданный игровой объект</returns>
        public GameObject CreateObject(string name, string id = null)
        {
            string newObjId = id;
            if(String.IsNullOrEmpty(newObjId))
            {
                newObjId = $"${name}_{objectsCounter}";
                objectsCounter++;
            }

            return definitions[name].CreateObject(newObjId);
        }

        /// <summary>
        /// Создать копии исходного определения с заданными именами
        /// </summary>
        /// <param name="templateName">Имя копируемого определения</param>
        /// <param name="cloneNames">Имена определений-копий</param>
        public void AddDefinitionClones(string templateName, IList<string> cloneNames)
        {
            var template = definitions[templateName];

            foreach(string cloneDefName in cloneNames)
            {
                var newObjDef = template.Clone() as ObjectDefinition;
                newObjDef.Name = cloneDefName;
                definitions.Add(cloneDefName, newObjDef);
            }
        }

        /// <summary>
        /// Загрузить определения объектов
        /// </summary>
        public async Task LoadDefinitions()
        {
            string contents = await package.ReadObjectDescriptions();
            var converter = new VectorConverter();
            var defs = JsonConvert.DeserializeObject<ObjectDefinition[]>(contents, converter);

            // Кэшировать игровые объекты
            foreach(var objDef in defs)
            {
                objDef.Loadable = true;
                definitions.Add(objDef.Name, objDef);
            }
        }

        /// <summary>
        /// Загрузить клиентские ресурсы
        /// </summary>
        public async Task LoadClientResources()
        {
            string contents = await package.ReadClientResources();
            ClientResources = JsonConvert.DeserializeObject<ClientResource[]>(contents);
        }

        public ObjectsManager(GamePackage pkg)
        {
            this.objectsCounter = 0;
            this.package = pkg;
            definitions = new Dictionary<string, ObjectDefinition>();
        }
    }
}
