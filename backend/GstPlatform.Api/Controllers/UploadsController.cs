using System.Text;
using System.Globalization;
using CsvHelper;
using ExcelDataReader;
using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using GstPlatform.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GstPlatform.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/businesses/{businessId:guid}/uploads")]
public class UploadsController(AppDbContext db, IGstParserService parser, IGstEngine gstEngine) : ControllerBase
{
    [HttpPost("gstr-1")]
    public async Task<ActionResult<object>> UploadGstr1(Guid businessId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { message = "File is empty." });

        object result;
        var fileExt = Path.GetExtension(file.FileName).ToLower();

        if (fileExt == ".json")
        {
            await using var stream = file.OpenReadStream();
            result = await parser.ParseGstr1JsonAsync(stream, ct);
        }
        else
        {
            var parsed = await ParseFileAsync(file, ct);
            result = ExtractGstr1Summary(parsed) ?? (object)parsed;
        }

        // Create or update GstReturn record for current month
        var now = DateTime.UtcNow;
        var business = await db.Businesses.FirstOrDefaultAsync(b => b.Id == businessId, ct);
        var gstReturn = await db.GstReturns
            .FirstOrDefaultAsync(r => r.BusinessId == businessId && r.Year == now.Year && r.Month == now.Month, ct);

        if (gstReturn == null)
        {
            gstReturn = new GstPlatform.Core.Entities.GstReturn
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                Gstin = business?.Gstin ?? "",
                Year = now.Year,
                Month = now.Month,
                CreatedAt = DateTime.UtcNow
            };
            db.GstReturns.Add(gstReturn);
        }

        if (result is GstSummaryDto gst1)
        {
            gstReturn.TaxableSales = gst1.TaxableSales;
            gstReturn.Cgst = gst1.Cgst;
            gstReturn.Sgst = gst1.Sgst;
            gstReturn.Igst = gst1.Igst;
            gstReturn.OutputTax = gst1.Cgst + gst1.Sgst + gst1.Igst;
        }

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GSTR-1",
            ParsedSummary = result is GstSummaryDto gst ? $"Sales: {gst.TaxableSales}, Liability: {gst.NetLiability}" : GetSummary(result)
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpPost("gstr-2b")]
    public async Task<ActionResult<object>> UploadGstr2B(Guid businessId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { message = "File is empty." });

        object result;
        var fileExt = Path.GetExtension(file.FileName).ToLower();
        IReadOnlyList<PurchaseInvoice> parsedPurchases = new List<PurchaseInvoice>();

        if (fileExt == ".json")
        {
            await using var stream = file.OpenReadStream();
            result = await parser.ParseGstr2BJsonAsync(stream, ct);
            
            // Parse and store individual purchase invoices
            stream.Seek(0, SeekOrigin.Begin);
            parsedPurchases = await parser.ParseGstr2BPurchasesAsync(stream, businessId, ct);
        }
        else
        {
            var parsed = await ParseFileAsync(file, ct);
            result = ExtractGstr2BSummary(parsed) ?? (object)parsed;
        }

        // Store parsed purchases in database
        if (parsedPurchases.Count > 0)
        {
            // Remove existing purchases for this business from the same period to avoid duplicates
            var purchaseDates = parsedPurchases.Select(p => p.InvoiceDate).ToList();
            var minDate = purchaseDates.Min();
            var maxDate = purchaseDates.Max();
            
            var existingPurchases = await db.PurchaseInvoices
                .Where(p => p.BusinessId == businessId 
                    && p.InvoiceDate >= minDate 
                    && p.InvoiceDate <= maxDate)
                .ToListAsync(ct);
            
            if (existingPurchases.Count > 0)
            {
                db.PurchaseInvoices.RemoveRange(existingPurchases);
            }

            db.PurchaseInvoices.AddRange(parsedPurchases);
        }

        // Update GstReturn record with ITC from GSTR-2B
        var now = DateTime.UtcNow;
        var business = await db.Businesses.FirstOrDefaultAsync(b => b.Id == businessId, ct);
        var gstReturn = await db.GstReturns
            .FirstOrDefaultAsync(r => r.BusinessId == businessId && r.Year == now.Year && r.Month == now.Month, ct);

        if (gstReturn == null)
        {
            gstReturn = new GstPlatform.Core.Entities.GstReturn
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                Gstin = business?.Gstin ?? "",
                Year = now.Year,
                Month = now.Month,
                CreatedAt = DateTime.UtcNow
            };
            db.GstReturns.Add(gstReturn);
        }

        if (result is GstSummaryDto gst2b)
        {
            gstReturn.InputTax = gst2b.Itc;
        }

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GSTR-2B",
            ParsedSummary = result is GstSummaryDto gst ? $"ITC: {gst.Itc}, Purchases: {parsedPurchases.Count}" : GetSummary(result)
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpPost("gstr-3b")]
    public async Task<ActionResult<object>> UploadGstr3B(Guid businessId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { message = "File is empty." });

        var fileExt = Path.GetExtension(file.FileName).ToLower();
        var result = await ParseFileAsync(file, ct);

        // Mark GstReturn as filed when GSTR-3B is uploaded
        var now = DateTime.UtcNow;
        var business = await db.Businesses.FirstOrDefaultAsync(b => b.Id == businessId, ct);
        var gstReturn = await db.GstReturns
            .FirstOrDefaultAsync(r => r.BusinessId == businessId && r.Year == now.Year && r.Month == now.Month, ct);

        if (gstReturn == null)
        {
            gstReturn = new GstPlatform.Core.Entities.GstReturn
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                Gstin = business?.Gstin ?? "",
                Year = now.Year,
                Month = now.Month,
                CreatedAt = DateTime.UtcNow
            };
            db.GstReturns.Add(gstReturn);
        }

        gstReturn.FiledAt = DateTime.UtcNow;

        // Extract meaningful summary based on file type
        string parsedSummary;
        if (fileExt == ".json")
        {
            file.OpenReadStream().Seek(0, SeekOrigin.Begin);
            await using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream);
            var content = await reader.ReadToEndAsync(ct);
            parsedSummary = ExtractGstr3BSummaryFromJson(content) ?? GetSummary(result);
        }
        else
        {
            parsedSummary = ExtractGstr3BSummaryFromParsed(result) ?? GetSummary(result);
        }

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GSTR-3B",
            ParsedSummary = parsedSummary
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpPost("ledger")]
    public async Task<ActionResult<object>> UploadLedger(Guid businessId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { message = "File is empty." });

        var fileExt = Path.GetExtension(file.FileName).ToLower();
        var result = await ParseFileAsync(file, ct);

        // Extract meaningful summary based on file type
        string parsedSummary;
        if (fileExt == ".json")
        {
            file.OpenReadStream().Seek(0, SeekOrigin.Begin);
            await using var stream = file.OpenReadStream();
            using var reader = new StreamReader(stream);
            var content = await reader.ReadToEndAsync(ct);
            parsedSummary = ExtractLedgerSummaryFromJson(content) ?? GetSummary(result);
        }
        else
        {
            parsedSummary = ExtractLedgerSummaryFromParsed(result) ?? GetSummary(result);
        }

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GST Ledger",
            ParsedSummary = parsedSummary
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult> GetUploads(Guid businessId, CancellationToken ct) =>
        Ok(await db.Uploads.Where(u => u.BusinessId == businessId).OrderByDescending(u => u.UploadedAt).ToListAsync(ct));

    private GstSummaryDto? ExtractGstr1Summary(dynamic parsed)
    {
        try
        {
            var totals = parsed.NumericTotals as Dictionary<string, decimal>;
            if (totals == null) return null;

            var cgst = totals.GetValueOrDefault("cgst");
            var sgst = totals.GetValueOrDefault("sgst");
            var igst = totals.GetValueOrDefault("igst");
            var taxableValue = totals.GetValueOrDefault("taxableValue");
            var outputTax = cgst + sgst + igst;

            if (outputTax == 0 && taxableValue == 0) return null;

            return gstEngine.CalculateSummary(outputTax, 0, taxableValue, cgst, sgst, igst);
        }
        catch { return null; }
    }

    private GstSummaryDto? ExtractGstr2BSummary(dynamic parsed)
    {
        try
        {
            var totals = parsed.NumericTotals as Dictionary<string, decimal>;
            if (totals == null) return null;

            var itc = totals.GetValueOrDefault("totalItc");
            if (itc == 0)
            {
                // fallback: sum cgst+sgst+igst if totalItc column not present
                itc = totals.GetValueOrDefault("cgst") + totals.GetValueOrDefault("sgst") + totals.GetValueOrDefault("igst");
            }

            if (itc == 0) return null;

            return gstEngine.CalculateSummary(0, itc, 0, 0, 0, 0);
        }
        catch { return null; }
    }

    private static string? ExtractGstr3BSummaryFromJson(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var period = root.TryGetProperty("filingPeriod", out var p) ? p.GetString() : null;
            if (!root.TryGetProperty("summary", out var summary)) return null;

            var netTax = summary.TryGetProperty("netTaxPayable", out var nt) ? nt.GetDecimal() : 0;
            var status = summary.TryGetProperty("paymentStatus", out var st) ? st.GetString() : "Unknown";

            return $"GSTR-3B for {period}, Net Tax: ₹{netTax}, Status: {status}";
        }
        catch { return null; }
    }

    private static string? ExtractLedgerSummaryFromJson(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var period = root.TryGetProperty("ledgerPeriod", out var p) ? p.GetString() : null;
            var closingBalance = root.TryGetProperty("closingBalance", out var cb) ? cb.GetDecimal() : 0;
            var txnCount = root.TryGetProperty("transactions", out var txns) && txns.ValueKind == JsonValueKind.Array
                ? txns.GetArrayLength() : 0;

            return $"Ledger for {period}: {txnCount} transactions, Closing Balance: ₹{closingBalance}";
        }
        catch { return null; }
    }

    private static string? ExtractGstr3BSummaryFromParsed(dynamic parsed)
    {
        try
        {
            var totals = parsed.NumericTotals as Dictionary<string, decimal>;
            if (totals == null) return null;

            var netTax = totals.GetValueOrDefault("netTaxPayable");
            var rowCount = parsed.RowCount as int? ?? 0;

            return $"GSTR-3B: Net Tax ₹{netTax}, {rowCount} rows";
        }
        catch { return null; }
    }

    private static string? ExtractLedgerSummaryFromParsed(dynamic parsed)
    {
        try
        {
            var totals = parsed.NumericTotals as Dictionary<string, decimal>;
            if (totals == null) return null;

            var closingBalance = totals.GetValueOrDefault("balance");
            var rowCount = parsed.RowCount as int? ?? 0;

            return $"Ledger: {rowCount} transactions, Closing Balance: ₹{closingBalance}";
        }
        catch { return null; }
    }

    private static string GetSummary(object result)
    {
        if (result is System.Text.Json.Nodes.JsonNode node)
            return node["ShortSummary"]?.GetValue<string>() ?? "Parsed successfully";

        // Handle anonymous/dynamic objects (CSV, Excel results)
        try
        {
            dynamic d = result;
            var summary = d.ShortSummary as string;
            return summary ?? "Parsed successfully";
        }
        catch { return "Parsed successfully"; }
    }

    private async Task<dynamic> ParseFileAsync(IFormFile file, CancellationToken ct)
    {
        var fileExt = Path.GetExtension(file.FileName).ToLower();

        return fileExt switch
        {
            ".xlsx" or ".xls" => await ParseExcelFileAsync(file, ct),
            ".csv" => await ParseCsvFileAsync(file, ct),
            ".json" => await ParseJsonFileAsync(file, ct),
            _ => throw new ArgumentException($"Unsupported file format: {fileExt}")
        };
    }

    private async Task<dynamic> ParseJsonFileAsync(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        var content = await reader.ReadToEndAsync(ct);
        
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;

        var headers = root.EnumerateObject().Select(p => p.Name).ToList();
        var sampleRows = new List<Dictionary<string, object?>>();

        if (root.ValueKind == JsonValueKind.Array)
        {
            headers = root[0].EnumerateObject().Select(p => p.Name).ToList();
            var count = 0;
            foreach (var item in root.EnumerateArray())
            {
                if (count >= 5) break;
                var row = new Dictionary<string, object?>();
                foreach (var prop in item.EnumerateObject())
                {
                    row[prop.Name] = prop.Value.GetRawText();
                }
                sampleRows.Add(row);
                count++;
            }
        }

        return new
        {
            ShortSummary = $"Parsed JSON with {headers.Count} fields",
            Format = "JSON",
            Headers = headers,
            RowCount = root.ValueKind == JsonValueKind.Array ? root.GetArrayLength() : 1,
            SampleRows = sampleRows
        };
    }

    private async Task<dynamic> ParseCsvFileAsync(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        
        await csv.ReadAsync();
        csv.ReadHeader();

        var headers = csv.HeaderRecord?.ToList() ?? new List<string>();
        var sampleRows = new List<Dictionary<string, object?>>();
        var allRows = new List<Dictionary<string, object?>>();
        var rowCount = 0;

        while (await csv.ReadAsync())
        {
            var row = new Dictionary<string, object?>();
            foreach (var header in headers)
                row[header] = csv.GetField(header);

            if (sampleRows.Count < 5) sampleRows.Add(row);
            allRows.Add(row);
            rowCount++;
        }

        // Compute numeric totals (same as Excel parser)
        var numericTotals = new Dictionary<string, decimal>();
        foreach (var header in headers)
        {
            decimal total = 0;
            var foundNumeric = false;
            foreach (var row in allRows)
            {
                var value = row.GetValueOrDefault(header)?.ToString()?.Replace(",", string.Empty);
                if (decimal.TryParse(value, out var number))
                {
                    total += number;
                    foundNumeric = true;
                }
            }
            if (foundNumeric) numericTotals[header] = total;
        }

        return new
        {
            ShortSummary = $"Parsed {rowCount} rows with {headers.Count} columns",
            Format = "CSV",
            Headers = headers,
            RowCount = rowCount,
            SampleRows = sampleRows,
            NumericTotals = numericTotals
        };
    }

    private static async Task<dynamic> ParseExcelFileAsync(IFormFile file, CancellationToken ct)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        await using var stream = file.OpenReadStream();
        using var reader = ExcelReaderFactory.CreateReader(stream);

        var dataSet = reader.AsDataSet(new ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataTableConfiguration
            {
                UseHeaderRow = false
            }
        });

        var table = dataSet.Tables.Count > 0 ? dataSet.Tables[0] : null;
        if (table == null || table.Rows.Count == 0)
        {
            return new { ShortSummary = "Empty sheet", Format = "Excel", SheetName = string.Empty, Headers = Array.Empty<string>(), SampleRows = Array.Empty<object>() };
        }

        var headerRow = 0;
        while (headerRow < table.Rows.Count && table.Rows[headerRow].ItemArray.All(c => string.IsNullOrWhiteSpace(c?.ToString())))
        {
            headerRow++;
        }

        var headers = table.Rows[headerRow].ItemArray.Select(c => c?.ToString()?.Trim() ?? string.Empty).ToList();
        var sampleRows = new List<Dictionary<string, object?>>();

        for (var rowIndex = headerRow + 1; rowIndex < table.Rows.Count && sampleRows.Count < 5; rowIndex++)
        {
            var row = table.Rows[rowIndex];
            if (row.ItemArray.All(c => string.IsNullOrWhiteSpace(c?.ToString()))) continue;

            var rowData = new Dictionary<string, object?>();
            for (var colIndex = 0; colIndex < headers.Count; colIndex++)
            {
                var header = headers[colIndex];
                if (string.IsNullOrWhiteSpace(header)) continue;
                rowData[header] = row.ItemArray.Length > colIndex ? row.ItemArray[colIndex] : null;
            }
            sampleRows.Add(rowData);
        }

        var numericTotals = new Dictionary<string, decimal>();
        for (var colIndex = 0; colIndex < headers.Count; colIndex++)
        {
            var header = headers[colIndex];
            if (string.IsNullOrWhiteSpace(header)) continue;

            decimal total = 0;
            var foundNumeric = false;
            for (var rowIndex = headerRow + 1; rowIndex < table.Rows.Count; rowIndex++)
            {
                var value = table.Rows[rowIndex].ItemArray.Length > colIndex ? table.Rows[rowIndex].ItemArray[colIndex]?.ToString()?.Replace(",", string.Empty) : null;
                if (decimal.TryParse(value, out var number))
                {
                    total += number;
                    foundNumeric = true;
                }
            }

            if (foundNumeric)
            {
                numericTotals[header] = total;
            }
        }

        var count = table.Rows.Cast<System.Data.DataRow>().Skip(headerRow + 1).Count(row => row.ItemArray.Any(c => !string.IsNullOrWhiteSpace(c?.ToString())));
        var shortSummary = $"Parsed {count} rows from sheet '{table.TableName}' with {headers.Count} columns";

        return new
        {
            ShortSummary = shortSummary,
            Format = "Excel",
            SheetName = table.TableName,
            Headers = headers,
            RowCount = count,
            NumericTotals = numericTotals,
            SampleRows = sampleRows
        };
    }
}
