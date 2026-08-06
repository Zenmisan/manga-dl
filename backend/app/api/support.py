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


class TicketCreate(BaseModel):
    name: str | None = None
    email: str | None = None
    category: str = "general"
    message: str
    user_id: str | None = None


@router.post("/ticket")
async def submit_ticket(body: TicketCreate, db: AsyncSession = Depends(get_db)):
    """Submit a support ticket. No auth required."""
    if not body.message or not body.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    ticket = SupportTicket(
        name=body.name,
        email=body.email,
        category=body.category,
        message=body.message.strip(),
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


async def _notify_email(ticket: SupportTicket, settings):
    """Send email notification via Resend API."""
    try:
        import httpx
        category_label = ticket.category.title()
        from_user = f"{ticket.name or 'Anonymous'} <{ticket.email}>" if ticket.email else (ticket.name or "Anonymous")
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": "manga-dl Support <onboarding@resend.dev>",
                    "to": [settings.SUPPORT_EMAIL],
                    "subject": f"[{category_label}] New support ticket #{ticket.id}",
                    "html": f"""
                        <h2>New Support Ticket #{ticket.id}</h2>
                        <p><strong>From:</strong> {from_user}</p>
                        <p><strong>Category:</strong> {category_label}</p>
                        <p><strong>Message:</strong></p>
                        <blockquote style="border-left:3px solid #dc2626;padding-left:12px;margin:8px 0;color:#555">
                            {ticket.message.replace(chr(10), '<br>')}
                        </blockquote>
                        <p style="color:#888;font-size:12px">View all tickets in Supabase Table Editor → support_tickets</p>
                    """,
                },
                timeout=10,
            )
    except Exception as e:
        log.warning("Failed to send ticket email notification: %s", e)
