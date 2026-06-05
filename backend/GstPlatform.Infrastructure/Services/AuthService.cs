using GstPlatform.Core.DTOs;
using GstPlatform.Core.Entities;
using GstPlatform.Core.Interfaces;
using GstPlatform.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GstPlatform.Infrastructure.Services;

public class AuthService(AppDbContext db, JwtTokenService jwt) : IAuthService
{
    private static readonly Dictionary<string, (Guid UserId, string RefreshToken, DateTime Expires)> RefreshStore = new();

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.");

        if (await db.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant(), ct))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant(), ct)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        return CreateAuthResponse(user);
    }

    public Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var entry = RefreshStore.Values.FirstOrDefault(v => v.RefreshToken == refreshToken);
        if (entry.UserId == Guid.Empty || entry.Expires < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        var user = db.Users.Find(entry.UserId)
            ?? throw new UnauthorizedAccessException("User not found.");

        return Task.FromResult(CreateAuthResponse(user));
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        var (accessToken, refreshToken) = jwt.GenerateTokens(user);
        RefreshStore[user.Email] = (user.Id, refreshToken, DateTime.UtcNow.AddDays(7));
        return new AuthResponse(accessToken, refreshToken, new UserDto(user.Id, user.Name, user.Email, user.Role));
    }
}
