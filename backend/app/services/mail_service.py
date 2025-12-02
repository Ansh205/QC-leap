import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

SMTP_SERVER_HOST = settings.MAIL_SERVER
SMTP_SERVER_PORT = settings.MAIL_PORT
SENDER_ADDRESS = settings.MAIL_USERNAME
SENDER_PASSWORD = settings.MAIL_PASSWORD

def send_message(subject: str, message: str, to_email: str):
    if not SENDER_ADDRESS or not SENDER_PASSWORD:
        print("Email credentials not set. Skipping email sending.")
        return

    msg = MIMEMultipart()
    msg["From"] = SENDER_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(message, 'html'))

    try:
        server = smtplib.SMTP(host=SMTP_SERVER_HOST, port=SMTP_SERVER_PORT)
        server.starttls()  # Secure the connection
        server.login(SENDER_ADDRESS, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")