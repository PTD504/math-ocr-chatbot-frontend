# server/app/models.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# User Profile Model (for authenticated users)
class UserProfile(BaseModel):
    uid: str
    email: Optional[str] = None
    name: str
    picture: Optional[str] = None
    isAnonymous: bool = False

# Chat Message Model
class Message(BaseModel):
    id: str
    conversationId: str
    type: str # "user" or "bot"
    content: Optional[str] = None # For user message (image URL or text)
    latex: Optional[str] = None # For bot message (LaTeX formula)
    timestamp: int # Unix timestamp in milliseconds

# New Message for request body
class NewMessage(BaseModel):
    type: str
    content: Optional[str] = None
    latex: Optional[str] = None

# Conversation Model
class Conversation(BaseModel):
    id: str
    title: str
    createdAt: int
    lastMessageAt: int
    messageCount: int = 0
    userType: str # 'anonymous' or 'authenticated'

# Update Conversation Title
class UpdateConversationTitle(BaseModel):
    title: str

# Image Processing Request (if needed for direct image uploads, but main.py handles form data)
class ImageProcessRequest(BaseModel):
    image_base64: str # Base64 encoded image string

# Image Processing Response
class ImageProcessResponse(BaseModel):
    formula: str
    processing_time: float
    user_uid: str