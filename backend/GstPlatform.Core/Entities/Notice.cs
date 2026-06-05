using GstPlatform.Core.Enums;

namespace GstPlatform.Core.Entities;

public class Notice
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? NoticeType { get; set; }
    public NoticeRisk Risk { get; set; } = NoticeRisk.Medium;
    public string Status { get; set; } = "Open";
    public string? AiSummary { get; set; }
    public string? RecommendedAction { get; set; }
    public string? BlobUrl { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public Business Business { get; set; } = null!;
}
