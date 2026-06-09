using System.Text.Json;
using GstPlatform.Core.DTOs;
using GstPlatform.Core.Entities;
using GstPlatform.Core.Interfaces;

namespace GstPlatform.Infrastructure.Services;

public class GstParserService(IGstEngine gstEngine) : IGstParserService
{
    public async Task<GstSummaryDto> ParseGstr1JsonAsync(Stream fileStream, CancellationToken ct = default)
    {
        using var doc = await JsonDocument.ParseAsync(fileStream, cancellationToken: ct);
        var root = doc.RootElement;

        decimal taxableSales = 0, cgst = 0, sgst = 0, igst = 0;

        if (root.TryGetProperty("sales", out var sales) && sales.ValueKind == JsonValueKind.Array)
        {
            foreach (var sale in sales.EnumerateArray())
            {
                taxableSales += GetDecimal(sale, "taxableValue");
                cgst += GetDecimal(sale, "cgst");
                sgst += GetDecimal(sale, "sgst");
                igst += GetDecimal(sale, "igst");
            }
        }

        var outputTax = cgst + sgst + igst;
        return gstEngine.CalculateSummary(outputTax, 0, taxableSales, cgst, sgst, igst);
    }

    public async Task<GstSummaryDto> ParseGstr2BJsonAsync(Stream fileStream, CancellationToken ct = default)
    {
        using var doc = await JsonDocument.ParseAsync(fileStream, cancellationToken: ct);
        var root = doc.RootElement;
        var itc = GetDecimal(root, "totalItc");
        return gstEngine.CalculateSummary(0, itc, 0, 0, 0, 0);
    }

    public async Task<IReadOnlyList<PurchaseInvoice>> ParseGstr2BPurchasesAsync(Stream fileStream, Guid businessId, CancellationToken ct = default)
    {
        using var doc = await JsonDocument.ParseAsync(fileStream, cancellationToken: ct);
        var root = doc.RootElement;
        var purchases = new List<PurchaseInvoice>();

        if (root.TryGetProperty("purchases", out var purchasesArray) && purchasesArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var purchase in purchasesArray.EnumerateArray())
            {
                var invoice = new PurchaseInvoice
                {
                    Id = Guid.NewGuid(),
                    BusinessId = businessId,
                    VendorName = GetString(purchase, "vendorName") ?? "Unknown Vendor",
                    VendorGstin = GetString(purchase, "vendorGstin"),
                    InvoiceNo = GetString(purchase, "invoiceNo") ?? "Unknown",
                    InvoiceDate = GetDateTime(purchase, "invoiceDate"),
                    TaxableValue = GetDecimal(purchase, "taxableValue"),
                    Cgst = GetDecimal(purchase, "cgst"),
                    Sgst = GetDecimal(purchase, "sgst"),
                    Igst = GetDecimal(purchase, "igst"),
                    TotalAmount = GetDecimal(purchase, "totalAmount"),
                    ItcAmount = GetDecimal(purchase, "itcAmount"),
                    Description = GetString(purchase, "description"),
                    UploadedAt = DateTime.UtcNow
                };
                purchases.Add(invoice);
            }
        }

        return purchases;
    }

    private static decimal GetDecimal(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.TryGetDecimal(out var d) ? d : 0;

    private static string? GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static DateTime GetDateTime(JsonElement element, string property)
    {
        if (element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String)
        {
            if (DateTime.TryParse(value.GetString(), out var date))
                return date;
        }
        return DateTime.UtcNow;
    }
}
