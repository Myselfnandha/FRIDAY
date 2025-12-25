import os
import json
import logging
import threading
import sqlite3
from http.server import HTTPServer, SimpleHTTPRequestHandler
from livekit import api

from memory import AlanMemory

logger = logging.getLogger("alan.server")

# Directory where Next.js static export will be
STATIC_DIR = os.path.join(os.path.dirname(__file__), "public")

class AlanRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        # 0. Health Check
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
            return

        # 1. API: Token Generation
        if self.path.startswith("/api/token"):
            self.handle_token_request()
            return
            
        # 2. API: Settings
        if self.path.startswith("/api/settings"):
            self.handle_get_settings()
            return

        # 3. Static Files (Default behavior)
        # Check if file exists, if not serve index.html (SPA Fallback)
        path = self.translate_path(self.path)
        
        # Robustness: If public dir missing or empty, serve simple message for root
        if not os.path.exists(STATIC_DIR) or not os.listdir(STATIC_DIR):
             if self.path == "/" or self.path == "/index.html":
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"ALAN Backend Active. UI not yet built.")
                return

        if not os.path.exists(path) or os.path.isdir(path):
            # If explicit file not found, serve index.html
            # Note: translate_path joins directory + path
            # We want to serve "index.html" from STATIC_DIR
            if not self.path.startswith("/api"):
                self.path = "/index.html"
        
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/settings"):
            self.handle_post_settings()
            return

    def handle_get_settings(self):
        try:
            mem = AlanMemory()
            personality = mem.get_personality()
            # Also get other config if we had it
            
            self.send_json(personality)
        except Exception as e:
            logger.error(f"Get settings failed: {e}")
            self.send_error(500, str(e))

    def handle_post_settings(self):
        try:
            length = int(self.headers.get('content-length'))
            field_data = self.rfile.read(length)
            data = json.loads(field_data)
            
            mem = AlanMemory()
            conn = sqlite3.connect(mem.db_path) # Direct access for simplicty or add method in memory.py
            c = conn.cursor()
            
            # Update personality traits
            for trait, value in data.items():
                c.execute("INSERT OR REPLACE INTO personality (trait, current_value) VALUES (?, ?)", (trait, value))
            
            conn.commit()
            conn.close()
            
            self.send_json({"status": "updated", "data": data})
            
        except Exception as e:
            logger.error(f"Update settings failed: {e}")
            self.send_error(500, str(e))

    def send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def handle_token_request(self):
        try:
            # Parse query params manually or just assume default for now
            # url parse is cleaner but let's keep it simple
            room_name = "alan-room"
            participant_identity = "user-frontend-" + os.urandom(4).hex()

            api_key = os.getenv("LIVEKIT_API_KEY")
            api_secret = os.getenv("LIVEKIT_API_SECRET")

            if not api_key or not api_secret:
                self.send_error(500, "Missing API Keys")
                return

            grant = api.VideoGrants(room_join=True, room=room_name)
            token = api.AccessToken(api_key, api_secret) \
                .with_identity(participant_identity) \
                .with_name("Human User") \
                .with_grants(grant)
            
            jwt_token = token.to_jwt()

            response = {"token": jwt_token}
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))
            
        except Exception as e:
            logger.error(f"Token generation failed: {e}")
            self.send_error(500, str(e))

def run_server(port=7860):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, AlanRequestHandler)
    logger.info(f"Serving UI at http://0.0.0.0:{port} from {STATIC_DIR}")
    httpd.serve_forever()

def start_background_server():
    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()
