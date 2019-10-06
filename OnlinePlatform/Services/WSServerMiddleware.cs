using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Net.WebSockets;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using OnlinePlatform.Platform.Interaction;

namespace OnlinePlatform.Services
{
    /// <summary>
    /// Middleware для обработки соединений WebSocket
    /// </summary>
    public class WSServerMiddleware
    {
        // Окончание пути к обработчику сообщений
        private const string PathSuffix = "/messages";

        // Следующий обработчик запроса в цепочке
        private readonly RequestDelegate nextHandler;

        // Управляет подключениями клиентов
        private WSManager connectionsManager;

        /// <summary>
        /// Поступил HTTP запрос
        /// </summary>
        /// <param name="httpContext">Контекст запроса</param>
        public async Task Invoke(HttpContext httpContext)
        {
            if(httpContext.WebSockets.IsWebSocketRequest)
            {
                if(httpContext.Request.Path == PathSuffix)
                {
                    var client = await httpContext.WebSockets.AcceptWebSocketAsync();
                    await connectionsManager.HandleClientMessages(client);
                }
                else
                {
                    httpContext.Response.StatusCode = 400;
                }
            }
            else
            {
                await nextHandler(httpContext);
            }
        }

        public WSServerMiddleware(RequestDelegate next, WSManager connManager)
        {
            nextHandler = next;
            this.connectionsManager = connManager;
        }
    }
    
    /// <summary>
    /// Класс метода расширения для использования Middleware
    /// </summary>
    public static class WSServerMiddlewareExtensions
    {
        public static IApplicationBuilder UseWSServerMiddleware(
            this IApplicationBuilder builder
            )
        {
            return builder.UseMiddleware<WSServerMiddleware>();
        }
    }
}
