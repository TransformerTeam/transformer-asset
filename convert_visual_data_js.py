import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "TestData", "VisualData.csv")
JS_PATH = os.path.join(BASE_DIR, "visual_data.js")

def convert_visual_csv_to_js():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return
    with open(CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        rows = [dict(r) for r in reader]

    content = "// Auto-generated Visual Inspection Data from TestData/VisualData.csv\n"
    content += "var visualCsvData = " + json.dumps(rows, indent=2, ensure_ascii=False) + ";\n"
    content += "if (typeof window !== 'undefined') {\n  window.visualCsvData = visualCsvData;\n  window.VISUAL_DATA = visualCsvData;\n}\n"

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {JS_PATH} with {len(rows)} records ({os.path.getsize(JS_PATH)} bytes).")

if __name__ == "__main__":
    convert_visual_csv_to_js()
