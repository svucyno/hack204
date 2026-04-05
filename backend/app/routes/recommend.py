from fastapi import APIRouter

router = APIRouter()

@router.get("/recommend")
def recommend():
    return {
        "resources": ["YouTube Course", "Practice Problems"]
    }