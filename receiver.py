import http.server
import json
import os

class UploadHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/upload':
            content_length = int(self.headers['Content-Length'])
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
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"status":"success"}')
                    return
            except Exception as e:
                print(f"Error handling post: {e}")
                
        self.send_response(400)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'{"status":"error"}')

def run(port=9999):
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, UploadHandler)
    print(f"Starting receiver server on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
