from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import firestore
import logging
from typing import List, Optional
from datetime import datetime
import os

from models import UserProfile, Conversation, Message, NewMessage, UpdateConversationTitle
from auth import get_current_user

logger = logging.getLogger(__name__)
db_firestore = firestore.client()

router = APIRouter()

# Helper function to get user's conversations collection ref
def get_conversations_ref(uid: str):
    return db_firestore.collection('users').document(uid).collection('conversations')

# Helper function to get messages collection ref for a specific conversation
def get_messages_ref(uid: str, conversation_id: str):
    return get_conversations_ref(uid).document(conversation_id).collection('messages')

# Endpoint to get all conversations for the current user
@router.get("/conversations", response_model=List[Conversation])
async def get_conversations(current_user: UserProfile = Depends(get_current_user)):
    try:
        conversations_query = get_conversations_ref(current_user.uid).order_by('lastMessageAt', direction=firestore.Query.DESCENDING)
        docs = conversations_query.stream()
        conversations = []
        for doc in docs:
            conv_data = doc.to_dict()
            conversations.append(Conversation(**conv_data))
        return conversations
    except Exception as e:
        logger.error(f"Error retrieving conversations for user {current_user.uid}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve conversations.")

# Endpoint to create a new conversation
@router.post("/conversations", response_model=Conversation)
async def create_new_conversation(current_user: UserProfile = Depends(get_current_user)):
    try:
        new_conv_id = f"conv_{int(datetime.now().timestamp() * 1000)}_{os.urandom(4).hex()}"
        current_time = int(datetime.now().timestamp() * 1000) # Milliseconds timestamp
        
        conversation_data = Conversation(
            id=new_conv_id,
            title="Cuộc trò chuyện mới",
            createdAt=current_time,
            lastMessageAt=current_time,
            messageCount=0,
            userType='anonymous' if current_user.isAnonymous else 'authenticated'
        )
        
        get_conversations_ref(current_user.uid).document(new_conv_id).set(conversation_data.model_dump())
        logger.info(f"Created new conversation {new_conv_id} for user {current_user.uid}")
        return conversation_data
    except Exception as e:
        logger.error(f"Failed to create conversation for UID {current_user.uid}: {e}", exc_info=True)
        
        if "PERMISSION_DENIED" in str(e) or "Missing or insufficient permissions" in str(e):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied by Firestore rules.")
        
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create new conversation.")


# Endpoint to update conversation title
@router.put("/conversations/{conversation_id}/title", response_model=Conversation)
async def update_conversation_title(
    conversation_id: str,
    update_data: UpdateConversationTitle,
    current_user: UserProfile = Depends(get_current_user)
):
    try:
        conv_ref = get_conversations_ref(current_user.uid).document(conversation_id)
        conv_doc = conv_ref.get()
        if not conv_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        
        conv_ref.update({"title": update_data.title})
        
        updated_conv_data = conv_doc.to_dict()
        updated_conv_data["title"] = update_data.title
        logger.info(f"Updated conversation {conversation_id} title for user {current_user.uid}")
        return Conversation(**updated_conv_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation {conversation_id} title for user {current_user.uid}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update conversation title.")

# Endpoint to delete a conversation and all its messages
@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    try:
        # Delete all messages in the conversation subcollection
        messages_ref = get_messages_ref(current_user.uid, conversation_id)
        docs = messages_ref.stream()
        for doc in docs:
            doc.reference.delete()
        
        # Delete the conversation document itself
        get_conversations_ref(current_user.uid).document(conversation_id).delete()
        logger.info(f"Deleted conversation {conversation_id} and its messages for user {current_user.uid}")
        return {"message": "Conversation deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id} for user {current_user.uid}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete conversation.")

# Endpoint to get messages for a specific conversation
@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(
    conversation_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    try:
        messages_query = get_messages_ref(current_user.uid, conversation_id).order_by('timestamp', direction=firestore.Query.ASCENDING)
        docs = messages_query.stream()
        messages = []
        for doc in docs:
            msg_data = doc.to_dict()
            messages.append(Message(**msg_data))
        return messages
    except Exception as e:
        logger.error(f"Error retrieving messages for conversation {conversation_id} and user {current_user.uid}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve messages.")

# Endpoint to add a new message to a conversation
@router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def add_message(
    conversation_id: str,
    new_message: NewMessage,
    current_user: UserProfile = Depends(get_current_user)
):
    try:
        conv_ref = get_conversations_ref(current_user.uid).document(conversation_id)
        conv_doc = conv_ref.get()
        if not conv_doc.exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        
        current_time = int(datetime.now().timestamp() * 1000)
        message_id = f"msg_{current_time}_{os.urandom(4).hex()}"

        message_data = Message(
            id=message_id,
            conversationId=conversation_id,
            type=new_message.type,
            content=new_message.content,
            latex=new_message.latex,
            imageData=new_message.imageData,
            preview=new_message.preview,
            fileName=new_message.fileName,
            timestamp=current_time
        )
        
        get_messages_ref(current_user.uid, conversation_id).document(message_id).set(message_data.model_dump())
        
        # Update conversation's lastMessageAt and messageCount
        conv_ref.update({
            "lastMessageAt": current_time,
            "messageCount": firestore.Increment(1)
        })
        logger.info(f"Added message to conversation {conversation_id} for user {current_user.uid}")
        return message_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding message to conversation {conversation_id} for user {current_user.uid}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to add message.")