from datetime import datetime
from domain.models import RefreshToken
from infrastructure.models import RefreshToken as RefreshTokenModel
from domain.repositories.refresh_token import RefreshTokenRepository
from sqlalchemy.orm import Session

from infrastructure.mappers import refresh_token_from_model


class SQLAlchemyRefreshTokenRepository(RefreshTokenRepository):
    def __init__(self, session: Session):
        self.session = session

    def create_or_update_refresh_token(
        self, token_str: str, user_id: str, exp: datetime
    ) -> RefreshToken:
        token = self.session.query(RefreshTokenModel).filter_by(user_id=user_id).first()

        if token:
            token.token = token_str
            token.expires_at = exp
            self.session.commit()

            token_entity = refresh_token_from_model(token)

            return token

        new_token = RefreshTokenModel(user_id=user_id, token=token_str, expires_at=exp)
        self.session.add(new_token)
        self.session.commit()

        token_entity = refresh_token_from_model(new_token)

        return token_entity
