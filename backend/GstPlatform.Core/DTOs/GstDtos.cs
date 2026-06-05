namespace GstPlatform.Core.DTOs;

public record GstSummaryDto(
    decimal TaxableSales,
    decimal Cgst,
    decimal Sgst,
    decimal Igst,
    decimal Itc,
    decimal NetLiability);

public record ItcMismatchDto(
    Guid Id,
    string VendorName,
    string? VendorGstin,
    string InvoiceNo,
    decimal ExpectedItc,
    decimal ReportedItc,
    decimal PotentialLoss,
    string Issue);

public record HealthScoreDto(int Score, IReadOnlyList<HealthFactorDto> Factors);

public record HealthFactorDto(string Name, int MaxPoints, int EarnedPoints, string Description);
