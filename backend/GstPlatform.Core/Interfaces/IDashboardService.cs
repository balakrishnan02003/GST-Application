using GstPlatform.Core.DTOs;

namespace GstPlatform.Core.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(Guid businessId, CancellationToken ct = default);
    Task<HealthScoreDto> GetHealthScoreAsync(Guid businessId, CancellationToken ct = default);
}
