namespace GstPlatform.Core.Entities;

public class Business
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Gstin { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<GstReturn> Returns { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<Upload> Uploads { get; set; } = [];
    public ICollection<Notice> Notices { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
}
