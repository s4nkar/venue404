from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
