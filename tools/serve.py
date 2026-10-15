# The dev server: the project folder over http, never cached, so an edited script is
# what the next page load runs. Usage: python3 tools/serve.py [port]
import http.server
import sys


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8793
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoStore).serve_forever()
