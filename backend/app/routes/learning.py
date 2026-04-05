from fastapi import APIRouter

router = APIRouter()

@router.get("/generate-path")
def generate_path(level: str):
    return {
        "path": [
            f"{level} Basics",
            f"{level} Practice",
            f"{level} Projects"
        ]
    }