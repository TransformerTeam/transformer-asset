const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
console.log('--- Step 1: Parse Test CSV Data ---');

function parseCSV(filepath) {
  const fullPath = path.isAbsolute(filepath) ? filepath : path.join(rootDir, filepath);
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  let hIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].startsWith('No.') || lines[i].includes('Serial') || lines[i].includes('Equipment Name') || lines[i].includes('SERIAL_NUMBER')) {
      hIdx = i; break;
    }
  }
  const parseRow = (line) => {
    const cols = []; let cur = ''; let inQ = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cols.push(cur.trim().replace(/^["']|["']$/g, '')); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim().replace(/^["']|["']$/g, ''));
    return cols;
  };
  const headers = parseRow(lines[hIdx]);
  const data = [];
  for (let i = hIdx + 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] !== undefined ? cols[idx] : ''; });
    obj.serial = obj.Serial_No || obj.serial || obj.Serial || obj.SERIAL_NUMBER || obj['Serial No'] || '';
    obj.date = obj.Date || obj.date || obj.DATE || obj.TESTDATE || '';
    data.push(obj);
  }
  return data;
}

const trInfoCsvData = parseCSV('TestData/TRinfo2.csv');
const visualCsvData = parseCSV('TestData/VisualData.csv');
const bushingInfoCsvData = parseCSV('TestData/BushingInfo.csv');
const bushingPfCsvData = parseCSV('TestData/BushingPFData.csv');
const surgeInfoCsvData = parseCSV('TestData/SurgeInfo.csv');
const surgePfCsvData = parseCSV('TestData/SurgePFData.csv');
const irPiCsvData = parseCSV('TestData/IRandPIData.csv');
const windingPfCsvData = parseCSV('TestData/WindingPFData.csv');
const excitingCsvData = parseCSV('TestData/ExcitingData.csv');
const ratioCsvData = parseCSV('TestData/RatioData.csv');
const windingCsvData = parseCSV('TestData/WindingData.csv');
const mtOilCsvData = parseCSV('TestData/MTOilData.csv');
const oltcOilCsvData = parseCSV('TestData/OLTCOilData.csv');
const dfrCsvData = parseCSV('TestData/DFRData.csv');
const factoryCsvData = parseCSV('TestData/FactoryData.csv');
const trInfoMain = parseCSV('TRInfo.csv');

console.log('--- Step 2: Setup VM Sandbox & evaluation_engine.js ---');
const sandbox = {
  window: {},
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  console, Math, Date, parseFloat, isNaN, parseInt, String, Array,
  trInfoCsvData, visualCsvData, bushingInfoCsvData, bushingPfCsvData,
  surgeInfoCsvData, surgePfCsvData, irPiCsvData, windingPfCsvData,
  excitingCsvData, ratioCsvData, windingCsvData, mtOilCsvData,
  oltcOilCsvData, dfrCsvData, factoryCsvData, TR_DATA: trInfoMain
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(rootDir, 'evaluation_engine.js'), 'utf8'), sandbox);

function scoreToAqu(score, isNA) {
  if (isNA || score === null || score === undefined) return 'N/A';
  if (score >= 4) return 'A';
  if (score === 3) return 'Q';
  if (score === 2) return 'W';
  if (score <= 1) return 'U';
  return 'U';
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const hiFilePath = path.join(rootDir, 'HealthIndexSum.csv');
const rawHiText = fs.readFileSync(hiFilePath, 'utf8');
const hiLines = rawHiText.split(/\r?\n/).filter(l => l.trim().length > 0);
let hIdx = hiLines.findIndex(l => l.startsWith('No.') || l.includes('Equipment Name'));
if (hIdx === -1) hIdx = 0;

const parseRow = (line) => {
  const cols = []; let cur = ''; let inQ = false;
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { cols.push(cur.trim().replace(/^["']|["']$/g, '')); cur = ''; }
    else cur += ch;
  }
  cols.push(cur.trim().replace(/^["']|["']$/g, ''));
  return cols;
};

const hiHeaders = parseRow(hiLines[hIdx].replace(/^\uFEFF/, ''));

console.log('--- Step 3: Process and Evaluate HealthIndexSum Rows ---');
const updatedOutputRows = [];
const healthDataObjects = [];
const evaluatedHiMap = new Map(); // serial -> { hi, status, dga }

// Header row
updatedOutputRows.push(hiHeaders.map(escapeCsvCell).join(','));

let countEvaluated = 0;
let countPreserved = 0;
let countIgnored = 0;

for (let r = hIdx + 1; r < hiLines.length; r++) {
  const rowCols = parseRow(hiLines[r]);
  const row = {};
  hiHeaders.forEach((h, idx) => { row[h] = rowCols[idx] !== undefined ? rowCols[idx] : ''; });

  const firstCol = String(row['No.'] || '').trim();
  const serial = String(row['Serial No'] || '').trim();
  const name = String(row['Equipment Name'] || '').trim();
  const site = String(row.SITE || '').trim();

  // Validate that this is an actual transformer row
  if (!/^\d+$/.test(firstCol) || (!name && !serial)) {
    console.log(`Skipping invalid/corrupt row at line ${r}: "${hiLines[r].slice(0, 50)}..."`);
    countIgnored++;
    continue;
  }

  // Handle SPARE GSPP2&3 or Scrap (Preserve as-is)
  if (site === 'SPARE GSPP2&3' || site === 'Scrap') {
    countPreserved++;
    const preservedRow = Object.assign({}, row);
    const cols = hiHeaders.map(h => preservedRow[h] !== undefined ? preservedRow[h] : '');
    updatedOutputRows.push(cols.map(escapeCsvCell).join(','));
    healthDataObjects.push(preservedRow);
    evaluatedHiMap.set(serial.toUpperCase(), {
      hi: row['Condition Health Index'],
      status: row['Health Index Status'],
      dga: row['DGA']
    });
    continue;
  }

  // Active transformer -> Full Evaluation
  const item = {
    name,
    serial,
    site,
    ratedPower: row['Rated Power (MVA)'],
    hvRate: row['HV Rate (kV)'],
    lvRate: row['LV Rate (kV)'],
    ratedVoltage: row['Rated Voltage (kV)'],
    serviceType: row['Service Type'],
    serviceAge: row['Service Age (Year)'],
    healthIndex: row['Condition Health Index'],
    healthStatus: row['Health Index Status'],
    estimatedDP: row['Estimated DP (From Furan)'],
    estimatedLife: row['Estimated Remaining Life time (Year)'],
    visualInspection: row['Visual Inspection'],
    activePart: {
      overall: row['Active Part'],
      insulationResistance: row['Insulation Resistance & PI'],
      insulationPowerFactor: row['Insulation Power Factor'],
      excitingCurrent: row['Exciting Current'],
      ratioPolarity: row['Ratio&Polarity'],
      windingResistance: row['Winding Resistance'],
      shortCircuit1P: row['1∅ Short Circuit Impedance'],
      shortCircuit3P: row['3∅ Short Circuit Impedance'],
      coreToGround: row['Core to Ground']
    },
    bushing: row.Bushing,
    surgeArrester: row['Surge Arrester'],
    dynamicResistance: row['Dynamic Resistance Measurement (OLTC)'],
    fra: row['Frequency Response Analysis (FRA)'],
    moisturePaper: row['%Moisture in paper (FDS)'],
    mainTankOil: {
      overall: row['Main Tank Oil'],
      dga: row.DGA,
      waterContent: row['Water Content'],
      dielectricBreakdown: row['Dielectric Breakdown'],
      pf25: row['PF at 25 °C'],
      pf100: row['PF at 100 °C'],
      conductivity: row.Conductivity,
      ift: row['Interfratial Tension (IFT)'],
      acidity: row.Acidity,
      color: row.Color,
      inhibitor: row.Inhibitor,
      corrosiveSulfur: row['Corrosive Sulfur']
    },
    passivator: row.Passivator,
    furan: row.Furan,
    sludge: row.Sludge,
    oltcOil: {
      overall: row['OLTC Oil'],
      dga: row['DGA (OLTC)'],
      dielectricBreakdown: row['Dielectric Breakdown (OLTC)'],
      waterContent: row['Water Content (OLTC)']
    },
    lastPM: row['Last PM'],
    nextPM: row['Next PM'],
    recommendation: row.Recommendation
  };

  const ptStructure = sandbox.buildPtStructure(item);
  let minPtScores = { activePart: 5, bushing: 5, surgeArrester: 5, oltc: 5, oil: 5, visual: 5, dga: 5 };
  let ptHasData = { activePart: false, bushing: false, surgeArrester: false, oltc: false, oil: false, visual: false, dga: false };
  const subMethodScores = {};
  let evaluatedDP = null;

  ptStructure.forEach(ptObj => {
    const ptKey = ptObj.id || String(ptObj.pt || '').toLowerCase();
    let currentPtGroup = 'activePart';
    if (ptKey.includes('bush')) currentPtGroup = 'bushing';
    else if (ptKey.includes('surge') || ptKey.includes('arrest')) currentPtGroup = 'surgeArrester';
    else if (ptKey.includes('oltc') || ptKey.includes('tap changer')) currentPtGroup = 'oltc';
    else if (ptKey.includes('oil')) currentPtGroup = 'oil';
    else if (ptKey.includes('visual') || ptKey.includes('general')) currentPtGroup = 'visual';

    ptObj.subs.forEach(subObj => {
      subObj.methods.forEach(m => {
        const match = sandbox.getMeasuredValueForItem(m.name, item, ptObj.pt, subObj.sub);
        if (!match.isNA && match.ratingScore != null) {
          const s = match.ratingScore;
          ptHasData[currentPtGroup] = true;
          if (s < minPtScores[currentPtGroup]) minPtScores[currentPtGroup] = s;

          const mLower = String(m.name || '').toLowerCase();
          function recordSub(key, score) {
            if (subMethodScores[key] === undefined || score < subMethodScores[key]) {
              subMethodScores[key] = score;
            }
          }

          if (mLower.includes('dga') || mLower.includes('dissolve gas')) {
            ptHasData.dga = true;
            if (s < minPtScores.dga) minPtScores.dga = s;
            recordSub('DGA', s);
          }
          if (currentPtGroup === 'visual') recordSub('Visual Inspection', s);
          if (mLower.includes('water content') && currentPtGroup === 'oil') recordSub('Water Content', s);
          if (mLower.includes('dielectric breakdown') && currentPtGroup === 'oil') recordSub('Dielectric Breakdown', s);
          if (mLower.includes('power factor at 25')) recordSub('PF at 25 °C', s);
          if (mLower.includes('power factor at 100')) recordSub('PF at 100 °C', s);
          if (mLower.includes('conductivity')) recordSub('Conductivity', s);
          if (mLower.includes('ift') || mLower.includes('interfacial')) recordSub('Interfratial Tension (IFT)', s);
          if (mLower.includes('acidity')) recordSub('Acidity', s);
          if (mLower.includes('color')) recordSub('Color', s);
          if (mLower.includes('inhibitor')) recordSub('Inhibitor', s);
          if (mLower.includes('corrosive sulfur')) recordSub('Corrosive Sulfur', s);
          if (mLower.includes('passivator')) recordSub('Passivator', s);
          if (mLower.includes('furan') && !mLower.includes('dp')) recordSub('Furan', s);
          if (mLower.includes('sludge')) recordSub('Sludge', s);

          if (mLower.includes('estimated dp') && match.value) {
            const num = parseInt(String(match.value).replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num)) evaluatedDP = num;
          }

          if (currentPtGroup === 'activePart') {
            if (mLower.includes('insulation resistance and pi')) recordSub('Insulation Resistance & PI', s);
            if (mLower.includes('power factor')) recordSub('Insulation Power Factor', s);
            if (mLower.includes('exciting current')) recordSub('Exciting Current', s);
            if (mLower.includes('turn ratio') || mLower.includes('ratio')) recordSub('Ratio&Polarity', s);
            if (mLower.includes('winding resistance')) recordSub('Winding Resistance', s);
            if (mLower.includes('single phase short circuit')) recordSub('1∅ Short Circuit Impedance', s);
            if (mLower.includes('three phase short circuit')) recordSub('3∅ Short Circuit Impedance', s);
            if (mLower.includes('magnetic core') || mLower.includes('core')) recordSub('Core to Ground', s);
          }

          if (currentPtGroup === 'bushing') recordSub('Bushing', s);
          if (currentPtGroup === 'surgeArrester') recordSub('Surge Arrester', s);

          if (currentPtGroup === 'oltc') {
            recordSub('OLTC Oil', s);
            if (mLower.includes('dga')) recordSub('DGA (OLTC)', s);
            if (mLower.includes('breakdown')) recordSub('Dielectric Breakdown (OLTC)', s);
            if (mLower.includes('water')) recordSub('Water Content (OLTC)', s);
          }
        }
      });
    });
  });

  // Calculate Health Index
  const { percentHIVal } = sandbox.computeHI(item);
  let finalHI = row['Condition Health Index'];
  let finalStatus = row['Health Index Status'];
  if (percentHIVal > 0) {
    finalHI = String(percentHIVal);
    finalStatus = percentHIVal >= 80 ? 'Healthy' : (percentHIVal >= 70 ? 'Monitor' : (percentHIVal >= 50 ? 'Warning' : 'Critical'));
  }

  // Find latest PM year
  const dateCandidates = [row['Last PM']];
  function checkLatest(list) {
    if (!list) return;
    const r = sandbox.findLatestRecord(list, serial);
    if (r && (r.Date || r.date || r.DATE)) dateCandidates.push(r.Date || r.date || r.DATE);
  }
  checkLatest(mtOilCsvData);
  checkLatest(irPiCsvData);
  checkLatest(ratioCsvData);
  checkLatest(windingCsvData);
  checkLatest(bushingPfCsvData);
  checkLatest(visualCsvData);
  checkLatest(oltcOilCsvData);

  let maxPmYear = null;
  dateCandidates.forEach(d => {
    if (!d) return;
    const match = String(d).match(/\b(20\d\d)\b/);
    if (match) {
      const yr = parseInt(match[1], 10);
      if (!maxPmYear || yr > maxPmYear) maxPmYear = yr;
    }
  });

  // Build updated row object
  const updatedRow = Object.assign({}, row);

  // Update Core HI & Status
  updatedRow['Condition Health Index'] = finalHI;
  updatedRow['Health Index Status'] = finalStatus;

  // Update DP if evaluated
  if (evaluatedDP !== null) updatedRow['Estimated DP (From Furan)'] = String(evaluatedDP);

  // Update Main Categories if evaluated
  if (ptHasData.visual) updatedRow['Visual Inspection'] = scoreToAqu(minPtScores.visual);
  if (ptHasData.activePart) updatedRow['Active Part'] = scoreToAqu(minPtScores.activePart);
  if (ptHasData.bushing) updatedRow['Bushing'] = scoreToAqu(minPtScores.bushing);
  if (ptHasData.surgeArrester) updatedRow['Surge Arrester'] = scoreToAqu(minPtScores.surgeArrester);
  if (ptHasData.oil) updatedRow['Main Tank Oil'] = scoreToAqu(minPtScores.oil);
  if (ptHasData.dga) updatedRow['DGA'] = scoreToAqu(minPtScores.dga);
  if (ptHasData.oltc) updatedRow['OLTC Oil'] = scoreToAqu(minPtScores.oltc);

  // Update Sub-tests if evaluated
  const subKeys = [
    'Insulation Resistance & PI', 'Insulation Power Factor', 'Exciting Current', 'Ratio&Polarity',
    'Winding Resistance', '1∅ Short Circuit Impedance', '3∅ Short Circuit Impedance', 'Core to Ground',
    'Water Content', 'Dielectric Breakdown', 'PF at 25 °C', 'PF at 100 °C', 'Conductivity',
    'Interfratial Tension (IFT)', 'Acidity', 'Color', 'Inhibitor', 'Corrosive Sulfur',
    'Passivator', 'Furan', 'Sludge', 'DGA (OLTC)', 'Dielectric Breakdown (OLTC)', 'Water Content (OLTC)'
  ];

  subKeys.forEach(k => {
    if (subMethodScores[k] !== undefined) {
      updatedRow[k] = scoreToAqu(subMethodScores[k]);
    }
  });

  // Last PM
  if (maxPmYear) updatedRow['Last PM'] = String(maxPmYear);

  // Recommendation: preserve existing engineering comment if present; otherwise generate
  if (!updatedRow['Recommendation'] || updatedRow['Recommendation'] === '-' || updatedRow['Recommendation'] === 'None') {
    const recRes = sandbox.generateDetailedRecommendation(item);
    if (recRes && recRes.plainText) {
      updatedRow['Recommendation'] = recRes.plainText;
    }
  }

  const cols = hiHeaders.map(h => updatedRow[h] !== undefined ? updatedRow[h] : '');
  updatedOutputRows.push(cols.map(escapeCsvCell).join(','));
  healthDataObjects.push(updatedRow);
  evaluatedHiMap.set(serial.toUpperCase(), {
    hi: finalHI,
    status: finalStatus,
    dga: updatedRow['DGA']
  });
  countEvaluated++;
}

console.log(`Evaluated: ${countEvaluated} active transformers`);
console.log(`Preserved: ${countPreserved} SPARE/Scrap transformers`);
console.log(`Ignored: ${countIgnored} corrupt lines`);
console.log(`Total data rows: ${healthDataObjects.length}`);

console.log('--- Step 4: Write HealthIndexSum.csv ---');
const csvOutput = '\uFEFF' + updatedOutputRows.join('\r\n') + '\r\n';
fs.writeFileSync(hiFilePath, csvOutput, 'utf8');
console.log('HealthIndexSum.csv written successfully with UTF-8 BOM and CRLF!');

console.log('--- Step 5: Write health_data.js ---');
const jsonStr = JSON.stringify(healthDataObjects, null, 4);
const jsContent = `const HEALTH_INDEX_DATA = ${jsonStr};\n\nif (typeof module !== 'undefined') {\n    module.exports = { HEALTH_INDEX_DATA };\n}\nif (typeof window !== 'undefined') {\n    window.HEALTH_INDEX_DATA = HEALTH_INDEX_DATA;\n}\n`;
fs.writeFileSync(path.join(rootDir, 'health_data.js'), '\uFEFF' + jsContent, 'utf8');
console.log(`health_data.js written successfully with ${healthDataObjects.length} transformers!`);

console.log('--- Step 6: Synchronize TRInfo.csv & data.js ---');
const trInfoPath = path.join(rootDir, 'TRInfo.csv');
const trInfoSourcePath = fs.existsSync(path.join(rootDir, 'TestData', 'TRinfo2.csv')) ? path.join(rootDir, 'TestData', 'TRinfo2.csv') : trInfoPath;

if (fs.existsSync(trInfoSourcePath)) {
  const trRaw = fs.readFileSync(trInfoSourcePath, 'utf8');
  const trLines = trRaw.split(/\r?\n/).filter(l => l.trim().length > 0);
  let trHIdx = trLines.findIndex(l => l.includes('SERIAL_NUMBER') || l.includes('Serial'));
  if (trHIdx === -1) trHIdx = 0;
  
  const trHeaders = parseRow(trLines[trHIdx].replace(/^\uFEFF/, ''));
  const trUpdatedRows = [];
  const trObjects = [];
  trUpdatedRows.push(trHeaders.map(escapeCsvCell).join(','));

  const sIdx = trHeaders.findIndex(h => h === 'SERIAL_NUMBER' || h === 'Serial_No' || h === 'serial');
  const hiIdx = trHeaders.findIndex(h => h === 'HI' || h === 'Health_Index');
  const dgaIdx = trHeaders.findIndex(h => h === 'DGA');

  for (let i = trHIdx + 1; i < trLines.length; i++) {
    const rowCols = parseRow(trLines[i]);
    const obj = {};
    trHeaders.forEach((h, idx) => { obj[h] = rowCols[idx] !== undefined ? rowCols[idx] : ''; });
    const sVal = String(obj.SERIAL_NUMBER || obj.Serial_No || obj.serial || '').trim().toUpperCase();
    
    if (sVal && evaluatedHiMap.has(sVal)) {
      const ev = evaluatedHiMap.get(sVal);
      if (hiIdx !== -1) obj[trHeaders[hiIdx]] = ev.hi;
      if (dgaIdx !== -1 && ev.dga) obj[trHeaders[dgaIdx]] = ev.dga;
    }
    
    const outLine = trHeaders.map(h => obj[h]);
    trUpdatedRows.push(outLine.map(escapeCsvCell).join(','));
    trObjects.push(obj);
  }

  const trOutput = '\uFEFF' + trUpdatedRows.join('\r\n') + '\r\n';
  fs.writeFileSync(trInfoPath, trOutput, 'utf8');
  console.log(`TRInfo.csv updated with ${trObjects.length} rows!`);

  const dataJsContent = `const TR_DATA = ${JSON.stringify(trObjects, null, 4)};\n\nif (typeof module !== 'undefined') {\n    module.exports = { TR_DATA };\n}\nif (typeof window !== 'undefined') {\n    window.TR_DATA = TR_DATA;\n}\n`;
  fs.writeFileSync(path.join(rootDir, 'data.js'), '\uFEFF' + dataJsContent, 'utf8');
  console.log(`data.js updated with ${trObjects.length} records!`);
}

console.log('--- Step 7: Verify Distributions ---');
const statusCounts = {};
const dgaCounts = {};
healthDataObjects.forEach(obj => {
  const s = obj['Health Index Status'] || 'N/A';
  statusCounts[s] = (statusCounts[s] || 0) + 1;
  const d = obj['DGA'] || 'N/A';
  dgaCounts[d] = (dgaCounts[d] || 0) + 1;
});
console.log('Status Counts:', statusCounts);
console.log('DGA Counts:', dgaCounts);
console.log('--- SYNC FINISHED SUCCESSFULLY ---');
