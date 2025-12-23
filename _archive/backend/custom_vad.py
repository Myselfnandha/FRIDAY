import webrtcvad
import logging
from livekit.agents import vad
from livekit import rtc
import asyncio

logger = logging.getLogger("low-ram-vad")

class WebRTCVAD(vad.VAD):
    def __init__(self, aggressiveness=3):
        # Aggressiveness: 0 (Least) to 3 (Most)
        super().__init__(capabilities=vad.VADCapabilities(update_interval=0.1))
        self.vad_model = webrtcvad.Vad(aggressiveness)
        logger.info(f"WebRTCVAD initialized with aggressiveness {aggressiveness}")

    def stream(self) -> "VADStream":
        return VADStream(self.vad_model)

class VADStream(vad.VADStream):
    def __init__(self, model):
        super().__init__()
        self.model = model
        self.sample_rate = 16000 # WebRTCVAD requires 8k, 16k, 32k, or 48k
        self.frame_duration_ms = 30 # Must be 10, 20, or 30ms
        self.buffer = b""
    
    def push_frame(self, frame: rtc.AudioFrame):
        # Resample logic simplified: WebRTC needs specific frame sizes
        # Frame size = sample_rate * duration_ms / 1000 * 2 (bytes per sample shortcut)
        # We assume input is 16k mono for now or handle naive downsampling
        
        # NOTE: LiveKit audio usually comes in 10ms chunks? 
        # Ideally we buffer to 30ms (480 samples @ 16khz = 960 bytes)
        
        data = frame.data.tobytes()
        self.buffer += data
        
        # Process chunks of 30ms (Assuming 16kHz for simplicity)
        # 30ms @ 16kHz = 480 samples * 2 bytes = 960 bytes
        chunk_size = 960
        
        while len(self.buffer) >= chunk_size:
            chunk = self.buffer[:chunk_size]
            self.buffer = self.buffer[chunk_size:]
            
            try:
                is_speech = self.model.is_speech(chunk, 16000)
                type = vad.VADEventType.START_OF_SPEECH if is_speech else vad.VADEventType.END_OF_SPEECH
                
                # We need to emit generic VAD Events
                # LiveKit VAD Protocol is more complex (SpeechStream), 
                # but basically we fire START/END events.
                # Since we are hacking a custom VAD plugin, we simplify:
                
                event = vad.VADEvent(
                    type=type,
                    samples_index=0, # Abstract
                    duration=0.03
                )
                self._event_ch.send_nowait(event)
                
            except Exception as e:
                # Often fails if audio isn't perfectly 16bit 16khz mono
                pass
                
    async def aclose(self):
        await super().aclose()
