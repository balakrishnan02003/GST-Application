namespace GstPlatform.Core.DTOs;

public record InvoiceItemRequest(string Description, decimal Quantity, decimal Rate, decimal GstRate);
public record CreateInvoiceRequest(
    string InvoiceNo,
    DateTime InvoiceDate,
    Guid? CustomerId,
    IReadOnlyList<InvoiceItemRequest> Items);

public record BulkImportInvoiceRequest(
    string InvoiceNo,
    DateTime InvoiceDate,
    string CustomerName,
    string? CustomerGstin,
    decimal TaxableValue,
    decimal GstRate,
    decimal Cgst,
    decimal Sgst,
    decimal Igst,
    decimal Amount,
    string? Description);

public record InvoiceDto(
    Guid Id,
    string InvoiceNo,
    DateTime InvoiceDate,
    decimal Amount,
    decimal GstAmount,
    string Status,
    string? CustomerName);

