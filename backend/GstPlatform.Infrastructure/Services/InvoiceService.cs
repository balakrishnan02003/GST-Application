using GstPlatform.Core.DTOs;
using GstPlatform.Core.Entities;
using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Infrastructure.Services;

public class InvoiceService(AppDbContext db) : IInvoiceService
{
    public async Task<IReadOnlyList<InvoiceDto>> GetInvoicesAsync(Guid businessId, CancellationToken ct = default)
    {
        return await db.Invoices
            .Include(i => i.Customer)
            .Where(i => i.BusinessId == businessId)
            .OrderByDescending(i => i.InvoiceDate)
            .Select(i => new InvoiceDto(
                i.Id,
                i.InvoiceNo,
                i.InvoiceDate,
                i.Amount,
                i.GstAmount,
                i.Cgst,
                i.Sgst,
                i.Igst,
                i.Status,
                i.Customer != null ? i.Customer.Name : null))
            .ToListAsync(ct);
    }

    public async Task<InvoiceDto> CreateInvoiceAsync(Guid businessId, CreateInvoiceRequest request, CancellationToken ct = default)
    {
        decimal subtotal = 0, cgst = 0, sgst = 0, igst = 0;

        var items = request.Items.Select(item =>
        {
            var amount = item.Quantity * item.Rate;
            var gst = amount * item.GstRate / 100;
            subtotal += amount;
            cgst += gst / 2;
            sgst += gst / 2;
            return new InvoiceItem
            {
                Id = Guid.NewGuid(),
                Description = item.Description,
                Quantity = item.Quantity,
                Rate = item.Rate,
                GstRate = item.GstRate,
                Amount = amount + gst
            };
        }).ToList();

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            CustomerId = request.CustomerId,
            InvoiceNo = request.InvoiceNo,
            InvoiceDate = request.InvoiceDate,
            Amount = subtotal + cgst + sgst + igst,
            GstAmount = cgst + sgst + igst,
            Cgst = cgst,
            Sgst = sgst,
            Igst = igst,
            Status = "Draft",
            Items = items
        };

        foreach (var item in items)
            item.InvoiceId = invoice.Id;

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync(ct);

        string? customerName = null;
        if (request.CustomerId.HasValue)
            customerName = await db.Customers.Where(c => c.Id == request.CustomerId).Select(c => c.Name).FirstOrDefaultAsync(ct);

        return new InvoiceDto(invoice.Id, invoice.InvoiceNo, invoice.InvoiceDate, invoice.Amount, invoice.GstAmount, invoice.Cgst, invoice.Sgst, invoice.Igst, invoice.Status, customerName);
    }

    public async Task<int> BulkImportInvoicesAsync(Guid businessId, List<BulkImportInvoiceRequest> requests, CancellationToken ct = default)
    {
        if (requests == null || requests.Count == 0) return 0;

        // 1. Get existing customers for mapping
        var customers = await db.Customers.Where(c => c.BusinessId == businessId).ToListAsync(ct);

        // 2. Group incoming rows by InvoiceNo
        var groupedRequests = requests
            .Where(r => !string.IsNullOrWhiteSpace(r.InvoiceNo))
            .GroupBy(r => r.InvoiceNo.Trim())
            .ToList();

        int importCount = 0;

        foreach (var group in groupedRequests)
        {
            var invoiceNo = group.Key;
            var firstRow = group.First();

            // 3. Delete existing invoice with the same InvoiceNo if it exists (overwrite)
            var existingInvoice = await db.Invoices
                .FirstOrDefaultAsync(i => i.BusinessId == businessId && i.InvoiceNo == invoiceNo, ct);
            if (existingInvoice != null)
            {
                db.Invoices.Remove(existingInvoice);
            }

            // 4. Match or create Customer
            Customer? customer = null;
            var customerGstin = firstRow.CustomerGstin?.Trim();
            var customerName = firstRow.CustomerName?.Trim() ?? "Unknown Customer";

            if (!string.IsNullOrEmpty(customerGstin))
            {
                customer = customers.FirstOrDefault(c => string.Equals(c.Gstin, customerGstin, StringComparison.OrdinalIgnoreCase));
            }

            if (customer == null && !string.IsNullOrEmpty(customerName))
            {
                customer = customers.FirstOrDefault(c => string.Equals(c.Name, customerName, StringComparison.OrdinalIgnoreCase));
            }

            if (customer == null)
            {
                customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    BusinessId = businessId,
                    Name = customerName,
                    Gstin = string.IsNullOrEmpty(customerGstin) ? null : customerGstin.ToUpperInvariant()
                };
                db.Customers.Add(customer);
                customers.Add(customer); // Add to local list so next groups can match
            }

            // 5. Create Invoice items
            var items = new List<InvoiceItem>();
            foreach (var row in group)
            {
                items.Add(new InvoiceItem
                {
                    Id = Guid.NewGuid(),
                    Description = !string.IsNullOrWhiteSpace(row.Description) ? row.Description : "Imported Item",
                    Quantity = 1,
                    Rate = row.TaxableValue,
                    GstRate = row.GstRate,
                    Amount = row.TaxableValue + row.Cgst + row.Sgst + row.Igst
                });
            }

            // 6. Create Invoice
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                CustomerId = customer.Id,
                InvoiceNo = invoiceNo,
                InvoiceDate = firstRow.InvoiceDate.Kind == DateTimeKind.Unspecified 
                    ? DateTime.SpecifyKind(firstRow.InvoiceDate, DateTimeKind.Utc) 
                    : firstRow.InvoiceDate.ToUniversalTime(),
                Cgst = group.Sum(r => r.Cgst),
                Sgst = group.Sum(r => r.Sgst),
                Igst = group.Sum(r => r.Igst),
                GstAmount = group.Sum(r => r.Cgst + r.Sgst + r.Igst),
                Amount = group.Sum(r => r.TaxableValue + r.Cgst + r.Sgst + r.Igst),
                Status = "Issued",
                Items = items
            };

            foreach (var item in items)
            {
                item.InvoiceId = invoice.Id;
            }

            db.Invoices.Add(invoice);
            importCount++;
        }

        await db.SaveChangesAsync(ct);
        return importCount;
    }

    public async Task DeleteInvoiceAsync(Guid businessId, Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await db.Invoices
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.BusinessId == businessId, ct);

        if (invoice == null)
        {
            throw new InvalidOperationException("Invoice not found.");
        }

        db.Invoices.Remove(invoice);
        await db.SaveChangesAsync(ct);
    }
}

