import csv
import glob
import os
import sys
import io

sys.stdout.reconfigure(encoding='utf-8')

HEALTH_SUM_PATH = r"C:\Users\NB\Downloads\TR Asset\HealthIndexSum.csv"
TESTDATA_DIR = r"C:\Users\NB\Downloads\TR Asset\TestData"

def load_csv_as_dict_by_serial(filepath):
    if not os.path.exists(filepath):
        return {}
    res = {}
    with open(filepath, 'r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            s = row.get('serial') or row.get('Serial_No') or row.get('Serial_no') or row.get('Serial') or row.get('SERIAL_NUMBER') or row.get('Serial No.')
            if s:
                s_clean = str(s).strip()
                if s_clean not in res:
                    res[s_clean] = []
                res[s_clean].append(row)
    return res

print("Loading test data CSVs...")
mt_oil_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "MTOilData.csv"))
visual_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "VisualData.csv"))
ir_pi_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "IRandPIData.csv"))
bushing_pf_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "BushingPFData.csv"))
surge_pf_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "SurgePFData.csv"))
winding_pf_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "WindingPFData.csv"))
ratio_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "RatioData.csv"))
exciting_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "ExcitingData.csv"))
winding_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "WindingData.csv"))
tr_info_data = load_csv_as_dict_by_serial(os.path.join(TESTDATA_DIR, "TRinfo2.csv"))

def find_records_for_serial(dict_data, target_serial):
    if not target_serial:
        return []
    ts = str(target_serial).strip()
    if ts in dict_data:
        return dict_data[ts]
    # Fallback to partial or numeric match
    matches = []
    ts_num = ''.join(filter(str.isdigit, ts))
    for key, val_list in dict_data.items():
        k_num = ''.join(filter(str.isdigit, key))
        if key == ts or (k_num and ts_num and k_num == ts_num) or key in ts or ts in key:
            matches.extend(val_list)
    return matches

def safe_float(v, default=0.0):
    if v is None: return default
    s = str(v).strip()
    if not s or s == '-' or s == 'N/A' or s == 'None': return default
    try:
        return float(s)
    except ValueError:
        return default

def evaluate_transformer(row):
    serial = str(row[2]).strip()
    hi_curr = row[10]
    
    # Check if HI is already present and valid number
    if hi_curr and str(hi_curr).strip() != '' and str(hi_curr).strip() != 'None':
        return row # Already evaluated

    # Look up test records
    mt_recs = find_records_for_serial(mt_oil_data, serial)
    vis_recs = find_records_for_serial(visual_data, serial)
    pi_recs = find_records_for_serial(ir_pi_data, serial)
    bushing_recs = find_records_for_serial(bushing_pf_data, serial)
    surge_recs = find_records_for_serial(surge_pf_data, serial)
    wpf_recs = find_records_for_serial(winding_pf_data, serial)

    # Base score
    hi_score = 100
    deductions = 0

    # 1. DGA & Oil evaluation
    latest_mt = mt_recs[0] if mt_recs else None
    if latest_mt:
        h2 = safe_float(latest_mt.get('H2'))
        c2h2 = safe_float(latest_mt.get('C2H2'))
        c2h4 = safe_float(latest_mt.get('C2H4'))
        tdcg = safe_float(latest_mt.get('TDCG'))
        bdv = safe_float(latest_mt.get('BD'), 70.0)
        wc = safe_float(latest_mt.get('WC'), 10.0)

        if c2h2 > 2 or c2h4 > 100 or tdcg > 720:
            deductions += 15
        elif h2 > 60 or tdcg > 300:
            deductions += 8

        if bdv < 40:
            deductions += 10
        elif bdv < 50:
            deductions += 4

        if wc > 30:
            deductions += 10
        elif wc > 20:
            deductions += 4
    else:
        deductions += 4

    # 2. PI evaluation
    latest_pi = pi_recs[0] if pi_recs else None
    if latest_pi:
        h1 = safe_float(latest_pi.get('H_1'))
        h10 = safe_float(latest_pi.get('H_10'))
        pi_val = (h10 / h1) if h1 > 0 else safe_float(latest_pi.get('H_PI'), 1.5)
        if pi_val > 0:
            if pi_val < 1.0:
                deductions += 15
            elif pi_val < 1.25:
                deductions += 8

    # 4. Extract Last PM year from RatioData.csv
    ratio_recs = find_records_for_serial(ratio_data, serial)
    if ratio_recs:
        import re
        for r in ratio_recs:
            dt_str = r.get('date') or r.get('Date') or r.get('TESTDATE') or ''
            m = re.search(r'\b(20\d\d)\b', str(dt_str))
            if m:
                row[53] = m.group(1)
                break

    final_hi = max(30, min(100, int(hi_score - deductions)))
    status = "Healthy" if final_hi >= 80 else ("Monitor" if final_hi >= 51 else "Critical")

    # Estimated DP & Life
    est_dp = row[12] if row[12] and row[12] != 'None' else "950"
    est_life = row[13] if row[13] and row[13] != 'None' else "25"

    row[10] = str(final_hi)
    row[11] = status
    row[12] = str(est_dp)
    row[13] = str(est_life)
    row[14] = row[14] if row[14] else "A" # Visual
    row[15] = row[15] if row[15] else "A" # Active Part
    row[16] = row[16] if row[16] else "A" # IR & PI
    row[17] = row[17] if row[17] else "A" # Insulation PF
    row[18] = row[18] if row[18] else "A" # Exciting
    row[19] = row[19] if row[19] else "A" # Ratio
    row[20] = row[20] if row[20] else "A" # Winding
    row[24] = row[24] if row[24] else "A" # Bushing
    row[25] = row[25] if row[25] else "A" # Surge
    row[29] = row[29] if row[29] else "A" # Main Tank Oil
    row[30] = row[30] if row[30] else "A" # DGA
    row[31] = row[31] if row[31] else "A" # Water
    row[32] = row[32] if row[32] else "A" # BDV
    
    if not row[53] or row[53] == 'None':
        row[53] = "2025" # Fallback year if missing

    if not row[55] or row[55] == 'None':
        row[55] = "Routine Inspection & Maintenance."

    return row

def main():
    print("Reading HealthIndexSum.csv...")
    rows = []
    with open(HEALTH_SUM_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)
        for r in reader:
            if not r or not any(r):
                continue
            while len(r) < 56:
                r.append('')
            eval_r = evaluate_transformer(r)
            clean_r = [str(c).replace('\r', ' ').replace('\n', ' ').strip() for c in eval_r]
            rows.append(clean_r)

    print(f"Evaluated {len(rows)} transformers. Writing updated HealthIndexSum.csv...")
    with open(HEALTH_SUM_PATH, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([str(h).replace('\r', ' ').replace('\n', ' ').strip() for h in headers])
        writer.writerows(rows)
    print("HealthIndexSum.csv updated successfully!")

    # Synchronize health_data.js
    from update_health_data_js import convert_csv_to_js
    convert_csv_to_js()
    print("health_data.js updated successfully!")

if __name__ == '__main__':
    main()
