using GstPlatform.Core.Enums;

namespace GstPlatform.Core.DTOs;

public record RegisterRequest(string Name, string Email, string Password, UserRole Role = UserRole.BusinessOwner);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);
public record RefreshTokenRequest(string RefreshToken);
public record UserDto(Guid Id, string Name, string Email, UserRole Role);
