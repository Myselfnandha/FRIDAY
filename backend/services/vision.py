import logging
import base64
import google.genai as genai
from config import settings

logger = logging.getLogger(__name__)


class VisionService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.model = settings.GEMINI_VISION_MODEL

    async def analyze_image(self, image_bytes: bytes, prompt: str = "Describe what you see in this image.") -> str:
        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_image,
                                }
                            },
                        ],
                    }
                ],
            )

            text = response.text
            logger.info(f"Vision analysis: '{text[:80]}...'")
            return text
        except Exception as e:
            logger.error(f"Vision error: {e}")
            raise


vision_service = VisionService()
