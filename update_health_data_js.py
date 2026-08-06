import csv
import json
import os
from datetime import datetime

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

def load_csv_records(file_path):
    if not os.path.exists(file_path):
        return []
    records = []
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for r in reader:
                records.append(dict(r))
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
    return records

def find_latest_record(csv_records, target_serial, serial_keys, date_keys):
    if not csv_records or not target_serial:
        return None
    target_clean = ''.join(c for c in str(target_serial) if c.isalnum()).lower()
    if not target_clean:
        return None
    
    matches = []
    for r in csv_records:
        s_val = None
        for k in serial_keys:
            if k in r and r[k]:
                s_val = r[k]
                break
        if not s_val:
            continue
        s_clean = ''.join(c for c in str(s_val) if c.isalnum()).lower()
        if s_clean == target_clean or (s_clean and target_clean and (s_clean in target_clean or target_clean in s_clean)):
            matches.append(r)
            
    if not matches:
        return None
        
    def parse_date(row):
        d_val = None
        for dk in date_keys:
            if dk in row and row[dk]:
                d_val = row[dk]
                break
        if not d_val:
            return datetime.min
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d-%b-%y', '%d-%b-%Y', '%m/%d/%Y', '%d-%B-%y'):
            try:
                return datetime.strptime(str(d_val).strip(), fmt)
            except ValueError:
                continue
        return datetime.min
        
    matches.sort(key=parse_date, reverse=True)
    return matches[0]

def convert_csv_to_js():
    # Load raw sub-CSV files to embed latest measurements in JS
    tr_info_recs = load_csv_records(r"C:\Users\NB\Downloads\TR Asset\TestData\TRinfo2.csv")
    bushing_recs = load_csv_records(r"C:\Users\NB\Downloads\TR Asset\TestData\BushingPFData.csv")
    bushing_info_recs = load_csv_records(r"C:\Users\NB\Downloads\TR Asset\TestData\BushingInfo.csv")
    mt_oil_recs = load_csv_records(r"C:\Users\NB\Downloads\TR Asset\TestData\MTOilData.csv")
    oltc_recs = load_csv_records(r"C:\Users\NB\Downloads\TR Asset\TestData\OLTCOilData.csv")

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
            
            while len(row) < 56:
                row.append('')

            name = parse_val(row[1])
            serial = parse_val(row[2])
            if not name and not serial:
                continue

            serial_str = str(serial) if serial is not None else ""

            # Find latest matching records from sub-CSVs
            tr_info_match = find_latest_record(tr_info_recs, serial_str, ['SERIAL_NUMBER', 'serial', 'Serial_No'], ['Date', 'date'])
            bushing_match = find_latest_record(bushing_recs, serial_str, ['serial', 'Serial_No', 'SERIAL_NUMBER'], ['date', 'Date'])
            mt_oil_match = find_latest_record(mt_oil_recs, serial_str, ['Serial_No', 'serial', 'SERIAL_NUMBER'], ['Date', 'date'])
            oltc_match = find_latest_record(oltc_recs, serial_str, ['Serial_No', 'serial', 'SERIAL_NUMBER'], ['Date', 'date'])

            # Look up bushing manufacturers for each phase from BushingInfo.csv
            h1_mfg, h2_mfg, h3_mfg, h0_mfg = '', '', '', ''
            bushing_info_rows = [r for r in bushing_info_recs if ''.join(c for c in str(r.get('Parent_Serial_No') or '') if c.isalnum()).lower() == ''.join(c for c in serial_str if c.isalnum()).lower()]
            if bushing_info_rows:
                h1_mfg = next((r.get('Manufacturer', '') for r in bushing_info_rows if str(r.get('Phase') or '').upper() == 'H1'), '')
                h2_mfg = next((r.get('Manufacturer', '') for r in bushing_info_rows if str(r.get('Phase') or '').upper() == 'H2'), '')
                h3_mfg = next((r.get('Manufacturer', '') for r in bushing_info_rows if str(r.get('Phase') or '').upper() == 'H3'), '')
                h0_mfg = next((r.get('Manufacturer', '') for r in bushing_info_rows if str(r.get('Phase') or '').upper() == 'H0'), '')

            if bushing_match:
                bushing_match['h1_mfg'] = h1_mfg
                bushing_match['h2_mfg'] = h2_mfg
                bushing_match['h3_mfg'] = h3_mfg
                bushing_match['h0_mfg'] = h0_mfg
            else:
                bushing_match = {
                    'h1_mfg': h1_mfg,
                    'h2_mfg': h2_mfg,
                    'h3_mfg': h3_mfg,
                    'h0_mfg': h0_mfg
                }

            item = {
                "no": idx,
                "name": str(name) if name is not None else "",
                "serial": serial_str,
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
                "recommendation": str(parse_val(row[55]) or ""),
                "trInfo": tr_info_match,
                "bushRec": bushing_match,
                "mtOilRec": mt_oil_match,
                "oltcRec": oltc_match
            }
            data.append(item)

    js_content = f"const HEALTH_INDEX_DATA = {json.dumps(data, indent=4, ensure_ascii=False)};\n"
    with open(JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"Updated {JS_PATH} successfully with {len(data)} items and embedded sub-CSV records.")

if __name__ == '__main__':
    convert_csv_to_js()
