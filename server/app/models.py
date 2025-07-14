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

class MessageBase(BaseModel):
    type: str
    content: Optional[str] = None
    latex: Optional[str] = None
    imageData: Optional[str] = None
    preview: Optional[str] = None
    fileName: Optional[str] = None

class NewMessage(MessageBase):
    pass

class Message(MessageBase):
    id: str
    conversationId: str
    timestamp: int

# Conversation Model
class Conversation(BaseModel):
    id: str
    title: str
    createdAt: int
    lastMessageAt: int
    messageCount: int = 0
    userType: str

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