
import logging
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.local_stt import LocalWhisperSTT
    from backend.agent import AssistantFnc, SystemControl
    print("Imports successful.")
except ImportError as e:
    print(f"Import failed: {e}")
    sys.exit(1)

async def test_stt_instantiation():
    try:
        print("Testing STT Instantiation...")
        stt = LocalWhisperSTT(model_name="tiny.en")
        print("STT Instantiated successfully.")
        
        # Check if _recognize_impl exists
        if hasattr(stt, '_recognize_impl'):
             print("_recognize_impl method found.")
        else:
             print("ERROR: _recognize_impl MISSING.")
             
    except Exception as e:
        print(f"STT Instantiation failed: {e}")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(test_stt_instantiation())
    print("Test Complete.")
