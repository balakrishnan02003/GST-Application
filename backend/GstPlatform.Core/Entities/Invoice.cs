namespace GstPlatform.Core.Entities;

public class Invoice
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public Guid? CustomerId { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Business Business { get; set; } = null!;
    public Customer? Customer { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = [];
}
