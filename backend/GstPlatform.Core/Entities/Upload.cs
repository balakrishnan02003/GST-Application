namespace GstPlatform.Core.Entities;

public class Upload
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public string? BlobUrl { get; set; }
    public string? ParsedSummary { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Business Business { get; set; } = null!;
}
