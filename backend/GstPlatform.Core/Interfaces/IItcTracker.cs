using GstPlatform.Core.DTOs;

namespace GstPlatform.Core.Interfaces;

public interface IItcTracker
{
    Task<IReadOnlyList<ItcMismatchDto>> GetMismatchesAsync(Guid businessId, CancellationToken ct = default);
}
