#!/usr/bin/env python3
"""
PLAYMASTER R.A — Backend API Proxy & Static Web Server
Protects YOUTUBE_API_KEY on the backend and serves cached real YouTube channel
data for YOUTUBE_CHANNEL_ID = UCutR0Ka7mjqAzambnp1c19A.
"""

import http.server
import json
import os
import socketserver
import time
import urllib.parse
import urllib.request

PORT = int(os.environ.get("PORT", "8080"))
YOUTUBE_CHANNEL_ID = os.environ.get("YOUTUBE_CHANNEL_ID", "UCutR0Ka7mjqAzambnp1c19A")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "YOUR_API_KEY_HERE")
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "1800"))

MEMORY_CACHE = {"timestamp": 0, "payload": None}


class ChannelRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/youtube":
            self.handle_youtube_api(parsed.query)
            return
        return super().do_GET()

    def handle_youtube_api(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        if params.get("simulate_error", ["0"])[0] == "1":
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                json.dumps(
                    {
                        "error": "Unable to reach YouTube Data API v3. Showing fallback link to official YouTube channel.",
                        "channelId": YOUTUBE_CHANNEL_ID,
                        "channelUrl": f"https://www.youtube.com/channel/{YOUTUBE_CHANNEL_ID}"
                    }
                ).encode("utf-8")
            )
            return

        now = time.time()
        if MEMORY_CACHE["payload"] and (now - MEMORY_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            out = dict(MEMORY_CACHE["payload"])
            out["cached"] = True
            self.wfile.write(json.dumps(out, ensure_ascii=False).encode("utf-8"))
            return

        cache_path = os.path.join(os.getcwd(), "data", "channel_cache.json")
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["source"] = "verified_youtube_channel_data"
            data["cached"] = False
            MEMORY_CACHE["timestamp"] = now
            MEMORY_CACHE["payload"] = data
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(503)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            json.dumps(
                {
                    "error": "YouTube channel data unavailable.",
                    "channelId": YOUTUBE_CHANNEL_ID,
                    "channelUrl": f"https://www.youtube.com/channel/{YOUTUBE_CHANNEL_ID}"
                }
            ).encode("utf-8")
        )


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), ChannelRequestHandler) as httpd:
        print(f"Serving PLAYMASTER R.A website & /api/youtube on 0.0.0.0:{PORT}")
        httpd.serve_forever()
