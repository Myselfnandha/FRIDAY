import edge_tts
import asyncio
import logging
import io
from livekit.agents import tts
from livekit import rtc
from livekit import rtc
from pydub import AudioSegment
from brain import CognitiveEngine # Import brain for lang detection logic helper if needed, or simple local check
import re

logger = logging.getLogger("edge-tts")

class EdgeTTS(tts.TTS):
    def __init__(self, default_voice="en-US-BrianNeural", tamil_voice="ta-IN-ValluvarNeural"):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False), sample_rate=24000, num_channels=1)
        self.default_voice = default_voice
        self.tamil_voice = tamil_voice

    def stream(self) -> "SynthesizeStream":
        return SynthesizeStream(self.default_voice, self.tamil_voice)


class SynthesizeStream(tts.SynthesizeStream):
    def __init__(self, default_voice, tamil_voice):
        super().__init__()
        self.default_voice = default_voice
        self.tamil_voice = tamil_voice
        self._sent_text = ""

    def push_text(self, token: str):
        if token:
            self._sent_text += token

    async def flush(self):
        if not self._sent_text.strip():
            return
            
        text = self._sent_text
        self._sent_text = ""
        
        try:
        try:
            # Language Detection Logic
            # Check for Tamil Characters
            is_tamil = bool(re.search(r'[\u0B80-\u0BFF]', text))
            selected_voice = self.tamil_voice if is_tamil else self.default_voice
            
            # Generate Audio
            communicate = edge_tts.Communicate(text, selected_voice)
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            # Convert MP3 to PCM (24kHz, 16bit, mono) via pydub
            # Note: This requires ffmpeg installed on system path
            audio_segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
            
            # Resample to 24000Hz (LiveKit standard often 24k or 48k)
            if audio_segment.frame_rate != 24000:
                audio_segment = audio_segment.set_frame_rate(24000)
            
            if audio_segment.channels != 1:
                audio_segment = audio_segment.set_channels(1)

            pcm_data = audio_segment.raw_data
            
            # Create AudioFrame
            # samples_per_channel = len(pcm_data) // 2 (since 16-bit = 2 bytes)
            frame = rtc.AudioFrame(
                data=pcm_data,
                sample_rate=24000,
                num_channels=1,
                samples_per_channel=len(pcm_data) // 2
            )
            
            # Send event
            self._event_ch.send_nowait(tts.SynthesisEvent(
                type=tts.SynthesisEventType.AUDIO,
                audio=tts.SynthesizedAudio(
                    text=text,
                    data=frame
                )
            ))
            
        except Exception as e:
            logger.error(f"EdgeTTS failed: {e}")

    async def aclose(self):
        await self.flush()
        await super().aclose()
