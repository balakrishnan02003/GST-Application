using System.Security.Claims;
using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GstPlatform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/businesses")]
public class BusinessesController(IBusinessService businessService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BusinessDto>>> GetBusinesses(CancellationToken ct) =>
        Ok(await businessService.GetBusinessesAsync(GetUserId(), ct));

    [HttpPost]
    public async Task<ActionResult<BusinessDto>> CreateBusiness([FromBody] CreateBusinessRequest request, CancellationToken ct) =>
        Ok(await businessService.CreateBusinessAsync(GetUserId(), request, ct));

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
