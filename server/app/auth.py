from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv
import os
import json
import logging
from typing import Optional, Dict
from pydantic import BaseModel

from models import UserProfile

load_dotenv()

logger = logging.getLogger(__name__)

# --- Firebase Admin SDK Initialization ---
firebase_admin_initialized = False

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global firebase_admin_initialized
    
    try:
        # Check if Firebase app is already initialized
        try:
            firebase_admin.get_app()
            logger.info("Firebase Admin SDK already initialized.")
            firebase_admin_initialized = True
            return
        except ValueError:
            # App doesn't exist, proceed with initialization
            pass
        
        firebase_service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_JSON')
        if firebase_service_account_json:
            # Load from JSON string directly for environment variables
            cred_dict = json.loads(firebase_service_account_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            firebase_admin_initialized = True
            logger.info("Firebase Admin SDK initialized successfully from JSON string.")
        else:
            # Fallback to file path if env var not set (useful for local development with file)
            firebase_service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH', 'firebase_admin_key.json')
            if os.path.exists(firebase_service_account_path):
                cred = credentials.Certificate(firebase_service_account_path)
                firebase_admin.initialize_app(cred)
                firebase_admin_initialized = True
                logger.info(f"Firebase Admin SDK initialized from file: {firebase_service_account_path}")
            else:
                logger.warning("Neither FIREBASE_SERVICE_ACCOUNT_KEY_JSON nor FIREBASE_SERVICE_ACCOUNT_KEY_PATH found. Firebase Admin SDK not initialized. User authentication will be disabled.")
                
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing Firebase service account JSON: {e}", exc_info=True)
        firebase_admin_initialized = False
    except Exception as e:
        logger.error(f"Error initializing Firebase Admin SDK: {e}", exc_info=True)
        firebase_admin_initialized = False

initialize_firebase()

# --- Pydantic Models for Authentication ---
class VerifyTokenRequest(BaseModel):
    idToken: str

# --- FastAPI Router and Dependencies ---
router = APIRouter()
security = HTTPBearer()

async def verify_firebase_id_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Firebase ID Token from the Authorization Bearer header.
    Returns decoded token if valid, raises HTTPException otherwise.
    """
    if not firebase_admin_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK is not initialized. Authentication is disabled."
        )
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase ID token verification failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials. {e}"
        )

async def get_current_user(decoded_token: Dict = Depends(verify_firebase_id_token)) -> UserProfile:
    """
    Dependency to get the current authenticated user's profile.
    """
    return UserProfile(
        uid=decoded_token.get('uid'),
        email=decoded_token.get('email'),
        name=decoded_token.get('name', decoded_token.get('email', 'Guest')),
        picture=decoded_token.get('picture'),
        isAnonymous=decoded_token.get('firebase', {}).get('sign_in_provider') == 'anonymous'
    )

# --- Authentication Endpoints ---
@router.post("/verify-token", response_model=UserProfile)
async def verify_token_endpoint(
    request: VerifyTokenRequest,
    # This endpoint does not need to be protected by get_current_user
    # as its purpose is to verify the token itself.
):
    """
    Receives a Firebase ID Token from the frontend, verifies it using Firebase Admin SDK,
    and returns the user profile.
    This is useful for the frontend to "sign in" with the backend after Firebase client-side auth.
    """
    if not firebase_admin_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK is not initialized. Authentication is disabled."
        )
    try:
        decoded_token = auth.verify_id_token(request.idToken)
        user_profile = UserProfile(
            uid=decoded_token.get('uid'),
            email=decoded_token.get('email'),
            name=decoded_token.get('name', decoded_token.get('email', 'Guest')),
            picture=decoded_token.get('picture'),
            isAnonymous=decoded_token.get('firebase', {}).get('sign_in_provider') == 'anonymous'
        )
        logger.info(f"Token verified for user: {user_profile.uid}")
        return user_profile
    except Exception as e:
        logger.error(f"Error verifying token in /verify-token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}"
        )

# Protected endpoint
@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns the profile of the current authenticated user.
    Requires a valid Firebase ID Token in the Authorization header.
    """
    return current_user