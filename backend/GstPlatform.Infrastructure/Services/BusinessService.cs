using GstPlatform.Core.DTOs;
using GstPlatform.Core.Entities;
using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Infrastructure.Services;

public class BusinessService(AppDbContext db) : IBusinessService
{
    public async Task<IReadOnlyList<BusinessDto>> GetBusinessesAsync(Guid userId, CancellationToken ct = default)
    {
        return await db.Businesses
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.Name)
            .Select(b => new BusinessDto(b.Id, b.Name, b.Gstin))
            .ToListAsync(ct);
    }

    public async Task<BusinessDto> CreateBusinessAsync(Guid userId, CreateBusinessRequest request, CancellationToken ct = default)
    {
        var business = new Business
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name,
            Gstin = request.Gstin.ToUpperInvariant(),
        };

        db.Businesses.Add(business);
        await SeedDemoDataAsync(business, ct);
        await db.SaveChangesAsync(ct);
        return new BusinessDto(business.Id, business.Name, business.Gstin);
    }

    private async Task SeedDemoDataAsync(Business business, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        db.GstReturns.Add(new GstReturn
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            Gstin = business.Gstin,
            Year = now.Year,
            Month = now.Month,
            OutputTax = 23000,
            InputTax = 12000,
            TaxableSales = 450000,
            TaxablePurchases = 280000,
            Cgst = 11500,
            Sgst = 11500,
            Igst = 0
        });

        db.ComplianceEvents.AddRange(
            new ComplianceEvent
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                FilingType = Core.Enums.FilingType.Gstr3B,
                DueDate = now.AddDays(5),
                IsCompleted = false,
                Notes = "GSTR-3B for current period"
            },
            new ComplianceEvent
            {
                Id = Guid.NewGuid(),
                BusinessId = business.Id,
                FilingType = Core.Enums.FilingType.Gstr1,
                DueDate = now.AddDays(11),
                IsCompleted = false,
                Notes = "GSTR-1 outward supplies"
            });

        db.ItcMismatches.Add(new ItcMismatch
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            VendorName = "ABC Supplies Pvt Ltd",
            VendorGstin = "29ABCDE1234F1Z5",
            InvoiceNo = "INV-2024-0892",
            ExpectedItc = 5600,
            ReportedItc = 0,
            Issue = "Vendor has not filed GSTR-1 for this invoice"
        });

        await Task.CompletedTask;
    }
}
