"""
Export Remaining Life Assessment Charts for Transformer Reports
Captures high-resolution, pixel-perfect charts directly from remaining_life_report.html
Adheres to CIGRE TB 761 and SINTEF Thermal-Chemical Kinetic Models.
"""

import os
import sys
import time
import json
import base64
import socket
import threading
import subprocess
from http.server import SimpleHTTPRequestHandler, HTTPServer

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO_ROOT)

FIGURES_MERGED_DIR = os.path.join(REPO_ROOT, 'scratch', 'figures_merged')
FIGURES_DIR = os.path.join(REPO_ROOT, 'scratch', 'figures')
os.makedirs(FIGURES_MERGED_DIR, exist_ok=True)
os.makedirs(FIGURES_DIR, exist_ok=True)

done_event = threading.Event()
saved_files = []

class ChartExportHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress routine static file logs
        pass

    def do_POST(self):
        if self.path == '/save_exported_charts':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                # 1. Chart 1: DP Degradation
                if 'chart1' in data and data['chart1']:
                    raw1 = data['chart1'].split(',', 1)[1]
                    b1 = base64.b64decode(raw1)
                    p1 = os.path.join(FIGURES_MERGED_DIR, 'fig_remaining_life_dp.png')
                    with open(p1, 'wb') as f:
                        f.write(b1)
                    # Also update fig_6_3_degradation.png in both locations
                    with open(os.path.join(FIGURES_MERGED_DIR, 'fig_6_3_degradation.png'), 'wb') as f:
                        f.write(b1)
                    with open(os.path.join(FIGURES_DIR, 'fig_6_3_degradation.png'), 'wb') as f:
                        f.write(b1)
                    saved_files.append(p1)
                
                # 2. Chart 2: Weibull PoF
                if 'chart2' in data and data['chart2']:
                    raw2 = data['chart2'].split(',', 1)[1]
                    b2 = base64.b64decode(raw2)
                    p2 = os.path.join(FIGURES_MERGED_DIR, 'fig_remaining_life_weibull.png')
                    with open(p2, 'wb') as f:
                        f.write(b2)
                    saved_files.append(p2)

                # 3. Combined Charts
                if 'combined' in data and data['combined']:
                    raw_all = data['combined'].split(',', 1)[1]
                    b_all = base64.b64decode(raw_all)
                    p_all = os.path.join(FIGURES_MERGED_DIR, 'fig_remaining_life_combined.png')
                    with open(p_all, 'wb') as f:
                        f.write(b_all)
                    saved_files.append(p_all)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                done_event.set()
            except Exception as e:
                print("Error saving chart data:", e)
                self.send_response(500)
                self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def export_charts_for_serial(serial='PP0158B01'):
    port = find_free_port()
    server = HTTPServer(('127.0.0.1', port), ChartExportHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"HTTP Server started on port {port} for serial {serial}")

    edge_paths = [
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    ]
    browser_exe = None
    for p in edge_paths:
        if os.path.exists(p):
            browser_exe = p
            break

    if not browser_exe:
        print("Error: No Chromium-based browser (Edge / Chrome) found!")
        server.shutdown()
        return False

    url = f"http://127.0.0.1:{port}/remaining_life_report.html?serial={serial}&export_charts=1"
    cmd = [
        browser_exe,
        '--headless=new',
        '--disable-gpu',
        '--force-device-scale-factor=2',
        '--window-size=1280,1800',
        url
    ]

    print(f"Launching browser to render and export charts...")
    proc = subprocess.Popen(cmd)

    # Wait up to 25 seconds for export completion
    success = done_event.wait(timeout=25)
    
    try:
        proc.terminate()
        proc.wait(timeout=3)
    except:
        proc.kill()
    
    server.shutdown()

    if success:
        print("All charts successfully exported!")
        for sf in saved_files:
            print(f"  - {sf} ({os.path.getsize(sf):,} bytes)")
        return True
    else:
        print("Export timed out!")
        return False

if __name__ == '__main__':
    serial = sys.argv[1] if len(sys.argv) > 1 else 'PP0158B01'
    export_charts_for_serial(serial)
