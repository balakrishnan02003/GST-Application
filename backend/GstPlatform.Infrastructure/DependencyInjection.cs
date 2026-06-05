using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using GstPlatform.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GstPlatform.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var provider = configuration["Database:Provider"] ?? "Sqlite";

        services.AddDbContext<AppDbContext>(options =>
        {
            if (string.Equals(provider, "Postgres", StringComparison.OrdinalIgnoreCase))
                options.UseNpgsql(connectionString);
            else
                options.UseSqlite(connectionString ?? "Data Source=gstplatform.db");
        });

        services.AddScoped<JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBusinessService, BusinessService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IGstEngine, GstEngine>();
        services.AddScoped<IGstParserService, GstParserService>();
        services.AddScoped<IItcTracker, ItcTracker>();

        return services;
    }
}
