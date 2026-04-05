from fastapi import APIRouter

router = APIRouter()

@router.get("/generate-quiz")
def quiz():
    return {
        "questions": ["Q1", "Q2", "Q3"]
    }