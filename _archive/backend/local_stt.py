from faster_whisper import WhisperModel
import asyncio
import numpy as np
from livekit.agents import stt
from livekit import rtc
import logging

import os
import ctranslate2

logger = logging.getLogger("local-stt")

class LocalWhisperSTT(stt.STT):
    def __init__(self, model_name="base"):
        # Explicitly support streaming=True so VoicePipelineAgent sends audio chunks
        super().__init__(capabilities=stt.STTCapabilities(streaming=True, interim_results=False))
        
        try:
            if ctranslate2.get_cuda_device_count() > 0:
                device = "cuda"
                compute_type = "float16"
            else:
                device = "cpu"
                compute_type = "int8"
        except Exception:
            device = "cpu"
            compute_type = "int8"
        
        logger.info(f"Loading Faster-Whisper model '{model_name}' on {device} ({compute_type})...")
        # Run in a thread or separate process ideally, but here we load once.
        self._model = WhisperModel(model_name, device=device, compute_type=compute_type)
        logger.info("Faster-Whisper model loaded.")

    async def _recognize_impl(self, buffer, *, language: str | None = None, conn_options: dict | None = None):
        # Merge frames if buffer has multiple, faster-whisper needs float32
        # Data is Int16 typically in LiveKit
        raw_data = b''
        for frame in buffer: # AudioBuffer is iterable of AudioFrames
             raw_data += frame.data.tobytes()

        audio_int16 = np.frombuffer(raw_data, np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0

        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, self._transcribe_oneshot, audio_float32)
        
        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[stt.SpeechData(text=text, confidence=1.0, language="en")]
        )

    def _transcribe_oneshot(self, audio):
        segments, _ = self._model.transcribe(audio, beam_size=5, language="en")
        text = " ".join([segment.text for segment in segments]).strip()
        return text

    def stream(self) -> "SpeechStream":
        return SpeechStream(self._model)

class SpeechStream(stt.SpeechStream):
    def __init__(self, model):
        super().__init__()
        self._model = model
        self.audio_frames = []
        self._closed = False
        self._sample_rate = 16000 # Whisper expects 16k

    def push_frame(self, frame: rtc.AudioFrame):
        if self._closed:
            return
        
        # Resample if needed? LiveKit usually delivers what we ask?
        # VoicePipelineAgent might send varying rates. 
        # We assume 16k or we might need resampling.
        # Ideally we check frame.sample_rate.
        
        # Simple buffer for now
        self.audio_frames.append(frame.data.tobytes())

    async def aclose(self, wait=True):
        self._closed = True
        if not self.audio_frames:
            await super().aclose(wait)
            return
        
        # Combine frames
        raw_data = b''.join(self.audio_frames)
        
        # Convert buffer to float32
        # Data is Int16
        audio_int16 = np.frombuffer(raw_data, np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0

        # Transcribe in executor
        loop = asyncio.get_running_loop()
        try:
            result_text = await loop.run_in_executor(None, self._transcribe, audio_float32)
            if result_text:
                event = stt.SpeechEvent(
                    type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                    alternatives=[stt.SpeechData(text=result_text, confidence=1.0, language="en")]
                )
                self._event_ch.send_nowait(event)
        except Exception as e:
            logger.error(f"STT failed: {e}")
            
        await super().aclose(wait)

    def _transcribe(self, audio):
        segments, _ = self._model.transcribe(audio, beam_size=5, language="en")
        text = " ".join([segment.text for segment in segments]).strip()
        return text
