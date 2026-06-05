using GstPlatform.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GstPlatform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/businesses/{businessId:guid}/itc")]
public class ItcController(IItcTracker itcTracker) : ControllerBase
{
    [HttpGet("mismatches")]
    public async Task<ActionResult> GetMismatches(Guid businessId, CancellationToken ct) =>
        Ok(await itcTracker.GetMismatchesAsync(businessId, ct));
}
