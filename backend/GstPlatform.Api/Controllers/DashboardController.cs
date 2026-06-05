using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GstPlatform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/businesses/{businessId:guid}/dashboard")]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(Guid businessId, CancellationToken ct) =>
        Ok(await dashboardService.GetSummaryAsync(businessId, ct));

    [HttpGet("health-score")]
    public async Task<ActionResult<HealthScoreDto>> GetHealthScore(Guid businessId, CancellationToken ct) =>
        Ok(await dashboardService.GetHealthScoreAsync(businessId, ct));
}
