import os
import logging
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, AgentServer
from livekit.plugins.google import beta as google_beta

# =========================
# INIT
# =========================
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alan-agent")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# =========================
# ALAN AGENT
# =========================
class AlanAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions=(
                "You are Alan, an autonomous AI assistant designed by Nandha. "
                "Style: JARVIS + TARS hybrid. "
                "Traits: precise, logical, concise, proactive. "
                "Languages: English, Tamil, Tanglish. "
                "Automatically switch language based on user input."
            ),
            llm=google_beta.realtime.RealtimeModel(
                model="models/gemini-1.5-flash",
                api_key=GOOGLE_API_KEY,
                temperature=0.6,
            ),
        )


# =========================
# SERVER
# =========================
server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    """
    Called automatically when a LiveKit RTC session starts.
    Audio, video, screen-share are handled by LiveKit.
    """
    logger.info("New RTC session started")

    session = AgentSession()

    await session.start(
        room=ctx.room,
        agent=AlanAgent(),
    )


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    agents.cli.run_app(server)
