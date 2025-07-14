import httpx
import logging

from fastapi import HTTPException, status
from config import settings 

logger = logging.getLogger(__name__)

async def process_image_with_model(image_data: bytes) -> tuple[str, float]:
    """
    Sends image data to the Model API Backend for LaTeX formula prediction.
    """
    model_api_url = settings.MODEL_API_BASE_URL
    model_api_key = settings.MODEL_API_KEY

    if not model_api_url:
        logger.error("MODEL_API_BASE_URL is not configured in settings.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Model API URL is not configured.")

    if not model_api_key:
        logger.warning("MODEL_API_KEY is not configured. Calling Model API without authentication.")

    headers = {}
    if model_api_key:
        headers["X-API-Key"] = model_api_key

    files = {'file': ('image.png', image_data, 'image/png')} # Assuming the image is in PNG format

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{model_api_url}/predict", files=files, headers=headers, timeout=settings.MODEL_API_TIMEOUT)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            
            result = response.json()
            formula = result.get("formula")
            processing_time = result.get("processing_time")

            if not formula:
                raise ValueError("Model API did not return a formula.")
            
            logger.info(f"Model API prediction successful. Formula: {formula[:50]}..., Time: {processing_time:.2f}s")
            return formula, processing_time

        except httpx.RequestError as e:
            logger.error(f"Network error calling Model API: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Cannot connect to Model API: {e.request.url}"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Model API returned HTTP error {e.response.status_code}: {e.response.text}", exc_info=True)
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Model API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error when calling Model API: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error communicating with Model API: {e}"
            )