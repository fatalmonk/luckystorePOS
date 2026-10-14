"""Read-only local build inputs: actual NotFair snapshot and empty catalog fixtures."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import ssl
from urllib.parse import parse_qs, urlsplit


def handler(snapshot):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            url = urlsplit(self.path)
            if url.path == "/api/seo/content":
                slug = parse_qs(url.query).get("slug", [None])[0]
                body = {"posts": snapshot["posts"]} if slug is None else {"post": snapshot["details"].get(slug)}
                status = 200 if slug is None or body["post"] is not None else 404
            elif url.path.startswith("/rest/v1/"):
                # Deliberately exercise the existing catalog fallback. These
                # fixtures are not inventory evidence or production-data proof.
                body, status = [], 200
            else:
                body, status = {"error": "Not a snapshot route"}, 404
            payload = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_POST(self):
            self.send_error(405)

        def log_message(self, *args):
            pass
    return Handler


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--cert", required=True)
    parser.add_argument("--key", required=True)
    parser.add_argument("--port", type=int, default=9443)
    args = parser.parse_args()
    snapshot = json.loads(Path(args.snapshot).read_text())
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler(snapshot))
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(args.cert, args.key)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.serve_forever()
