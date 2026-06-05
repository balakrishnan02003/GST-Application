using GstPlatform.Core.Enums;

namespace GstPlatform.Core.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.BusinessOwner;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Business> Businesses { get; set; } = [];
}
