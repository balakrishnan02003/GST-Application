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

        // Calculate dynamic upcoming compliance events based on current date
        var now = DateTime.UtcNow;
        var upcoming = new List<ComplianceAlertDto>();

        // 1. GSTR-1 (Due on the 11th of the succeeding month)
        var gstr1TargetMonth = now.Day <= 11 ? now.AddMonths(-1) : now;
        var gstr1DueDate = new DateTime(gstr1TargetMonth.Year, gstr1TargetMonth.Month, 11, 23, 59, 59, DateTimeKind.Utc).AddMonths(1);
        var isGstr1Completed = await db.Uploads.AnyAsync(u =>
            u.BusinessId == businessId &&
            u.FileType == "GSTR-1" &&
            u.UploadedAt >= new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            ct);
        
        var gstr1DaysLeft = (int)Math.Ceiling((gstr1DueDate - now).TotalDays);
        if (!isGstr1Completed)
        {
            upcoming.Add(new ComplianceAlertDto(
                $"GSTR-1 for {gstr1TargetMonth:MMMM yyyy}",
                "Gstr1",
                gstr1DueDate,
                gstr1DaysLeft));
        }

        // 2. GSTR-3B (Due on the 20th of the succeeding month)
        var gstr3BTargetMonth = now.Day <= 20 ? now.AddMonths(-1) : now;
        var gstr3BDueDate = new DateTime(gstr3BTargetMonth.Year, gstr3BTargetMonth.Month, 20, 23, 59, 59, DateTimeKind.Utc).AddMonths(1);
        var isGstr3BCompleted = await db.Uploads.AnyAsync(u =>
            u.BusinessId == businessId &&
            u.FileType == "GSTR-3B" &&
            u.UploadedAt >= new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            ct);

        var gstr3BDaysLeft = (int)Math.Ceiling((gstr3BDueDate - now).TotalDays);
        if (!isGstr3BCompleted)
        {
            upcoming.Add(new ComplianceAlertDto(
                $"GSTR-3B for {gstr3BTargetMonth:MMMM yyyy}",
                "Gstr3B",
                gstr3BDueDate,
                gstr3BDaysLeft));
        }

        upcoming = upcoming.OrderBy(u => u.DueDate).ToList();

        var itcIssues = await db.ItcMismatches
            .Where(m => m.BusinessId == businessId)
            .CountAsync(ct);

        var alerts = new List<AlertDto>();
        if (itcIssues > 0)
        {
            alerts.Add(new AlertDto("ITC", $"{itcIssues} ITC mismatch(es) detected — review vendor filings", "warning"));
        }

        foreach (var u in upcoming)
        {
            var periodName = u.Title.Contains("for ") ? u.Title.Split("for ").LastOrDefault() : "";
            if (u.DaysRemaining <= 7 && u.DaysRemaining >= 0)
            {
                alerts.Add(new AlertDto("Compliance", $"{u.FilingType} for {periodName} is due in {u.DaysRemaining} days", u.DaysRemaining <= 3 ? "critical" : "warning"));
            }
            else if (u.DaysRemaining < 0)
            {
                alerts.Add(new AlertDto("Compliance", $"{u.FilingType} for {periodName} is OVERDUE by {Math.Abs(u.DaysRemaining)} days", "critical"));
            }
        }

        // Add Data Sync Alert if GSTR-2B is not uploaded yet for the current period
        var hasGstr2BThisMonth = await db.Uploads.AnyAsync(u =>
            u.BusinessId == businessId &&
            u.FileType == "GSTR-2B" &&
            u.UploadedAt >= new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            ct);

        if (!hasGstr2BThisMonth)
        {
            alerts.Add(new AlertDto("Data Sync", "Latest GSTR-2B not uploaded. Reconcile ITC by uploading it.", "warning"));
        }

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
        var now = DateTime.UtcNow;
        var returns = await db.GstReturns.Where(r => r.BusinessId == businessId).ToListAsync(ct);
        var mismatches = await db.ItcMismatches.Where(m => m.BusinessId == businessId).CountAsync(ct);

        // Check if GSTR-1 and GSTR-3B uploads exist for the current month
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var hasGstr1 = await db.Uploads.AnyAsync(u => u.BusinessId == businessId && u.FileType == "GSTR-1" && u.UploadedAt >= startOfMonth, ct);
        var hasGstr3B = await db.Uploads.AnyAsync(u => u.BusinessId == businessId && u.FileType == "GSTR-3B" && u.UploadedAt >= startOfMonth, ct);

        // Filing Score (out of 30):
        // 15 points for GSTR-1, 15 points for GSTR-3B.
        // If not uploaded yet, but we are before the due date, we count it as "on track" (full points).
        // If after due date and not uploaded, user gets 0 points for that filing.
        int filingScore = 0;
        if (now.Day <= 11 || hasGstr1) filingScore += 15;
        if (now.Day <= 20 || hasGstr3B) filingScore += 15;

        var vendorScore = mismatches == 0 ? 20 : Math.Max(0, 20 - mismatches * 5);
        
        var itcScore = 10;
        if (returns.Count > 0)
        {
            var avgOut = returns.Average(r => r.OutputTax);
            var avgIn = returns.Average(r => r.InputTax);
            if (avgOut > 0)
            {
                itcScore = (int)(20 * (avgIn / avgOut));
            }
        }
        
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
