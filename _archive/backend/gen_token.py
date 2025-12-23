import os
import argparse
from livekit import api
from dotenv import load_dotenv

load_dotenv()

def get_token(room_name="alan-room", participant_name="User"):
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        return "Error: LIVEKIT_API_KEY or LIVEKIT_API_SECRET not found in .env"

    token = api.AccessToken(api_key, api_secret) \
        .with_identity(f"user-{participant_name}") \
        .with_name(participant_name) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        ))
    return token.to_jwt()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--room", default="alan-room", help="Room name")
    parser.add_argument("--user", default="User", help="Participant name")
    args = parser.parse_args()
    print(get_token(args.room, args.user))
