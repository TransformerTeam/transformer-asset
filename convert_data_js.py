import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "TestData", "TRinfo2.csv")
JS_PATH = os.path.join(BASE_DIR, "data.js")

def convert_trinfo_to_data_js():
    if not os.path.exists(CSV_PATH):
        print(f"File not found: {CSV_PATH}")
        return
    with open(CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    content = "const TR_DATA = " + json.dumps(rows, indent=4, ensure_ascii=False) + ";\n"
    content += "if (typeof window !== 'undefined') {\n    window.TR_DATA = TR_DATA;\n}\n"

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"data.js updated with {len(rows)} records ({os.path.getsize(JS_PATH)} bytes).")

if __name__ == "__main__":
    convert_trinfo_to_data_js()
