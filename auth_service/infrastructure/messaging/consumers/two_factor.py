from infrastructure.services.email_sender import EmailTwoFactorSender
from domain.models import TwoFactorCode, User


async def handle_two_factor_code_generated(event: TwoFactorCode):
    sender = EmailTwoFactorSender()
    user = User(id=event.user_id, username=event.username, email=event.email)
    sender.send_code(user, event.code)
