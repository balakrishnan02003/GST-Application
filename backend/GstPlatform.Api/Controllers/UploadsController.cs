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
public class UploadsController(AppDbContext db, IGstParserService parser) : ControllerBase
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
            result = await ParseFileAsync(file, ct);
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

        if (fileExt == ".json")
        {
            await using var stream = file.OpenReadStream();
            result = await parser.ParseGstr2BJsonAsync(stream, ct);
        }
        else
        {
            result = await ParseFileAsync(file, ct);
        }

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GSTR-2B",
            ParsedSummary = result is GstSummaryDto gst ? $"ITC: {gst.Itc}" : GetSummary(result)
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpPost("gstr-3b")]
    public async Task<ActionResult<object>> UploadGstr3B(Guid businessId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { message = "File is empty." });

        var result = await ParseFileAsync(file, ct);

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GSTR-3B",
            ParsedSummary = GetSummary(result)
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpPost("ledger")]
    public async Task<ActionResult<object>> UploadLedger(Guid businessId, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0) return BadRequest(new { message = "File is empty." });

        var result = await ParseFileAsync(file, ct);

        db.Uploads.Add(new Upload
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            FileName = file.FileName,
            FileType = "GST Ledger",
            ParsedSummary = GetSummary(result)
        });
        await db.SaveChangesAsync(ct);

        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult> GetUploads(Guid businessId, CancellationToken ct) =>
        Ok(await db.Uploads.Where(u => u.BusinessId == businessId).OrderByDescending(u => u.UploadedAt).ToListAsync(ct));

    private string GetSummary(object result)
    {
        if (result is not System.Text.Json.Nodes.JsonNode node) return "Parsed successfully";
        var summary = node["ShortSummary"]?.GetValue<string>();
        return summary ?? "Parsed successfully";
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
        var rowCount = 0;

        while (await csv.ReadAsync())
        {
            if (sampleRows.Count < 5)
            {
                var row = new Dictionary<string, object?>();
                foreach (var header in headers)
                {
                    row[header] = csv.GetField(header);
                }
                sampleRows.Add(row);
            }
            rowCount++;
        }

        return new
        {
            ShortSummary = $"Parsed {rowCount} rows with {headers.Count} columns",
            Format = "CSV",
            Headers = headers,
            RowCount = rowCount,
            SampleRows = sampleRows
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
