using System.Text.Json;
using GstPlatform.Core.DTOs;
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

    private static decimal GetDecimal(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.TryGetDecimal(out var d) ? d : 0;
}
