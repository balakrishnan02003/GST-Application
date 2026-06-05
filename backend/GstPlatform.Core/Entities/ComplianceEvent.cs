using GstPlatform.Core.Enums;

namespace GstPlatform.Core.Entities;

public class ComplianceEvent
{
    public Guid Id { get; set; }
    public Guid BusinessId { get; set; }
    public FilingType FilingType { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public string? Notes { get; set; }

    public Business Business { get; set; } = null!;
}
