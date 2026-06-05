namespace GstPlatform.Core.Entities;

public class InvoiceItem
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Rate { get; set; }
    public decimal GstRate { get; set; }
    public decimal Amount { get; set; }

    public Invoice Invoice { get; set; } = null!;
}
