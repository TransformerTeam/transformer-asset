"""
AM-HV Real-Time Visual Inspection Synchronizer
GPSC Transformer Asset Management System

This script automates data synchronization from:
https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_visual.php
using a dedicated Microsoft Edge session profile.

Modes:
  py sync_amhv_visual.py --login : Opens an interactive Edge window for one-time Microsoft SSO login.
  py sync_amhv_visual.py --sync  : Runs headless in the background, fetches real-time data, and updates VisualData.csv.
"""

import os
import sys
import time
import subprocess
import csv
import re
from html.parser import HTMLParser

# If executed via pyw.exe or hidden wscript, sys.stdout and sys.stderr may be None
if sys.stdout is None:
    class _DummyStream:
        def write(self, s): pass
        def flush(self): pass
        def reconfigure(self, **kwargs): pass
    sys.stdout = _DummyStream()
    sys.stderr = _DummyStream()

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_DIR = os.path.join(BASE_DIR, ".amhv_profile")
TEST_DATA_DIR = os.path.join(BASE_DIR, "TestData")
VISUAL_CSV_PATH = os.path.join(TEST_DATA_DIR, "VisualData.csv")
AMHV_URL = "https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_visual.php"
EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

class HTMLTableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.current_table = []
        self.current_row = []
        self.current_cell = []
        self.in_cell = False

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.current_table = []
        elif tag == "tr":
            self.current_row = []
        elif tag in ("td", "th"):
            self.in_cell = True
            self.current_cell = []

    def handle_endtag(self, tag):
        if tag == "table":
            if self.current_table:
                self.tables.append(self.current_table)
        elif tag == "tr":
            if self.current_row:
                self.current_table.append(self.current_row)
        elif tag in ("td", "th"):
            self.in_cell = False
            cell_text = "".join(self.current_cell).strip()
            self.current_row.append(cell_text)

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell.append(data)

LOG_FILE = os.path.join(BASE_DIR, "sync_history.log")

def log_message(msg, level="INFO"):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {msg}"
    print(log_entry)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_entry + "\n")
    except Exception as e:
        print("Failed to write log:", e)

def is_login_page(html_text):
    if not html_text:
        return True
    lower = html_text.lower()
    return ("sign in to your account" in lower or
            "login.microsoftonline.com" in lower or
            "convergedsignin" in lower)

def launch_login():
    """Opens Edge interactively so user can log in once via Microsoft SSO."""
    print("=" * 65)
    print(" [AM-HV Real-Time Sync Setup] One-Time Login")
    print("=" * 65)
    print("Opening Microsoft Edge window...")
    print(f"URL: {AMHV_URL}")
    print(f"Profile: {PROFILE_DIR}")
    print("\nPlease log in with your GPSC / Glow Microsoft 365 credentials.")
    print("After logging in, once the Visual Inspection report page is visible,")
    print("close the Edge window or press Enter here to complete setup.\n")

    os.makedirs(PROFILE_DIR, exist_ok=True)
    cmd = [
        EDGE_EXE,
        f"--user-data-dir={PROFILE_DIR}",
        "--no-first-run",
        "--no-default-browser-check",
        AMHV_URL
    ]

    p = subprocess.Popen(cmd)
    try:
        input("Press [Enter] here once you have finished logging in in Edge... ")
    except KeyboardInterrupt:
        pass
    log_message("User completed interactive login session.", "INFO")
    print("\nSession saved in .amhv_profile. You can now run --sync anytime!")

def run_headless_sync():
    """Runs Edge in headless mode using the saved session to pull print_visual.php."""
    log_message("Starting AM-HV Real-Time Background Synchronization...", "INFO")

    if not os.path.exists(PROFILE_DIR):
        log_message("Authentication profile .amhv_profile not found. Run login_amhv.bat first.", "WARNING")
        return False

    dump_file = os.path.join(BASE_DIR, "scratch", "amhv_dump.html")
    os.makedirs(os.path.dirname(dump_file), exist_ok=True)

    cmd = [
        EDGE_EXE,
        f"--user-data-dir={PROFILE_DIR}",
        "--headless",
        "--disable-gpu",
        "--virtual-time-budget=6000",
        "--dump-dom",
        AMHV_URL
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=30)
        raw_output = proc.stdout
        # Try decoding with utf-8 or cp874/cp1252
        for enc in ['utf-8', 'cp874', 'windows-1252', 'latin-1']:
            try:
                html_text = raw_output.decode(enc)
                break
            except Exception:
                html_text = ""
    except Exception as e:
        log_message(f"Error during headless fetch: {e}", "ERROR")
        return False

    if is_login_page(html_text):
        log_message("Session expired or unauthenticated. Microsoft SSO login required. Run login_amhv.bat.", "WARNING")
        return False

    with open(dump_file, "w", encoding="utf-8", errors="ignore") as f:
        f.write(html_text)

    log_message(f"Captured {len(html_text)} bytes from AM-HV. Parsing content...", "INFO")

    # Check if response is CSV or HTML table
    if "<table" in html_text.lower():
        parser = HTMLTableParser()
        parser.feed(html_text)
        if not parser.tables:
            log_message("No HTML tables found in AM-HV response.", "ERROR")
            return False

        # Pick the largest table (likely the data table)
        data_table = max(parser.tables, key=len)
        log_message(f"Extracted data table with {len(data_table)} rows.", "INFO")

        if len(data_table) < 2:
            log_message("AM-HV table contains insufficient rows (< 2).", "WARNING")
            return False

        # Save to VisualData.csv
        backup_csv = VISUAL_CSV_PATH + ".bak"
        if os.path.exists(VISUAL_CSV_PATH):
            import shutil
            shutil.copy2(VISUAL_CSV_PATH, backup_csv)

        with open(VISUAL_CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            for row in data_table:
                writer.writerow(row)

        log_message(f"Successfully updated {VISUAL_CSV_PATH} with {len(data_table)} rows.", "SUCCESS")

        # Trigger automatic health index recomputation & health_data.js update
        try:
            log_message("Recomputing fleet Health Indices and updating health_data.js...", "INFO")
            import evaluate_all_health_index
            evaluate_all_health_index.main()
            log_message("Health Index recomputation complete. Dashboard data synchronized.", "SUCCESS")
        except Exception as eval_err:
            log_message(f"Error recomputing health indices: {eval_err}", "ERROR")

        return True
    else:
        # Plain CSV output
        lines = [line.strip() for line in html_text.splitlines() if line.strip()]
        if len(lines) > 2 and ("," in lines[0] or "\t" in lines[0]):
            with open(VISUAL_CSV_PATH, "w", encoding="utf-8-sig") as f:
                f.write(html_text)
            log_message(f"Successfully saved plain CSV to {VISUAL_CSV_PATH}.", "SUCCESS")

            try:
                log_message("Recomputing fleet Health Indices and updating health_data.js...", "INFO")
                import evaluate_all_health_index
                evaluate_all_health_index.main()
                log_message("Health Index recomputation complete. Dashboard data synchronized.", "SUCCESS")
            except Exception as eval_err:
                log_message(f"Error recomputing health indices: {eval_err}", "ERROR")

            return True
        else:
            log_message(f"Unexpected format in response. Saved raw output to {dump_file}.", "ERROR")
            return False

def run_comprehensive_sync():
    js_script = os.path.join(BASE_DIR, "sync_amhv_all.js")
    if os.path.exists(js_script):
        res = subprocess.run(["node", js_script, "--sync"], cwd=BASE_DIR)
        return res.returncode == 0
    return run_headless_sync()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--login":
        js_script = os.path.join(BASE_DIR, "sync_amhv_all.js")
        if os.path.exists(js_script):
            subprocess.run(["node", js_script, "--login"], cwd=BASE_DIR)
        else:
            launch_login()
    elif len(sys.argv) > 1 and sys.argv[1] == "--sync":
        run_comprehensive_sync()
    else:
        print("Usage:")
        print("  py sync_amhv_visual.py --login   # Run once to sign in via Microsoft SSO")
        print("  py sync_amhv_visual.py --sync    # Run anytime to sync all 17 AM-HV endpoints in background")
