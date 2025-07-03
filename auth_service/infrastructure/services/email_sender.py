from domain.repositories.two_factor_auth import TwoFactorCodeSender
from domain.models import User
from infrastructure.services.email_utils import send_email


class EmailTwoFactorSender(TwoFactorCodeSender):
    async def send_code(self, user: User, code: str):
        # use an email lib like aiosmtplib, SendGrid, or SMTP
        print(123)
        await send_email(
            to=user.email,
            subject="Your 2FA Code",
            body=f"Hi {user.username}, your code is {code}",
        )
