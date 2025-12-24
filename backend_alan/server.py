import os
import json
import logging
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from livekit import api

logger = logging.getLogger("alan.server")

# Directory where Next.js static export will be
STATIC_DIR = os.path.join(os.path.dirname(__file__), "public")

class AlanRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        # 1. API: Token Generation
        if self.path.startswith("/api/token"):
            self.handle_token_request()
            return

        # 2. Static Files (Default behavior)
        # Check if file exists, if not serve index.html (SPA Fallback)
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            # If explicit file not found, serve index.html
            # Note: translate_path joins directory + path
            # We want to serve "index.html" from STATIC_DIR
            if not self.path.startswith("/api"):
                self.path = "/index.html"
        
        super().do_GET()

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
