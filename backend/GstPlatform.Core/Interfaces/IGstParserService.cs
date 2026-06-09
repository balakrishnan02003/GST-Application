using GstPlatform.Core.DTOs;
using GstPlatform.Core.Entities;

namespace GstPlatform.Core.Interfaces;

public interface IGstParserService
{
    Task<GstSummaryDto> ParseGstr1JsonAsync(Stream fileStream, CancellationToken ct = default);
    Task<GstSummaryDto> ParseGstr2BJsonAsync(Stream fileStream, CancellationToken ct = default);
    Task<IReadOnlyList<PurchaseInvoice>> ParseGstr2BPurchasesAsync(Stream fileStream, Guid businessId, CancellationToken ct = default);
}
