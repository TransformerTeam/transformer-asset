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
    pi_recs = load_csv_records(r"C:\Users\NB\Downloads\TR Asset\TestData\PIData.csv")

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
            pi_match = find_latest_record(pi_recs, serial_str, ['serial', 'Serial_No', 'SERIAL_NUMBER'], ['date', 'Date'])

            if bushing_match:
                np_rows = [r for r in bushing_info_recs if str(r.get('Parent_Serial_No') or '').strip().lower() == serial_str.strip().lower()]
                phases = [
                    ('H1', 'bushing_h1_pf_20c', 'bushing_h1_pf_tan', 'bushing_h1_c1', 'maxbh1_tand', 'maxbch1_change', 'maxbh1_tand_cls', 'maxbch1_change_cls'),
                    ('H2', 'bushing_h2_pf_20c', 'bushing_h2_pf_tan', 'bushing_h2_c1', 'maxbh2_tand', 'maxbch2_change', 'maxbh2_tand_cls', 'maxbch2_change_cls'),
                    ('H3', 'bushing_h3_pf_20c', 'bushing_h3_pf_tan', 'bushing_h3_c1', 'maxbh3_tand', 'maxbch3_change', 'maxbh3_tand_cls', 'maxbch3_change_cls'),
                    ('X1', 'xbushing_h1_pf_20c', 'xbushing_h1_pf_tan', 'xbushing_h1_c1', 'maxbl1_tand', 'maxbcl1_change', 'maxbl1_tand_cls', 'maxbcl1_change_cls'),
                    ('X2', 'xbushing_h2_pf_20c', 'xbushing_h2_pf_tan', 'xbushing_h2_c1', 'maxbl2_tand', 'maxbcl2_change', 'maxbl2_tand_cls', 'maxbcl2_change_cls'),
                    ('X3', 'xbushing_h3_pf_20c', 'xbushing_h3_pf_tan', 'xbushing_h3_c1', 'maxbl3_tand', 'maxbcl3_change', 'maxbl3_tand_cls', 'maxbcl3_change_cls'),
                ]
                for ph_label, pf20_key, pf_key, cap_key, out_pf_err, out_cap_err, out_pf_cls, out_cap_cls in phases:
                    np_row = next((r for r in np_rows if str(r.get('Phase') or '').strip().upper() == ph_label), None)
                    
                    pf20 = 0.0
                    cap = 0.0
                    try:
                        pf20 = float(bushing_match.get(pf20_key) or bushing_match.get(pf_key) or 0)
                    except Exception:
                        pass
                    try:
                        cap = float(bushing_match.get(cap_key) or 0)
                    except Exception:
                        pass

                    if np_row:
                        np_pf = 0.0
                        np_cap = 0.0
                        try:
                            np_pf = float(np_row.get('Meas_PF_C1') or np_row.get('Corr_PF') or 0)
                        except Exception:
                            pass
                        try:
                            np_cap = float(np_row.get('Capacitance_C1') or 0)
                        except Exception:
                            pass
                            
                        mfg_upper = str(np_row.get('Manufacturer') or '').upper().strip()
                        
                        if np_pf > 0 and pf20 > 0:
                            if 'MGC' in mfg_upper:
                                bushing_match[out_pf_err] = f"{pf20:.2f}"
                            else:
                                pf_err_val = ((pf20 - np_pf) / np_pf) * 100
                                bushing_match[out_pf_err] = f"{pf_err_val:+.2f}"
                                
                        if np_cap > 0 and cap > 0:
                            cap_err_val = ((cap - np_cap) / np_cap) * 100
                            bushing_match[out_cap_err] = f"{cap_err_val:+.2f}"
                        
                        if np_pf > 0 and pf20 > 0:
                            pf_ratio = pf20 / np_pf
                            pf_err = ((pf20 - np_pf) / np_pf) * 100
                            if pf_err < 0 and 'MGC' not in mfg_upper:
                                bushing_match[out_pf_cls] = 'ex-status-good'
                            elif 'ABB' in mfg_upper:
                                bushing_match[out_pf_cls] = 'ex-status-good' if pf_err <= 40.0 else 'ex-status-fair' if pf_err < 75.0 else 'ex-status-poor'
                            elif 'TRENCH' in mfg_upper:
                                bushing_match[out_pf_cls] = 'ex-status-good' if pf_ratio <= 1.5 else 'ex-status-fair' if pf_ratio <= 2.0 else 'ex-status-poor'
                            elif 'PASSONI' in mfg_upper or 'VILLA' in mfg_upper:
                                bushing_match[out_pf_cls] = 'ex-status-good' if pf_err <= 0 else 'ex-status-fair' if pf_err < 30.0 else 'ex-status-poor'
                            elif 'MGC' in mfg_upper:
                                bushing_match[out_pf_cls] = 'ex-status-good' if pf20 <= 0.5 else 'ex-status-fair' if pf20 <= 0.7 else 'ex-status-poor'
                            else:
                                bushing_match[out_pf_cls] = 'ex-status-good' if pf_ratio <= 1.5 else 'ex-status-fair' if pf_ratio <= 2.0 else 'ex-status-poor'
                        
                        if np_cap > 0 and cap > 0:
                            dev_val = ((cap - np_cap) / np_cap) * 100
                            abs_dev = abs(dev_val)
                            if dev_val < 0:
                                bushing_match[out_cap_cls] = 'ex-status-good'
                            elif 'ABB' in mfg_upper:
                                bushing_match[out_cap_cls] = 'ex-status-good' if abs_dev <= 3.0 else 'ex-status-fair' if abs_dev <= 5.0 else 'ex-status-poor'
                            elif 'PASSONI' in mfg_upper or 'VILLA' in mfg_upper:
                                bushing_match[out_cap_cls] = 'ex-status-good' if abs_dev <= 1.0 else 'ex-status-fair' if abs_dev <= 3.0 else 'ex-status-poor'
                            elif 'MGC' in mfg_upper:
                                bushing_match[out_cap_cls] = 'ex-status-good' if abs_dev <= 5.0 else 'ex-status-fair' if abs_dev <= 10.0 else 'ex-status-poor'
                            elif 'TRENCH' in mfg_upper:
                                bushing_match[out_cap_cls] = 'ex-status-good' if abs_dev <= 110.0 else 'ex-status-poor'
                            else:
                                bushing_match[out_cap_cls] = 'ex-status-good' if abs_dev <= 5.0 else 'ex-status-fair' if abs_dev <= 10.0 else 'ex-status-poor'
                                
                    if out_pf_err not in bushing_match:
                        bushing_match[out_pf_err] = '-'
                    if out_cap_err not in bushing_match:
                        bushing_match[out_cap_err] = '-'
                        
                    if out_pf_cls not in bushing_match or not bushing_match[out_pf_cls]:
                        val = bushing_match.get(out_pf_err, '-')
                        if val != '-':
                            try:
                                v = abs(float(val))
                                bushing_match[out_pf_cls] = 'ex-status-good' if v <= 50 else 'ex-status-fair' if v <= 100 else 'ex-status-poor'
                            except Exception:
                                bushing_match[out_pf_cls] = ''
                                
                    if out_cap_cls not in bushing_match or not bushing_match[out_cap_cls]:
                        val = bushing_match.get(out_cap_err, '-')
                        if val != '-':
                            try:
                                v = abs(float(val))
                                bushing_match[out_cap_cls] = 'ex-status-good' if v <= 5 else 'ex-status-fair' if v <= 10 else 'ex-status-poor'
                            except Exception:
                                bushing_match[out_cap_cls] = ''

            item = {
                "no": idx,
                "name": str(name) if name is not None else "",
                "serial": serial_str,
                "NO_WINDING": str(tr_info_match.get("NO_WINDING") or "2") if tr_info_match else "2",
                "pi": {
                    "H_PI": str(pi_match.get("H_PI") or "-"),
                    "L_PI": str(pi_match.get("L_PI") or "-"),
                    "T_PI": str(pi_match.get("T_PI") or "-"),
                    "date": str(pi_match.get("date") or "")
                } if pi_match else None,
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
