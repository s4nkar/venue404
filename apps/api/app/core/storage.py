import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status
from app.core.config import settings


if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )

def upload_image_to_cloudinary(file_bytes: bytes, folder: str = "venues") -> str:
    
    if not settings.cloudinary_cloud_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured on the server."
        )

    try:
        response = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="image"
        )
        return response.get("secure_url")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image upload failed: {str(e)}"
        )

def delete_image_from_cloudinary(public_id: str):
    
    if not settings.cloudinary_cloud_name:
        return
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception:
        pass 