using GstPlatform.Core.DTOs;

namespace GstPlatform.Core.Interfaces;

public interface IInvoiceService
{
    Task<IReadOnlyList<InvoiceDto>> GetInvoicesAsync(Guid businessId, CancellationToken ct = default);
    Task<InvoiceDto> CreateInvoiceAsync(Guid businessId, CreateInvoiceRequest request, CancellationToken ct = default);
    Task<int> BulkImportInvoicesAsync(Guid businessId, List<BulkImportInvoiceRequest> requests, CancellationToken ct = default);
    Task DeleteInvoiceAsync(Guid businessId, Guid invoiceId, CancellationToken ct = default);
}

