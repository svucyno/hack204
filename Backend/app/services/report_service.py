"""PDF report generation for learner progress."""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas


def build_learner_pdf(title: str, sections: List[tuple[str, Any]]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    
    # Header Background
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(0, height - 100, width, 100, fill=True, stroke=False)
    
    # Title
    y = height - 50
    c.setFillColor(colors.HexColor("#38bdf8"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, y, title)
    
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica", 10)
    c.drawString(40, y - 20, f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y %H:%M')}")
    
    y -= 70
    
    # Body
    for heading, body in sections:
        if y < 80:
            c.showPage()
            y = height - 60
            
        c.setFillColor(colors.HexColor("#4f46e5"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, str(heading))
        y -= 20
        
        c.setFillColor(colors.HexColor("#334155"))
        c.setFont("Helvetica", 11)
        
        text = str(body) if not isinstance(body, list) else ", ".join(map(str, body))
        if not text:
             text = "None"
             
        for line in text.splitlines()[:40]:
            if y < 50:
                c.showPage()
                y = height - 50
                c.setFillColor(colors.HexColor("#334155"))
                c.setFont("Helvetica", 11)
            c.drawString(50, y, line[:120])
            y -= 18
            
        y -= 15
        
    c.save()
    return buf.getvalue()
