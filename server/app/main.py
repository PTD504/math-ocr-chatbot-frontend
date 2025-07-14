from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

from auth import router as auth_router, verify_firebase_id_token, get_current_user
from chat import router as chat_router
from models import UserProfile, Message
from services import process_image_with_model 
from config import settings

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description=settings.PROJECT_DESCRIPTION
)

# CORS Middleware (Adjust allow_origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"]) # Chat endpoints for conversations and messages

@app.get("/", summary="Root endpoint for API health check")
async def root():
    return {"message": "Chatbot Backend API is running!"}

@app.get("/health", summary="Health check endpoint")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "timestamp": os.getenv("START_TIME", "N/A")}

# Image processing endpoint
@app.post("/process-image")
async def process_image_endpoint(
    request: Request,
    user: UserProfile = Depends(get_current_user) # Ensure user is authenticated
):
    """
    Receives an image from the frontend, sends it to the Model API Backend,
    and returns the LaTeX formula.
    """
    if not user.uid:
        raise HTTPException(status_code=401, detail="Authentication required for image processing.")
    
    content_type = request.headers.get("Content-Type")
    if not content_type or not content_type.startswith("multipart/form-data"):
        raise HTTPException(status_code=400, detail="Invalid Content-Type. Expected multipart/form-data.")

    try:
        form = await request.form()
        image_file = form.get("image")
        if not image_file or not hasattr(image_file, 'file'):
            raise HTTPException(status_code=400, detail="No image file provided.")

        image_data = await image_file.read()
        
        # Call the service layer to process image with the Model API Backend
        latex_formula, processing_time = await process_image_with_model(image_data)
        
        return {
            "formula": latex_formula,
            "processing_time": processing_time,
            "user_uid": user.uid
        }
    except HTTPException:
        raise # Re-raise FastAPI HTTPExceptions
    except Exception as e:
        logger.error(f"Error processing image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process image: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)