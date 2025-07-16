class InvalidCredentials(Exception):
    """Invalid user account cridentials"""


class RefreshTokenExpired(Exception):
    """Refresh token is expired"""


class UserNotFound(Exception):
    """User was not found by it's id"""


class Invalid2FACode(Exception):
    """Two Factor code is not valid"""
