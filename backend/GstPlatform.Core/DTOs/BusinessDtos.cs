namespace GstPlatform.Core.DTOs;

public record CreateBusinessRequest(string Name, string Gstin);
public record BusinessDto(Guid Id, string Name, string Gstin);
