import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "TestData", "IRandPIData.csv")
JS_PATH = os.path.join(BASE_DIR, "pi_data.js")

def convert_pi_csv_to_js():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return
    with open(CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        rows = [dict(r) for r in reader]

    content = "// Auto-generated IR and PI Data from TestData/IRandPIData.csv\n"
    content += "var IR_PI_DATA = " + json.dumps(rows, indent=2, ensure_ascii=False) + ";\n"
    content += "if (typeof window !== 'undefined') {\n  window.IR_PI_DATA = IR_PI_DATA;\n}\n"

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {JS_PATH} with {len(rows)} records ({os.path.getsize(JS_PATH)} bytes).")

if __name__ == "__main__":
    convert_pi_csv_to_js()
