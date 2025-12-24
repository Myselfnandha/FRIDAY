import logging
import os
import json
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, AgentServer, JobContext
from livekit.plugins import google

# Import Brain
from brain import AlanBrain

load_dotenv()

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alan-agent")

# BRAIN INSTANCE
brain = AlanBrain()

def prewarm(proc: JobContext):
    proc.userdata["brain"] = brain

async def entrypoint(ctx: JobContext):
    logger.info(f"Starting ALAN Agent in room {ctx.room.name}")
    
    # 1. Connect
    await ctx.connect()
    
    # 2. Init Agent
    # We use Google's Realtime API (Gemini 2.0)
    # This handles STT/TTS and LLM in one connection
    
    agent = google.beta.RealtimeClient(
        model="models/gemini-2.0-flash-exp",
        api_key=os.getenv("GOOGLE_API_KEY"),
        instructions=(
            "You are ALAN. "
            "System: Project ALAN v2. "
            "Traits: Precise, Concise, Adaptive. "
            "If the user speaks Tamil, reply in Tamil. "
            "If the user speaks English, reply in English. "
            "You control the ALAN Interface. "
            "When you speak, the Arc Reactor glows blue."
        )
    )
    
    # 3. Handle Chat (Data Channel)
    @ctx.room.on("data_received")
    def on_data(data: rtc.DataPacket):
        try:
            msg = data.data.decode("utf-8")
            logger.info(f"Received data: {msg}")
            
            payload = json.loads(msg)
            if payload.get('type') == 'user_chat':
                user_text = payload.get('text')
                if user_text:
                    # Async dispatch to Brain
                    # We use a task so we don't block the loop
                    async def process_chat():
                        response_text = await brain.think(user_text, ctx)
                        # Send back to UI
                        reply = {
                            "type": "agent_chat",
                            "text": response_text
                        }
                        await ctx.room.local_participant.publish_data(
                            json.dumps(reply).encode("utf-8"),
                            reliable=True
                        )
                    
                    # Schedule the task
                    import asyncio
                    asyncio.create_task(process_chat())
                 
        except Exception as e:
            logger.error(f"Error handling data: {e}")

    # 4. Start
    agent.start(ctx.room)
    
    await agent.run()

if __name__ == "__main__":
    # Start the Universal UI Server (Static + API)
    from server import start_background_server
    start_background_server()

    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
