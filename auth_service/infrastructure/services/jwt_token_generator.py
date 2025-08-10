import secrets
from domain.models import User
from domain.repositories.token_generator import TokenGenerator
from jwt_config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from jose import jwt
from datetime import datetime, timedelta, timezone, UTC


class JWTTokenGenerator(TokenGenerator):
    ACCESS_TOKEN_EXPIRE_MINUTES: int = ACCESS_TOKEN_EXPIRE_MINUTES
    ALGORITHM: str = ALGORITHM
    SECRET_KEY: str = SECRET_KEY

    def extract_from_payload(self, token: str) -> tuple[str, datetime]:
        payload = self.decode_payload(token)

        user_id = payload.get("sub")
        exp_timestamp = payload.get("exp")

        exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=UTC)

        return user_id, exp_datetime

    def _build_payload(self, user_id: int, timedelta: timedelta) -> dict:
        exp_date = datetime.now(timezone.utc) + timedelta
        payload = {
            "sub": str(user_id),
            "exp": exp_date,  # 15 minutes expiry
        }
        return payload

    def generate_access_token(self, user: User) -> str:
        payload = self._build_payload(user.id, timedelta(minutes=15))
        return jwt.encode(payload, self.SECRET_KEY, algorithm=self.ALGORITHM)

    def generate_refresh_token(self) -> str:
        return secrets.token_urlsafe(64)

    def decode_payload(self, token: str):
        return jwt.decode(
            token,
            self.SECRET_KEY,
        )
