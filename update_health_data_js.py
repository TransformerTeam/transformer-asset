import csv
import json
import os

CSV_PATH = r"C:\Users\NB\Downloads\TR Asset\HealthIndexSum.csv"
JS_PATH = r"C:\Users\NB\Downloads\TR Asset\health_data.js"

def parse_val(val):
    if val is None:
        return None
    s = str(val).strip()
    if s == '' or s == 'None' or s == '-':
        return None
    try:
        if '.' in s:
            f = float(s)
            return int(f) if f.is_integer() else f
        return int(s)
    except ValueError:
        return s

def convert_csv_to_js():
    data = []
    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        if not headers:
            print("CSV is empty.")
            return

        for idx, row in enumerate(reader):
            if not row or not any(row):
                continue
            
            # Ensure row has enough columns
            while len(row) < 56:
                row.append('')

            name = parse_val(row[1])
            serial = parse_val(row[2])
            if not name and not serial:
                continue

            item = {
                "no": idx,
                "name": str(name) if name is not None else "",
                "serial": str(serial) if serial is not None else "",
                "site": str(parse_val(row[3]) or ""),
                "ratedPower": parse_val(row[4]),
                "hvRate": parse_val(row[5]),
                "lvRate": parse_val(row[6]),
                "ratedVoltage": str(parse_val(row[7]) or ""),
                "serviceType": str(parse_val(row[8]) or ""),
                "serviceAge": parse_val(row[9]),
                "healthIndex": parse_val(row[10]),
                "healthStatus": str(parse_val(row[11]) or ""),
                "estimatedDP": parse_val(row[12]),
                "estimatedLife": parse_val(row[13]),
                "visualInspection": str(parse_val(row[14]) or "N/A"),
                "activePart": {
                    "overall": str(parse_val(row[15]) or "N/A"),
                    "insulationResistance": str(parse_val(row[16]) or "N/A"),
                    "insulationPowerFactor": str(parse_val(row[17]) or "N/A"),
                    "excitingCurrent": str(parse_val(row[18]) or "N/A"),
                    "ratioPolarity": str(parse_val(row[19]) or "N/A"),
                    "windingResistance": str(parse_val(row[20]) or "N/A"),
                    "shortCircuit1P": str(parse_val(row[21]) or "N/A"),
                    "shortCircuit3P": str(parse_val(row[22]) or "N/A"),
                    "coreToGround": str(parse_val(row[23]) or "N/A")
                },
                "bushing": str(parse_val(row[24]) or "N/A"),
                "surgeArrester": str(parse_val(row[25]) or "N/A"),
                "dynamicResistance": str(parse_val(row[26]) or "N/A"),
                "fra": str(parse_val(row[27]) or "N/A"),
                "moisturePaper": str(parse_val(row[28]) or "N/A"),
                "mainTankOil": {
                    "overall": str(parse_val(row[29]) or "N/A"),
                    "dga": str(parse_val(row[30]) or "N/A"),
                    "waterContent": str(parse_val(row[31]) or "N/A"),
                    "dielectricBreakdown": str(parse_val(row[32]) or "N/A"),
                    "pf25": str(parse_val(row[33]) or "N/A"),
                    "pf100": str(parse_val(row[34]) or "N/A"),
                    "conductivity": str(parse_val(row[35]) or "N/A"),
                    "ift": str(parse_val(row[36]) or "N/A"),
                    "acidity": str(parse_val(row[37]) or "N/A"),
                    "color": str(parse_val(row[38]) or "N/A"),
                    "inhibitor": str(parse_val(row[39]) or "N/A"),
                    "corrosiveSulfur": str(parse_val(row[40]) or "N/A")
                },
                "passivator": str(parse_val(row[41]) or "N/A"),
                "furan": str(parse_val(row[42]) or "N/A"),
                "sludge": str(parse_val(row[43]) or "N/A"),
                "oltcOil": {
                    "dga": str(parse_val(row[45]) or "N/A"),
                    "dielectricBreakdown": str(parse_val(row[46]) or "N/A"),
                    "waterContent": str(parse_val(row[47]) or "N/A")
                },
                "dateToAssess": str(parse_val(row[48]) or ""),
                "lastPM": str(parse_val(row[53]) or ""),
                "nextPM": str(parse_val(row[54]) or ""),
                "recommendation": str(parse_val(row[55]) or "")
            }
            data.append(item)

    js_content = f"const HEALTH_INDEX_DATA = {json.dumps(data, indent=4, ensure_ascii=False)};\n"
    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"Updated {JS_PATH} successfully with {len(data)} items.")

if __name__ == '__main__':
    convert_csv_to_js()
