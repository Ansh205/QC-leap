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

    if message.strip().startswith("<html"):
        html_body = message
    else:
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="color: #2c3e50; margin: 0;">QC-Leap Notification</h2>
                    </div>
                    <div style="font-size: 16px;">
                        {message.replace(chr(10), '<br>')}
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #7f8c8d; text-align: center;">
                        <p>&copy; {2025} QC-Leap. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """

    msg.attach(MIMEText(html_body, 'html'))

    try:
        server = smtplib.SMTP(host=SMTP_SERVER_HOST, port=SMTP_SERVER_PORT)
        server.starttls()  # Secure the connection
        server.login(SENDER_ADDRESS, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")


def send_invitation_email(to_email: str, company_name: str, inviter_name: str, invitation_link: str = "http://localhost:3000/invitations"):

    subject = f"You've been invited to join {company_name} on QC-Leap"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #2c3e50;">Invitation to Join {company_name}</h2>
                <p>Hello,</p>
                <p><strong>{inviter_name}</strong> has invited you to join their company <strong>{company_name}</strong> on QC-Leap.</p>
                <p>QC-Leap is an AI-powered quality control system for manufacturing defect detection.</p>
                <p>This invitation will expire in 30 days.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #7f8c8d;">If you were not expecting this invitation, you can safely ignore this email.</p>
            </div>
        </body>
    </html>
    """
    
    send_message(subject, html_content, to_email)