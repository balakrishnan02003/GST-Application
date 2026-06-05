using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Infrastructure.Services;

public class DashboardService(AppDbContext db, IGstEngine gstEngine) : IDashboardService
{
    public async Task<DashboardSummaryDto> GetSummaryAsync(Guid businessId, CancellationToken ct = default)
    {
        // Calculate from real invoice data (current period)
        var invoices = await db.Invoices
            .Where(i => i.BusinessId == businessId && i.Status == "Issued")
            .ToListAsync(ct);

        var sales = invoices.Sum(i => i.Amount - i.GstAmount);
        var outputTax = invoices.Sum(i => i.GstAmount);

        // Get ITC from latest GSTR-2B upload (if any)
        var latestUpload = await db.Uploads
            .Where(u => u.BusinessId == businessId && u.FileType == "GSTR-2B")
            .OrderByDescending(u => u.UploadedAt)
            .FirstOrDefaultAsync(ct);

        var inputTax = 0m;
        if (latestUpload?.ParsedSummary != null && latestUpload.ParsedSummary.Contains("ITC:"))
        {
            var itcStr = latestUpload.ParsedSummary.Split("ITC:").LastOrDefault()?.Trim();
            if (decimal.TryParse(itcStr, out var itc))
                inputTax = itc;
        }

        var netLiability = gstEngine.CalculateNetLiability(outputTax, inputTax);

        // Get real compliance events (no dummy data generation)
        var existingEvents = await db.ComplianceEvents
            .Where(e => e.BusinessId == businessId)
            .ToListAsync(ct);

        var upcoming = existingEvents
            .Where(e => !e.IsCompleted)
            .OrderBy(e => e.DueDate)
            .Take(5)
            .Select(e => new ComplianceAlertDto(
                e.Notes ?? e.FilingType.ToString(),
                e.FilingType.ToString(),
                e.DueDate,
                (int)Math.Ceiling((e.DueDate - DateTime.UtcNow).TotalDays)))
            .ToList();

        var itcIssues = await db.ItcMismatches
            .Where(m => m.BusinessId == businessId)
            .CountAsync(ct);

        var alerts = new List<AlertDto>();
        if (itcIssues > 0)
            alerts.Add(new AlertDto("ITC", $"{itcIssues} ITC mismatch(es) detected — review vendor filings", "warning"));
        if (upcoming.Any(u => u.DaysRemaining <= 7))
            alerts.Add(new AlertDto("Compliance", "Filing due within 7 days", "critical"));

        var health = await GetHealthScoreAsync(businessId, ct);

        return new DashboardSummaryDto(
            outputTax,
            inputTax,
            netLiability,
            sales,
            0m,
            health.Score,
            upcoming,
            alerts);
    }

    public async Task<HealthScoreDto> GetHealthScoreAsync(Guid businessId, CancellationToken ct = default)
    {
        var returns = await db.GstReturns.Where(r => r.BusinessId == businessId).ToListAsync(ct);
        var compliance = await db.ComplianceEvents.Where(e => e.BusinessId == businessId).ToListAsync(ct);
        var mismatches = await db.ItcMismatches.Where(m => m.BusinessId == businessId).CountAsync(ct);

        var filingScore = compliance.Count == 0 ? 20 : (int)(30 * compliance.Count(e => e.IsCompleted) / (double)compliance.Count);
        var vendorScore = mismatches == 0 ? 20 : Math.Max(0, 20 - mismatches * 5);
        var itcScore = returns.Count == 0 ? 10 : (int)(20 * (returns.Average(r => r.InputTax) / Math.Max(1, returns.Average(r => r.OutputTax))));
        var paymentScore = returns.Any() ? 25 : 15;

        var factors = new List<HealthFactorDto>
        {
            new("Filing Timeliness", 30, Math.Min(30, filingScore), "On-time GST return filings"),
            new("Vendor Compliance", 20, Math.Min(20, vendorScore), "Vendors filing returns correctly"),
            new("ITC Efficiency", 20, Math.Min(20, itcScore), "Input tax credit utilization"),
            new("Payment History", 30, Math.Min(30, paymentScore), "GST payment consistency")
        };

        return new HealthScoreDto(factors.Sum(f => f.EarnedPoints), factors);
    }
}
