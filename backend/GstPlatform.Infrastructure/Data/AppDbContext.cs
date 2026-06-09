using GstPlatform.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<GstReturn> GstReturns => Set<GstReturn>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Upload> Uploads => Set<Upload>();
    public DbSet<Notice> Notices => Set<Notice>();
    public DbSet<ComplianceEvent> ComplianceEvents => Set<ComplianceEvent>();
    public DbSet<ItcMismatch> ItcMismatches => Set<ItcMismatch>();
    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Business>()
            .HasIndex(b => b.Gstin);

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => new { i.BusinessId, i.InvoiceNo })
            .IsUnique();

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(i => i.Invoice)
            .WithMany(inv => inv.Items)
            .HasForeignKey(i => i.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        base.OnModelCreating(modelBuilder);
    }
}
