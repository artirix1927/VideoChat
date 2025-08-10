from domain.repositories.user import UserRepository
from infrastructure.db_session import get_db
from infrastructure.repositories.sqlalchemy_user import (
    SQLAlchemyUserRepository,
)
from domain.repositories.two_factor_auth import TwoFactorCodeSender
from infrastructure.services.email_utils import send_email


class EmailTwoFactorSender(TwoFactorCodeSender):
    async def send_code(self, user_id: int, code: str):
        async for session in get_db():
            user_repo: UserRepository = SQLAlchemyUserRepository(session)
            user = await user_repo.get_by_id(user_id)
            print(123)
            await send_email(
                to=user.email,
                subject="Your 2FA Code",
                body=f"Hi {user.username}, your code is {code}",
            )
