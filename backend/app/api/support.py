import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.support import SupportTicket
from app.config import get_settings

log = logging.getLogger(__name__)
router = APIRouter(prefix="/support", tags=["support"])


from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    name: str | None = Field(default=None, max_length=150)
    email: str | None = Field(default=None, max_length=255)
    category: str = Field(default="general", max_length=50)
    message: str = Field(..., max_length=4000)
    user_id: str | None = Field(default=None, max_length=100)


@router.post("/ticket")
async def submit_ticket(body: TicketCreate, db: AsyncSession = Depends(get_db)):
    """Submit a support ticket. No auth required."""
    msg = body.message.strip()
    if not msg:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    ticket = SupportTicket(
        name=body.name.strip() if body.name else None,
        email=body.email.strip() if body.email else None,
        category=body.category.strip() if body.category else "general",
        message=msg,
        user_id=body.user_id,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # Fire-and-forget email notification via Resend (if configured)
    settings = get_settings()
    if settings.RESEND_API_KEY:
        import asyncio
        asyncio.create_task(_notify_email(ticket, settings))

    return {"id": ticket.id, "status": "received"}


def _html_escape(text: str) -> str:
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;"))


async def _notify_email(ticket: SupportTicket, settings):
    """Send email notification via Resend API."""
    try:
        import httpx
        category_label = _html_escape(ticket.category.title())
        name_safe = _html_escape(ticket.name or "Anonymous")
        email_safe = _html_escape(ticket.email or "")
        from_user = f"{name_safe} &lt;{email_safe}&gt;" if email_safe else name_safe
        message_safe = _html_escape(ticket.message).replace("\n", "<br>")
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": "manga-dl Support <onboarding@resend.dev>",
                    "to": [settings.SUPPORT_EMAIL],
                    "subject": f"[{ticket.category.title()}] New support ticket #{ticket.id}",
                    "html": f"""
                        <h2>New Support Ticket #{ticket.id}</h2>
                        <p><strong>From:</strong> {from_user}</p>
                        <p><strong>Category:</strong> {category_label}</p>
                        <p><strong>Message:</strong></p>
                        <blockquote style="border-left:3px solid #dc2626;padding-left:12px;margin:8px 0;color:#555">
                            {message_safe}
                        </blockquote>
                        <p style="color:#888;font-size:12px">View all tickets in Supabase Table Editor → support_tickets</p>
                    """,
                },
                timeout=10,
            )
    except Exception as e:
        log.warning("Failed to send ticket email notification: %s", e)
