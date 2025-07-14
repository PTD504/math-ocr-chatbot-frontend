import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Math LaTeX Chatbot Backend"
    API_VERSION: str = "1.0.0"
    PROJECT_DESCRIPTION: str = "Backend for Math LaTeX Chatbot, handling authentication, chat history, and model interaction."
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Firebase Admin SDK Configuration
    # Prioritize JSON string from env var for deployment, fallback to path for local
    FIREBASE_SERVICE_ACCOUNT_KEY_JSON: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: str = "firebase_admin_key.json"

    # Model API Backend Configuration
    MODEL_API_BASE_URL: str = os.getenv("MODEL_API_BASE_URL") # Default to local model API
    MODEL_API_KEY: Optional[str] = os.getenv("MODEL_API_KEY") # API Key for Model API Backend

    # HTTP client timeout for Model API calls
    MODEL_API_TIMEOUT: int = 30 # seconds

    # Pydantic Settings management
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()