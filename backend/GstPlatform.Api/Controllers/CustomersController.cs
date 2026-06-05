using GstPlatform.Core.Entities;
using GstPlatform.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/businesses/{businessId:guid}/customers")]
public class CustomersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetCustomers(Guid businessId, CancellationToken ct)
    {
        var customers = await db.Customers
            .Where(c => c.BusinessId == businessId)
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Gstin,
                c.Email,
                c.Phone
            })
            .ToListAsync(ct);

        return Ok(customers);
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateCustomer(Guid businessId, [FromBody] CreateCustomerRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Customer name is required." });

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            Name = request.Name.Trim(),
            Gstin = request.Gstin?.Trim().ToUpperInvariant(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim()
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            customer.Id,
            customer.Name,
            customer.Gstin,
            customer.Email,
            customer.Phone
        });
    }
}

public record CreateCustomerRequest(string Name, string? Gstin, string? Email, string? Phone);
