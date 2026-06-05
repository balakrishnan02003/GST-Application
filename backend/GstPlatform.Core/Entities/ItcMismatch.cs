namespace GstPlatform.Core.Entities;

public class ItcMismatch
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public string? VendorGstin { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public decimal ExpectedItc { get; set; }
    public decimal ReportedItc { get; set; }
    public string Issue { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

    public Business Business { get; set; } = null!;
}
