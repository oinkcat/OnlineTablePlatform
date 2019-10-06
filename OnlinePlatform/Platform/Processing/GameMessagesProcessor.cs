using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;
using System.Collections.Concurrent;
using Evaluator;
using OnlinePlatform.Platform.Interaction;

using IOStream = System.IO.Stream;

namespace OnlinePlatform.Platform.Processing
{
    /// <summary>
    /// Аргумент события завершения обработки сообщения
    /// </summary>
    public class MessageProcessedEventArgs : EventArgs
    {
        /// <summary>
        /// Изменения состояния
        /// </summary>
        public IList<StateChange> Changes { get; set; }

        public MessageProcessedEventArgs(IList<StateChange> changes)
        {
            Changes = changes;
        }
    }

    /// <summary>
    /// В процессе работы скрипта возникло исключение
    /// </summary>
    public class ScriptErrorEventArgs : EventArgs
    {
        /// <summary>
        /// Информация об ошибке
        /// </summary>
        public Exception Exception { get; set; }

        public ScriptErrorEventArgs(Exception exc)
        {
            Exception = exc;
        }
    }

    /// <summary>
    /// Обработчик игровых сообщений
    /// </summary>
    public class GameMessagesProcessor
    {
        // Поле данных - индекс игрока за столом
        private const string PlayerIndexField = "playerIdx";

        // Имя события - игровая сессия запущена
        private const string SessionStartedEventName = "initialize";

        // Имя события скрипта - игрок подключен
        private const string PlayerConnectedEventName = "new_player";

        // Имя события - наступление таймаута
        private const string TimeoutElapsedEventName = "timeout";

        // Игровой сеанс
        private readonly GameSession session;

        // Сообщения для обработки
        private readonly BlockingCollection<IncomingMessage> messages;

        // Обработчик сообщений
        private readonly Task processingTask;

        // Обработчик скриптов
        private Interpreter.FrontEnd scriptProcessor;

        // Преобразователь результатов обработки в изменения состояния
        private ResultsTranslator resultsTranslator;

        /// <summary>
        /// Входящее сообщение обработано скриптом
        /// </summary>
        public event EventHandler<MessageProcessedEventArgs> MessageProcessed;

        /// <summary>
        /// Возникла ошибка обработки скрипта
        /// </summary>
        public event EventHandler<ScriptErrorEventArgs> ScriptErrorOccured;

        /// <summary>
        /// Обработать сообщение
        /// </summary>
        /// <param name="message">Сообщение от игрока</param>
        public void Process(IncomingMessage message)
        {
            if(scriptProcessor.State != Interpreter.ExecutionState.Finished)
            {
                messages.Add(message);
            }
            else
            {
                throw new Exception("Script is not running!");
            }
        }

        /// <summary>
        /// Загрузить и запустить серверный сценарий
        /// </summary>
        /// <param name="srcStream"></param>
        public void LoadAndRunScript(IOStream srcStream)
        {
            using (srcStream)
            {
                scriptProcessor.LoadScript(srcStream);
                scriptProcessor.Run();

                if(scriptProcessor.State != Interpreter.ExecutionState.Paused)
                {
                    throw new Exception("Invalid interpreter state!");
                }

                processingTask.Start();

                // Оповестить о старте сеанса
                Process(new SessionStarted());
            }
        }

        // Цикл обработки сообщений
        private void MessageProcessingLoop()
        {
            while(scriptProcessor.State != Interpreter.ExecutionState.Finished)
            {
                var messageToProcess = messages.Take();
                string eventName = GetScriptEventNameForMessage(messageToProcess);

                // Подготовить данные для обработки скриптом
                if(eventName != null)
                {
                    var player = session.GetPlayerById(messageToProcess.SenderId);
                    var eventData = messageToProcess.ToDictionary();

                    if(player != null)
                    {
                        // Если задан ID игрока - передать его место за столом
                        eventData.Add(PlayerIndexField, player.SeatIndex);
                    }

                    object results = null;
                    try
                    {
                        results = scriptProcessor.RaiseEvent(eventName, eventData);
                    }
                    catch(Exception e)
                    {
                        var exceptionArgs = new ScriptErrorEventArgs(e);
                        ScriptErrorOccured?.Invoke(this, exceptionArgs);
                    }

                    if(results != null && results is object[])
                    {
                        // Обработка результатов
                        var resultsList = results as object[];
                        var changes = resultsTranslator.Translate(resultsList);

                        // Вызвать обработчики события
                        var eventArgs = new MessageProcessedEventArgs(changes);
                        MessageProcessed?.Invoke(this, eventArgs);
                    }
                }
            }
        }

        // Выдать имя события скрипта для заданного сообщения
        private string GetScriptEventNameForMessage(IncomingMessage message)
        {
            switch (message)
            {
                case SessionStarted _:
                    return SessionStartedEventName;
                case ClientInitialized _:
                    return PlayerConnectedEventName;
                case TimeoutElapsed _:
                    return TimeoutElapsedEventName;
                case CustomMessage _:
                    return (message as CustomMessage).Id;
                default:
                    return null;
            }
        }

        // Скриптом было запрошено выполнение скрипта по таймауту
        private void TimeoutRequested(object sender, TimeoutEventArgs e)
        {
            double delayMs = e.SecondsDelay * 1000;
            var timeoutTimer = new Timer(delayMs) { AutoReset = false };

            // При наступлении таймаута - послать скрипту сообщение
            timeoutTimer.Elapsed += (s, arg) => {
                Process(new TimeoutElapsed(e.SecondsDelay));
            };

            timeoutTimer.Start();
        }

        public GameMessagesProcessor(GameSession session)
        {
            this.session = session;
            messages = new BlockingCollection<IncomingMessage>();

            scriptProcessor = new Interpreter.FrontEnd();
            resultsTranslator = new ResultsTranslator(session);

            resultsTranslator.TimeoutRequested += TimeoutRequested;

            // Задача обработки входящих сообщений
            var option = TaskCreationOptions.LongRunning;
            processingTask = new Task(MessageProcessingLoop, option);
        }
    }
}
