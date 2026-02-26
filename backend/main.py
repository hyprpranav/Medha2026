"""
MEDHA Command Center — Email Service
FastAPI backend for sending emails via Gmail SMTP.
Supports manual (single) and broadcast (multi-recipient) modes.
The frontend sends the recipient list for broadcast — no server-side
Firebase access needed.
"""

import os
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Load .env ───────────────────────────────────────────────
load_dotenv()

app = FastAPI(
    title="MEDHA Command Center Email Service",
    version="2.0.0",
)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://medha2026.vercel.app",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Credentials ─────────────────────────────────────────────
EMAIL_USER = os.environ.get("EMAIL_USER", "")
EMAIL_PASS = os.environ.get("EMAIL_PASS", "")


# ── Request schemas ─────────────────────────────────────────
class EmailRequest(BaseModel):
    mode: str  # 'manual' | 'broadcast'
    to: Optional[str] = None  # single recipient (manual mode)
    recipients: Optional[List[str]] = None  # list of emails (broadcast mode)
    subject: str
    body: str
    senderUid: Optional[str] = None


# ── HTML template ───────────────────────────────────────────
def build_html(subject: str, body: str) -> str:
    return f"""\
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
  <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">MEDHA 2026</h1>
    <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">Dept. of ECE, M. Kumarasamy College of Engineering</p>
  </div>
  <div style="padding:28px 24px;background:#ffffff;border:1px solid #e2e8f0;border-top:none;">
    <h2 style="color:#1e293b;margin:0 0 16px;font-size:18px;">{subject}</h2>
    <div style="color:#475569;line-height:1.7;font-size:14px;white-space:pre-wrap;">{body}</div>
  </div>
  <div style="padding:16px 24px;background:#f1f5f9;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
      This email was sent from MEDHA Command Center.<br>
      Dept. of ECE, M.&nbsp;Kumarasamy College of Engineering, Karur.
    </p>
  </div>
</div>"""


# ── Core send helper ────────────────────────────────────────
def send_one(to_email: str, subject: str, body: str):
    """Send a single email via Gmail SMTP."""
    if not EMAIL_USER or not EMAIL_PASS:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured. Set EMAIL_USER and EMAIL_PASS.",
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"MEDHA 2026 <{EMAIL_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(build_html(subject, body), "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Gmail authentication failed. Check EMAIL_USER and EMAIL_PASS (use an App Password).",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ── Routes ──────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "MEDHA Command Center Email Service",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "email_configured": bool(EMAIL_USER and EMAIL_PASS)}


@app.post("/send-mail")
def send_mail(request: EmailRequest):
    """
    Send a single email (mode='manual') or broadcast to a list of
    recipients (mode='broadcast').  For broadcast the frontend fetches
    all leader emails from Firestore and sends them in `recipients`.
    """

    if not request.subject.strip() or not request.body.strip():
        raise HTTPException(status_code=400, detail="Subject and body are required")

    # ── Manual: single recipient ────────────────────────────
    if request.mode == "manual":
        if not request.to:
            raise HTTPException(status_code=400, detail="Recipient email required for manual mode")
        send_one(request.to.strip(), request.subject, request.body)
        return {"success": True, "message": f"Email sent to {request.to}"}

    # ── Broadcast: list of recipients ───────────────────────
    elif request.mode == "broadcast":
        recipients = request.recipients or []
        valid = [e.strip() for e in recipients if e and "@" in e]

        if not valid:
            raise HTTPException(
                status_code=400,
                detail="No valid recipient emails provided. Frontend should pass 'recipients' array.",
            )

        sent_count = 0
        errors = []

        for email in valid:
            try:
                send_one(email, request.subject, request.body)
                sent_count += 1
                # Small delay between emails to avoid Gmail rate-limiting
                if sent_count % 10 == 0:
                    time.sleep(1)
            except Exception as e:
                errors.append(f"{email}: {str(e)}")

        return {
            "success": True,
            "message": f"Broadcast sent to {sent_count}/{len(valid)} recipients",
            "sent": sent_count,
            "total": len(valid),
            "errors": errors if errors else None,
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'manual' or 'broadcast'")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
