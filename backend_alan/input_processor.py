import logging
import uuid
import datetime
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum

logger = logging.getLogger("alan.input")

class InputSource(str, Enum):
    VOICE = "voice"
    TEXT = "text"
    FILE = "file"
    SYSTEM = "system"
    API = "api"
    SCREEN = "screen"

class InputPriority(str, Enum):
    CRITICAL = "critical" # Hotword, Safety Stop
    HIGH = "high"         # Voice, System Alerts
    NORMAL = "normal"     # Files, Webhooks
    LOW = "low"          # Text Chat

class UnifiedInputEvent(BaseModel):
    """
    Canonical Event for the Brain Pipeline.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now().isoformat())
    
    source: InputSource
    raw: Any
    normalized: str
    
    # Metadata
    session_id: Optional[str] = None
    confidence: float = 1.0 # 0.0 to 1.0
    language: str = "en"
    priority: InputPriority = InputPriority.NORMAL
    
    # Intent (Optional early classification)
    intent: Optional[str] = None
    flags: List[str] = []

    class Config:
        use_enum_values = True

# --- ADAPTERS ---

class InputProcessor:
    def __init__(self):
        self.history = []

    def process(self, source: InputSource, raw_input: Any, **kwargs) -> UnifiedInputEvent:
        """
        Main entrypoint to normalize ANY input into a UnifiedInputEvent.
        """
        event = UnifiedInputEvent(
            source=source,
            raw=raw_input,
            normalized=str(raw_input), # Default fallback
            **kwargs
        )

        # 1. Normalize & Enrich based on Source
        if source == InputSource.TEXT:
            self._process_text(event)
        elif source == InputSource.VOICE:
            self._process_voice(event)
        elif source == InputSource.SYSTEM:
            self._process_system(event)
            
        # 2. Global Safety/Guardrails (Stub)
        # if "shutdown" in event.normalized: event.priority = InputPriority.CRITICAL

        # 3. Log
        logger.info(f"Input Event [{event.priority.upper()}]: {event.normalized} ({event.source})")
        
        return event

    def _process_text(self, event: UnifiedInputEvent):
        # Clean whitespace
        if isinstance(event.raw, str):
            event.normalized = event.raw.strip()
        event.priority = InputPriority.LOW

    def _process_voice(self, event: UnifiedInputEvent):
        # Voice is High priority
        event.priority = InputPriority.HIGH
        # Raw might be {text: "...", confidence: 0.9}
        if isinstance(event.raw, dict):
            event.normalized = event.raw.get("text", "")
            event.confidence = event.raw.get("confidence", 1.0)
        elif isinstance(event.raw, str):
            event.normalized = event.raw

    def _process_system(self, event: UnifiedInputEvent):
        event.priority = InputPriority.HIGH

input_processor = InputProcessor()
