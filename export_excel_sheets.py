import os
import sys
import io
import csv
from datetime import datetime
import openpyxl

# Set output encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EXCEL_PATH = r"C:\Users\NB\OneDrive - GPSC\GPSC Group Transformer Assessment\Transformer Asset Managment GPSC GROUP Rev.25.xlsm"
OUTPUT_DIR = r"C:\Users\NB\Downloads\TR Asset\TestData"
HEALTH_SUM_PATH = r"C:\Users\NB\Downloads\TR Asset\HealthIndexSum.csv"

# Target sheets to export
SHEET_NAMES = [
    'SAPorder',
    'FactoryData',
    'VisualData',
    'WindingPFData',
    'IRandPIData',
    'BushingPFData',
    'BushingInfo',
    'SurgePFData',
    'SurgeInfo',
    'ExcitingData',
    'RatioData',
    'WindingData',
    'SingleShortData',
    'ThreeShortData',
    'FRAData',
    'DFRData',
    'DRMData',
    'PDonlineData',
    'ThermoScanData',
    'TRinfo2',
    'TRHistory',
    'MTOilData',
    'OLTCOilData'
]

def export_sheet(ws, out_filepath):
    rows = []
    for r in ws.iter_rows(values_only=True):
        row_vals = []
        has_val = False
        for cell in r:
            if cell is None:
                row_vals.append("")
            elif isinstance(cell, datetime):
                row_vals.append(cell.strftime("%Y-%m-%d %H:%M:%S") if cell.time() else cell.strftime("%Y-%m-%d"))
                has_val = True
            else:
                s_val = str(cell).strip()
                if s_val != "":
                    has_val = True
                row_vals.append(s_val)
        if has_val:
            rows.append(row_vals)
    
    if rows:
        os.makedirs(os.path.dirname(out_filepath), exist_ok=True)
        with open(out_filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerows(rows)
        print(f"Exported {ws.title} -> {out_filepath} ({len(rows)} rows)")
    else:
        print(f"Sheet {ws.title} is empty or has no data rows.")

def load_risk_assess_map(wb):
    risk_map = {}
    if 'RiskAssessSum' not in wb.sheetnames:
        return risk_map
    ws = wb['RiskAssessSum']
    # Row 2 contains headers, data starts row 4
    for r in range(4, ws.max_row + 1):
        eq_name = ws.cell(r, 1).value
        serial  = ws.cell(r, 2).value
        site    = ws.cell(r, 3).value
        impact  = ws.cell(r, 30).value # Impact Index (%)
        ghi     = ws.cell(r, 39).value # General Health Index [GHI] (%)
        chi     = ws.cell(r, 40).value # Condition Health Index [CHI] (%)
        pof     = ws.cell(r, 41).value # Probability of Failure (%)
        
        eq_str = str(eq_name).strip() if eq_name else ""
        sn_str = str(serial).strip() if serial else ""
        
        entry = {
            'impact': round(float(impact), 2) if impact is not None and isinstance(impact, (int, float)) else (str(impact).strip() if impact else ''),
            'ghi': round(float(ghi), 2) if ghi is not None and isinstance(ghi, (int, float)) else (str(ghi).strip() if ghi else ''),
            'chi': round(float(chi), 2) if chi is not None and isinstance(chi, (int, float)) else (str(chi).strip() if chi else ''),
            'pof': round(float(pof), 2) if pof is not None and isinstance(pof, (int, float)) else (str(pof).strip() if pof else ''),
        }
        
        if sn_str:
            risk_map[sn_str] = entry
        if eq_str:
            risk_map[eq_str] = entry
    return risk_map

def export_health_index_sum(ws, out_filepath, risk_map):
    headers = []
    for row in ws.iter_rows(min_row=2, max_row=2, values_only=True):
        headers = list(row)

    clean_headers = [str(h).replace('\n', ' ').strip() if h is not None else '' for h in headers[:56]]

    # Append Evaluation Summary columns if not present
    eval_cols = ['General Health Index [GHI] (%)', 'Probability of Failure [PoF] (%)', 'Impact Index [CoF] (%)', 'Risk Level']
    extended_headers = clean_headers + eval_cols

    data_rows = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        row_data = list(row)[:56]
        non_empty = [v for v in row_data if v is not None and str(v).strip() != '']
        if not non_empty:
            continue
        eq_name = str(row_data[1]).strip() if len(row_data) > 1 and row_data[1] else ''
        serial  = str(row_data[2]).strip() if len(row_data) > 2 and row_data[2] else ''
        if not eq_name and not serial:
            continue
        
        cleaned = []
        for val in row_data:
            if isinstance(val, datetime):
                cleaned.append(val.strftime('%m/%d/%Y'))
            elif val is None:
                cleaned.append('')
            else:
                cleaned.append(str(val).strip())
        
        # Match Evaluation Risk data
        r_entry = risk_map.get(serial) or risk_map.get(eq_name) or {}
        ghi_val = r_entry.get('ghi', '')
        pof_val = r_entry.get('pof', '')
        impact_val = r_entry.get('impact', '')
        
        # Calculate Risk Level
        risk_level = ''
        try:
            pof_num = float(pof_val) if pof_val != '' else None
            imp_num = float(impact_val) if impact_val != '' else None
            if pof_num is not None and imp_num is not None:
                if pof_num >= 30 or imp_num >= 70:
                    risk_level = 'High Risk'
                elif pof_num >= 15 or imp_num >= 50:
                    risk_level = 'Medium Risk'
                else:
                    risk_level = 'Low Risk'
        except Exception:
            pass

        cleaned.extend([str(ghi_val), str(pof_val), str(impact_val), risk_level])
        data_rows.append(cleaned)

    with open(out_filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(extended_headers)
        writer.writerows(data_rows)
    print(f"Exported HealthIndexSum with Evaluation fields -> {out_filepath} ({len(data_rows)} rows)")

def main():
    print(f"Starting export from {EXCEL_PATH} at {datetime.now()}")
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel file does not exist at {EXCEL_PATH}")
        sys.exit(1)

    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, keep_vba=False, data_only=True)
    all_sheets = wb.sheetnames

    risk_map = load_risk_assess_map(wb)

    # Export HealthIndexSum with Evaluation metrics
    if 'HealthIndexSum' in all_sheets:
        export_health_index_sum(wb['HealthIndexSum'], HEALTH_SUM_PATH, risk_map)
        try:
            from update_health_data import convert_csv_to_health_data
            convert_csv_to_health_data()
        except Exception as e:
            print(f"Warning: Could not update health_data.js: {e}")

    # Export target TestData sheets
    for s_name in SHEET_NAMES:
        if s_name in all_sheets:
            out_file = os.path.join(OUTPUT_DIR, f"{s_name}.csv")
            export_sheet(wb[s_name], out_file)
        else:
            print(f"WARNING: Sheet '{s_name}' not found in workbook.")

    print(f"All exports completed successfully at {datetime.now()}.")

if __name__ == "__main__":
    main()
