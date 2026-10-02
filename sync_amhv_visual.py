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
    print("\nSession saved in .amhv_profile. You can now run --sync anytime!")

def run_headless_sync():
    """Runs Edge in headless mode using the saved session to pull print_visual.php."""
    print("=" * 65)
    print(" [AM-HV Real-Time Sync] Fetching Live Data...")
    print("=" * 65)

    if not os.path.exists(PROFILE_DIR):
        print("ERROR: .amhv_profile not found.")
        print("Please run setup first: py sync_amhv_visual.py --login")
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

    print("Launching headless Edge session...")
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=25)
        raw_output = proc.stdout
        # Try decoding with utf-8 or cp874/cp1252
        for enc in ['utf-8', 'cp874', 'windows-1252', 'latin-1']:
            try:
                html_text = raw_output.decode(enc)
                break
            except Exception:
                html_text = ""
    except Exception as e:
        print("Error during headless fetch:", e)
        return False

    if is_login_page(html_text):
        print("\n[WARNING] Session expired or not logged in.")
        print("Microsoft login page was returned.")
        print("Please re-authenticate by running:")
        print("   py sync_amhv_visual.py --login")
        return False

    with open(dump_file, "w", encoding="utf-8", errors="ignore") as f:
        f.write(html_text)

    print(f"Raw data captured ({len(html_text)} bytes). Parsing contents...")

    # Check if response is CSV or HTML table
    if "<table" in html_text.lower():
        parser = HTMLTableParser()
        parser.feed(html_text)
        if not parser.tables:
            print("No HTML tables found in output.")
            return False

        # Pick the largest table (likely the data table)
        data_table = max(parser.tables, key=len)
        print(f"Extracted data table with {len(data_table)} rows.")

        if len(data_table) < 2:
            print("Table contains insufficient rows.")
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

        print(f"SUCCESS: Successfully updated {VISUAL_CSV_PATH} ({len(data_table)} rows)!")
        return True
    else:
        # Plain CSV output
        lines = [line.strip() for line in html_text.splitlines() if line.strip()]
        if len(lines) > 2 and ("," in lines[0] or "\t" in lines[0]):
            with open(VISUAL_CSV_PATH, "w", encoding="utf-8-sig") as f:
                f.write(html_text)
            print(f"SUCCESS: Successfully saved plain CSV to {VISUAL_CSV_PATH}!")
            return True
        else:
            print("Unexpected format in response. Saved raw output to:", dump_file)
            return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--login":
        launch_login()
    elif len(sys.argv) > 1 and sys.argv[1] == "--sync":
        run_headless_sync()
    else:
        print("Usage:")
        print("  py sync_amhv_visual.py --login   # Run once to sign in via Microsoft SSO")
        print("  py sync_amhv_visual.py --sync    # Run anytime to pull live data in background")
