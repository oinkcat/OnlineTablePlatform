using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using OnlinePlatform.Platform;
using OnlinePlatform.Services;

namespace OnlinePlatform
{
    public class Startup
    {
        private int SessionDurationMinutes = 60;
        
        const string AuthScheme = CookieAuthenticationDefaults.AuthenticationScheme;

        // Имя каталога хранения данных
        private const string StorageDirectory = "Storage";

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        /// <summary>
        /// Настройка сервисов DI
        /// </summary>
        /// <param name="services">Коллекция сервисов</param>
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddMvc();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            TimeSpan duration = TimeSpan.FromMinutes(SessionDurationMinutes);
            services.AddDistributedMemoryCache();
            services.AddSession(opt => opt.IdleTimeout = duration);

            services.AddAuthentication(AuthScheme).AddCookie(options => {
                options.LoginPath = new PathString("/");
                options.ExpireTimeSpan = duration;
            });

            services.AddSingleton<SessionsManager>();
            services.AddSingleton<UserContext>();
            services.AddSingleton<WSManager>();
        }

        /// <summary>
        /// Настройка приложения
        /// </summary>
        /// <param name="app">Построитель приложения</param>
        /// <param name="env">Окружение хостинга</param>
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseBrowserLink();
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
            }

            app.UseAuthentication();
            app.UseSession();

            // WebSocket
            var wsOptions = new WebSocketOptions()
            {
                KeepAliveInterval = TimeSpan.FromSeconds(5)
            };
            app.UseWebSockets(wsOptions);
            app.UseWSServerMiddleware();

            // Контент
            app.UseStaticFiles();
            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });

            // Настройка путей к данным
            Config.Initialize(Path.Combine(env.ContentRootPath, StorageDirectory));
        }
    }
}
