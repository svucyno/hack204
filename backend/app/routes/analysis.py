from fastapi import APIRouter

router = APIRouter()

@router.post("/analyze-performance")
def analyze(data: dict):
    score = sum(data.get("answers", []))
    return {"score": score}