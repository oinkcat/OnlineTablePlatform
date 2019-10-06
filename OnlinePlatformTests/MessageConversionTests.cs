using System.Text;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OnlinePlatform.Platform.Interaction;

namespace OnlinePlatformTests
{
    /// <summary>
    /// Тесты конвертации JSON в игровые сообщения
    /// </summary>
    [TestClass]
    public class MessageConversionTests
    {
        /// <summary>
        /// Тест конвертации сообщения инициализации клиента
        /// </summary>
        [TestMethod]
        public void TestJsonToInitializedMessage()
        {
            string clientInitializedJson = @"{
                tag: ""init_done"",
                senderId: ""726288bd-a6a0-41de-bbba-96fe63bab1c7""
            }";
            var msgBytes = Encoding.UTF8.GetBytes(clientInitializedJson);

            var message = GameMessage.FromBytes(msgBytes);
            Assert.IsInstanceOfType(message, typeof(ClientInitialized));
        }

        /// <summary>
        /// Тест конвертации произвольного игрового сообщения
        /// </summary>
        [TestMethod]
        public void TestJsonToCustomMessage()
        {
            string customJson = @"{
                tag: ""oink"",
                senderId: ""726288bd-a6a0-41de-bbba-96fe63bab1c7"",
                foo: ""bar"",
                value: 12345
            }";
            var msgBytes = Encoding.UTF8.GetBytes(customJson);

            var message = GameMessage.FromBytes(msgBytes);
            Assert.IsInstanceOfType(message, typeof(CustomMessage));
        }
    }
}
