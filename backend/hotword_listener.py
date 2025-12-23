import openwakeword
import numpy as np
import sounddevice as sd
import asyncio

class HotwordListener:
    def __init__(self, wake_word="alan"):
        self.model = openwakeword.Model()
        self.wake_word = wake_word.lower()

    async def wait_for_wake(self):
        loop = asyncio.get_event_loop()

        def callback(indata, frames, time, status):
            audio = np.frombuffer(indata, dtype=np.int16)
            preds = self.model.predict(audio)
            if self.wake_word in preds and preds[self.wake_word] > 0.5:
                loop.call_soon_threadsafe(loop.stop)

        with sd.InputStream(
            channels=1,
            samplerate=16000,
            dtype="int16",
            callback=callback,
        ):
            await asyncio.get_event_loop().run_forever()
