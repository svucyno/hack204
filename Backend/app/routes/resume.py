"""Resume upload and analysis endpoint."""

import os
import PyPDF2
import google.generativeai as genai
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List
import json
import logging
from app.core.deps import get_current_user
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.db.documents import User
from app.db import collections as C
from app.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resume", tags=["resume"])

class ResumeAnalysisResult(BaseModel):
    goals: List[str]
    interests: List[str]
    skills: List[str]

@router.post("/analyze", response_model=ResumeAnalysisResult)
async def analyze_resume(file: UploadFile = File(...)):
    """Analyze a resume file (PDF or text) to extract goals, interests, and skills using Gemini."""
    content = ""
    try:
        if file.filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(file.file)
            content = " ".join(page.extract_text() for page in reader.pages if page.extract_text())
        else:
            doc = await file.read()
            content = doc.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"File reading error: {e}")
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")
        
    api_key = settings.gemini_api_key or settings.openai_api_key # Attempt fallback if key reused
    if not api_key:
        logger.warning("No generative AI API key set. Returning mock resume analysis.")
        return ResumeAnalysisResult(
            goals=["Machine learning fundamentals", "Advance software engineering"],
            interests=["Python", "Deep Learning", "Cloud deployment"],
            skills=["Python", "FastAPI", "React"]
        )
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Extract the following information from the resume text provided below.
        Return ONLY a JSON object with this exact structure, nothing else (no markdown tags):
        {{
            "goals": ["short goal 1", "short goal 2"],
            "interests": ["interest 1", "interest 2"],
            "skills": ["skill 1", "skill 2"]
        }}
        
        Resume text:
        {content[:8000]}
        """
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return ResumeAnalysisResult(
            goals=data.get("goals") or [],
            interests=data.get("interests") or [],
            skills=data.get("skills") or []
        )
    except Exception as e:
        logger.error(f"AI extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini API or Parsing failure: {str(e)}")

@router.get("/generate")
async def generate_resume_txt(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Response:
    """Generate an ATS-friendly text summary resume based on learning paths."""
    p = await db[C.PROFILES].find_one({"user_id": user.id})
    paths_cursor = db[C.LEARNING_PATHS].find({"user_id": user.id})
    paths = await paths_cursor.to_list(100)
    
    lines = []
    lines.append(user.full_name.upper() if user.full_name else "PROFESSIONAL RESUME")
    lines.append(f"Email: {user.email}")
    if p and p.get("linkedin_url"):
         lines.append(f"LinkedIn: {p.get('linkedin_url')}")
    if p and p.get("github_url"):
         lines.append(f"GitHub: {p.get('github_url')}")
    lines.append("")
    
    lines.append("SUMMARY")
    lines.append("-" * 40)
    goals = p.get("goals") if p else []
    goals_text = ", ".join(goals) if goals else "Continuous learning and professional growth"
    lines.append(f"Dedicated professional with a focus on: {goals_text}.")
    lines.append("")
    
    lines.append("TECHNICAL SKILLS & INTERESTS")
    lines.append("-" * 40)
    interests = p.get("interests") if p else []
    if interests:
         lines.append(f"Key Topics: {', '.join(interests)}")
    else:
         lines.append("Eager to learn modern technologies and frameworks.")
    lines.append("")
    
    lines.append("EDUCATION & CONTINUOUS LEARNING")
    lines.append("-" * 40)
    if paths:
        for pt in paths:
             # Just picking paths with actual modules to indicate learning
             lines.append(f"* Goal Pathway: {pt.get('goal_summary')}")
             mods = pt.get("modules", [])
             if mods:
                 lines.append(f"  Topics covered: {', '.join(m.get('title') for m in mods[:5])}")
    else:
         lines.append("* Actively participating in structured learning paths.")
         
    text_content = "\n".join(lines)
    return Response(
        content=text_content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="ats_resume.txt"'}
    )
