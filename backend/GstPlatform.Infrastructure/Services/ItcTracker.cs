using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Infrastructure.Services;

public class ItcTracker(AppDbContext db) : IItcTracker
{
    public async Task<IReadOnlyList<ItcMismatchDto>> GetMismatchesAsync(Guid businessId, CancellationToken ct = default)
    {
        return await db.ItcMismatches
            .Where(m => m.BusinessId == businessId)
            .OrderByDescending(m => m.ExpectedItc - m.ReportedItc)
            .Select(m => new ItcMismatchDto(
                m.Id,
                m.VendorName,
                m.VendorGstin,
                m.InvoiceNo,
                m.ExpectedItc,
                m.ReportedItc,
                m.ExpectedItc - m.ReportedItc,
                m.Issue))
            .ToListAsync(ct);
    }
}
