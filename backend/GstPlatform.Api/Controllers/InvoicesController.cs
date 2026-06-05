using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GstPlatform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/businesses/{businessId:guid}/invoices")]
public class InvoicesController(IInvoiceService invoiceService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InvoiceDto>>> GetInvoices(Guid businessId, CancellationToken ct) =>
        Ok(await invoiceService.GetInvoicesAsync(businessId, ct));

    [HttpPost]
    public async Task<ActionResult<InvoiceDto>> CreateInvoice(Guid businessId, [FromBody] CreateInvoiceRequest request, CancellationToken ct) =>
        Ok(await invoiceService.CreateInvoiceAsync(businessId, request, ct));

    [HttpPost("bulk")]
    public async Task<ActionResult<object>> BulkImportInvoices(Guid businessId, [FromBody] List<BulkImportInvoiceRequest> requests, CancellationToken ct)
    {
        var count = await invoiceService.BulkImportInvoicesAsync(businessId, requests, ct);
        return Ok(new { count, message = $"Successfully imported {count} invoices." });
    }

    [HttpDelete("{invoiceId:guid}")]
    public async Task<ActionResult> DeleteInvoice(Guid businessId, Guid invoiceId, CancellationToken ct)
    {
        await invoiceService.DeleteInvoiceAsync(businessId, invoiceId, ct);
        return NoContent();
    }
}

