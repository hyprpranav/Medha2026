"""
MEDHA Command Center — Email Service
FastAPI backend for sending emails via Gmail SMTP
Deploy to Google Cloud Run
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.cloud.firestore as firestore

app = FastAPI(
    title="MEDHA Command Center Email Service",
    version="1.0.0",
)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://medha2026.vercel.app",
        "*",  # Remove in production, use specific origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables (set in Cloud Run)
EMAIL_USER = os.environ.get("EMAIL_USER", "")
EMAIL_PASS = os.environ.get("EMAIL_PASS", "")  # Gmail App Password
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")


class EmailRequest(BaseModel):
    mode: str  # 'manual' or 'broadcast'
    to: Optional[str] = None
    subject: str
    body: str
    senderUid: Optional[str] = None


def send_email(to_email: str, subject: str, body: str):
    """Send an email via Gmail SMTP."""
    if not EMAIL_USER or not EMAIL_PASS:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables.",
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"MEDHA Command Center <{EMAIL_USER}>"
    msg["To"] = to_email

    # Plain text
    msg.attach(MIMEText(body, "plain"))

    # HTML version
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">MEDHA Command Center</h1>
            <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">MEDHA 2026 — Event Communication</p>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-top: 0;">{subject}</h2>
            <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">{body}</div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This email was sent from MEDHA Command Center.<br>
                Kongunadu College of Engineering & Technology, Thottiyam, Trichy.
            </p>
        </div>
    </div>
    """
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="Gmail authentication failed. Check EMAIL_USER and EMAIL_PASS.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@app.get("/")
def root():
    return {
        "service": "MEDHA Command Center Email Service",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/send-mail")
def send_mail(request: EmailRequest):
    """Send manual or broadcast email."""

    if not request.subject or not request.body:
        raise HTTPException(status_code=400, detail="Subject and body are required")

    if request.mode == "manual":
        # Single email
        if not request.to:
            raise HTTPException(status_code=400, detail="Recipient email required for manual mode")

        send_email(request.to, request.subject, request.body)
        return {"success": True, "message": f"Email sent to {request.to}"}

    elif request.mode == "broadcast":
        # Broadcast to all team leaders
        if not FIREBASE_PROJECT_ID:
            raise HTTPException(
                status_code=500,
                detail="Firebase project ID not configured for broadcast mode",
            )

        try:
            db = firestore.Client(project=FIREBASE_PROJECT_ID)
            teams = db.collection("teams").stream()

            sent_count = 0
            errors = []

            for team_doc in teams:
                team = team_doc.to_dict()
                leader_email = team.get("leaderEmail", "")
                if leader_email and "@" in leader_email:
                    try:
                        send_email(leader_email, request.subject, request.body)
                        sent_count += 1
                    except Exception as e:
                        errors.append(f"{leader_email}: {str(e)}")

            return {
                "success": True,
                "message": f"Broadcast sent to {sent_count} team leaders",
                "errors": errors if errors else None,
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'manual' or 'broadcast'")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
