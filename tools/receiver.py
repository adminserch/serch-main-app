import http.server
import json
import os
from urllib.parse import urlparse

class UploadHandler(http.server.BaseHTTPRequestHandler):
    def check_origin(self):
        origin = self.headers.get('Origin')
        if not origin:
            return None
        
        try:
            parsed = urlparse(origin)
            hostname = parsed.hostname
            if not hostname:
                return None
            
            # Check if the hostname matches our trusted hosts exactly
            trusted_hosts = {
                'localhost',
                '127.0.0.1',
                'contribution.usercontent.google.com'
            }
            if hostname in trusted_hosts:
                return origin
        except Exception:
            pass
            
        return None

    def do_OPTIONS(self):
        allowed_origin = self.check_origin()
        if not allowed_origin:
            self.send_response(403)
            self.end_headers()
            return
            
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', allowed_origin)
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        allowed_origin = self.check_origin()
        if not allowed_origin:
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b'{"status":"forbidden"}')
            return

        if self.path == '/upload':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
            except (ValueError, TypeError):
                content_length = 0

            # Content length check (10MB max limit to prevent memory exhaustion)
            MAX_SIZE = 10 * 1024 * 1024
            if content_length > MAX_SIZE:
                self.send_response(413)  # Payload Too Large
                self.send_header('Access-Control-Allow-Origin', allowed_origin)
                self.end_headers()
                self.wfile.write(b'{"status":"error","message":"payload too large"}')
                return

            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                filename = data.get('filename')
                content = data.get('content')
                
                if filename and content:
                    filename = os.path.basename(filename)
                    dest_path = os.path.join('stitch_screens', filename)
                    with open(dest_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Saved {filename}")
                    
                    self.send_response(200)
                    self.send_header('Access-Control-Allow-Origin', allowed_origin)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"status":"success"}')
                    return
            except Exception as e:
                print(f"Error handling post: {e}")
                
        self.send_response(400)
        self.send_header('Access-Control-Allow-Origin', allowed_origin)
        self.end_headers()
        self.wfile.write(b'{"status":"error"}')

def run(port=9999):
    # Ensure output directory exists once at startup
    os.makedirs('stitch_screens', exist_ok=True)
    server_address = ('127.0.0.1', port)
    httpd = http.server.HTTPServer(server_address, UploadHandler)
    print(f"Starting receiver server on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
