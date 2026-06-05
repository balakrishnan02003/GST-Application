using GstPlatform.Core.DTOs;

namespace GstPlatform.Core.Interfaces;

public interface IBusinessService
{
    Task<IReadOnlyList<BusinessDto>> GetBusinessesAsync(Guid userId, CancellationToken ct = default);
    Task<BusinessDto> CreateBusinessAsync(Guid userId, CreateBusinessRequest request, CancellationToken ct = default);
}
