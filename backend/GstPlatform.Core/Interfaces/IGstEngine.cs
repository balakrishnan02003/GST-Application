using GstPlatform.Core.DTOs;

namespace GstPlatform.Core.Interfaces;

public interface IGstEngine
{
    GstSummaryDto CalculateSummary(decimal outputTax, decimal inputTax, decimal taxableSales, decimal cgst, decimal sgst, decimal igst);
    decimal CalculateNetLiability(decimal outputGst, decimal eligibleItc);
}
