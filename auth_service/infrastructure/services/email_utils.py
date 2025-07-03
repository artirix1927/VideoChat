import aiosmtplib
from email.message import EmailMessage


async def send_email(to: str, subject: str, body: str):
    message = EmailMessage()
    message["From"] = "mrartem1927@gmail.com"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username="mrartem1927@gmail.com",
        password="ctlo lxfx tbyy ybiq",
    )
