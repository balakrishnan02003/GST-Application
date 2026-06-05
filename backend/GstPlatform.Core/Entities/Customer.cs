namespace GstPlatform.Core.Entities;

public class Customer
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Gstin { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }

    public Business Business { get; set; } = null!;
    public ICollection<Invoice> Invoices { get; set; } = [];
}
