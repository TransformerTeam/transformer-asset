// Standalone Detail Page Logic for GPSC Transformer Asset Management
// Completely cut off and independent of assessment.js

let assessmentData = [];
let trInfoCsvData = [];
let bushingPfCsvData = [];
let bushingInfoCsvData = [];
let mtOilCsvData = [];
let mainTankDgaCsvData = [];
let oltcOilCsvData = [];

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

// Find matching record by serial
function findLatestRecord(csvArray, targetSerial) {
  if (!csvArray || !csvArray.length || !targetSerial) return null;
  const matches = csvArray.filter(d => {
    const s = d.serial || d.Serial_No || d.Serial_no || d.Serial || d.SERIAL_NUMBER || d['Serial No.'] || '';
    if (!s) return false;
    const s1 = String(s).trim().toLowerCase();
    const s2 = String(targetSerial).trim().toLowerCase();
    if (s1 === s2) return true;
    const n1 = s1.replace(/\D/g, '');
    const n2 = s2.replace(/\D/g, '');
    if (n1 && n2 && n1 === n2) return true;
    return s1.includes(s2) || s2.includes(s1);
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const da = new Date(a.date || a.Date || '');
    const db = new Date(b.date || b.Date || '');
    return db - da;
  });

  return matches[0];
}

// Format DGA Date
function formatDgaDate(dateStr) {
  if (!dateStr) return '-';
  let d;
  if (dateStr instanceof Date) {
    d = dateStr;
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) {
    // If it's not a valid date, clean up time part if any and return it
    let clean = String(dateStr).trim();
    if (clean.includes(' ')) {
      clean = clean.split(' ')[0];
    }
    return clean;
  }
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
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
  if ((!assessmentData || !assessmentData.length) && typeof HEALTH_INDEX_DATA !== 'undefined') {
    assessmentData = HEALTH_INDEX_DATA;
  }

  let item = null;
  if (assessmentData && assessmentData.length > 0) {
    if (typeof no === 'number') {
      item = assessmentData.find(i => i.no === no);
    }
    if (!item && no !== undefined && no !== null) {
      const target = String(no).trim();
      item = assessmentData.find(i => i.no === Number(target) || String(i.serial) === target || String(i.serial).includes(target) || target.includes(String(i.serial)));
    }
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

  // Recommendation Text
  const recEl = document.getElementById('ex-recommendation-text');
  if (recEl) {
    const recText = (item.recommendation && item.recommendation.trim()) ? item.recommendation.trim() : 'No specific recommendation recorded.';
    const recCardParent = recEl.closest('.excel-card');
    const recCardHeader = recCardParent ? recCardParent.querySelector('.excel-card-header') : null;

    const isRoutine = /^routine/i.test(recText);
    if (!isRoutine) {
      if (recCardParent) {
        recCardParent.style.border = '2px solid #f97316';
        recCardParent.style.borderRadius = '6px';
        recCardParent.style.boxShadow = '0 0 10px rgba(249, 115, 22, 0.4)';
      }
      if (recCardHeader) {
        recCardHeader.style.setProperty('background', 'linear-gradient(135deg, #ea580c, #c2410c)', 'important');
        recCardHeader.style.setProperty('color', '#ffffff', 'important');
      }
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      recEl.style.setProperty('background', isDark ? 'rgba(249, 115, 22, 0.22)' : '#fff7ed', 'important');
      recEl.style.setProperty('color', isDark ? '#ffedd5' : '#0f172a', 'important');
      recEl.style.setProperty('font-weight', isDark ? '600' : '400', 'important');
    } else {
      if (recCardParent) {
        recCardParent.style.border = '';
        recCardParent.style.boxShadow = '';
      }
      if (recCardHeader) {
        recCardHeader.style.background = '';
        recCardHeader.style.color = '';
      }
      recEl.style.background = '';
      recEl.style.color = '';
      recEl.style.fontWeight = '';
    }

    const rawItems = recText.split(/,\s*/).map(s => s.trim()).filter(s => s.length > 0);
    if (rawItems.length > 1) {
      recEl.innerHTML = '<ul style="margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 4px; list-style-type: disc; font-size: 0.68rem; line-height: 1.35;">' +
        rawItems.map(it => `<li style="margin-bottom: 2px;">${it}</li>`).join('') +
        '</ul>';
    } else {
      recEl.textContent = recText;
    }
  }

  // 2. Speedometer Gauge
  const hi = item.healthIndex;
  setElTxt('ex-est-life', item.estimatedLife || '-');
  setElTxt('ex-est-dp', item.estimatedDP || '0');

  const score = document.getElementById('ex-gauge-score');
  if (score) {
    score.textContent = (hi !== null && hi !== undefined) ? `HI ${hi}%` : 'HI --%';
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

  const formatErrVal = (val) => {
    if (val === null || val === undefined || val === '' || val === '-') return '-';
    const num = parseFloat(val);
    if (isNaN(num)) return '-';
    return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
  };

  const getErrCell = (val, checkFn) => {
    const formatted = formatErrVal(val);
    if (formatted === '-') return '<td>-</td>';
    return `<td class="${checkFn(val)}">${formatted}</td>`;
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

    if (typeof bushingInfoCsvData !== 'undefined' && bushingInfoCsvData && bushingInfoCsvData.length > 0) {
      const np_rows = bushingInfoCsvData.filter(r => String(r.Parent_Serial_No || '').trim().toLowerCase() === String(item.serial).trim().toLowerCase());
      const phases = [
        ['H1', 'bushing_h1_pf_20c', 'bushing_h1_pf_tan', 'bushing_h1_c1', (val) => { h1_pf_err = val; }, (val) => { h1_cap_err = val; }],
        ['H2', 'bushing_h2_pf_20c', 'bushing_h2_pf_tan', 'bushing_h2_c1', (val) => { h2_pf_err = val; }, (val) => { h2_cap_err = val; }],
        ['H3', 'bushing_h3_pf_20c', 'bushing_h3_pf_tan', 'bushing_h3_c1', (val) => { h3_pf_err = val; }, (val) => { h3_cap_err = val; }],
        ['X1', 'xbushing_h1_pf_20c', 'xbushing_h1_pf_tan', 'xbushing_h1_c1', (val) => { l1_pf_err = val; }, (val) => { l1_cap_err = val; }],
        ['X2', 'xbushing_h2_pf_20c', 'xbushing_h2_pf_tan', 'xbushing_h2_c1', (val) => { l2_pf_err = val; }, (val) => { l2_cap_err = val; }],
        ['X3', 'xbushing_h3_pf_20c', 'xbushing_h3_pf_tan', 'xbushing_h3_c1', (val) => { l3_pf_err = val; }, (val) => { l3_cap_err = val; }]
      ];
      phases.forEach(([ph_label, pf20_key, pf_key, cap_key, set_pf, set_cap]) => {
        const np_row = np_rows.find(r => String(r.Phase || '').trim().toUpperCase() === ph_label);
        if (np_row) {
          const pf20 = parseFloat(bushRec[pf20_key] || bushRec[pf_key] || 0);
          const np_pf = parseFloat(np_row.Meas_PF_C1 || np_row.Corr_PF || 0);
          if (np_pf > 0 && pf20 > 0) {
            set_pf(((pf20 - np_pf) / np_pf) * 100);
          }
          const cap = parseFloat(bushRec[cap_key] || 0);
          const np_cap = parseFloat(np_row.Capacitance_C1 || 0);
          if (np_cap > 0 && cap > 0) {
            set_cap(((cap - np_cap) / np_cap) * 100);
          }
        }
      });
    }

    bushBody.innerHTML = `
      <tr>
        <td>%Error PF (C1)</td>
        <td>OEM Criteria</td>
        ${getErrCell(h1_pf_err, getBushingPfErrClass)}
        ${getErrCell(h2_pf_err, getBushingPfErrClass)}
        ${getErrCell(h3_pf_err, getBushingPfErrClass)}
        ${getErrCell(l1_pf_err, getBushingPfErrClass)}
        ${getErrCell(l2_pf_err, getBushingPfErrClass)}
        ${getErrCell(l3_pf_err, getBushingPfErrClass)}
      </tr>
      <tr>
        <td>%Error Capacitance (C1)</td>
        <td>OEM Criteria</td>
        ${getErrCell(h1_cap_err, getBushingCapErrClass)}
        ${getErrCell(h2_cap_err, getBushingCapErrClass)}
        ${getErrCell(h3_cap_err, getBushingCapErrClass)}
        ${getErrCell(l1_cap_err, getBushingCapErrClass)}
        ${getErrCell(l2_cap_err, getBushingCapErrClass)}
        ${getErrCell(l3_cap_err, getBushingCapErrClass)}
      </tr>
    `;
    updateTestDate('ex-update-bushing', bushRec.date);
  } else {
    // Standalone Mock Fallback
    bushBody.innerHTML = `
      <tr>
        <td>%Error PF (C1)</td>
        <td>OEM Criteria</td>
        <td class="ex-status-good">+3.50%</td>
        <td class="ex-status-good">+5.20%</td>
        <td class="ex-status-good">+4.10%</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>%Error Capacitance (C1)</td>
        <td>OEM Criteria</td>
        <td class="ex-status-good">+1.88%</td>
        <td class="ex-status-good">+1.07%</td>
        <td class="ex-status-good">+0.63%</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
    updateTestDate('ex-update-bushing', item.dateToAssess);
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
    const getIndicatorCell = (status) => `<td class="${getStatusClass(status)}">${status === 'A' ? 'Good' : (status === 'Q' ? 'Warning' : 'Critical')}</td>`;
    basicBody.innerHTML = `
      <tr>
        <td>
          Insulation Resistance & PI
          <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
            <i class="fa-solid fa-file-invoice"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: PI > 1.25</td>
        ${getIndicatorCell(ap.insulationResistance)}
        <td class="ex-status-good">1.73 (Good)</td>
      </tr>
      <tr>
        <td>
          Core to Ground
          <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
            <i class="fa-solid fa-file-invoice"></i>
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
          <a href="pf_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PF Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
            <i class="fa-solid fa-file-invoice"></i>
          </a>
        </td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: %PF <= 1.0%</td>
        ${getIndicatorCell(ap.insulationPowerFactor)}
        <td class="ex-status-good">0.35% (Good)</td>
      </tr>
      <tr>
        <td>Transformer Turn Ratio</td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: <= 0.5% Dev</td>
        ${getIndicatorCell(ap.ratioPolarity)}
        <td class="ex-status-good">< 0.5% Dev</td>
      </tr>
      <tr>
        <td>Exciting Current</td>
        <td><span>${item.dateToAssess}</span></td>
        <td>EGAT Vectors</td>
        ${getIndicatorCell(ap.excitingCurrent)}
        <td class="ex-status-good">Normal Pattern</td>
      </tr>
      <tr>
        <td>Winding Resistance</td>
        <td><span>${item.dateToAssess}</span></td>
        <td>IEEE C57.152: <= 5% Dev</td>
        ${getIndicatorCell(ap.windingResistance)}
        <td class="ex-status-good">< 2% Dev</td>
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
    const duvalRes = evaluateDuval1(fCh4, fC2h4, fC2h2);

    document.getElementById('ex-dga-duval1').textContent = duvalRes.name;
    if (duvalRes.code === 'D2' || duvalRes.code === 'T3') {
      document.getElementById('ex-dga-duval1').style.color = '#ef4444';
      document.getElementById('ex-dga-fault').textContent = 'Thermal/High Energy fault suspected';
      document.getElementById('ex-dga-fault').style.color = '#ef4444';
    } else if (duvalRes.code === 'PD') {
      document.getElementById('ex-dga-duval1').style.color = '#10b981';
      document.getElementById('ex-dga-fault').textContent = 'Normal / Low Energy';
      document.getElementById('ex-dga-fault').style.color = '#10b981';
    } else {
      document.getElementById('ex-dga-duval1').style.color = '#eab308';
      document.getElementById('ex-dga-fault').textContent = 'Warning / Monitor';
      document.getElementById('ex-dga-fault').style.color = '#eab308';
    }

    const limits = { H2: 100, CH4: 120, C2H6: 65, C2H4: 50, C2H2: 1, CO: 350, CO2: 2500 };
    const age = parseInt(serviceAgeYears) || 0;
    let ageCat = 'Unknown';
    if (age > 0) {
      if (age <= 9) ageCat = '1-9';
      else if (age <= 30) ageCat = '10-30';
      else ageCat = '>30';
    }
    const fluidType = String(trInfo ? (trInfo.TYPE_OF_INSULATION || trInfo.type_of_insulation) : '').toLowerCase();
    const catKey = fluidType.includes('silicone') || fluidType.includes('ester') || fluidType.includes('natural') ? 'high' : 'mineral';

    const T2_NORMS = {
      'mineral': {
        'Unknown': { H2: 200, CH4: 150, C2H6: 150, C2H4: 95, C2H2: 2, CO: 1100, CO2: 14000 },
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
    
    const limitsT2 = T2_NORMS[catKey][ageCat];
    let maxIEEEStatus = 'DGA Status 1 (Normal)';
    let ieeeColor = '#10b981';
    
    const gasKeys = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2'];
    let hasExceededT2 = false;
    let hasExceededT1 = false;
    
    for (let key of gasKeys) {
      const val = parseFloat(latestDGA[key] || 0);
      if (val > limitsT2[key]) {
        hasExceededT2 = true;
      } else if (val > limits[key]) {
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

    const h2Val = parseFloat(latestDGA.H2 || 0);
    const ch4Val = parseFloat(latestDGA.CH4 || 0);
    const c2h6Val = parseFloat(latestDGA.C2H6 || 0);
    const c2h4Val = parseFloat(latestDGA.C2H4 || 0);
    const c2h2Val = parseFloat(latestDGA.C2H2 || 0);

    const isIecSignificant = (h2Val > 60 || ch4Val > 50 || c2h6Val > 60 || c2h4Val > 100 || c2h2Val > 2);
    let iecStatusText = 'Normal';
    let iecColor = '#10b981';

    if (isIecSignificant) {
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
      } else {
        iecStatusText = 'Mixed / Non-typical Pattern';
        iecColor = '#eab308';
      }
    }

    document.getElementById('ex-dga-iec-status').textContent = iecStatusText;
    document.getElementById('ex-dga-iec-status').style.color = iecColor;

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

  const getBDClass = (n) => n >= 50 ? 'ex-status-good' : (n >= 40 ? 'ex-status-fair' : 'ex-status-poor');
  const getPF25Class = (n) => n <= 0.5 ? 'ex-status-good' : (n <= 1.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getPF100Class = (n) => n <= 0.5 ? 'ex-status-good' : (n <= 2.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getCondClass = (n) => n <= 0.1 ? 'ex-status-good' : (n <= 1.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getWcClass = (n) => n <= 20 ? 'ex-status-good' : (n <= 30 ? 'ex-status-fair' : 'ex-status-poor');
  const getIftClass = (n) => n >= 28 ? 'ex-status-good' : (n >= 22 ? 'ex-status-fair' : 'ex-status-poor');
  const getAcClass = (n) => n <= 0.1 ? 'ex-status-good' : (n <= 0.2 ? 'ex-status-fair' : 'ex-status-poor');

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
    const dpVal = item.estimatedDP || '-';
    const moisturePaper = item.moisturePaper || '-';
    const sludgeVal = mtOilRec.Sludge_Condition || '-';

    const sulfurVal = mtOilRec.Corrosive_Sulfur || '-';
    const passivatorVal = mtOilRec.Passivator || '-';

    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td>${getCell(dbVal, getBDClass)}<td>kV</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td>${getCell(pf25Val, getPF25Class, '%')}<td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td>${getCell(pf100Val, getPF100Class, '%')}<td>%</td></tr>
      <tr><td>Conductivity</td><td>IEC 61620</td>${getCell(condVal, getCondClass)}<td>pS/m</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td>${getCell(wcVal, getWcClass)}<td>ppm</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td><td>${colorVal}</td><td>-</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td>${getCell(iftVal, getIftClass)}<td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td>${getCell(acVal, getAcClass)}<td>mgKOH/g</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td><td>${inhibitorVal === '-' ? '-' : parseFloat(inhibitorVal).toFixed(2)}</td><td>%</td></tr>
    `;

    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td><td>${furanVal}</td><td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td><td>${dpVal}</td><td>-</td></tr>
      <tr><td>Moisture in Paper [FDS]</td><td>IEEE C57.161-2018</td>${getCellString(moisturePaper)}<td>%M/dw</td></tr>
      <tr><td>Est. Moisture in Paper [D1533]</td><td>Calculated</td><td>${moistCal}</td><td>%M/dw</td></tr>
      <tr><td>Sludge Condition</td><td>Visual</td><td class="${sludgeVal.toLowerCase().includes('non') ? 'ex-status-good' : 'ex-status-fair'}">${sludgeVal}</td><td>-</td></tr>
    `;

    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td><td class="${sulfurVal.toLowerCase().includes('non') ? 'ex-status-good' : 'ex-status-poor'}">${sulfurVal}</td><td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td><td>${passivatorVal}</td><td>ppm</td></tr>
    `;

    updateTestDate('ex-update-oil', mtOilRec.Date || mtOilRec.date);
  } else {
    // Standalone Mock Fallback
    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td><td class="ex-status-good">72.7</td><td>kV</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td><td class="ex-status-good">0.001%</td><td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td><td class="ex-status-good">0.017%</td><td>%</td></tr>
      <tr><td>Conductivity</td><td>IEC 61620</td><td class="ex-status-good">0.1</td><td>pS/m</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td><td class="ex-status-good">6.7</td><td>ppm</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td><td>0.5</td><td>-</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td><td class="ex-status-good">38</td><td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td><td class="ex-status-good">0.01</td><td>mgKOH/g</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td><td>0.30</td><td>%</td></tr>
    `;

    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td><td>-</td><td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td><td>-</td><td>-</td></tr>
      <tr><td>Moisture in Paper [FDS]</td><td>IEEE C57.161-2018</td><td>-</td><td>%M/dw</td></tr>
      <tr><td>Est. Moisture in Paper [D1533]</td><td>Calculated</td><td>-</td><td>%M/dw</td></tr>
      <tr><td>Sludge Condition</td><td>Visual</td><td>-</td><td>-</td></tr>
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
