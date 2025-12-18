from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from livekit import api
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({"status": "Voice Assistant Backend Running", "endpoints": ["/token"]})

@app.route('/token')
def get_token():
    try:
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")
        livekit_url = os.getenv("LIVEKIT_URL")
        
        if not api_key or not api_secret or not livekit_url:
            return jsonify({"error": "Environment variables not set"}), 500

        # Create a token for the user to join the room
        token = api.AccessToken(api_key, api_secret) \
            .with_identity("user-frontend") \
            .with_name("User") \
            .with_grants(api.VideoGrants(
                room_join=True,
                room="alan-room",
            ))
        
        return jsonify({
            "token": token.to_jwt(),
            "url": livekit_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Token Server on port 5000...")
    app.run(port=5000)
