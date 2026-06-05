namespace GstPlatform.Core.Entities;

public class GstReturn
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string Gstin { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal OutputTax { get; set; }
    public decimal InputTax { get; set; }
    public decimal TaxableSales { get; set; }
    public decimal TaxablePurchases { get; set; }
    public decimal Cgst { get; set; }
    public decimal Sgst { get; set; }
    public decimal Igst { get; set; }
    public DateTime? FiledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Business Business { get; set; } = null!;

    public decimal NetLiability => OutputTax - InputTax;
}
