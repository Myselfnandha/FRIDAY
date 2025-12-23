from flask import Flask, jsonify
from flask_cors import CORS
import os
from livekit import api
# Vercel handles env vars automatically if set in the dashboard

app = Flask(__name__)
CORS(app)

@app.route('/api/token')
def get_token():
    try:
        api_key = os.environ.get("LIVEKIT_API_KEY")
        api_secret = os.environ.get("LIVEKIT_API_SECRET")
        livekit_url = os.environ.get("LIVEKIT_URL")
        
        if not api_key or not api_secret or not livekit_url:
            return jsonify({"error": "Environment variables not set"}), 500

        grant = api.VideoGrants(room_join=True, room="alan-room")
        token = api.AccessToken(api_key, api_secret) \
            .with_identity("user-frontend") \
            .with_name("User") \
            .with_grants(grant)
        
        return jsonify({
            "token": token.to_jwt(),
            "url": livekit_url
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Vercel expects 'app' to be exposed
