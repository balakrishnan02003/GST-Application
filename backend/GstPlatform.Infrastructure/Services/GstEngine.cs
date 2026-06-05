using GstPlatform.Core.DTOs;
using GstPlatform.Core.Interfaces;

namespace GstPlatform.Infrastructure.Services;

public class GstEngine : IGstEngine
{
    public GstSummaryDto CalculateSummary(decimal outputTax, decimal inputTax, decimal taxableSales, decimal cgst, decimal sgst, decimal igst) =>
        new(taxableSales, cgst, sgst, igst, inputTax, CalculateNetLiability(outputTax, inputTax));

    public decimal CalculateNetLiability(decimal outputGst, decimal eligibleItc) =>
        Math.Max(0, outputGst - eligibleItc);
}
