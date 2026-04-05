from fastapi import FastAPI
from app.routes import learning, quiz, analysis, recommend

app = FastAPI()

app.include_router(learning.router)
app.include_router(quiz.router)
app.include_router(analysis.router)
app.include_router(recommend.router)

@app.get("/")
def home():
    return {"message": "Backend Running 🚀"}