namespace GstPlatform.Core.DTOs;

public record DashboardSummaryDto(
    decimal GstPayable,
    decimal AvailableItc,
    decimal NetLiability,
    decimal Sales,
    decimal Purchases,
    int HealthScore,
    IReadOnlyList<ComplianceAlertDto> UpcomingDueDates,
    IReadOnlyList<AlertDto> Alerts);

public record ComplianceAlertDto(string Title, string FilingType, DateTime DueDate, int DaysRemaining);
public record AlertDto(string Type, string Message, string Severity);
