namespace GstPlatform.Core.Entities;

public class PurchaseInvoice
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public string? VendorGstin { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public decimal TaxableValue { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal ItcAmount { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UploadedAt { get; set; }

    public Business Business { get; set; } = null!;
}