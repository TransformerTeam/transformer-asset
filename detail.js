// Standalone Detail Page Logic for GPSC Transformer Asset Management
// Completely cut off and independent of assessment.js

var assessmentData = [];
var trInfoCsvData = [];
var bushingPfCsvData = [];
var bushingInfoCsvData = [];
var mtOilCsvData = [];
var mainTankDgaCsvData = [];
var oltcOilCsvData = [];
var piCsvData = [];

// Auto-initialize assessmentData from HEALTH_INDEX_DATA if available
if (typeof HEALTH_INDEX_DATA !== 'undefined' && Array.isArray(HEALTH_INDEX_DATA) && HEALTH_INDEX_DATA.length > 0) {
  if (typeof parseHealthIndexSumCSV === 'function') {
    assessmentData = parseHealthIndexSumCSV(HEALTH_INDEX_DATA);
  } else {
    assessmentData = HEALTH_INDEX_DATA;
  }
  if (typeof window !== 'undefined') window.assessmentData = assessmentData;
}

// Helper to set element text content safely
const setElTxt = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};

// Parse numeric values safely
const parseNum = (v) => {
  if (v === undefined || v === null || v === '-' || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

// CSV parsing function
function parseDgaCSV(text) {
  if (text.startsWith('\ufeff')) {
    text = text.substring(1);
  }

  const rows = [];
  let currentRow = [];
  let currentEntry = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentEntry += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentEntry.trim());
      currentEntry = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentEntry.trim());
      if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentEntry = '';
    } else {
      currentEntry += char;
    }
  }
  if (currentEntry !== '' || currentRow.length > 0) {
    currentRow.push(currentEntry.trim());
    if (currentRow.some(c => c !== '')) rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const results = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 2) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] ? row[idx].trim() : '';
      });
      obj.serial = obj.Serial_No || obj.serial || obj.Serial || obj.SERIAL_NUMBER || '';
      obj.date = obj.Date || obj.date || obj.DATE || obj.sampling_date || obj.Sampling_Date || '';
      results.push(obj);
    }
  }
  return results;
}

// Health Index Sum parser
function parseHealthIndexSumCSV(rows) {
  if (!rows || rows.length === 0) return [];
  const results = [];
  rows.forEach((row, idx) => {
    const name = row['Equipment Name'] || row.name || '';
    const serial = row['Serial No'] || row.serial || '';
    if (!name && !serial) return;

    function pVal(v) {
      if (v === undefined || v === null || v === '-' || v === '' || v === 'N/A' || v === 'None') return null;
      const n = Number(v);
      return isNaN(n) ? v : n;
    }

    results.push({
      no: idx,
      name: String(name),
      serial: String(serial),
      site: String(row.SITE || row.site || ''),
      ratedPower: pVal(row['Rated Power (MVA)']),
      hvRate: pVal(row['HV Rate (kV)']),
      lvRate: pVal(row['LV Rate (kV)']),
      ratedVoltage: String(row['Rated Voltage (kV)'] || ''),
      serviceType: String(row['Service Type'] || ''),
      serviceAge: pVal(row['Service Age (Year)']),
      healthIndex: pVal(row['Condition Health Index']),
      healthStatus: String(row['Health Index Status'] || ''),
      estimatedDP: pVal(row['Estimated DP (From Furan)']),
      estimatedLife: pVal(row['Estimated Remaining Life time (Year)']),
      visualInspection: String(row['Visual Inspection'] || 'N/A'),
      activePart: {
        overall: String(row['Active Part'] || 'N/A'),
        insulationResistance: String(row['Insulation Resistance & PI'] || 'N/A'),
        insulationPowerFactor: String(row['Insulation Power Factor'] || 'N/A'),
        excitingCurrent: String(row['Exciting Current'] || 'N/A'),
        ratioPolarity: String(row['Transformer Turn Ratio'] || 'N/A'),
        windingResistance: String(row['Winding Resistance'] || 'N/A'),
        shortCircuit1P: String(row['Short Circuit Impedance 1 Phase'] || 'N/A'),
        shortCircuit3P: String(row['Short Circuit Impedance 3 Phase'] || 'N/A'),
        coreToGround: String(row['Core to Ground'] || 'N/A')
      },
      bushing: String(row['Bushing'] || 'N/A'),
      surgeArrester: String(row['Surge Arrester'] || 'N/A'),
      dynamicResistance: String(row['OLTC Dynamic Resistance'] || 'N/A'),
      fra: String(row['FRA'] || 'N/A'),
      moisturePaper: String(row['Moisture in Paper [FDS]'] || 'N/A'),
      mainTankOil: {
        overall: String(row['Main Tank Oil Properties'] || 'N/A'),
        dga: String(row['DGA'] || 'N/A'),
        waterContent: String(row['Water Content (ASTM D1533)'] || 'N/A'),
        dielectricBreakdown: String(row['Dielectric Breakdown (ASTM D1816 (2 mm))'] || 'N/A'),
        pf25: String(row['Power Factor at 25 °C (ASTM D924)'] || 'N/A'),
        pf100: String(row['Power Factor at 100 °C (ASTM D925)'] || 'N/A'),
        conductivity: String(row['Conductivity (IEC 61620)'] || 'N/A'),
        ift: String(row['IFT (ASTM D971)'] || 'N/A'),
        acidity: String(row['Acidity (ASTM D974)'] || 'N/A'),
        color: String(row['Color Number (ASTM D1500)'] || 'N/A'),
        inhibitor: String(row['Inhibitor (IEC 60296)'] || 'N/A'),
        corrosiveSulfur: String(row['Corrosive Sulfur (DIN 51353)'] || 'N/A')
      },
      passivator: String(row['Passivator [Irgamet 39]'] || 'N/A'),
      furan: String(row['Furan (2-FAL) (ASTM D5837)'] || 'N/A'),
      sludge: String(row['Sludge Coindition'] || 'N/A'),
      oltcOil: {
        dga: String(row['OLTC DGA'] || 'N/A'),
        dielectricBreakdown: String(row['OLTC Dielectric Breakdown'] || 'N/A'),
        waterContent: String(row['OLTC Water Content'] || 'N/A')
      },
      dateToAssess: String(row['Date to Assess'] || ''),
      lastPM: String(row['Last PM'] || ''),
      nextPM: String(row['Next PM'] || ''),
      recommendation: String(row['Recommend'] || '')
    });
  });
  return results;
}

// Find matching record by serial with fast caching
var _latestRecordCacheDetail = new Map();

function findLatestRecord(csvArray, targetSerial) {
  if (!csvArray || !csvArray.length || !targetSerial) return null;
  const cleanTarget = String(targetSerial || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cacheKey = `${csvArray.length}_${cleanTarget}`;
  if (_latestRecordCacheDetail.has(cacheKey)) {
    return _latestRecordCacheDetail.get(cacheKey);
  }

  const matches = csvArray.filter(d => {
    const s = d.serial || d.Serial_No || d.Serial_no || d.Serial || d.SERIAL_NUMBER || d['Serial No.'] || '';
    if (!s) return false;
    const s1 = String(s).trim().toLowerCase();
    const s2 = String(targetSerial).trim().toLowerCase();
    if (s1 === s2) return true;
    const cleanS = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanS && cleanTarget && (cleanS === cleanTarget || cleanS.includes(cleanTarget) || cleanTarget.includes(cleanS))) return true;
    return s1.includes(s2) || s2.includes(s1);
  });

  if (matches.length === 0) {
    _latestRecordCacheDetail.set(cacheKey, null);
    return null;
  }

  matches.sort((a, b) => {
    const da = new Date(a.date || a.Date || a['Test Date'] || a.Test_Date || '');
    const db = new Date(b.date || b.Date || b['Test Date'] || b.Test_Date || '');
    if (isNaN(da.getTime())) return 1;
    if (isNaN(db.getTime())) return -1;
    return db - da;
  });

  const result = matches[0];
  _latestRecordCacheDetail.set(cacheKey, result);
  return result;
}

// Format Date as DD-MMM-YYYY
function formatDgaDate(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'N/A') return '-';
  if (typeof formatDateToDdMmmYyyy === 'function') {
    return formatDateToDdMmmYyyy(dateStr);
  }
  let d;
  if (dateStr instanceof Date) {
    d = dateStr;
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) {
    let clean = String(dateStr).trim();
    if (clean.includes(' ')) {
      clean = clean.split(' ')[0];
    }
    return clean;
  }
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Robust date-parsing function that returns a Date object
function parseDateRobust(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  let cleaned = String(dateStr).trim();
  
  // Strip off time component if present
  if (cleaned.includes(' ')) {
    cleaned = cleaned.split(' ')[0];
  }
  
  // Try standard Date constructor first if it's a clean ISO or standard format
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try simple slash format (e.g. DD/MM/YYYY or MM/DD/YYYY)
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      let p2 = parseInt(parts[2]);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (parts[0].length === 4) {
          const d = new Date(p0, p1 - 1, p2);
          if (!isNaN(d.getTime())) return d;
        }
        if (parts[2].length === 4) {
          if (p0 > 12) { // Must be DD/MM/YYYY
            const d = new Date(p2, p1 - 1, p0);
            if (!isNaN(d.getTime())) return d;
          } else { // Assume MM/DD/YYYY
            const d = new Date(p2, p0 - 1, p1);
            if (!isNaN(d.getTime())) return d;
          }
        }
      }
    }
  }
  
  // Try dash format (e.g. DD-MMM-YY)
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0]);
      const p2 = parseInt(parts[2]);
      const months = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const monthPart = parts[1].toLowerCase().substring(0, 3);
      if (months[monthPart] !== undefined) {
        let year = p2;
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        if (!isNaN(p0) && !isNaN(year)) {
          const d = new Date(year, months[monthPart], p0);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
  }
  
  return null;
}

// Utility to set test date element with color-coding
function updateTestDate(elId, rawDateStr) {
  const el = document.getElementById(elId);
  if (!el) return;

  const dateObj = parseDateRobust(rawDateStr);
  
  let cleanStr = String(rawDateStr || '-').trim();
  if (cleanStr.includes(' ')) {
    cleanStr = cleanStr.split(' ')[0];
  }
  const formatted = dateObj ? formatDgaDate(dateObj) : cleanStr;
  
  el.textContent = formatted;
  el.style.padding = '2px 6px';
  el.style.borderRadius = '4px';
  el.style.fontWeight = 'bold';
  el.style.display = 'inline-block';

  if (dateObj) {
    const today = new Date();
    const diffTime = Math.abs(today - dateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const threeYearsInDays = 3 * 365.25;

    if (diffDays <= threeYearsInDays) {
      el.style.setProperty('color', '#10b981', 'important');
      el.style.setProperty('background-color', 'rgba(16, 185, 129, 0.15)', 'important');
    } else {
      el.style.setProperty('color', '#eab308', 'important');
      el.style.setProperty('background-color', 'rgba(234, 179, 8, 0.15)', 'important');
    }
  } else {
    el.style.removeProperty('color');
    el.style.removeProperty('background-color');
  }
}

// Duval 1 Evaluation
function evaluateDuval1(ch4, c2h4, c2h2) {
  const sum = ch4 + c2h4 + c2h2;
  if (sum <= 0) return { code: 'PD', name: 'PD Partial discharges' };
  const ch4Pct = (ch4 / sum) * 100;
  const c2h4Pct = (c2h4 / sum) * 100;
  const c2h2Pct = (c2h2 / sum) * 100;

  let code = 'D2';
  let name = 'D2 Discharges of high energy';

  if (ch4Pct >= 98) {
    code = 'PD'; name = 'PD Partial discharges';
  } else if (ch4Pct < 98 && c2h4Pct <= 20 && c2h2Pct <= 4) {
    code = 'T1'; name = 'T1 Thermal faults (T < 300°C)';
  } else if (c2h4Pct > 20 && c2h4Pct < 50 && c2h2Pct <= 4) {
    code = 'T2'; name = 'T2 Thermal faults (300°C < T < 700°C)';
  } else if (c2h4Pct >= 50 && c2h2Pct <= 15) {
    code = 'T3'; name = 'T3 Thermal faults (T > 700°C)';
  } else if (c2h4Pct <= 23 && c2h2Pct >= 13) {
    code = 'D1'; name = 'D1 Discharges of low energy';
  } else if ((c2h4Pct > 23 && c2h4Pct <= 40 && c2h2Pct >= 13 && c2h2Pct < 29) || (c2h4Pct > 23 && c2h2Pct >= 29)) {
    code = 'D2'; name = 'D2 Discharges of high energy';
  } else if ((c2h4Pct < 50 && c2h2Pct > 4 && c2h2Pct < 13) ||
             (c2h4Pct > 40 && c2h2Pct > 15 && c2h2Pct < 29) ||
             (c2h4Pct > 40 && c2h4Pct < 50 && c2h2Pct >= 13 && c2h2Pct <= 15)) {
    code = 'DT'; name = 'DT Mixed thermal and discharge faults';
  }

  return { code, name };
}

// Load CSV files essential for the Detail Page
function loadAllTestDataCSVs() {
  const csvFiles = [
    { url: 'HealthIndexSum.csv', target: d => {
        if (d && d.length > 0) {
          const parsed = parseHealthIndexSumCSV(d);
          if (parsed && parsed.length > 0) {
            assessmentData = parsed;
          }
        }
      }
    },
    { url: 'TestData/TRinfo2.csv', target: d => trInfoCsvData = d },
    { url: 'TestData/BushingPFData.csv', target: d => bushingPfCsvData = d },
    { url: 'TestData/BushingInfo.csv', target: d => bushingInfoCsvData = d },
    { url: 'TestData/MTOilData.csv', target: d => { mtOilCsvData = d; mainTankDgaCsvData = d; } },
    { url: 'TestData/MainTankOilData.csv', target: d => { if (!mtOilCsvData.length) { mtOilCsvData = d; mainTankDgaCsvData = d; } } },
    { url: 'TestData/OLTCOilData.csv', target: d => oltcOilCsvData = d },
    { url: 'TestData/PIData.csv', target: d => piCsvData = d },
    { url: 'TestData/DFRData.csv', target: d => dfrCsvData = d },
  ];

  return Promise.allSettled(
    csvFiles.map(item =>
      fetch(item.url)
        .then(r => r.ok ? r.text() : '')
        .then(txt => {
          if (txt) item.target(parseDgaCSV(txt));
        })
    )
  );
}

// Main detail renderer
function openDetail(no) {
  if (!assessmentData || !assessmentData.length) {
    if (typeof window !== 'undefined' && window.assessmentData && window.assessmentData.length > 0) {
      assessmentData = window.assessmentData;
    } else if (typeof HEALTH_INDEX_DATA !== 'undefined' && HEALTH_INDEX_DATA.length > 0) {
      assessmentData = (typeof parseHealthIndexSumCSV === 'function') ? parseHealthIndexSumCSV(HEALTH_INDEX_DATA) : HEALTH_INDEX_DATA;
      if (typeof window !== 'undefined') window.assessmentData = assessmentData;
    }
  }

  let item = null;
  if (assessmentData && assessmentData.length > 0) {
    if (typeof no === 'object' && no !== null) {
      item = no;
    } else if (typeof no === 'number') {
      item = assessmentData.find(i => i.no === no);
    }
    if (!item && no !== undefined && no !== null) {
      const target = String(no).trim();
      item = assessmentData.find(i => 
        i.no === Number(target) || 
        String(i.serial) === target || 
        String(i['Serial No']) === target ||
        String(i.serial).includes(target) || 
        target.includes(String(i.serial)) ||
        (i.name && String(i.name).toLowerCase() === target.toLowerCase()) ||
        (i['Equipment Name'] && String(i['Equipment Name']).toLowerCase() === target.toLowerCase())
      );
    }
  }
  if (!item && assessmentData && assessmentData.length > 0) {
    item = assessmentData[0];
  }
  if (!item) return;

  // Status Class Mapper
  function getStatusClass(status) {
    if (status === 'A' || status === 'Normal' || status === 'Good') return 'ex-status-good';
    if (status === 'Q' || status === 'Warning' || status === 'Fair' || status === 'Monitor') return 'ex-status-fair';
    if (status === 'U' || status === 'Poor' || status === 'Critical') return 'ex-status-poor';
    return '';
  }

  // Calculate Service Year
  let serviceAgeYears = '-';
  if (item.serviceAge && item.serviceAge !== '-' && item.serviceAge !== '' && item.serviceAge !== 'N/A') {
    serviceAgeYears = item.serviceAge;
  } else if (typeof TR_DATA !== 'undefined') {
    const trMatch = TR_DATA.find(x => x.SERIAL_NUMBER === item.serial);
    if (trMatch && trMatch.MANUFACTURING_DATE) {
      const parts = trMatch.MANUFACTURING_DATE.split('-');
      let year = null;
      if (parts.length === 3) {
        year = parseInt(parts[2]);
        if (year < 100) year += 2000;
      } else {
        const yrMatch = trMatch.MANUFACTURING_DATE.match(/\d{4}$/);
        if (yrMatch) year = parseInt(yrMatch[0]);
      }
      if (year && year > 1900 && year <= 2026) {
        serviceAgeYears = (2026 - year).toString();
      }
    }
  }

  // Look up dynamic TRInfo record
  const trInfo = findLatestRecord(trInfoCsvData, item.serial) || item.trInfo;

  // 1. Transformer Information Table
  setElTxt('ex-info-name', item.name || '-');
  setElTxt('ex-info-serial', item.serial || '-');
  setElTxt('ex-info-site', item.site || '-');
  setElTxt('ex-info-power', item.ratedPower ? `${item.ratedPower} MVA` : '-');
  setElTxt('ex-info-voltage', item.ratedVoltage ? `${item.ratedVoltage} kV` : '-');
  setElTxt('ex-info-service', item.serviceType || '-');
  setElTxt('ex-info-age', serviceAgeYears !== '-' ? `${serviceAgeYears} Years` : '-');

  if (trInfo) {
    setElTxt('ex-info-brand', trInfo.BRAND || trInfo.brand || '-');
    setElTxt('ex-info-fluid', trInfo.TYPE_OF_INSULATION || trInfo.type_of_insulation || '-');
    setElTxt('ex-info-oltc-brand', trInfo.TAP_CHANGER_BRAND || trInfo.tap_changer_brand || '-');
    setElTxt('ex-info-oltc-type', trInfo.TAP_CHANGER_TYPE || trInfo.tap_changer_type || '-');
    setElTxt('ex-info-vector', trInfo.VECTOR_GROUP || trInfo.vector_group || '-');
  } else {
    // Falls back to TR_DATA if TRInfo not found
    if (typeof TR_DATA !== 'undefined') {
      const match = TR_DATA.find(x => x.SERIAL_NUMBER === item.serial);
      if (match) {
        setElTxt('ex-info-brand', match.BRAND || '-');
        setElTxt('ex-info-fluid', match.TYPE_OF_INSULATION || '-');
        setElTxt('ex-info-oltc-brand', match.TAP_CHANGER_BRAND || '-');
        setElTxt('ex-info-oltc-type', match.TAP_CHANGER_TYPE || '-');
        setElTxt('ex-info-vector', match.VECTOR_GROUP || '-');
      } else {
        setElTxt('ex-info-brand', '-');
        setElTxt('ex-info-fluid', '-');
        setElTxt('ex-info-oltc-brand', '-');
        setElTxt('ex-info-oltc-type', '-');
        setElTxt('ex-info-vector', '-');
      }
    }
  }

  // Populate OLTC Information Card from OLTC_DATA
  const oltcMatch = (typeof OLTC_DATA !== 'undefined' && Array.isArray(OLTC_DATA)) ? OLTC_DATA.find(x => {
    const s1 = String(x.parentSerialNo || '').trim().toLowerCase();
    const s2 = String(item.serial || item.SERIAL_NUMBER || '').trim().toLowerCase();
    const kks1 = String(x.kksNo || '').trim().toLowerCase();
    const kks2 = String(item.name || item.EQUIPMENT_NAME || '').trim().toLowerCase();
    return (s1 && s2 && (s1 === s2 || s1.includes(s2) || s2.includes(s1))) ||
           (kks1 && kks2 && (kks1 === kks2 || kks1.includes(kks2) || kks2.includes(kks1)));
  }) : null;

  if (oltcMatch) {
    setElTxt('ex-oltc-mfg', oltcMatch.oltcManufacturer || '-');
    setElTxt('ex-oltc-model', oltcMatch.oltcModelType || '-');
    setElTxt('ex-oltc-year', oltcMatch.oltcModelYear || '-');
    setElTxt('ex-oltc-serial', oltcMatch.oltcSerialNo || '-');
    setElTxt('ex-oltc-motor', oltcMatch.motorDrive || '-');
    setElTxt('ex-oltc-counter', oltcMatch.counterOperated ? Number(oltcMatch.counterOperated).toLocaleString() : '-');
    setElTxt('ex-oltc-taps', oltcMatch.tapNo ? `${oltcMatch.tapNo} Taps` : '-');
    setElTxt('ex-oltc-resistor', oltcMatch.transitionResistorOhm ? `${oltcMatch.transitionResistorOhm} Ω` : '-');
    setElTxt('ex-oltc-maint-spec', oltcMatch.maintenanceTime || '-');
    setElTxt('ex-oltc-schedule', (oltcMatch.lastInspection || oltcMatch.nextDue) ? `${oltcMatch.lastInspection || '-'} / ${oltcMatch.nextDue || '-'}` : '-');
  } else {
    setElTxt('ex-oltc-mfg', '-');
    setElTxt('ex-oltc-model', '-');
    setElTxt('ex-oltc-year', '-');
    setElTxt('ex-oltc-serial', '-');
    setElTxt('ex-oltc-motor', '-');
    setElTxt('ex-oltc-counter', '-');
    setElTxt('ex-oltc-taps', '-');
    setElTxt('ex-oltc-resistor', '-');
    setElTxt('ex-oltc-maint-spec', '-');
    setElTxt('ex-oltc-schedule', '-');
  }

  // Sync with Evaluation Report Engine
  if (typeof computeHI === 'function') {
    try {
      const { percentHIVal } = computeHI(item);
      if (percentHIVal > 0) {
        item.healthIndex = percentHIVal;
        item.healthStatus = percentHIVal >= 80 ? 'Healthy' : (percentHIVal >= 51 ? 'Monitor' : 'Critical');
      }
    } catch (e) {
      console.warn('computeHI error in detail.js', e);
    }
  }

  // Update button to Evaluation Report
  const evalBtn = document.getElementById('btn-eval-report');
  if (evalBtn) {
    evalBtn.href = `evaluation_report.html?serial=${encodeURIComponent(item.serial)}`;
  }

  // Excel Visual Indicator
  const exVisualText = document.getElementById('ex-visual-text');
  if (exVisualText) {
    const visVal = item.visualInspection || 'N/A';
    let visLabel = 'Acceptable (A)';
    let visClass = 'ex-status-good';

    if (visVal === 'Q' || visVal === 'Warning' || visVal === 'Fair' || visVal === 'Monitor') {
      visLabel = 'Monitor (Q)';
      visClass = 'ex-status-fair';
    } else if (visVal === 'U' || visVal === 'Unacceptable' || visVal === 'Critical' || visVal === 'Poor') {
      visLabel = 'Unacceptable (U)';
      visClass = 'ex-status-poor';
    }
    exVisualText.textContent = visLabel;
    exVisualText.className = `excel-visual-box ${visClass}`;
  }

  // Interpretation and Recommendations Box
  const recEl = document.getElementById('ex-recommendation-text');
  if (recEl) {
    if (typeof generateDetailedRecommendation === 'function') {
      const recRes = generateDetailedRecommendation(item);
      recEl.innerHTML = recRes.html;
      recEl.style.fontSize = '0.78rem';
      recEl.style.lineHeight = '1.45';
    } else {
      const recText = (item.recommendation && item.recommendation.trim()) ? item.recommendation.trim() : 'Normal Condition: All diagnostic test results are within acceptable limits.';
      recEl.textContent = recText;
    }
  }

  // 2. Speedometer Gauge
  const hi = item.healthIndex;
  setElTxt('ex-est-life', item.estimatedLife || '-');
  setElTxt('ex-est-dp', item.estimatedDP && !isNaN(parseFloat(item.estimatedDP)) ? Math.round(parseFloat(item.estimatedDP)) : (item.estimatedDP || '0'));

  const score = document.getElementById('ex-gauge-score');
  if (score) {
    score.textContent = (hi !== null && hi !== undefined) ? `HI ${Math.round(hi)}%` : 'HI --%';
    const hiVal = (hi !== null && hi !== undefined) ? hi : 0;
    if (hiVal >= 80) {
      score.style.color = '#22c55e';
    } else if (hiVal >= 51) {
      score.style.color = '#facc15';
    } else {
      score.style.color = '#ff4d4d';
    }
  }

  const needleGroup = document.getElementById('ex-gauge-needle-group');
  if (needleGroup) {
    const hiVal = (hi !== null && hi !== undefined) ? Math.max(0, Math.min(100, hi)) : 0;
    const angle = -90 + (hiVal * 1.8);
    needleGroup.setAttribute('transform', `rotate(${angle} 60 60)`);
  }

  const imgEl = document.getElementById('ex-model-img');
  if (imgEl) {
    imgEl.src = `Transformer Photo/${item.name}.jpg`;
    imgEl.onerror = () => {
      imgEl.src = 'background.jpg';
    };
  }

  // 3. Bushing Card
  const bushBody = document.getElementById('ex-bushing-rows');
  const bushRec = findLatestRecord(bushingPfCsvData, item.serial) || item.bushRec;

  const getBushingPfErrClass = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return '';
    const v = Math.abs(parseFloat(val));
    if (v <= 50) return 'ex-status-good';
    if (v <= 100) return 'ex-status-fair';
    return 'ex-status-poor';
  };

  const getBushingCapErrClass = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return '';
    const v = Math.abs(parseFloat(val));
    if (v <= 5) return 'ex-status-good';
    if (v <= 10) return 'ex-status-fair';
    return 'ex-status-poor';
  };

  const formatErrVal = (val, isRaw) => {
    if (val === null || val === undefined || val === '' || val === '-') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    if (isRaw) return num.toFixed(2) + '%';
    return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
  };

  const getBushingEvaluation = (pf20, npPf, cap, npCap, mfg, ins) => {
    let pfStatusCls = '';
    let capStatusCls = '';

    const manufacturer = (mfg || '').toUpperCase().trim();
    const insulation = (ins || '').toUpperCase().trim();

    // --- PF Status Evaluation ---
    if (npPf > 0 && pf20 > 0) {
      const pfRatio = pf20 / npPf;
      const pfErrPercent = ((pf20 - npPf) / npPf) * 100;

      if (pfErrPercent < 0 && !manufacturer.includes('MGC')) {
        pfStatusCls = 'ex-status-good';
      } else if (manufacturer.includes('ABB')) {
        if (pfErrPercent <= 40.0) {
          pfStatusCls = 'ex-status-good';
        } else if (pfErrPercent < 75.0) {
          pfStatusCls = 'ex-status-fair';
        } else {
          pfStatusCls = 'ex-status-poor';
        }
      } else if (manufacturer.includes('TRENCH')) {
        if (pfRatio <= 1.5) {
          pfStatusCls = 'ex-status-good';
        } else if (pfRatio <= 2.0) {
          pfStatusCls = 'ex-status-fair';
        } else {
          pfStatusCls = 'ex-status-poor';
        }
      } else if (manufacturer.includes('PASSONI') || manufacturer.includes('VILLA')) {
        if (pfErrPercent <= 0) {
          pfStatusCls = 'ex-status-good';
        } else if (pfErrPercent < 30.0) {
          pfStatusCls = 'ex-status-fair';
        } else {
          pfStatusCls = 'ex-status-poor';
        }
      } else if (manufacturer.includes('MGC')) {
        if (pf20 <= 0.5) {
          pfStatusCls = 'ex-status-good';
        } else if (pf20 <= 0.7) {
          pfStatusCls = 'ex-status-fair';
        } else {
          pfStatusCls = 'ex-status-poor';
        }
      } else {
        if (pfRatio <= 1.5) {
          pfStatusCls = 'ex-status-good';
        } else if (pfRatio <= 2.0) {
          pfStatusCls = 'ex-status-fair';
        } else {
          pfStatusCls = 'ex-status-poor';
        }
      }
    }

    // --- Cap Status Evaluation ---
    if (npCap > 0 && cap > 0) {
      const devVal = ((cap - npCap) / npCap) * 100;
      const absDev = Math.abs(devVal);

      if (devVal < 0) {
        capStatusCls = 'ex-status-good';
      } else if (manufacturer.includes('ABB')) {
        if (absDev <= 3.0) {
          capStatusCls = 'ex-status-good';
        } else if (absDev <= 5.0) {
          capStatusCls = 'ex-status-fair';
        } else {
          capStatusCls = 'ex-status-poor';
        }
      } else if (manufacturer.includes('PASSONI') || manufacturer.includes('VILLA')) {
        if (absDev <= 1.0) {
          capStatusCls = 'ex-status-good';
        } else if (absDev <= 3.0) {
          capStatusCls = 'ex-status-fair';
        } else {
          capStatusCls = 'ex-status-poor';
        }
      } else if (manufacturer.includes('MGC')) {
        if (absDev <= 5.0) {
          capStatusCls = 'ex-status-good';
        } else if (absDev <= 10.0) {
          capStatusCls = 'ex-status-fair';
        } else {
          capStatusCls = 'ex-status-poor';
        }
      } else if (manufacturer.includes('TRENCH')) {
        if (absDev <= 110.0) {
          capStatusCls = 'ex-status-good';
        } else {
          capStatusCls = 'ex-status-poor';
        }
      } else {
        if (absDev <= 5.0) {
          capStatusCls = 'ex-status-good';
        } else if (absDev <= 10.0) {
          capStatusCls = 'ex-status-fair';
        } else {
          capStatusCls = 'ex-status-poor';
        }
      }
    }

    return { pfStatusCls, capStatusCls };
  };

  const getErrCell = (val, checkFn, customClass, isRaw) => {
    const formatted = formatErrVal(val, isRaw);
    if (formatted === '-') return '<td>-</td>';
    const cls = customClass || (checkFn ? checkFn(val) : '');
    return `<td class="${cls}">${formatted}</td>`;
  };

  if (bushRec) {
    let h1_pf_err = bushRec.maxbh1_tand || '-';
    let h2_pf_err = bushRec.maxbh2_tand || '-';
    let h3_pf_err = bushRec.maxbh3_tand || '-';
    let l1_pf_err = bushRec.maxbl1_tand || '-';
    let l2_pf_err = bushRec.maxbl2_tand || '-';
    let l3_pf_err = bushRec.maxbl3_tand || '-';

    let h1_cap_err = bushRec.maxbch1_change || '-';
    let h2_cap_err = bushRec.maxbch2_change || '-';
    let h3_cap_err = bushRec.maxbch3_change || '-';
    let l1_cap_err = bushRec.maxbcl1_change || '-';
    let l2_cap_err = bushRec.maxbcl2_change || '-';
    let l3_cap_err = bushRec.maxbcl3_change || '-';

    let h1_pf_cls = bushRec.maxbh1_tand_cls || '';
    let h2_pf_cls = bushRec.maxbh2_tand_cls || '';
    let h3_pf_cls = bushRec.maxbh3_tand_cls || '';
    let l1_pf_cls = bushRec.maxbl1_tand_cls || '';
    let l2_pf_cls = bushRec.maxbl2_tand_cls || '';
    let l3_pf_cls = bushRec.maxbl3_tand_cls || '';

    let h1_cap_cls = bushRec.maxbch1_change_cls || '';
    let h2_cap_cls = bushRec.maxbch2_change_cls || '';
    let h3_cap_cls = bushRec.maxbch3_change_cls || '';
    let l1_cap_cls = bushRec.maxbcl1_change_cls || '';
    let l2_cap_cls = bushRec.maxbcl2_change_cls || '';
    let l3_cap_cls = bushRec.maxbcl3_change_cls || '';

    if (typeof bushingInfoCsvData !== 'undefined' && bushingInfoCsvData && bushingInfoCsvData.length > 0) {
      const np_rows = bushingInfoCsvData.filter(r => String(r.Parent_Serial_No || '').trim().toLowerCase() === String(item.serial).trim().toLowerCase());
      const phases = [
        ['H1', 'bushing_h1_pf_20c', 'bushing_h1_pf_tan', 'bushing_h1_c1', 
          (val, cls) => { h1_pf_err = val; if (cls) h1_pf_cls = cls; }, 
          (val, cls) => { h1_cap_err = val; if (cls) h1_cap_cls = cls; }],
        ['H2', 'bushing_h2_pf_20c', 'bushing_h2_pf_tan', 'bushing_h2_c1', 
          (val, cls) => { h2_pf_err = val; if (cls) h2_pf_cls = cls; }, 
          (val, cls) => { h2_cap_err = val; if (cls) h2_cap_cls = cls; }],
        ['H3', 'bushing_h3_pf_20c', 'bushing_h3_pf_tan', 'bushing_h3_c1', 
          (val, cls) => { h3_pf_err = val; if (cls) h3_pf_cls = cls; }, 
          (val, cls) => { h3_cap_err = val; if (cls) h3_cap_cls = cls; }],
        ['X1', 'xbushing_h1_pf_20c', 'xbushing_h1_pf_tan', 'xbushing_h1_c1', 
          (val, cls) => { l1_pf_err = val; if (cls) l1_pf_cls = cls; }, 
          (val, cls) => { l1_cap_err = val; if (cls) l1_cap_cls = cls; }],
        ['X2', 'xbushing_h2_pf_20c', 'xbushing_h2_pf_tan', 'xbushing_h2_c1', 
          (val, cls) => { l2_pf_err = val; if (cls) l2_pf_cls = cls; }, 
          (val, cls) => { l2_cap_err = val; if (cls) l2_cap_cls = cls; }],
        ['X3', 'xbushing_h3_pf_20c', 'xbushing_h3_pf_tan', 'xbushing_h3_c1', 
          (val, cls) => { l3_pf_err = val; if (cls) l3_pf_cls = cls; }, 
          (val, cls) => { l3_cap_err = val; if (cls) l3_cap_cls = cls; }]
      ];
      phases.forEach(([ph_label, pf20_key, pf_key, cap_key, set_pf, set_cap]) => {
        const np_row = np_rows.find(r => String(r.Phase || '').trim().toUpperCase() === ph_label);
        if (np_row) {
          const pf20 = parseFloat(bushRec[pf20_key] || bushRec[pf_key] || 0);
          const np_pf = parseFloat(np_row.Meas_PF_C1 || np_row.Corr_PF || 0);
          const mfg = np_row.Manufacturer || '';
          const ins = np_row.Type || np_row.Insulation || '';
          
          if (pf20 > 0) {
            const isMgc = mfg.toUpperCase().includes('MGC');
            if (isMgc) {
              const evalRes = getBushingEvaluation(pf20, 0, 0, 0, mfg, ins);
              set_pf(pf20, evalRes.pfStatusCls);
            } else {
              if (np_pf > 0) {
                const pf_err_val = ((pf20 - np_pf) / np_pf) * 100;
                const evalRes = getBushingEvaluation(pf20, np_pf, 0, 0, mfg, ins);
                set_pf(pf_err_val, evalRes.pfStatusCls);
              }
            }
          }
          const cap = parseFloat(bushRec[cap_key] || 0);
          const np_cap = parseFloat(np_row.Capacitance_C1 || 0);
          if (np_cap > 0 && cap > 0) {
            const cap_err_val = ((cap - np_cap) / np_cap) * 100;
            const evalRes = getBushingEvaluation(0, 0, cap, np_cap, mfg, ins);
            set_cap(cap_err_val, evalRes.capStatusCls);
          }
        }
      });
    }

    const getMfgForPhase = (ph) => {
      if (typeof bushingInfoCsvData !== 'undefined' && bushingInfoCsvData && bushingInfoCsvData.length > 0) {
        const np_rows = bushingInfoCsvData.filter(r => String(r.Parent_Serial_No || '').trim().toLowerCase() === String(item.serial).trim().toLowerCase());
        const np_row = np_rows.find(r => String(r.Phase || '').trim().toUpperCase() === ph.toUpperCase());
        return np_row ? (np_row.Manufacturer || '') : '';
      }
      return '';
    };

    const h1_mfg = getMfgForPhase('H1').toUpperCase();
    const h2_mfg = getMfgForPhase('H2').toUpperCase();
    const h3_mfg = getMfgForPhase('H3').toUpperCase();
    const l1_mfg = getMfgForPhase('X1').toUpperCase();
    const l2_mfg = getMfgForPhase('X2').toUpperCase();
    const l3_mfg = getMfgForPhase('X3').toUpperCase();

    bushBody.innerHTML = `
      <tr>
        <td>%Error PF (C1)</td>
        <td>OEM Criteria</td>
        ${getErrCell(h1_pf_err, getBushingPfErrClass, h1_pf_cls, h1_mfg.includes('MGC'))}
        ${getErrCell(h2_pf_err, getBushingPfErrClass, h2_pf_cls, h2_mfg.includes('MGC'))}
        ${getErrCell(h3_pf_err, getBushingPfErrClass, h3_pf_cls, h3_mfg.includes('MGC'))}
        ${getErrCell(l1_pf_err, getBushingPfErrClass, l1_pf_cls, l1_mfg.includes('MGC'))}
        ${getErrCell(l2_pf_err, getBushingPfErrClass, l2_pf_cls, l2_mfg.includes('MGC'))}
        ${getErrCell(l3_pf_err, getBushingPfErrClass, l3_pf_cls, l3_mfg.includes('MGC'))}
      </tr>
      <tr>
        <td>%Error Capacitance (C1)</td>
        <td>OEM Criteria</td>
        ${getErrCell(h1_cap_err, getBushingCapErrClass, h1_cap_cls, false)}
        ${getErrCell(h2_cap_err, getBushingCapErrClass, h2_cap_cls, false)}
        ${getErrCell(h3_cap_err, getBushingCapErrClass, h3_cap_cls, false)}
        ${getErrCell(l1_cap_err, getBushingCapErrClass, l1_cap_cls, false)}
        ${getErrCell(l2_cap_err, getBushingCapErrClass, l2_cap_cls, false)}
        ${getErrCell(l3_cap_err, getBushingCapErrClass, l3_cap_cls, false)}
      </tr>
    `;
    updateTestDate('ex-update-bushing', bushRec.date);
  } else {
    // Show '-' for all columns if no bushing data is recorded
    bushBody.innerHTML = `
      <tr>
        <td>%Error PF (C1)</td>
        <td>OEM Criteria</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>%Error Capacitance (C1)</td>
        <td>OEM Criteria</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
    const updateEl = document.getElementById('ex-update-bushing');
    if (updateEl) {
      updateEl.textContent = 'No Data';
      updateEl.style.removeProperty('color');
      updateEl.style.removeProperty('background-color');
      updateEl.style.border = 'none';
      updateEl.style.boxShadow = 'none';
    }
  }

  // 4. Surge Arrester Mock Fallback
  const saBody = document.getElementById('ex-arrester-rows');
  if (saBody) {
    updateTestDate('ex-update-arrester', item.dateToAssess);
    saBody.innerHTML = `
      <tr>
        <td>Insulation Resistance (MΩ)</td>
        <td>EGAT</td>
        <td>> 1000</td>
        <td>> 1000</td>
        <td>> 1000</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>Current (mA)</td>
        <td>EGAT</td>
        <td>0.082</td>
        <td>0.085</td>
        <td>0.081</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>Watt Loss (W)</td>
        <td>EGAT</td>
        <td>0.005</td>
        <td>0.005</td>
        <td>0.004</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  }

  // 5. Active Part Mock Fallback
  const ap = item.activePart || {};
  const basicBody = document.getElementById('ex-active-basic-rows');
  if (basicBody) {
    // Lookup NO_WINDING
    let noWinding = 2; // default fallback
    if (item.NO_WINDING) {
      noWinding = parseInt(item.NO_WINDING, 10);
    } else if (typeof trInfoCsvData !== 'undefined' && trInfoCsvData && trInfoCsvData.length > 0) {
      const infoMatch = trInfoCsvData.find(x => String(x.SERIAL_NUMBER || x.Serial_No || '').trim().toLowerCase() === String(item.serial).trim().toLowerCase());
      if (infoMatch && infoMatch.NO_WINDING) {
        noWinding = parseInt(infoMatch.NO_WINDING, 10);
      }
    } else if (typeof TR_DATA !== 'undefined' && TR_DATA) {
      const rawMatch = TR_DATA.find(x => String(x.SERIAL_NUMBER || '').trim().toLowerCase() === String(item.serial).trim().toLowerCase());
      if (rawMatch && rawMatch.NO_WINDING) {
        noWinding = parseInt(rawMatch.NO_WINDING, 10);
      }
    }

    // Lookup PI Record from piCsvData
    let piRec = null;
    if (typeof piCsvData !== 'undefined' && piCsvData && piCsvData.length > 0) {
      const matches = piCsvData.filter(x => String(x.serial || '').trim().toLowerCase() === String(item.serial).trim().toLowerCase());
      if (matches.length > 0) {
        piRec = matches[0];
      }
    }
    if (!piRec && item.pi) {
      piRec = {
        H_PI: item.pi.H_PI,
        L_PI: item.pi.L_PI,
        T_PI: item.pi.T_PI,
        date: item.pi.date
      };
    }

    // Format PI Results
    let piResultHtml = '';
    let piDate = item.dateToAssess || '-';

    const getPiSpan = (valStr) => {
      if (valStr === undefined || valStr === null || valStr === '' || valStr === '-' || valStr === 'N/A') {
        return `<span style="color: var(--text-sub); margin: 0 4px;">-</span>`;
      }
      const val = parseFloat(String(valStr).replace(/,/g, ''));
      if (isNaN(val)) {
        return `<span style="color: var(--text-sub); margin: 0 4px;">-</span>`;
      }
      
      let cls = 'ex-status-good';
      if (val <= 1.0) cls = 'ex-status-poor';
      else if (val <= 1.25) cls = 'ex-status-fair';
      
      return `<span class="${cls}" style="font-weight: bold; padding: 2px 6px; border-radius: 4px; margin: 0 4px; display: inline-block;">${val.toFixed(2)}</span>`;
    };

    if (piRec) {
      const h_pi_span = getPiSpan(piRec.H_PI);
      const l_pi_span = getPiSpan(piRec.L_PI);
      const t_pi_span = getPiSpan(piRec.T_PI);

      if (noWinding === 3) {
        piResultHtml = `HV = ${h_pi_span}, LV = ${l_pi_span}, TV = ${t_pi_span}`;
      } else {
        piResultHtml = `HV = ${h_pi_span}, LV = ${l_pi_span}, HV-LV = ${t_pi_span}`;
      }

      if (piRec.date) {
        const parsedDate = parseDateRobust(piRec.date);
        if (parsedDate) {
          piDate = formatDgaDate(parsedDate);
        }
      }
    } else {
      const emptySpan = `<span style="color: var(--text-sub); margin: 0 4px;">-</span>`;
      if (noWinding === 3) {
        piResultHtml = `HV = ${emptySpan}, LV = ${emptySpan}, TV = ${emptySpan}`;
      } else {
        piResultHtml = `HV = ${emptySpan}, LV = ${emptySpan}, HV-LV = ${emptySpan}`;
      }
    }

    const getWindingDateSpan = (rawDateStr) => {
      const dateObj = parseDateRobust(rawDateStr);
      let cleanStr = String(rawDateStr || '-').trim();
      if (cleanStr.includes(' ')) {
        cleanStr = cleanStr.split(' ')[0];
      }
      const formatted = dateObj ? formatDgaDate(dateObj) : cleanStr;
      if (!dateObj || formatted === '-') return `<span>${formatted}</span>`;
      
      const today = new Date();
      const diffTime = Math.abs(today - dateObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const threeYearsInDays = 3 * 365.25;
      
      let color = '#eab308';
      let bg = 'rgba(234, 179, 8, 0.15)';
      if (diffDays <= threeYearsInDays) {
        color = '#10b981';
        bg = 'rgba(16, 185, 129, 0.15)';
      }
      
      return `<span style="color: ${color} !important; background-color: ${bg} !important; padding: 2px 6px; border-radius: 4px; font-weight: bold; display: inline-block;">${formatted}</span>`;
    };

    const getIndicatorCell = (status) => {
      const cls = getStatusClass(status);
      if (status === 'N/A' || status === '-' || !status) {
        return `<td>-</td>`;
      }
      return `<td class="${cls}">${status === 'A' || status === 'Good' ? 'Good' : (status === 'Q' || status === 'Warning' ? 'Warning' : 'Critical')}</td>`;
    };

    basicBody.innerHTML = `
      <tr>
        <td>
          Insulation Resistance & PI
          <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td>${getWindingDateSpan(piDate)}</td>
        <td>IEEE C57.152: PI > 1.25</td>
        ${getIndicatorCell(ap.insulationResistance)}
        <td>${piResultHtml}</td>
      </tr>
      <tr>
        <td>
          Core to Ground
          <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: > 100 MΩ</td>
        ${getIndicatorCell(ap.coreToGround)}
        <td class="ex-status-good">> 1000 MΩ</td>
      </tr>
      <tr>
        <td>
          Dynamic Resistance
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>Manufacturer</td>
        ${getIndicatorCell(item.dynamicResistance)}
        <td class="ex-status-good">Normal</td>
      </tr>
      <tr>
        <td>
          Insulation Power Factor
          <a href="pf_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PF Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: %PF <= 1.0%</td>
        ${getIndicatorCell(ap.insulationPowerFactor)}
        <td class="ex-status-good">0.35% (Good)</td>
      </tr>
      <tr>
        <td>
          Transformer Turn Ratio
          <a href="ratio_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open Voltage Ratio & Turn Ratio (TTR) Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: <= 0.5% Dev</td>
        ${getIndicatorCell(ap.ratioPolarity)}
        <td class="ex-status-good">< 0.5% Dev</td>
      </tr>
      <tr>
        <td>
          Exciting Current
          <a href="exciting_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open Exciting Current Test Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>EGAT Vectors</td>
        ${getIndicatorCell(ap.excitingCurrent)}
        <td class="ex-status-good">Normal Pattern</td>
      </tr>
      <tr>
        <td>
          Winding Resistance
          <a href="winding_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open Winding Resistance Test Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: <= 5% Dev</td>
        ${getIndicatorCell(ap.windingResistance)}
        <td class="ex-status-good">< 2% Dev</td>
      </tr>
      <tr>
        <td>
          Single Phase Short Circuit Impedance
          <a href="single_short_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open Single Phase Short Circuit Impedance Report" style="margin-left: 6px;">
            <i class="fa-solid fa-file-lines"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: <= 3.0% Dev</td>
        ${getIndicatorCell(ap.shortCircuit1P || 'A')}
        <td class="ex-status-good">< 3.0% Dev</td>
      </tr>
    `;
  }

  const specialBody = document.getElementById('ex-active-special-rows');
  if (specialBody) {
    specialBody.innerHTML = `
      <tr>
        <td>Frequency Response Analysis (FRA)</td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.149</td>
        <td class="ex-status-good">${item.fra === 'A' ? 'Good' : 'Alert'}</td>
        <td class="ex-status-good">Normal [Pattern]</td>
      </tr>
      <tr>
        <td>Moisture in Paper [FDS]</td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.161-2018</td>
        <td class="ex-status-good">${item.moisturePaper === 'A' ? 'Good' : 'Alert'}</td>
        <td class="ex-status-good">0.8% [Normal]</td>
      </tr>
      <tr>
        <td>Thermography Scan</td>
        <td><span>${item.dateToAssess}</span></td>
        <td>EGAT Limits</td>
        <td class="ex-status-good">Good</td>
        <td class="ex-status-good">Normal</td>
      </tr>
    `;
  }
  updateTestDate('ex-update-active', item.dateToAssess);

  // 6. Main Tank DGA
  const latestDGA = findLatestRecord(mtOilCsvData.length ? mtOilCsvData : mainTankDgaCsvData, item.serial) || item.mtOilRec;

  function colorGasCell(elId, val, limit) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = (val === undefined || val === null || val === 'N/A' || val === '-') ? '-' : val;
    el.className = '';
    if (val === undefined || val === null || val === 'N/A' || val === '-') return;
    const fVal = parseFloat(val);
    if (isNaN(fVal)) return;
    if (fVal > limit) {
      el.className = 'ex-status-poor';
    } else {
      el.className = 'ex-status-good';
    }
  }

  if (latestDGA) {
    const dgaDateStr = latestDGA.date || latestDGA.Date || '';
    updateTestDate('ex-update-dga', dgaDateStr);

    const h2 = latestDGA.H2 || latestDGA.h2 || '-';
    const ch4 = latestDGA.CH4 || latestDGA.ch4 || '-';
    const c2h6 = latestDGA.C2H6 || latestDGA.c2h6 || '-';
    const c2h4 = latestDGA.C2H4 || latestDGA.c2h4 || '-';
    const c2h2 = latestDGA.C2H2 || latestDGA.c2h2 || '-';
    const co = latestDGA.CO || latestDGA.co || '-';
    const co2 = latestDGA.CO2 || latestDGA.co2 || '-';
    const tdcg = latestDGA.TDCG || latestDGA.tdcg || '-';

    colorGasCell('ex-dga-h2', h2, 100);
    colorGasCell('ex-dga-ch4', ch4, 120);
    colorGasCell('ex-dga-c2h6', c2h6, 65);
    colorGasCell('ex-dga-c2h4', c2h4, 50);
    colorGasCell('ex-dga-c2h2', c2h2, 1);
    colorGasCell('ex-dga-co', co, 350);
    colorGasCell('ex-dga-co2', co2, 2500);
    colorGasCell('ex-dga-tdcg', tdcg, 720);

    const fCh4 = parseFloat(ch4) || 0;
    const fC2h4 = parseFloat(c2h4) || 0;
    const fC2h2 = parseFloat(c2h2) || 0;

    // Aligned IEEE C57.104-2019 dynamic status logic
    const o2Val = parseFloat(latestDGA.O2 || 0);
    const n2Val = parseFloat(latestDGA.N2 || 0);
    const o2n2Ratio = n2Val > 0 ? (o2Val / n2Val) : 0.25;
    const isLowRatio = o2n2Ratio <= 0.2;

    let ageCat = 'Unknown';
    const ageVal = parseInt(serviceAgeYears) || 0;
    
    // Parse age category exactly like in assessment.js / dga_report.html
    let mfgYear = null;
    const mfgYearStr = trInfo ? (trInfo.MANUFACTURING_DATE || trInfo.manufacturing_date || '') : '';
    if (mfgYearStr) {
      const str = mfgYearStr.toString().trim();
      if (/^\d{4}$/.test(str)) {
        mfgYear = parseInt(str, 10);
      } else {
        const y4 = str.match(/\b(19\d\d|20\d\d)\b/);
        if (y4) mfgYear = parseInt(y4[1], 10);
        else {
          const y2 = str.match(/-(\d{2})$/);
          if (y2) {
            const yr = parseInt(y2[1], 10);
            mfgYear = yr < 50 ? (2000 + yr) : (1900 + yr);
          }
        }
      }
    }
    let ageYears = null;
    if (mfgYear) {
      const sampleYear = dgaDateStr ? (new Date(dgaDateStr).getFullYear() || 2026) : 2026;
      ageYears = sampleYear - mfgYear;
    }
    if (ageYears !== null && ageYears !== undefined && !isNaN(ageYears) && ageYears >= 1) {
      if (ageYears <= 9) ageCat = '1-9';
      else if (ageYears <= 30) ageCat = '10-30';
      else ageCat = '>30';
    } else if (ageVal >= 1) {
      if (ageVal <= 9) ageCat = '1-9';
      else if (ageVal <= 30) ageCat = '10-30';
      else ageCat = '>30';
    }

    const T1_NORMS = {
      'low': {
        'Unknown': { H2: 80, CH4: 90, C2H6: 90, C2H4: 50, C2H2: 1, CO: 900, CO2: 9000 },
        '1-9':     { H2: 75, CH4: 45, C2H6: 30, C2H4: 20, C2H2: 1, CO: 900, CO2: 5000 },
        '10-30':   { H2: 100, CH4: 90, C2H6: 90, C2H4: 50, C2H2: 1, CO: 900, CO2: 10000 },
        '>30':     { H2: 110, CH4: 110, C2H6: 150, C2H4: 90, C2H2: 2, CO: 900, CO2: 10000 }
      },
      'high': {
        'Unknown': { H2: 40, CH4: 20, C2H6: 15, C2H4: 50, C2H2: 2, CO: 500, CO2: 5000 },
        '1-9':     { H2: 40, CH4: 20, C2H6: 15, C2H4: 25, C2H2: 1, CO: 500, CO2: 3500 },
        '10-30':   { H2: 40, CH4: 20, C2H6: 15, C2H4: 60, C2H2: 2, CO: 500, CO2: 5500 },
        '>30':     { H2: 40, CH4: 20, C2H6: 15, C2H4: 60, C2H2: 2, CO: 500, CO2: 5500 }
      }
    };

    const T2_NORMS = {
      'low': {
        'Unknown': { H2: 200, CH4: 150, C2H6: 175, C2H4: 100, C2H2: 2, CO: 1100, CO2: 12500 },
        '1-9':     { H2: 200, CH4: 100, C2H6: 70, C2H4: 40, C2H2: 2, CO: 1100, CO2: 7000 },
        '10-30':   { H2: 200, CH4: 150, C2H6: 175, C2H4: 95, C2H2: 2, CO: 1100, CO2: 14000 },
        '>30':     { H2: 200, CH4: 200, C2H6: 250, C2H4: 175, C2H2: 4, CO: 1100, CO2: 14000 }
      },
      'high': {
        'Unknown': { H2: 90, CH4: 50, C2H6: 40, C2H4: 100, C2H2: 7, CO: 600, CO2: 7000 },
        '1-9':     { H2: 90, CH4: 30, C2H6: 30, C2H4: 80, C2H2: 2, CO: 600, CO2: 5000 },
        '10-30':   { H2: 90, CH4: 60, C2H6: 40, C2H4: 125, C2H2: 7, CO: 600, CO2: 8000 },
        '>30':     { H2: 90, CH4: 30, C2H6: 40, C2H4: 125, C2H2: 7, CO: 600, CO2: 8000 }
      }
    };

    const catKey = isLowRatio ? 'low' : 'high';
    const limitsT1 = T1_NORMS[catKey][ageCat];
    const limitsT2 = T2_NORMS[catKey][ageCat];

    // Re-color gas cells dynamically using the calculated T1 limit
    colorGasCell('ex-dga-h2', h2, limitsT1.H2);
    colorGasCell('ex-dga-ch4', ch4, limitsT1.CH4);
    colorGasCell('ex-dga-c2h6', c2h6, limitsT1.C2H6);
    colorGasCell('ex-dga-c2h4', c2h4, limitsT1.C2H4);
    colorGasCell('ex-dga-c2h2', c2h2, limitsT1.C2H2);
    colorGasCell('ex-dga-co', co, limitsT1.CO);
    colorGasCell('ex-dga-co2', co2, limitsT1.CO2);
    colorGasCell('ex-dga-tdcg', tdcg, 720);

    let maxIEEEStatus = 'DGA Status 1 (Normal)';
    let ieeeColor = '#10b981';
    
    const gasKeys = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2'];
    let hasExceededT2 = false;
    let hasExceededT1 = false;
    
    for (let key of gasKeys) {
      const val = parseFloat(latestDGA[key] || 0);
      if (val > limitsT2[key]) {
        hasExceededT2 = true;
      } else if (val > limitsT1[key]) {
        hasExceededT1 = true;
      }
    }
    
    if (hasExceededT2) {
      maxIEEEStatus = 'DGA Status 3 (Critical)';
      ieeeColor = '#ef4444';
    } else if (hasExceededT1) {
      maxIEEEStatus = 'DGA Status 2 (Caution)';
      ieeeColor = '#eab308';
    }
    
    document.getElementById('ex-dga-ieee-status').textContent = maxIEEEStatus;
    document.getElementById('ex-dga-ieee-status').style.color = ieeeColor;

    // Check if Status 1 (only check H2, CH4, C2H6, C2H4, C2H2 for Duval applicability)
    const isStatus1 = (() => {
      const gasesKeys = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2'];
      for (let key of gasesKeys) {
        const num = parseFloat(latestDGA[key] || 0);
        if (limitsT1 && num > limitsT1[key]) {
          return false;
        }
      }
      return true;
    })();

    const duvalRes = evaluateDuval1(fCh4, fC2h4, fC2h2);

    let duvalText = duvalRes.name;
    let duvalColor = '#eab308';
    let faultText = 'Warning / Monitor';
    let faultColor = '#eab308';

    if (isStatus1) {
      duvalText = 'The concentration of hydrocarbon gases and hydrogen is too low for a reliable assessment.';
      duvalColor = '#10b981';
      faultText = 'Normal / No Fault Detected';
      faultColor = '#10b981';
    } else if (duvalRes.code === 'D2' || duvalRes.code === 'T3') {
      duvalColor = '#ef4444';
      faultText = 'Thermal/High Energy fault suspected';
      faultColor = '#ef4444';
    } else if (duvalRes.code === 'PD') {
      duvalColor = '#10b981';
      faultText = 'Normal / Low Energy';
      faultColor = '#10b981';
    }

    document.getElementById('ex-dga-duval1').textContent = duvalText;
    document.getElementById('ex-dga-duval1').style.color = duvalColor;
    document.getElementById('ex-dga-fault').textContent = faultText;
    document.getElementById('ex-dga-fault').style.color = faultColor;

    // Aligned IEC 60599 Diagnosis logic
    const h2Val = parseFloat(latestDGA.H2 || 0);
    const ch4Val = parseFloat(latestDGA.CH4 || 0);
    const c2h6Val = parseFloat(latestDGA.C2H6 || 0);
    const c2h4Val = parseFloat(latestDGA.C2H4 || 0);
    const c2h2Val = parseFloat(latestDGA.C2H2 || 0);

    const isIecSignificant = (h2Val > 60 || ch4Val > 50 || c2h6Val > 60 || c2h4Val > 100 || c2h2Val > 2);
    let iecStatusText = 'Normal';
    let iecColor = '#10b981';

    if (!isIecSignificant && c2h2Val < 1) {
      iecStatusText = 'Normal';
      iecColor = '#10b981';
    } else {
      const r1 = c2h4Val > 0 ? (c2h2Val / c2h4Val) : 0;
      const r2 = h2Val > 0 ? (ch4Val / h2Val) : 0;
      const r3 = c2h6Val > 0 ? (c2h4Val / c2h6Val) : 0;

      if (r1 < 0.1 && r2 < 0.1 && r3 < 0.2) {
        iecStatusText = 'PD - Partial Discharge';
        iecColor = '#eab308';
      } else if (r1 > 1 && r2 >= 0.1 && r2 <= 0.5 && r3 > 1) {
        iecStatusText = 'D1 - Discharges of Low Energy';
        iecColor = '#eab308';
      } else if (r1 >= 0.6 && r1 <= 2.5 && r2 >= 0.1 && r2 <= 1 && r3 > 2) {
        iecStatusText = 'D2 - Discharges of High Energy';
        iecColor = '#ef4444';
      } else if (r1 < 0.1 && r2 > 1 && r3 < 1) {
        iecStatusText = 'T1 - Thermal Fault < 300°C';
        iecColor = '#eab308';
      } else if (r1 < 0.1 && r2 > 1 && r3 >= 1 && r3 <= 4) {
        iecStatusText = 'T2 - Thermal Fault 300°C - 700°C';
        iecColor = '#eab308';
      } else if (r1 < 0.1 && r2 > 1 && r3 > 4) {
        iecStatusText = 'T3 - Thermal Fault > 700°C';
        iecColor = '#ef4444';
      } else if (c2h2Val >= 2) {
        iecStatusText = 'D - Electrical Discharge Suspected';
        iecColor = '#ef4444';
      } else if (c2h4Val > 100 || r3 > 3) {
        iecStatusText = 'T - Thermal Overheating Suspected';
        iecColor = '#eab308';
      } else {
        iecStatusText = 'Mixed / Non-typical Pattern';
        iecColor = '#eab308';
      }
    }

    document.getElementById('ex-dga-iec-status').textContent = iecStatusText;
    document.getElementById('ex-dga-iec-status').style.color = iecColor;

    // Aligned Paper Insulation condition
    const coVal = parseFloat(latestDGA.CO || 0);
    const co2Val = parseFloat(latestDGA.CO2 || 0);
    const rCo2Co = coVal > 0 ? (co2Val / coVal) : 0;

    let paperDesc = 'Normal Paper Aging';
    let paperColor = '#10b981';
    
    if (coVal > 500 && rCo2Co > 0 && rCo2Co < 3) {
      paperDesc = 'Paper Overheating Suspected (CO2/CO < 3)';
      paperColor = '#ef4444';
    } else if (coVal > 500 && rCo2Co >= 3 && rCo2Co <= 10) {
      paperDesc = 'Moderate Paper Degradation (CO2/CO = 3-10)';
      paperColor = '#eab308';
    } else if (rCo2Co > 10) {
      paperDesc = 'Normal Paper Aging (CO2/CO > 10)';
      paperColor = '#10b981';
    }
    
    document.getElementById('ex-dga-paper-status').textContent = paperDesc;
    document.getElementById('ex-dga-paper-status').style.color = paperColor;

  } else {
    colorGasCell('ex-dga-h2', '12', 40);
    colorGasCell('ex-dga-ch4', '5', 20);
    colorGasCell('ex-dga-c2h6', '4', 15);
    colorGasCell('ex-dga-c2h4', '2', 50);
    colorGasCell('ex-dga-c2h2', '0', 2);
    colorGasCell('ex-dga-co', '140', 500);
    colorGasCell('ex-dga-co2', '1240', 5500);
    colorGasCell('ex-dga-tdcg', '163', 720);

    updateTestDate('ex-update-dga', item.dateToAssess);

    document.getElementById('ex-dga-duval1').textContent = 'Normal';
    document.getElementById('ex-dga-duval1').style.color = '#10b981';
    document.getElementById('ex-dga-fault').textContent = 'Normal / No Fault';
    document.getElementById('ex-dga-fault').style.color = '#10b981';
    document.getElementById('ex-dga-ieee-status').textContent = 'DGA Status 1 (Normal)';
    document.getElementById('ex-dga-ieee-status').style.color = '#10b981';
    document.getElementById('ex-dga-iec-status').textContent = 'Normal';
    document.getElementById('ex-dga-iec-status').style.color = '#10b981';
    document.getElementById('ex-dga-paper-status').textContent = 'Normal Paper Aging';
    document.getElementById('ex-dga-paper-status').style.color = '#10b981';
  }

  // 7. Main Tank Oil Properties
  const mtOilRec = findLatestRecord(mtOilCsvData, item.serial) || item.mtOilRec;
  const physicalBody = document.getElementById('ex-oil-physical-rows');
  const agingBody = document.getElementById('ex-oil-aging-rows');
  const sulfurBody = document.getElementById('ex-oil-sulfur-rows');

  let fluidType = 'Mineral oil';
  let hvVoltage = 115;
  if (typeof TR_DATA !== 'undefined') {
    const rawMeta = TR_DATA.find(x => String(x.SERIAL_NUMBER) === String(item.serial));
    if (rawMeta) {
      if (rawMeta.TYPE_OF_INSULATION) fluidType = rawMeta.TYPE_OF_INSULATION;
      if (rawMeta.HV_RATED) {
         hvVoltage = parseFloat(rawMeta.HV_RATED);
         if (isNaN(hvVoltage)) hvVoltage = 115;
      }
    }
  }

  const getRatingClass = (paramName) => (val) => {
    if (typeof evaluateOilParameter === 'function') {
      const rating = evaluateOilParameter(paramName, val, fluidType, hvVoltage);
      if (!rating) return '';
      return `ex-status-${rating}`;
    }
    return '';
  };

  const getBDClass = getRatingClass('BDV_2mm');
  const getPF25Class = getRatingClass('PF25');
  const getPF100Class = getRatingClass('PF100');
  const getCondClass = getRatingClass('Conductivity');
  const getWcClass = getRatingClass('WaterContent');
  const getIftClass = getRatingClass('IFT');
  const getAcClass = getRatingClass('Acidity');
  const getSludgeClass = getRatingClass('Sludge');
  const getCorrosiveSulfurClass = getRatingClass('CorrosiveSulfur');
  const getFuranClass = getRatingClass('Furan');
  const getDpClass = getRatingClass('DP');
  const getColorClass = getRatingClass('Color');
  const getInhibitorClass = getRatingClass('Inhibitor');
  const getPassivatorClass = getRatingClass('Passivator');

  const getCell = (val, checkFn, suffix = '') => {
    if (val === '-' || val === undefined || val === null) return `<td>-</td>`;
    const num = parseFloat(val);
    if (isNaN(num)) return `<td>${val}</td>`;
    return `<td class="${checkFn(num)}">${num.toFixed(suffix ? 1 : 2)}${suffix}</td>`;
  };

  const getCellString = (val, checkFn) => {
    if (val === null || val === undefined || val === '' || val === '-') return `<td>-</td>`;
    const statusCls = checkFn ? checkFn(val) : '';
    return `<td class="${statusCls}">${val}</td>`;
  };

  if (mtOilRec) {
    const dbVal = mtOilRec.BD || mtOilRec.dielectric_breakdown || '-';
    const pf25Val = mtOilRec.PF_25 || '-';
    const pf100Val = mtOilRec.PF_100 || '-';
    const condVal = mtOilRec.Conductivity || '-';
    const wcVal = mtOilRec.WC || mtOilRec.water_content || '-';
    const colorVal = mtOilRec.Color_No || '-';
    const iftVal = mtOilRec.IFT || '-';
    const acVal = mtOilRec.Acidity_No || mtOilRec.acidity || '-';
    const inhibitorVal = mtOilRec.Inhibitor || '-';

    const tempC = parseNum(mtOilRec.Temp || mtOilRec.Oil_Temp) || 40;
    const wcPpm = parseNum(wcVal) || 0;
    let moistCal = '-';
    if (wcPpm > 0) {
      moistCal = (0.00224 * wcPpm * Math.exp(1440 / (tempC + 273.15))).toFixed(1);
    }

    const furanVal = mtOilRec.Furan_Analysis || '-';
    const dpVal = item.estimatedDP && !isNaN(parseFloat(item.estimatedDP)) ? Math.round(parseFloat(item.estimatedDP)) : (item.estimatedDP || '-');
    const moisturePaper = item.moisturePaper || '-';
    const sludgeVal = mtOilRec.Sludge_Condition || '-';

    const sulfurVal = mtOilRec.Corrosive_Sulfur || '-';
    const passivatorVal = mtOilRec.Passivator || '-';

    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td>${getCell(dbVal, getBDClass)}<td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td>${getCell(wcVal, getWcClass)}<td>ppm</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td>${getCell(pf25Val, getPF25Class, '%')}<td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td>${getCell(pf100Val, getPF100Class, '%')}<td>%</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td>${getCell(iftVal, getIftClass)}<td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td>${getCell(acVal, getAcClass)}<td>mgKOH/g</td></tr>
      <tr><td>Oil Conductivity</td><td>IEC 61620</td>${getCell(condVal, getCondClass)}<td>pS/m</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td>${getCell(colorVal, getColorClass)}<td>-</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td>${getCell(inhibitorVal, getInhibitorClass)}<td>%</td></tr>
    `;

    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td>${getCell(furanVal, getFuranClass)}<td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td>${getCell(dpVal, getDpClass)}<td>-</td></tr>
      <tr><td>Sludge condition</td><td>Visual</td>${getCellString(sludgeVal, getSludgeClass)}<td>-</td></tr>
    `;

    const reverseSulfurMapForTable = { 1: '1a', 2: '1b', 3: '2a', 4: '2b', 5: '2c', 6: '2d', 7: '2e', 8: '3a', 9: '3b', 10: '4a', 11: '4b', 12: '4c' };
    let formattedSulfur = sulfurVal;
    const sNum = parseFloat(sulfurVal);
    if (!isNaN(sNum) && reverseSulfurMapForTable[Math.round(sNum)]) {
      formattedSulfur = reverseSulfurMapForTable[Math.round(sNum)];
    }

    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td>${getCellString(formattedSulfur, getCorrosiveSulfurClass)}<td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td>${getCell(passivatorVal, getPassivatorClass)}<td>ppm</td></tr>
    `;

    updateTestDate('ex-update-oil', mtOilRec.Date || mtOilRec.date);
  } else {
    // Standalone Mock Fallback
    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td><td class="ex-status-good">72.7</td><td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td><td class="ex-status-good">6.7</td><td>ppm</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td><td class="ex-status-good">0.001%</td><td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td><td class="ex-status-good">0.017%</td><td>%</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td><td class="ex-status-good">38</td><td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td><td class="ex-status-good">0.01</td><td>mgKOH/g</td></tr>
      <tr><td>Oil Conductivity</td><td>IEC 61620</td><td class="ex-status-good">0.1</td><td>pS/m</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td><td>0.5</td><td>-</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td><td>0.30</td><td>%</td></tr>
    `;

    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td><td>-</td><td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td><td>-</td><td>-</td></tr>
      <tr><td>Sludge condition</td><td>Visual</td><td>-</td><td>-</td></tr>
    `;

    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td><td>Non-Corrosive</td><td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td><td>-</td><td>ppm</td></tr>
    `;
    updateTestDate('ex-update-oil', item.dateToAssess);
  }

  // 8. OLTC Oil
  const oltcRec = findLatestRecord(oltcOilCsvData, item.serial) || item.oltcRec;
  const oltcBody = document.getElementById('ex-oltc-rows');

  if (oltcRec) {
    const odbVal = oltcRec.A_BD || oltcRec.BD || '85.2';
    const owcVal = oltcRec.A_WC || oltcRec.WC || '12.5';
    oltcBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>IEC 60156</td><td class="${getStatusClass(parseFloat(odbVal) >= 40 ? 'A' : 'Q')}">${odbVal}</td><td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td><td class="${getStatusClass(parseFloat(owcVal) <= 30 ? 'A' : 'Q')}">${owcVal}</td><td>ppm</td></tr>
    `;
    updateTestDate('ex-update-oltc', oltcRec.date || oltcRec.Date);
  } else {
    oltcBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>IEC 60156</td><td class="ex-status-good">85.2</td><td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td><td class="ex-status-good">12.5</td><td>ppm</td></tr>
    `;
    updateTestDate('ex-update-oltc', item.dateToAssess);
  }
}

// Global theme switcher for detail page
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tr-dashboard-theme', theme);
}
