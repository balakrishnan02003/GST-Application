using GstPlatform.Core.DTOs;

namespace GstPlatform.Core.Interfaces;

public interface IGstParserService
{
    Task<GstSummaryDto> ParseGstr1JsonAsync(Stream fileStream, CancellationToken ct = default);
    Task<GstSummaryDto> ParseGstr2BJsonAsync(Stream fileStream, CancellationToken ct = default);
}
