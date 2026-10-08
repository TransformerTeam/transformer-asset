import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PF_CSV_PATH = os.path.join(BASE_DIR, "TestData", "WindingPFData.csv")
FACTORY_CSV_PATH = os.path.join(BASE_DIR, "TestData", "FactoryData.csv")
JS_PATH = os.path.join(BASE_DIR, "pf_data.js")

def convert_pf_csv_to_js():
    pf_rows = []
    if os.path.exists(PF_CSV_PATH):
        with open(PF_CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.DictReader(f)
            for r in reader:
                d = dict(r)
                # Normalize serial and date fields for seamless lookup
                d['serial'] = d.get('serial') or d.get('Serial_No') or d.get('Serial') or d.get('SERIAL_NUMBER') or ''
                d['date'] = d.get('date') or d.get('Date') or d.get('TESTDATE') or ''
                pf_rows.append(d)

    factory_rows = []
    if os.path.exists(FACTORY_CSV_PATH):
        with open(FACTORY_CSV_PATH, "r", encoding="utf-8-sig", errors="ignore") as f:
            reader = csv.DictReader(f)
            for r in reader:
                d = dict(r)
                d['serial'] = d.get('Serial_No') or d.get('serial') or d.get('Serial') or d.get('SERIAL_NUMBER') or ''
                factory_rows.append(d)

    content = "// Auto-generated Insulation Power Factor & Factory Data from TestData/WindingPFData.csv and TestData/FactoryData.csv\n"
    content += "var WINDING_PF_DATA = " + json.dumps(pf_rows, indent=2, ensure_ascii=False) + ";\n\n"
    content += "var FACTORY_DATA = " + json.dumps(factory_rows, indent=2, ensure_ascii=False) + ";\n\n"
    content += """if (typeof window !== 'undefined') {
  window.WINDING_PF_DATA = WINDING_PF_DATA;
  window.FACTORY_DATA = FACTORY_DATA;
  if (!window.windingPfCsvData || !window.windingPfCsvData.length) {
    window.windingPfCsvData = WINDING_PF_DATA;
  }
  if (!window.factoryCsvData || !window.factoryCsvData.length) {
    window.factoryCsvData = FACTORY_DATA;
  }
}
"""

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {JS_PATH} with {len(pf_rows)} PF records and {len(factory_rows)} Factory records ({os.path.getsize(JS_PATH)} bytes).")

if __name__ == "__main__":
    convert_pf_csv_to_js()
