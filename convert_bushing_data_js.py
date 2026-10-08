import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INFO_CSV_PATH = os.path.join(BASE_DIR, "TestData", "BushingInfo.csv")
PF_CSV_PATH = os.path.join(BASE_DIR, "TestData", "BushingPFData.csv")
JS_PATH = os.path.join(BASE_DIR, "bushing_data.js")

def convert_bushing_csv_to_js():
    info_rows = []
    if os.path.exists(INFO_CSV_PATH):
        with open(INFO_CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.DictReader(f)
            info_rows = [dict(r) for r in reader]

    pf_rows = []
    if os.path.exists(PF_CSV_PATH):
        with open(PF_CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.DictReader(f)
            pf_rows = [dict(r) for r in reader]

    content = "// Auto-generated Bushing Data from TestData/BushingInfo.csv and TestData/BushingPFData.csv\n"
    content += "var BUSHING_INFO_DATA = " + json.dumps(info_rows, indent=2, ensure_ascii=False) + ";\n\n"
    content += "var BUSHING_PF_DATA = " + json.dumps(pf_rows, indent=2, ensure_ascii=False) + ";\n\n"
    content += """if (typeof window !== 'undefined') {
  window.BUSHING_INFO_DATA = BUSHING_INFO_DATA;
  window.BUSHING_PF_DATA = BUSHING_PF_DATA;
  if (!window.bushingInfoCsvData || !window.bushingInfoCsvData.length) {
    window.bushingInfoCsvData = BUSHING_INFO_DATA;
  }
  if (!window.bushingPfCsvData || !window.bushingPfCsvData.length) {
    window.bushingPfCsvData = BUSHING_PF_DATA;
  }
}
"""

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {JS_PATH} with {len(info_rows)} info records and {len(pf_rows)} pf records ({os.path.getsize(JS_PATH)} bytes).")

if __name__ == "__main__":
    convert_bushing_csv_to_js()
