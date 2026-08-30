var dfrCsvData = (typeof dfrCsvData !== 'undefined' && dfrCsvData && dfrCsvData.length) ? dfrCsvData : ((typeof DFR_DATA !== 'undefined') ? DFR_DATA : []);
/**
 * GPSC Transformer Asset Management - Evaluation Engine
 * Authoritative implementation of Condition Health Index (CHI), Component Evaluation, and Diagnostic Rules
 */

var _evalLatestRecordCache = new Map();

function findLatestRecord(csvArray, targetSerial) {
  if (!csvArray || !csvArray.length || !targetSerial) return null;
  const cleanTarget = String(targetSerial).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cacheKey = `${csvArray.length}_${cleanTarget}`;
  if (_evalLatestRecordCache.has(cacheKey)) {
    return _evalLatestRecordCache.get(cacheKey);
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

  if (!matches.length) {
    _evalLatestRecordCache.set(cacheKey, null);
    return null;
  }

  matches.sort((a, b) => {
    const dA = new Date(a.date || a.Date || a['Test Date'] || a.Test_Date || 0);
    const dB = new Date(b.date || b.Date || b['Test Date'] || b.Test_Date || 0);
    if (isNaN(dA.getTime())) return 1;
    if (isNaN(dB.getTime())) return -1;
    return dB - dA;
  });

  const result = matches[0];
  _evalLatestRecordCache.set(cacheKey, result);
  return result;
}

function isExcludedSite(site) {
  if (!site) return false;
  const s = String(site).trim().toLowerCase();
  if (s === 'scrap' || s.includes('scrap')) return true;
  if (s === 'spare gspp2&3' || s === 'spare gspp2 & 3' || (s.includes('spare') && s.includes('gspp'))) return true;
  return false;
}

// ==========================================
// buildPtStructure: Returns PT component data
// (shared across Assessment Dashboard & Evaluation Report)
// ==========================================
function buildPtStructure(item) {
  const serialVal = item ? (item['Serial No'] || item.serial || item.SERIAL_NUMBER || '') : '';
  const trInfoItem = (typeof trInfoCsvData !== 'undefined' && trInfoCsvData && trInfoCsvData.length > 0 && serialVal) 
    ? findLatestRecord(trInfoCsvData, serialVal) 
    : (item?.trInfo || (typeof TR_DATA !== 'undefined' ? TR_DATA.find(x => String(x.SERIAL_NUMBER || x.Serial_No || '').trim().toLowerCase() === String(serialVal).trim().toLowerCase()) : null));
  const insulationType = String((item && (item.TYPE_OF_INSULATION || item.fluid)) || (trInfoItem && (trInfoItem.TYPE_OF_INSULATION || trInfoItem.WINDING_INSULATION)) || '').toLowerCase();
  const isNaturalEster = insulationType.includes('ester') || insulationType.includes('fr3') || insulationType.includes('natural');
  const hvRated = parseFloat((item && (item.HV_RATED || item.HV_Voltage)) || (trInfoItem && trInfoItem.HV_RATED) || '115');
  const is230kVorAbove = hvRated >= 230;

  const dgaSubText = isNaturalEster ? 'IEEE C57.155-2014, Natural Ester and Synthetic Ester' : 'IEEE C57.104-2019, Mineral Oil';

  const vg = String((item && (item.VECTOR_GROUP || item.vectorGroup)) || (trInfoItem && trInfoItem.VECTOR_GROUP) || '').toUpperCase();
  const mt = String((item && (item.MODEL_TYPE || item.modelType)) || (trInfoItem && trInfoItem.MODEL_TYPE) || '').toUpperCase();
  const app = String((item && (item.APPLICATION || item.Service_Type)) || (trInfoItem && (trInfoItem.APPLICATION || trInfoItem.Service_Type)) || '').toUpperCase();
  const spec = String((item && (item.SPECIFICATION || item.REMARK || item.MODEL_TYPE)) || (trInfoItem && (trInfoItem.SPECIFICATION || trInfoItem.REMARK || trInfoItem.MODEL_TYPE)) || '').toUpperCase();
  const noWindingStr = String((item && (item.NO_WINDING || item.no_winding)) || (trInfoItem && trInfoItem.NO_WINDING) || '').trim();
  const lv2Rated = String((item && item.LV2_RATED) || (trInfoItem && trInfoItem.LV2_RATED) || '').trim();

  const isAuto = vg.includes('YNA') || vg.includes('AUTO') || mt.includes('AUTO') || app.includes('AUTO') || spec.includes('AUTO');
  const is3Winding = !isAuto && (noWindingStr === '3' || (lv2Rated !== '' && lv2Rated !== '-' && lv2Rated !== '0') || spec.includes('3W'));

  // Check if transformer has LV Bushing data or LV Arrester data (e.g. KT4A)
  let hasLvBushing = false;
  let hasLvArrester = false;

  const cleanTarget = String(serialVal || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nameClean = String((item && (item.name || item.EQUIPMENT_NAME || item['Equipment Name'])) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const bushSource = (typeof bushingPfCsvData !== 'undefined' && Array.isArray(bushingPfCsvData)) ? bushingPfCsvData : (typeof window !== 'undefined' && window.bushingPfCsvData ? window.bushingPfCsvData : null);
  if (bushSource) {
    const bushRec = findLatestRecord(bushSource, serialVal);
    if (bushRec) {
      const hasX1 = (bushRec.xbushing_h1_c1 && bushRec.xbushing_h1_c1 !== '-' && bushRec.xbushing_h1_c1 !== '') ||
                    (bushRec.xbushing_h1_pf_20c && bushRec.xbushing_h1_pf_20c !== '-' && bushRec.xbushing_h1_pf_20c !== '') ||
                    (bushRec.xbushing_h1_pf_tan && bushRec.xbushing_h1_pf_tan !== '-' && bushRec.xbushing_h1_pf_tan !== '');
      if (hasX1) hasLvBushing = true;
    }
  }

  const bushInfoSource = (typeof bushingInfoCsvData !== 'undefined' && Array.isArray(bushingInfoCsvData)) ? bushingInfoCsvData : (typeof window !== 'undefined' && window.bushingInfoCsvData ? window.bushingInfoCsvData : null);
  if (!hasLvBushing && bushInfoSource) {
    const hasLvInfo = bushInfoSource.some(r => {
      const s = String(r.Parent_Serial_No || r.serial || r.Serial_No || r.SERIAL_NUMBER || r.transformer_serial || '').trim();
      const cleanS = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pos = String(r.Phase || r.phase || r.position || r.Position || r.POS || r.PHASE || '').trim().toUpperCase();
      const matchesS = (s.toLowerCase() === String(serialVal).toLowerCase()) || (cleanS && cleanTarget && (cleanS === cleanTarget || cleanS.includes(cleanTarget) || cleanTarget.includes(cleanS)));
      return matchesS && (pos.startsWith('X') || pos.startsWith('LV') || pos.startsWith('L'));
    });
    if (hasLvInfo) hasLvBushing = true;
  }

  const surgeSource = (typeof surgePfCsvData !== 'undefined' && Array.isArray(surgePfCsvData)) ? surgePfCsvData : (typeof window !== 'undefined' && window.surgePfCsvData ? window.surgePfCsvData : null);
  if (surgeSource) {
    const surgeRec = findLatestRecord(surgeSource, serialVal);
    if (surgeRec) {
      const hasXh1 = (surgeRec.xh1_current && surgeRec.xh1_current !== '-' && surgeRec.xh1_current !== '') ||
                     (surgeRec.xh1_watt_loss && surgeRec.xh1_watt_loss !== '-' && surgeRec.xh1_watt_loss !== '') ||
                     (surgeRec.xh1_pf_tan && surgeRec.xh1_pf_tan !== '-' && surgeRec.xh1_pf_tan !== '') ||
                     (surgeRec.xh1_pf_20c && surgeRec.xh1_pf_20c !== '-' && surgeRec.xh1_pf_20c !== '');
      if (hasXh1) hasLvArrester = true;
    }
  }

  const surgeInfoSource = (typeof surgeInfoCsvData !== 'undefined' && Array.isArray(surgeInfoCsvData)) ? surgeInfoCsvData : (typeof window !== 'undefined' && window.surgeInfoCsvData ? window.surgeInfoCsvData : null);
  if (!hasLvArrester && surgeInfoSource) {
    const hasLvSurge = surgeInfoSource.some(r => {
      const s = String(r.Parent_Serial_No || r.serial || r.Serial_No || r.SERIAL_NUMBER || r.transformer_serial || '').trim();
      const cleanS = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pos = String(r.Phase || r.phase || r.position || r.Position || r.POS || r.PHASE || '').trim().toUpperCase();
      const matchesS = (s.toLowerCase() === String(serialVal).toLowerCase()) || (cleanS && cleanTarget && (cleanS === cleanTarget || cleanS.includes(cleanTarget) || cleanTarget.includes(cleanS)));
      return matchesS && (pos.startsWith('X') || pos.startsWith('LV') || pos.startsWith('L'));
    });
    if (hasLvSurge) hasLvArrester = true;
  }

  // Explicit support for known dual-voltage transformers (e.g. KT4A, KT5A, KT6A, KT7A, PTE 1689/01..04, TIC003, TIC008)
  const dualVoltagePatterns = ['PTE168901', 'PTE168902', 'PTE168903', 'PTE168904', 'KT4A', 'KT5A', 'KT6A', 'KT7A', 'TP70279703', '510049', '20083122TIC003', '20083122TIC008', 'EDP011601', '512033', '5513053', '54001', 'EDP008001', '508038'];
  if (dualVoltagePatterns.some(p => cleanTarget.includes(p) || nameClean.includes(p))) {
    hasLvBushing = true;
    hasLvArrester = true;
  }

  let hvPfSubText = 'IEEE C57.152-2013, Mineral Oil < 230 kV: Normal ≤ 0.5%, Service Limit ≤ 1.0%';
  if (isNaturalEster) {
    hvPfSubText = 'IEEE C57.152-2013, Natural Ester: Normal ≤ 1.0%, Service Limit ≤ 1.5%';
  } else if (is230kVorAbove) {
    hvPfSubText = 'IEEE C57.152-2013, Mineral Oil ≥ 230 kV: Normal ≤ 0.4%, Service Limit ≤ 1.0%';
  }

  const hvWindingSub = {
    sub: 'HV Winding', full: 100, subWeight: (isAuto ? 40 : (is3Winding ? 30 : 45)),
    methods: [
      { name: 'Exciting Current', subText: 'IEEE C57.152 / CIGRE TB 761', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
      { name: 'Single Phase Short Circuit Impedance', subText: 'IEEE C57.152-2013, %Deviation within 3% average three phase', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
      { name: 'Three Phase Short Circuit Impedance', subText: 'IEEE C57.152-2013, %Deviation within 3% of nameplate', defaultDate: '-', mWeight: 5, maxScore: 4, mWorst: '13.3333' },
      { name: 'Turn Ratio', subText: 'IEEE C57.152-2013, %Deviation within 0.5% of nameplate', defaultDate: '-', mWeight: 5, maxScore: 5, mWorst: '16.6667' },
      { name: 'HV Winding Resistance', subText: 'IEEE C57.152-2013, %Dev between Phase within 2% and %DEV from FAT/Oldest 5%', defaultDate: '-', mWeight: 5, maxScore: 5, mWorst: '16.6667' },
      { name: 'Power Factor', subText: hvPfSubText, defaultDate: '-', mWeight: 4, maxScore: 13.3333, mWorst: '-' },
      { name: 'Capacitance', subText: 'IEEE C57.152-2013, %Dev from FAT/Oldest ≤ 5%', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
      { name: 'Insulation Resistance and PI', subText: 'IEEE C57.152-2013, PI > 1.25', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' }
    ]
  };

  const lvWindingSub = {
    sub: 'LV Winding', full: 100, subWeight: (isAuto ? 10 : (is3Winding ? 30 : 45)),
    methods: isAuto ? [
      { name: 'LV Winding Resistance', subText: 'IEEE C57.152-2013, %Dev between Phase within 2% and %DEV from FAT/Oldest 5%', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
    ] : [
      { name: 'LV Winding Resistance', subText: 'IEEE C57.152-2013, %Dev between Phase within 2% and %DEV from FAT/Oldest 5%', defaultDate: '-', mWeight: 5, maxScore: 5, mWorst: '33.3333' },
      { name: 'Power Factor', subText: 'IEEE C57.152-2013, Normal ≤ 0.5%, Service Limit ≤ 1.0%', defaultDate: '-', mWeight: 5, maxScore: 4, mWorst: '26.6667' },
      { name: 'Capacitance', subText: 'IEEE C57.152-2013, %Dev from FAT/Oldest ≤ 5%', defaultDate: '-', mWeight: 5, maxScore: 3, mWorst: '20' },
      { name: 'Insulation Resistance and PI', subText: 'IEEE C57.152-2013, PI > 1.25', defaultDate: '-', mWeight: 3, maxScore: 20, mWorst: '-' }
    ]
  };

  const tvWindingSub = {
    sub: 'TV Winding', full: 100, subWeight: (isAuto ? 40 : 30),
    methods: [
      { name: 'TV Winding Resistance', subText: 'IEEE C57.152-2013, %Dev between Phase within 2% and %DEV from FAT/Oldest 5%', defaultDate: '-', mWeight: 5, maxScore: 5, mWorst: '25' },
      { name: 'Power Factor', subText: 'IEEE C57.152-2013, Normal ≤ 0.5%, Service Limit ≤ 1.0%', defaultDate: '-', mWeight: 4, maxScore: 25, mWorst: '-' },
      { name: 'Capacitance', subText: 'IEEE C57.152-2013, %Dev from FAT/Oldest ≤ 5%', defaultDate: '-', mWeight: 3, maxScore: 25, mWorst: '-' },
      { name: 'Insulation Resistance and PI', subText: 'IEEE C57.152-2013, PI > 1.25', defaultDate: '-', mWeight: 3, maxScore: 25, mWorst: '-' }
    ]
  };

  const activePartSubs = [
    {
      sub: 'Magnetic Core', full: 100, subWeight: 10,
      methods: [
        { name: 'Insulation Resistance (MOhm)', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
      ]
    },
    hvWindingSub,
    lvWindingSub
  ];

  if (isAuto || is3Winding) {
    activePartSubs.push(tvWindingSub);
  }

  return [
    {
      pt: 'General Part', weight: 5,
      subs: [
        {
          sub: 'Overall Inspection', full: 100, subWeight: 100,
          methods: [
            { name: 'Visual Inspection', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
          ]
        }
      ]
    },
    {
      pt: 'Active Part', weight: 25,
      subs: activePartSubs
    },
    {
      pt: 'Insulation Oil', weight: 20, splitSubWeights: true,
      subs: [
        {
          sub: 'DGA', full: 100, subWeight: 25, weight: 5,
          methods: [
            { 
              name: 'Dissolve Gas Analysis (DGA)', 
              subText: dgaSubText, 
              defaultDate: '-', 
              mWeight: 5, 
              maxScore: 100, 
              mWorst: '-' 
            }
          ]
        },
        {
          sub: 'Dielectric Breakdown & Water Content', full: 100, subWeight: 25, weight: 5,
          methods: [
            { name: 'Dielectric Breakdown', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Water Content', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        },
        {
          sub: 'Oil Properties, Paper Aging, Corrosive Sulfur', full: 100, subWeight: 50, weight: 10,
          methods: [
            { name: 'Power Factor at 25 °C', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
            { name: 'Power Factor at 100 °C', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
            { name: 'IFT', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
            { name: 'Acidity', defaultDate: '-', mWeight: 3, maxScore: 10, mWorst: '-' },
            { name: 'Oil Conductivity', defaultDate: '-', mWeight: 2, maxScore: 5, mWorst: '-' },
            { name: 'Color Number', defaultDate: '-', mWeight: 2, maxScore: 5, mWorst: '-' },
            { name: 'Inhibitor', defaultDate: '-', mWeight: 2, maxScore: 5, mWorst: '-' },
            { name: 'Furan [2-FAL]', defaultDate: '-', mWeight: 5, maxScore: 15, mWorst: '-' },
            { name: 'Estimated DP [Furan]', defaultDate: '-', mWeight: 5, maxScore: 15, mWorst: '-' },
            { name: 'Sludge condition', defaultDate: '-', mWeight: 3, maxScore: 5, mWorst: '-' },
            { name: 'Corrosive Sulfur', defaultDate: '-', mWeight: 5, maxScore: 5, mWorst: '-' },
            { name: 'Passivator [Irgamet 39]', defaultDate: '-', mWeight: 5, maxScore: 5, mWorst: '-' }
          ]
        }
      ]
    },
    {
      pt: 'OLTC', weight: 20,
      subs: [
        {
          sub: 'OLTC Inspection', full: 100, subWeight: 100,
          methods: [
            { name: 'Visual Inspection', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
          ]
        },
        {
          sub: 'OLTC Oil', full: 100, subWeight: 100,
          methods: [
            { name: 'Breakdown Voltage (kV)', defaultDate: '-', mWeight: 4, maxScore: 23.5294, mWorst: '-' },
            { name: 'Water Content (ppm)', defaultDate: '-', mWeight: 5, maxScore: 29.4118, mWorst: '-' }
          ]
        }
      ]
    },
    // Bushing (Grouped 3 phases into Sub-PT Component)
    {
      pt: 'Bushing', weight: 25,
      subs: hasLvBushing ? [
        {
          sub: 'Bushing Inspection', full: 100, subWeight: 100,
          methods: [
            { name: 'Visual Inspection', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
          ]
        },
        {
          sub: 'HV Bushing', full: 100, subWeight: 50,
          methods: [
            { name: 'Power Factor', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Capacitance', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        },
        {
          sub: 'LV Bushing', full: 100, subWeight: 50,
          methods: [
            { name: 'Power Factor', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Capacitance', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        }
      ] : [
        {
          sub: 'Bushing Inspection', full: 100, subWeight: 100,
          methods: [
            { name: 'Visual Inspection', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
          ]
        },
        {
          sub: 'HV Bushing', full: 100, subWeight: 100,
          methods: [
            { name: 'Power Factor', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Capacitance', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        }
      ]
    },
    // Arrester (Grouped 3 phases into Sub-PT Component)
    {
      pt: 'Arrester', weight: 5,
      subs: hasLvArrester ? [
        {
          sub: 'Arrester Inspection', full: 100, subWeight: 100,
          methods: [
            { name: 'Visual Inspection', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
          ]
        },
        {
          sub: 'HV Arrester', full: 100, subWeight: 50,
          methods: [
            { name: 'Leakage Current (%Error from FAT/Oldest)', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Watt Loss (%Error from FAT/Oldest)', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        },
        {
          sub: 'LV Arrester', full: 100, subWeight: 50,
          methods: [
            { name: 'Leakage Current (%Error from FAT/Oldest)', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Watt Loss (%Error from FAT/Oldest)', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        }
      ] : [
        {
          sub: 'Arrester Inspection', full: 100, subWeight: 100,
          methods: [
            { name: 'Visual Inspection', defaultDate: '-', mWeight: 5, maxScore: 100, mWorst: 100 }
          ]
        },
        {
          sub: 'HV Arrester', full: 100, subWeight: 100,
          methods: [
            { name: 'Leakage Current (%Error from FAT/Oldest)', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' },
            { name: 'Watt Loss (%Error from FAT/Oldest)', defaultDate: '-', mWeight: 5, maxScore: 50, mWorst: '-' }
          ]
        }
      ]
    }
  ];
}

// ==========================================
// getMethodStandardAndLimit: Dynamic Standard & Limit Generator for Test Methods
// ==========================================
function getMethodStandardAndLimit(methodName, item, ptName, subName) {
  const mLower = String(methodName || '').toLowerCase();
  const ptLower = String(ptName || '').toLowerCase();
  const subLower = String(subName || '').toLowerCase();

  // Voltage and fluid type for dynamic criteria
  let hvVoltage = parseFloat((item && (item.voltage || item.ratedVoltage || item.HV_RATED || item['Rated Voltage (kV)'])) || '115');
  if (isNaN(hvVoltage)) hvVoltage = 115;
  const fluidType = (item && (item.fluid || item.fluidType || item.TYPE_OF_INSULATION)) || 'Mineral oil';
  const isEster = String(fluidType).toLowerCase().includes('ester');
  const vClass = hvVoltage <= 69 ? 1 : (hvVoltage < 230 ? 2 : 3);

  // 1. Dielectric Breakdown
  if (mLower.includes('dielectric breakdown') || mLower.includes('breakdown voltage')) {
    const lim = vClass === 1 ? '≥ 45.0 kV' : (vClass === 2 ? '≥ 52.0 kV' : '≥ 55.0 kV');
    return `ASTM D1816, Limit: ${lim}`;
  }

  // 2. Water Content
  if (mLower.includes('water content') || mLower.includes('moisture')) {
    let lim = '';
    if (!isEster) {
      lim = vClass === 1 ? '≤ 30 ppm' : (vClass === 2 ? '≤ 20 ppm' : '≤ 15 ppm');
    } else {
      lim = vClass === 1 ? '≤ 300 ppm' : (vClass === 2 ? '≤ 150 ppm' : '≤ 100 ppm');
    }
    return `ASTM D1533, Limit: ${lim}`;
  }

  // 3. Power Factor at 25 °C
  if (mLower.includes('25') && (mLower.includes('power factor') || mLower.includes('pf'))) {
    return isEster ? 'ASTM D924, Limit: ≤ 2.00%' : 'ASTM D924, Limit: ≤ 0.40%';
  }

  // 4. Power Factor at 100 °C
  if (mLower.includes('100') && (mLower.includes('power factor') || mLower.includes('pf'))) {
    return isEster ? 'ASTM D924, Limit: ≤ 5.00%' : 'ASTM D924, Limit: ≤ 4.00%';
  }

  // 5. IFT / Interfacial Tension
  if (mLower.includes('ift') || mLower.includes('interfacial tension')) {
    const lim = vClass === 1 ? '≥ 28.0 mN/m' : (vClass === 2 ? '≥ 33.0 mN/m' : '≥ 35.0 mN/m');
    return `ASTM D971, Limit: ${lim}`;
  }

  // 6. Acidity / Neutralization Number
  if (mLower.includes('acidity') || mLower.includes('neutralization')) {
    const lim = vClass === 1 ? '≤ 0.17 mgKOH/g' : (vClass === 2 ? '≤ 0.12 mgKOH/g' : '≤ 0.07 mgKOH/g');
    return `ASTM D974, Limit: ${lim}`;
  }

  // 7. Oil Conductivity
  if (mLower.includes('conductivity')) {
    return 'IEC 61620, Limit: ≤ 4.0 pS/m';
  }

  // 8. Color Number
  if (mLower.includes('color')) {
    return 'ASTM D1500, Limit: ≤ 2.0';
  }

  // 9. Inhibitor
  if (mLower.includes('inhibitor')) {
    return 'IEC 60296, Limit: ≥ 0.10 wt%';
  }

  // 10. Estimated DP
  if (mLower.includes('estimated dp') || mLower.includes('dp')) {
    return 'Chendong / IEC, Limit: ≥ 700 DP';
  }

  // 11. Furan [2-FAL]
  if (mLower.includes('furan')) {
    return 'ASTM D5837, Limit: ≤ 700 ppb';
  }

  // 12. Sludge condition
  if (mLower.includes('sludge')) {
    return 'IEC 60422, Limit: ≤ 0.018 wt%';
  }

  // 13. Corrosive Sulfur
  if (mLower.includes('corrosive sulfur') || mLower.includes('sulfur')) {
    return 'DIN 51353, Limit: Non-corr. (≤ 2e)';
  }

  // 14. Passivator
  if (mLower.includes('passivator') || mLower.includes('irgamet')) {
    return 'IEC 60666, Limit: ≥ 70 ppm';
  }

  // 15. DGA / Dissolved Gas Analysis
  if (mLower.includes('dga') || mLower.includes('dissolve') || subLower.includes('dga')) {
    return 'IEEE C57.104-2019, Status: 1 (Normal)';
  }

  // 16. Visual Inspection
  if (mLower.includes('visual')) {
    return 'IEEE C57.152-2013, Normal Condition';
  }

  // 17. Insulation Resistance & PI
  if (mLower.includes('insulation resistance') || mLower.includes('pi')) {
    return 'IEEE C57.152-2013, PI ≥ 1.25, IR ≥ 10,000 MΩ';
  }

  // 18. Power Factor & Capacitance (Winding / Active Part)
  if (ptLower.includes('active')) {
    if (mLower.includes('capacitance') || mLower.includes('cap')) {
      return 'IEEE C57.152-2013, Limit: Cap Dev ≤ ±5.0%';
    }
    if (mLower.includes('power factor') || mLower.includes('pf')) {
      return 'IEEE C57.152-2013, Limit: PF ≤ 0.50%';
    }
  }

  // 19. Turn Ratio
  if (mLower.includes('turn ratio') || mLower.includes('ratio')) {
    return 'IEEE C57.152-2013, Limit: Ratio Error ≤ ±0.50%';
  }

  // 20. Exciting Current
  if (mLower.includes('exciting')) {
    return 'IEEE C57.152-2013, Limit: Phase Diff ≤ 5%';
  }

  // 21. Winding Resistance
  if (mLower.includes('winding resistance') || mLower.includes('resistance')) {
    return 'IEEE C57.152-2013, Limit: Phase Dev ≤ 2.0%';
  }

  // 22. Short Circuit Impedance
  if (mLower.includes('short circuit') || mLower.includes('impedance')) {
    return 'IEEE C57.152-2013, Limit: Dev from Nameplate ≤ ±3.0%';
  }

  // 23. Bushing Power Factor & Capacitance (Dynamic per Manufacturer & Insulation Type Criteria)
  if (ptLower.includes('bushing') || subLower.includes('bushing')) {
    const isLv = subLower.includes('lv') || subLower.includes('x');
    const bushInfoSource = (typeof bushingInfoCsvData !== 'undefined' && Array.isArray(bushingInfoCsvData)) ? bushingInfoCsvData : (typeof window !== 'undefined' && window.bushingInfoCsvData ? window.bushingInfoCsvData : null);
    const serialVal = (item && (item.serial || item.SERIAL_NUMBER || item.Serial_No || item.Serial_no)) || '';
    
    let mfg = 'IEEE C57.152-2013';
    let type = 'OIP';

    if (bushInfoSource && serialVal) {
      const cleanTarget = String(serialVal).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const recs = bushInfoSource.filter(r => {
        const s = String(r.Parent_Serial_No || r.serial || r.Serial_No || '').trim();
        const cleanS = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return (s.toLowerCase() === String(serialVal).toLowerCase()) || (cleanS && cleanTarget && cleanS === cleanTarget);
      });

      const filtered = recs.filter(r => {
        const pos = String(r.Phase || r.phase || '').trim().toUpperCase();
        if (isLv) {
          return pos.startsWith('X') || pos.startsWith('LV');
        } else {
          return pos.startsWith('H') || (!pos.startsWith('X') && !pos.startsWith('LV'));
        }
      });

      const targetRec = filtered.length > 0 ? filtered[0] : (recs.length > 0 ? recs[0] : null);
      if (targetRec) {
        mfg = String(targetRec.Manufacturer || targetRec.MANUFACTURER || targetRec.Maker || '').trim();
        const rawType = String(targetRec.Type || targetRec.Bushing_Type || targetRec.Insulation || '').trim().toUpperCase();
        type = rawType.includes('RIP') ? 'RIP' : (rawType.includes('RIS') ? 'RIS' : 'OIP');
      }
    }

    const mfgUpper = mfg.toUpperCase();
    const isPf = mLower.includes('power factor') || mLower.includes('pf');
    const isCap = mLower.includes('capacitance') || mLower.includes('cap');

    if (mfgUpper.includes('ABB')) {
      if (isPf) return `ABB (${type}), Limit: Error %PF < 75%`;
      if (isCap) return `ABB (${type}), Limit: Error Cap < 3%`;
    } else if (mfgUpper.includes('TRENCH')) {
      if (isPf) return `TRENCH (${type}), Limit: Error %PF 1.5 - Double`;
      if (isCap) return `TRENCH (${type}), Limit: Error Cap < 10%`;
    } else if (mfgUpper.includes('PASSONI') || mfgUpper.includes('VILLA')) {
      if (type === 'RIP') {
        if (isPf) return `PASSONI VILLA (RIP), Limit: Error %PF < 30%`;
        if (isCap) return `PASSONI VILLA (RIP), Limit: Error Cap < 1%`;
      } else {
        if (isPf) return `PASSONI VILLA (OIP), Limit: Error %PF 1.5 - 2x Nameplate`;
        if (isCap) return `PASSONI VILLA (OIP), Limit: Error Cap < 5%`;
      }
    } else if (mfgUpper.includes('MGC') || mfgUpper.includes('MOSER')) {
      if (type === 'RIP') {
        if (isPf) return `MGC (RIP), Limit: %PF < 0.70%`;
        if (isCap) return `MGC (RIP), Limit: Error Cap < 10%`;
      } else {
        if (isPf) return `MGC (OIP), Limit: Error %PF 1.5 - 2x Nameplate`;
        if (isCap) return `MGC (OIP), Limit: Error Cap < 5%`;
      }
    }

    if (isPf) return `IEEE C57.152-2013 (${type}), Limit: Error %PF 1.5 - 2x Nameplate`;
    if (isCap) return `IEEE C57.152-2013 (${type}), Limit: Error Cap < 5%`;
  }

  // 24. Surge Arrester
  if (ptLower.includes('arrester') || mLower.includes('arrester') || mLower.includes('surge')) {
    return 'IEEE C57.152-2013, Limit: Leakage ≤ 0.50 mA, IR ≥ 10,000 MΩ';
  }

  // 25. OLTC Oil / OLTC Breakdown / Water Content / DGA
  if (ptLower.includes('oltc') || subLower.includes('oltc') || mLower.includes('oltc')) {
    if (mLower.includes('breakdown') || mLower.includes('dielectric')) {
      return 'IEEE C57.152 Table 5 / IEC 60156, Limit: ≥ 40.0 kV (Good) / ≥ 30 kV (Min)';
    }
    if (mLower.includes('water') || mLower.includes('moisture')) {
      return 'IEEE C57.139 / IEC 60422, Limit: ≤ 30 ppm (Flashover risk > 50 ppm)';
    }
    if (mLower.includes('dga') || mLower.includes('gas') || mLower.includes('acetylene') || mLower.includes('c2h2')) {
      return 'IEEE C57.139 / CIGRE 761 (TB 443), Condition Level A–B (C2H2 ≤ 100 ppm)';
    }
    if (mLower.includes('dynamic') || mLower.includes('drm')) {
      return 'IEEE C57.152-2013, Limit: Ripple ≤ 10%, Deviation ≤ ±5%';
    }
  }

  return '';
}

// ==========================================
// getMeasuredValueForItem: Dynamic CSV query & Scoring
// ==========================================
function getMeasuredValueForItem(itemName, item, ptName, subName) {
  const serialVal = item.serial || item.SERIAL_NUMBER || item['Serial No'];
  const nameLower = (itemName || '').toLowerCase();
  const ptLower = (ptName || '').toLowerCase();
  const subLower = (subName || '').toLowerCase();

  const trInfoItem = (typeof trInfoCsvData !== 'undefined') ? findLatestRecord(trInfoCsvData, serialVal) : null;
  const isOltcNA = trInfoItem && trInfoItem.TAP_CHANGER_TYPE && (trInfoItem.TAP_CHANGER_TYPE.includes('NLTC') || trInfoItem.TAP_CHANGER_TYPE.includes('DETC'));

  if (ptLower.includes('oltc') && isOltcNA) {
    return { value: 'N/A (DETC/NLTC)', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

    // FDS Moisture in Paper (DFRData.csv)
  if (nameLower.includes('moisture in paper') || nameLower.includes('fds') || nameLower.includes('dfr')) {
    const latestDfr = (typeof dfrCsvData !== 'undefined') ? findLatestRecord(dfrCsvData, serialVal) : null;
    if (latestDfr) {
      const date = latestDfr['Test Date'] || latestDfr.date || latestDfr.Date;
      const rawM = latestDfr['PercentMoisture (CHL)'] || latestDfr.PercentMoisture || latestDfr['Percent Moisture'];
      if (rawM !== undefined && rawM !== '' && rawM !== '-') {
        const numM = parseFloat(rawM);
        if (!isNaN(numM)) {
          let score = 5;
          let cat = 'Dry';
          let rec = '-';
          if (numM > 3.5) {
            score = 1;
            cat = 'Wet / Excessive';
            rec = 'High Moisture in Paper: Urgent insulation dry-out required';
          } else if (numM > 2.0) {
            score = 3;
            cat = 'Moderate';
            rec = 'Elevated Moisture in Paper: Plan insulation drying';
          }
          return {
            value: `${numM.toFixed(1)}% [${cat}]`,
            testDate: date,
            ratingScore: score,
            recommendation: rec
          };
        }
      }
    }
    const rawVal = item['%Moisture in paper (FDS)'] || item.moisturePaper;
    if (rawVal && rawVal !== 'N/A' && rawVal !== '-') {
      const isGood = rawVal === 'A' || rawVal === 'Good';
      return {
        value: isGood ? '0.5% [Dry]' : 'Elevated Moisture',
        testDate: item.dateToAssess || '-',
        ratingScore: isGood ? 5 : 3,
        recommendation: isGood ? '-' : 'Investigate paper moisture'
      };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 1. General Visual Inspection (VisualData.csv)
  if (nameLower.includes('visual inspection') || nameLower.includes('visual')) {
    const latestVis = (typeof visualCsvData !== 'undefined') ? findLatestRecord(visualCsvData, serialVal) : null;
    if (latestVis) {
      const date = latestVis.Date || latestVis.date || latestVis.DATE;
      const abnormalRemarks = [];

      Object.keys(latestVis).forEach(key => {
        const val = String(latestVis[key] || '').trim();
        const valUpper = val.toUpperCase();
        if (key.toLowerCase().endsWith('_result')) {
          if (valUpper === 'ABNORMAL' || valUpper === 'U' || valUpper === 'UNACCEPTABLE' || valUpper === 'CRITICAL' || valUpper === 'POOR' || valUpper === 'ACTION') {
            const baseName = key.slice(0, -7);
            const remarkKey = baseName + '_remark';
            const foundKey = Object.keys(latestVis).find(k => k.toLowerCase() === remarkKey.toLowerCase());
            const remarkVal = foundKey ? latestVis[foundKey] : '';
            const cleanRemark = String(remarkVal || '').trim();
            if (cleanRemark && cleanRemark !== '-' && cleanRemark !== 'Normal' && !abnormalRemarks.includes(cleanRemark)) {
              abnormalRemarks.push(cleanRemark);
            } else {
              const readableName = baseName.replace(/_/g, ' ');
              if (!abnormalRemarks.includes(readableName)) {
                abnormalRemarks.push(readableName);
              }
            }
          }
        }
      });

      ['comment1', 'comment2', 'comment3', 'comment4', 'comment5', 'comment6'].forEach(ck => {
        const cVal = String(latestVis[ck] || '').trim();
        if (cVal && cVal !== '-' && (cVal.toLowerCase().includes('leak') || cVal.toLowerCase().includes('abnormal') || cVal.toLowerCase().includes('defect') || cVal.toLowerCase().includes('low') || cVal.toLowerCase().includes('crack') || cVal.toLowerCase().includes('rust'))) {
          if (!abnormalRemarks.some(r => r.toLowerCase() === cVal.toLowerCase() || cVal.toLowerCase().includes(r.toLowerCase()))) {
            abnormalRemarks.push(cVal);
          }
        }
      });

      if (abnormalRemarks.length > 0) {
        const cleanedRemarks = [];
        abnormalRemarks.forEach(r => {
          let s = String(r || '').trim();
          if (!s || s === '-' || s.toLowerCase() === 'normal') return;
          s = s.replace(/The butterfly valve was found to have an oil leak\.?/gi, 'Butterfly valve oil leak')
               .replace(/CT box was found as oil leak\.?/gi, 'BCT box oil leak')
               .replace(/was found to have an oil leak\.?/gi, 'oil leak')
               .replace(/was found as oil leak\.?/gi, 'oil leak')
               .replace(/Oil level almost low\.?/gi, 'Oil level low')
               .replace(/\.+$/, '');
          if (!cleanedRemarks.some(existing => existing.toLowerCase() === s.toLowerCase() || existing.toLowerCase().includes(s.toLowerCase()))) {
            cleanedRemarks.push(s);
          }
        });

        const summaryText = cleanedRemarks.length > 0 ? cleanedRemarks.join(', ') : abnormalRemarks.join(', ');
        return {
          value: summaryText,
          testDate: date,
          ratingScore: 3,
          recommendation: 'Plan visual maintenance / Repair defects'
        };
      } else {
        return {
          value: 'Normal',
          testDate: date,
          ratingScore: 5,
          recommendation: '-'
        };
      }
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 2. Magnetic Core (IRandPIData.csv)
  if ((subLower.includes('magnetic') || subLower.includes('core') || ptLower.includes('magnetic')) && nameLower.includes('insulation resistance')) {
    const latestPi = (typeof irPiCsvData !== 'undefined') ? findLatestRecord(irPiCsvData, serialVal) : null;
    if (latestPi) {
      const date = latestPi.date || latestPi.Date || latestPi.DATE;
      const comment = String(latestPi.comment || latestPi.Comment || '').trim();
      const commentUpper = comment.toUpperCase();

      const getValidVal = (...keys) => {
        for (let k of keys) {
          const val = latestPi[k];
          if (val !== undefined && val !== null && val !== '-' && val !== 'N/A' && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
        return null;
      };

      const cg = getValidVal('coregnd', 'core_gnd');
      const cf = getValidVal('coreframe', 'core_frame', 'coreclamp');
      const fg = getValidVal('framegnd', 'frame_gnd', 'clampgnd');

      let isCannotTest = commentUpper.includes('CANNOT TEST') || commentUpper.includes('CAN NOT TEST') || commentUpper.includes('ไม่สามารถทดสอบได้');

      const evaluateIrScore = (numIr) => {
        if (numIr < 10) return 1;
        if (numIr < 100) return 2;
        if (numIr < 300) return 3;
        if (numIr < 500) return 4;
        return 5;
      };

      if (isCannotTest || (!cg && !cf && !fg)) {
        const subUpper = String(subName || '').toUpperCase();
        let fallbackIr = getValidVal('H_10', 'L_10', 'T_10');
        if (subUpper.includes('LV')) fallbackIr = getValidVal('L_10', 'L_1');
        if (subUpper.includes('TV')) fallbackIr = getValidVal('T_10', 'T_1');

        if (!isCannotTest && fallbackIr) {
          const numIr = parseFloat(fallbackIr);
          if (!isNaN(numIr) && numIr > 0) {
            const score = evaluateIrScore(numIr);
            const valStr = `${numIr >= 500 ? Math.round(numIr) : numIr.toFixed(1)} MΩ`;
            return { value: valStr, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Check insulation resistance' };
          }
        }
        return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
      }

      const parts = [];
      if (cg) parts.push(`Core-Gnd: ${cg} MΩ`);
      if (cf) parts.push(`Core-Clamp: ${cf} MΩ`);
      if (fg) parts.push(`Clamp-Gnd: ${fg} MΩ`);
      const resStr = parts.join('<br>');

      const valNums = [cg, cf, fg].map(v => parseFloat(v)).filter(n => !isNaN(n) && n > 0);
      let score = 5;
      if (valNums.length > 0) {
        score = evaluateIrScore(Math.min(...valNums));
      }
      return { value: resStr, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Inspect core insulation & grounding' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 3. Exciting Current (ExcitingData.csv)
  if (nameLower.includes('exciting current')) {
    const latestExciting = (typeof excitingCsvData !== 'undefined') ? findLatestRecord(excitingCsvData, serialVal) : null;
    if (latestExciting) {
      const date = latestExciting.DATE || latestExciting.Date || latestExciting.date;
      
      const pNum = (v) => {
        if (v === undefined || v === null || v === '' || v === '-' || v === 'N/A') return NaN;
        const n = parseFloat(v);
        return isNaN(n) ? NaN : n;
      };

      let h1 = pNum(latestExciting.H1CENTER);
      let h2 = pNum(latestExciting.H2CENTER);
      let h3 = pNum(latestExciting.H3CENTER);
      let tapName = '';

      if (isNaN(h1) || isNaN(h2) || isNaN(h3)) {
        if (!isNaN(pNum(latestExciting.H1NO1)) && !isNaN(pNum(latestExciting.H2NO1)) && !isNaN(pNum(latestExciting.H3NO1))) {
          h1 = pNum(latestExciting.H1NO1);
          h2 = pNum(latestExciting.H2NO1);
          h3 = pNum(latestExciting.H3NO1);
          tapName = latestExciting.H1TAP1 ? ` (Tap ${latestExciting.H1TAP1})` : '';
        } else if (!isNaN(pNum(latestExciting.H1NO2)) && !isNaN(pNum(latestExciting.H2NO2)) && !isNaN(pNum(latestExciting.H3NO2))) {
          h1 = pNum(latestExciting.H1NO2);
          h2 = pNum(latestExciting.H2NO2);
          h3 = pNum(latestExciting.H3NO2);
          tapName = latestExciting.H1TAP2 ? ` (Tap ${latestExciting.H1TAP2})` : '';
        } else if (!isNaN(pNum(latestExciting.H1MAX)) && !isNaN(pNum(latestExciting.H2MAX)) && !isNaN(pNum(latestExciting.H3MAX))) {
          h1 = pNum(latestExciting.H1MAX);
          h2 = pNum(latestExciting.H2MAX);
          h3 = pNum(latestExciting.H3MAX);
          tapName = ' (Max Tap)';
        } else if (!isNaN(pNum(latestExciting.H1MIN)) && !isNaN(pNum(latestExciting.H2MIN)) && !isNaN(pNum(latestExciting.H3MIN))) {
          h1 = pNum(latestExciting.H1MIN);
          h2 = pNum(latestExciting.H2MIN);
          h3 = pNum(latestExciting.H3MIN);
          tapName = ' (Min Tap)';
        } else if (!isNaN(pNum(latestExciting.H1COM1)) && !isNaN(pNum(latestExciting.H2COM1)) && !isNaN(pNum(latestExciting.H3COM1))) {
          h1 = pNum(latestExciting.H1COM1);
          h2 = pNum(latestExciting.H2COM1);
          h3 = pNum(latestExciting.H3COM1);
        } else if (!isNaN(pNum(latestExciting.X1)) && !isNaN(pNum(latestExciting.X2)) && !isNaN(pNum(latestExciting.X3))) {
          h1 = pNum(latestExciting.X1);
          h2 = pNum(latestExciting.X2);
          h3 = pNum(latestExciting.X3);
        }
      }

      if (!isNaN(h1) && !isNaN(h2) && !isNaN(h3) && h1 > 0 && h2 > 0 && h3 > 0) {
        let patternName = 'H-L-H';
        if (h1 > h2 && h3 > h2) {
          patternName = 'H-L-H';
        } else if (h2 > h1 && h2 > h3) {
          patternName = 'L-H-L';
        } else if (Math.abs(h1 - h2) / Math.max(h1, h2) <= 0.05 && Math.abs(h2 - h3) / Math.max(h2, h3) <= 0.05) {
          patternName = 'H-H-H';
        } else if (h1 > h3 && h2 > h3) {
          patternName = 'H-H-L';
        } else if (h3 > h1 && h2 > h1) {
          patternName = 'L-H-H';
        }

        const outerDiff = (Math.abs(h1 - h3) / Math.max(h1, h3)) * 100;
        let score = 5;
        if (outerDiff <= 5.0 && (h2 <= h1 && h2 <= h3)) {
          score = 5;
        } else if (outerDiff <= 10.0 && (h2 <= h1 && h2 <= h3)) {
          score = 4;
        } else if (outerDiff <= 15.0) {
          score = 3;
        } else if (outerDiff <= 25.0) {
          score = 2;
        } else {
          score = 1;
        }

        const valStr = `H1: ${h1.toFixed(1)}, H2: ${h2.toFixed(1)}, H3: ${h3.toFixed(1)} mA${tapName}<br>Pattern: ${patternName}`;
        let recStr = '-';
        if (score === 3) recStr = 'Core demagnetization recommended (IEEE C57.152 / CIGRE TB 761)';
        else if (score === 2) recStr = 'Check core grounding & perform FRA (IEEE C57.152 / CIGRE TB 761)';
        else if (score === 1) recStr = 'Investigate turn short / core damage immediately (IEEE C57.152 / CIGRE TB 761)';

        return { value: valStr, testDate: date, ratingScore: score, recommendation: recStr };
      }
    }

    const rawEx = item['Exciting Current'] || (item.activePart && item.activePart.excitingCurrent);
    if (rawEx && rawEx !== 'N/A' && rawEx !== '-') {
      const isGood = rawEx === 'A' || rawEx === 'Good' || rawEx === '5';
      return {
        value: isGood ? 'Balanced (Normal Pattern)' : 'Pattern Variance Detected',
        testDate: item.dateToAssess || item['Date To Assess'] || '-',
        ratingScore: isGood ? 5 : 3,
        recommendation: isGood ? '-' : 'Investigate exciting current pattern'
      };
    }

    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 4. Single Phase Short Circuit Impedance (SingleShortData.csv: 3 Taps Display)
  if (nameLower.includes('single phase short circuit') || nameLower.includes('single phase impedance') || (nameLower.includes('single') && (nameLower.includes('short') || nameLower.includes('impedance')))) {
    const latestSingleShort = (typeof singleShortCsvData !== 'undefined') ? findLatestRecord(singleShortCsvData, serialVal) : null;
    if (latestSingleShort) {
      const date = latestSingleShort.Date || latestSingleShort.date;
      const maxDev = parseFloat(latestSingleShort.HV_Max_Dev);
      const cenDev = parseFloat(latestSingleShort.HV_Cen_Dev);
      const minDev = parseFloat(latestSingleShort.HV_Min_Dev);
      const tap1Dev = parseFloat(latestSingleShort.HV_Tap1_Dev);
      const tap1Name = latestSingleShort.HV_Tap1 && latestSingleShort.HV_Tap1 !== '-' ? `Tap ${latestSingleShort.HV_Tap1}` : 'Tap 1';

      const parts = [];
      if (!isNaN(maxDev)) parts.push(`Max: ${maxDev.toFixed(2)}%`);
      if (!isNaN(cenDev)) parts.push(`Cen: ${cenDev.toFixed(2)}%`);
      if (!isNaN(minDev)) parts.push(`Min: ${minDev.toFixed(2)}%`);

      if (parts.length === 0) {
        if (!isNaN(tap1Dev)) {
          parts.push(`${tap1Name}: ${tap1Dev.toFixed(2)}%`);
        } else if (latestSingleShort.Single_Phase_Result && latestSingleShort.Single_Phase_Result !== '-' && !isNaN(parseFloat(latestSingleShort.Single_Phase_Result))) {
          const resNum = parseFloat(latestSingleShort.Single_Phase_Result);
          parts.push(`%Dev: ${resNum.toFixed(2)}%`);
        }
      }

      const validDevs = [maxDev, cenDev, minDev, tap1Dev, parseFloat(latestSingleShort.Single_Phase_Result)].filter(v => !isNaN(v));
      if (parts.length === 0 || validDevs.length === 0) {
        return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
      }

      const val = parts.join(', ');
      const worstDev = Math.max(...validDevs.map(Math.abs));
      const score = worstDev <= 3.0 ? 5 : (worstDev <= 5.0 ? 3 : 1);
      return { value: val, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Inspect 1-phase winding impedance (IEEE C57.152)' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 5. Three Phase Short Circuit Impedance (ThreeShortData.csv: 3 Taps Display)
  if (nameLower.includes('three phase short circuit') || nameLower.includes('three phase impedance') || (nameLower.includes('three') && nameLower.includes('short')) || (nameLower.includes('short circuit') && !nameLower.includes('single'))) {
    const latestThreeShort = (typeof threeShortCsvData !== 'undefined') ? findLatestRecord(threeShortCsvData, serialVal) : null;
    if (latestThreeShort) {
      const date = latestThreeShort.Date || latestThreeShort.date;
      const maxDev = parseFloat(latestThreeShort.HV_Max_Dev);
      const cenDev = parseFloat(latestThreeShort.HV_Cen_Dev);
      const minDev = parseFloat(latestThreeShort.HV_Min_Dev);
      const tap1Dev = parseFloat(latestThreeShort.HV_Tap1_Dev);
      const tap1Name = latestThreeShort.HV_Tap1 && latestThreeShort.HV_Tap1 !== '-' ? `Tap ${latestThreeShort.HV_Tap1}` : 'Tap 1';

      const parts = [];
      if (!isNaN(maxDev)) parts.push(`Max: ${maxDev.toFixed(2)}%`);
      if (!isNaN(cenDev)) parts.push(`Cen: ${cenDev.toFixed(2)}%`);
      if (!isNaN(minDev)) parts.push(`Min: ${minDev.toFixed(2)}%`);

      if (parts.length === 0) {
        if (!isNaN(tap1Dev)) {
          parts.push(`${tap1Name}: ${tap1Dev.toFixed(2)}%`);
        } else if (latestThreeShort.Short_Circuit_Impedance_Result && latestThreeShort.Short_Circuit_Impedance_Result !== '-' && !isNaN(parseFloat(latestThreeShort.Short_Circuit_Impedance_Result))) {
          const resNum = parseFloat(latestThreeShort.Short_Circuit_Impedance_Result);
          parts.push(`%Dev: ${resNum.toFixed(2)}%`);
        }
      }

      const validDevs = [maxDev, cenDev, minDev, tap1Dev, parseFloat(latestThreeShort.Short_Circuit_Impedance_Result)].filter(v => !isNaN(v));
      if (parts.length === 0 || validDevs.length === 0) {
        return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
      }

      const val = parts.join(', ');
      const worstDev = Math.max(...validDevs.map(Math.abs));
      const score = worstDev <= 3.0 ? 5 : (worstDev <= 5.0 ? 3 : 1);
      return { value: val, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Inspect 3-phase impedance (IEEE C57.152)' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 6. Turn Ratio (RatioData.csv)
  if (nameLower.includes('turn ratio') || nameLower.includes('ratio')) {
    const latestRatio = (typeof ratioCsvData !== 'undefined') ? findLatestRecord(ratioCsvData, serialVal) : null;
    if (latestRatio) {
      const date = latestRatio.date || latestRatio.Date;

      const trInfoItem = (typeof trInfoCsvData !== 'undefined') ? findLatestRecord(trInfoCsvData, serialVal) : null;
      const noWinding = parseInt(item.NO_WINDING || (trInfoItem && trInfoItem.NO_WINDING) || item.noWinding || '2', 10);
      const tvRated = parseFloat(item.LV2_RATED || (trInfoItem && trInfoItem.LV2_RATED) || '0');
      const vectorGroup = String(item.VECTOR_GROUP || (trInfoItem && trInfoItem.VECTOR_GROUP) || item.vectorGroup || '').toUpperCase();
      const isAuto = vectorGroup.includes('AUTO') || vectorGroup.includes('NA0') || vectorGroup.includes('YNA');
      const is3W = !isAuto && (noWinding === 3 || tvRated > 0 || /\([a-z0-9]+\)/i.test(vectorGroup) || /(d11d11|d11d1|yn0d|yn0y|yn11d)/i.test(vectorGroup));

      const getPhaseMaxErr = (...vals) => {
        const valid = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (valid.length === 0) return null;
        return Math.max(...valid.map(Math.abs));
      };

      const maxErrMax = getPhaseMaxErr(latestRatio.H1_max_err, latestRatio.H2_max_err, latestRatio.H3_max_err);
      const maxErrCen = getPhaseMaxErr(latestRatio.H1_cen_err, latestRatio.H2_cen_err, latestRatio.H3_cen_err);
      const maxErrMin = getPhaseMaxErr(latestRatio.H1_min_err, latestRatio.H2_min_err, latestRatio.H3_min_err);

      // For 3-winding TV tap data (from H1_err1, H2_err1, H3_err1 when H-Y service tap is present)
      const isHyValid = latestRatio.H1_ratio1 && latestRatio.H1_ratio1 !== '-' && !isNaN(parseFloat(latestRatio.H1_ratio1)) && parseFloat(latestRatio.H1_ratio1) > 0;
      const hasHyData = isHyValid && latestRatio.H1_tap_N1 && latestRatio.H1_tap_N1 !== '-';
      const maxErrTv = hasHyData ? getPhaseMaxErr(latestRatio.H1_err1, latestRatio.H2_err1, latestRatio.H3_err1) : getPhaseMaxErr(latestRatio.HT_H1_cen_err, latestRatio.HT_H2_cen_err, latestRatio.HT_H3_cen_err);

      // Overall worst error across all tested points
      let allTestedErrs = [maxErrMax, maxErrCen, maxErrMin, maxErrTv].filter(x => x !== null);
      if (allTestedErrs.length === 0 && latestRatio.MAXERR && !isNaN(parseFloat(latestRatio.MAXERR))) {
        allTestedErrs.push(Math.abs(parseFloat(latestRatio.MAXERR)));
      }

      if (allTestedErrs.length > 0) {
        const worstErr = Math.max(...allTestedErrs);
        const score = worstErr <= 0.50 ? 5 : (worstErr <= 1.00 ? 3 : 1);
        let val = '';

        if (is3W) {
          // 3-Winding: Separate into HV:LV and HV:TV
          let hvLvParts = [];
          if (maxErrMax !== null) hvLvParts.push(`Max: ${maxErrMax.toFixed(2)}%`);
          if (maxErrCen !== null) hvLvParts.push(`Cen: ${maxErrCen.toFixed(2)}%`);
          if (maxErrMin !== null) hvLvParts.push(`Min: ${maxErrMin.toFixed(2)}%`);
          if (hvLvParts.length === 0 && maxErrCen === null && worstErr !== null) {
            hvLvParts.push(`Cen: ${worstErr.toFixed(2)}%`);
          }

          let hvTvParts = [];
          if (maxErrTv !== null) {
            hvTvParts.push(`Cen: ${maxErrTv.toFixed(2)}%`);
          }

          const hvLvStr = `HV:LV (${hvLvParts.join(', ')})`;
          const hvTvStr = hvTvParts.length > 0 ? `HV:TV (${hvTvParts.join(', ')})` : 'HV:TV (Cen: -)';
          val = `${hvLvStr}<br>${hvTvStr}`;
        } else {
          // 2-Winding / Auto Transformer: Show all tested Taps
          let tapParts = [];
          if (maxErrMax !== null) tapParts.push(`Max: ${maxErrMax.toFixed(2)}%`);
          if (maxErrCen !== null) tapParts.push(`Cen: ${maxErrCen.toFixed(2)}%`);
          if (maxErrMin !== null) tapParts.push(`Min: ${maxErrMin.toFixed(2)}%`);

          // Check if discrete service tap exists (e.g. Tap 1)
          if (latestRatio.H1_tap_N1 && latestRatio.H1_tap_N1 !== '-' && latestRatio.H1_ratio1 && latestRatio.H1_ratio1 !== '-') {
            const sErr = getPhaseMaxErr(latestRatio.H1_err1, latestRatio.H2_err1, latestRatio.H3_err1);
            if (sErr !== null) {
              tapParts.push(`Tap ${latestRatio.H1_tap_N1}: ${sErr.toFixed(2)}%`);
            }
          }

          if (tapParts.length > 0) {
            val = `Tap (${tapParts.join(', ')})`;
          } else {
            val = `%Dev: ${worstErr.toFixed(2)}%`;
          }
        }

        return {
          value: val,
          testDate: date,
          ratingScore: score,
          recommendation: score >= 4 ? '-' : 'Check turn ratio / tap changer (IEEE C57.152: %Dev ≤ 0.5%)'
        };
      }
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 7. Winding Resistance (WindingData.csv)
  if (nameLower.includes('winding resistance')) {
    const latestWinding = (typeof windingCsvData !== 'undefined') ? findLatestRecord(windingCsvData, serialVal) : null;
    if (latestWinding) {
      const date = latestWinding.DATE || latestWinding.Date || latestWinding.date;
      const isTv = nameLower.includes('tv') || String(subName || '').toLowerCase().includes('tv') || String(subName || '').toLowerCase().includes('tertiary');
      const isLv = !isTv && (nameLower.includes('lv') || String(subName || '').toLowerCase().includes('lv'));

      const trInfoItem = (typeof trInfoCsvData !== 'undefined') ? findLatestRecord(trInfoCsvData, serialVal) : null;
      const rawTapStr = String(item.TAP_CHANGER_TYPE || item.tapChangerType || (trInfoItem && trInfoItem.TAP_CHANGER_TYPE) || '').toUpperCase();
      const hasOltc = !rawTapStr.includes('DETC') && !rawTapStr.includes('NLTC') && !rawTapStr.includes('FIX') && item.oltc !== 'N/A' && item.oltcOil !== 'N/A';

      const hasMaxMin = latestWinding.DEVMAX && latestWinding.DEVMAX !== '-' && latestWinding.DEVMIN && latestWinding.DEVMIN !== '-';
      const isOltcMode = hasOltc || hasMaxMin;

      let val = '';
      let devPhase = 0;
      let devFat = 0;
      let tapDetails = [];

      if (isTv) {
        // TV Winding (Tertiary)
        devPhase = Math.abs(parseFloat(latestWinding.DEVT) || parseFloat(latestWinding.MAXYERR) || 0);
        devFat = Math.abs(parseFloat(latestWinding.MAXYERR) || parseFloat(latestWinding.MAXERR) || 0);
        val = `Phase: ${devPhase.toFixed(2)}%<br>FAT: ${devFat.toFixed(2)}%`;
      } else if (isLv) {
        // LV Winding
        devPhase = Math.abs(parseFloat(latestWinding.DEVX) || parseFloat(latestWinding.DEVMAXX) || 0);
        devFat = Math.abs(parseFloat(latestWinding.MAXXERR) || parseFloat(latestWinding.MAXERR) || 0);
        val = `Phase: ${devPhase.toFixed(2)}%<br>FAT: ${devFat.toFixed(2)}%`;
      } else if (isOltcMode && hasMaxMin) {
        // HV Winding with OLTC (Tests at Tap Max, Center, Min)
        const devMax = Math.abs(parseFloat(latestWinding.DEVMAX) || 0);
        const devCen = Math.abs(parseFloat(latestWinding.DEVCENTER) || 0);
        const devMin = Math.abs(parseFloat(latestWinding.DEVMIN) || 0);
        devPhase = Math.max(devMax, devCen, devMin);
        devFat = Math.abs(parseFloat(latestWinding.MAXERR) || parseFloat(latestWinding.DEVMAXX) || 0);

        val = `Tap (Max: ${devMax.toFixed(2)}%, Cen: ${devCen.toFixed(2)}%, Min: ${devMin.toFixed(2)}%)<br>FAT: ${devFat.toFixed(2)}%`;
        if (devMax > 2.0) tapDetails.push(`Tap Max ${devMax.toFixed(2)}%`);
        if (devCen > 2.0) tapDetails.push(`Tap Cen ${devCen.toFixed(2)}%`);
        if (devMin > 2.0) tapDetails.push(`Tap Min ${devMin.toFixed(2)}%`);
      } else {
        // HV Winding with DETC / Specific Tap
        let specificTapName = 'Tap Cen';
        if (latestWinding.H1TAP1 && latestWinding.H1TAP1 !== '-' && latestWinding.H1TAP1 !== '') {
          specificTapName = `Tap ${latestWinding.H1TAP1}`;
        } else if (latestWinding.DEVCENTER && latestWinding.DEVCENTER !== '-' && latestWinding.DEVCENTER !== '') {
          specificTapName = 'Tap Cen';
        }

        devPhase = Math.abs(parseFloat(latestWinding.DEVTAP1) || parseFloat(latestWinding.DEVCENTER) || parseFloat(latestWinding.DEVMAX) || parseFloat(latestWinding.DEVMAXX) || 0);
        devFat = Math.abs(parseFloat(latestWinding.MAXERR) || parseFloat(latestWinding.DEVMAXX) || 0);
        val = `${specificTapName}: ${devPhase.toFixed(2)}%<br>FAT: ${devFat.toFixed(2)}%`;
        if (devPhase > 2.0) tapDetails.push(`${specificTapName} ${devPhase.toFixed(2)}%`);
      }

      // Scoring according to IEEE C57.152-2013:
      // Standard Limit: %Dev between Phase <= 2%, %DEV from FAT/Oldest <= 5%
      let score = 5;
      if (devPhase <= 1.0 && devFat <= 3.0) {
        score = 5;
      } else if (devPhase <= 2.0 && devFat <= 5.0) {
        score = 4;
      } else if (devPhase <= 3.0 || devFat <= 7.0) {
        score = 3;
      } else if (devPhase <= 5.0 || devFat <= 10.0) {
        score = 2;
      } else {
        score = 1;
      }

      let rec = '-';
      if (score < 4) {
        if (isTv) {
          rec = `Check TV winding resistance & connections (IEEE C57.152: Phase Dev ≤ 2%, FAT Dev ≤ 5%)`;
        } else if (isLv) {
          rec = `Check LV winding resistance & connections (IEEE C57.152: Phase Dev ≤ 2%, FAT Dev ≤ 5%)`;
        } else if (isOltcMode && hasMaxMin) {
          const detailStr = tapDetails.length > 0 ? ` at ${tapDetails.join(', ')}` : '';
          rec = `Check HV winding resistance & OLTC tap contacts${detailStr} (IEEE C57.152: Phase Dev ≤ 2%, FAT Dev ≤ 5%)`;
        } else {
          const detailStr = tapDetails.length > 0 ? ` at ${tapDetails.join(', ')}` : '';
          rec = `Check HV winding resistance & DETC tap contacts${detailStr} (IEEE C57.152: Phase Dev ≤ 2%, FAT Dev ≤ 5%)`;
        }
      }

      return { value: val, testDate: date, ratingScore: score, recommendation: rec };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 8. Power Factor (WindingPFData.csv)
  if ((nameLower === 'power factor' || nameLower.includes('power factor')) && !ptLower.includes('bushing') && !subLower.includes('bushing') && !nameLower.includes('bushing') && !nameLower.includes('oil') && !nameLower.includes('at 25') && !nameLower.includes('at 100')) {
    const latestWindingPf = (typeof windingPfCsvData !== 'undefined') ? findLatestRecord(windingPfCsvData, serialVal) : null;
    if (latestWindingPf) {
      const date = latestWindingPf.date || latestWindingPf.Date;
      const isTv = nameLower.includes('tv') || String(subName || '').toLowerCase().includes('tv') || String(subName || '').toLowerCase().includes('tertiary');
      const isLv = !isTv && (nameLower.includes('lv') || String(subName || '').toLowerCase().includes('lv'));

      const trInfoItem = (typeof trInfoCsvData !== 'undefined') ? findLatestRecord(trInfoCsvData, serialVal) : null;
      const insulationType = String(item.TYPE_OF_INSULATION || (trInfoItem && trInfoItem.TYPE_OF_INSULATION) || '').toLowerCase();
      const isNaturalEster = insulationType.includes('ester') || insulationType.includes('fr3') || insulationType.includes('natural');
      const hvRated = parseFloat(item.HV_RATED || item.HV_Voltage || (trInfoItem && trInfoItem.HV_RATED) || '115');
      const is230kVorAbove = hvRated >= 230;

      const vg = String((item && (item.VECTOR_GROUP || item.vectorGroup)) || (trInfoItem && trInfoItem.VECTOR_GROUP) || '').toUpperCase();
      const mt = String((item && (item.MODEL_TYPE || item.modelType)) || (trInfoItem && trInfoItem.MODEL_TYPE) || '').toUpperCase();
      const app = String((item && (item.APPLICATION || item.Service_Type)) || (trInfoItem && (trInfoItem.APPLICATION || trInfoItem.Service_Type)) || '').toUpperCase();
      const spec = String((item && (item.SPECIFICATION || item.REMARK || item.MODEL_TYPE)) || (trInfoItem && (trInfoItem.SPECIFICATION || trInfoItem.REMARK || trInfoItem.MODEL_TYPE)) || '').toUpperCase();
      const noWindingStr = String((item && (item.NO_WINDING || item.no_winding)) || (trInfoItem && trInfoItem.NO_WINDING) || '').trim();
      const lv2Rated = String((item && item.LV2_RATED) || (trInfoItem && trInfoItem.LV2_RATED) || '').trim();

      const isAuto = vg.includes('YNA') || vg.includes('AUTO') || mt.includes('AUTO') || app.includes('AUTO') || spec.includes('AUTO');
      const is3Winding = !isAuto && (noWindingStr === '3' || (lv2Rated !== '' && lv2Rated !== '-' && lv2Rated !== '0') || spec.includes('3W'));

      const isValidPfNum = (v) => {
        if (v === undefined || v === null) return false;
        const s = String(v).trim();
        if (s === '' || s === '-' || s === 'N/A' || s === 'null') return false;
        const num = parseFloat(s);
        return !isNaN(num) && num > 0;
      };

      const getPfVal = (v2, v1) => {
        if (isValidPfNum(v2)) return parseFloat(v2);
        if (isValidPfNum(v1)) return parseFloat(v1);
        return null;
      };

      let val = '';
      let maxPf = 0;
      let hasValidData = false;

      if (isAuto) {
        // Auto Transformer: HV (CH, CHT), LV (-, -), TV (CT, CTH)
        if (isLv) {
          return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
        } else if (isTv) {
          const ct = getPfVal(latestWindingPf.ct_pf_2, latestWindingPf.ct_pf_1);
          const cth = getPfVal(latestWindingPf.cth_pf_2, latestWindingPf.cth_pf_1);
          const maxTv = isValidPfNum(latestWindingPf.maxtv_tand) ? parseFloat(latestWindingPf.maxtv_tand) : null;
          const validValues = [ct, cth, maxTv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const ctStr = ct !== null ? `${ct.toFixed(2)}%` : '-';
            const cthStr = cth !== null ? `${cth.toFixed(2)}%` : '-';
            val = `CT: ${ctStr}, CTH: ${cthStr}`;
          }
        } else {
          // HV Winding: CH, CHT (stored in ch_pf and chl_pf)
          const ch = getPfVal(latestWindingPf.ch_pf_2, latestWindingPf.ch_pf_1);
          const cht = getPfVal(latestWindingPf.chl_pf_2, latestWindingPf.chl_pf_1);
          const maxHv = isValidPfNum(latestWindingPf.maxhv_tand) ? parseFloat(latestWindingPf.maxhv_tand) : null;
          const validValues = [ch, cht, maxHv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const chStr = ch !== null ? `${ch.toFixed(2)}%` : '-';
            const chtStr = cht !== null ? `${cht.toFixed(2)}%` : '-';
            val = `CH: ${chStr}, CHT: ${chtStr}`;
          }
        }
      } else if (is3Winding) {
        // 3 Winding: HV (CH, CHL), LV (CL, CLT), TV (CT, CTH)
        if (isTv) {
          const ct = getPfVal(latestWindingPf.ct_pf_2, latestWindingPf.ct_pf_1);
          const cth = getPfVal(latestWindingPf.cth_pf_2, latestWindingPf.cth_pf_1);
          const maxTv = isValidPfNum(latestWindingPf.maxtv_tand) ? parseFloat(latestWindingPf.maxtv_tand) : null;
          const validValues = [ct, cth, maxTv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const ctStr = ct !== null ? `${ct.toFixed(2)}%` : '-';
            const cthStr = cth !== null ? `${cth.toFixed(2)}%` : '-';
            val = `CT: ${ctStr}, CTH: ${cthStr}`;
          }
        } else if (isLv) {
          const cl = getPfVal(latestWindingPf.cl_pf_2, latestWindingPf.cl_pf_1);
          const clt = getPfVal(latestWindingPf.clh_pf_2, latestWindingPf.clh_pf_1);
          const maxLv = isValidPfNum(latestWindingPf.maxlv_tand) ? parseFloat(latestWindingPf.maxlv_tand) : null;
          const validValues = [cl, clt, maxLv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const clStr = cl !== null ? `${cl.toFixed(2)}%` : '-';
            const cltStr = clt !== null ? `${clt.toFixed(2)}%` : '-';
            val = `CL: ${clStr}, CLT: ${cltStr}`;
          }
        } else {
          // HV Winding: CH, CHL
          const ch = getPfVal(latestWindingPf.ch_pf_2, latestWindingPf.ch_pf_1);
          const chl = getPfVal(latestWindingPf.chl_pf_2, latestWindingPf.chl_pf_1);
          const maxHv = isValidPfNum(latestWindingPf.maxhv_tand) ? parseFloat(latestWindingPf.maxhv_tand) : null;
          const validValues = [ch, chl, maxHv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const chStr = ch !== null ? `${ch.toFixed(2)}%` : '-';
            const chlStr = chl !== null ? `${chl.toFixed(2)}%` : '-';
            val = `CH: ${chStr}, CHL: ${chlStr}`;
          }
        }
      } else {
        // 2 Winding: HV (CH, CHL), LV (CL, CLH), TV (-, -)
        if (isTv) {
          return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
        } else if (isLv) {
          const cl = getPfVal(latestWindingPf.cl_pf_2, latestWindingPf.cl_pf_1);
          const clh = getPfVal(latestWindingPf.clh_pf_2, latestWindingPf.clh_pf_1);
          const maxLv = isValidPfNum(latestWindingPf.maxlv_tand) ? parseFloat(latestWindingPf.maxlv_tand) : null;
          const validValues = [cl, clh, maxLv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const clStr = cl !== null ? `${cl.toFixed(2)}%` : '-';
            const clhStr = clh !== null ? `${clh.toFixed(2)}%` : '-';
            val = `CL: ${clStr}, CLH: ${clhStr}`;
          }
        } else {
          // HV Winding: CH, CHL
          const ch = getPfVal(latestWindingPf.ch_pf_2, latestWindingPf.ch_pf_1);
          const chl = getPfVal(latestWindingPf.chl_pf_2, latestWindingPf.chl_pf_1);
          const maxHv = isValidPfNum(latestWindingPf.maxhv_tand) ? parseFloat(latestWindingPf.maxhv_tand) : null;
          const validValues = [ch, chl, maxHv].filter(v => v !== null);
          if (validValues.length > 0) {
            hasValidData = true;
            maxPf = Math.max(...validValues);
            const chStr = ch !== null ? `${ch.toFixed(2)}%` : '-';
            const chlStr = chl !== null ? `${chl.toFixed(2)}%` : '-';
            val = `CH: ${chStr}, CHL: ${chlStr}`;
          }
        }
      }

      if (!hasValidData) {
        return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
      }

      // Scoring criteria:
      // 1. Mineral Oil < 230 kV: 5 (<0.4%), 4 (0.4-0.5%), 3 (0.5-0.7%), 2 (0.7-1.0%), 1 (>1.0%)
      // 2. Mineral Oil >= 230 kV: 5 (<0.3%), 4 (0.3-0.4%), 3 (0.4-0.6%), 2 (0.6-1.0%), 1 (>1.0%)
      // 3. Natural Ester: 5 (<0.7%), 4 (0.7-0.8%), 3 (0.8-0.9%), 2 (0.9-1.0%), 1 (>1.0%)
      let score = 5;
      let rec = '-';

      if (isNaturalEster) {
        if (maxPf < 0.7) {
          score = 5;
        } else if (maxPf <= 0.8) {
          score = 4;
        } else if (maxPf <= 0.9) {
          score = 3;
          rec = 'Check winding insulation & moisture (Natural Ester: PF 0.8-0.9%)';
        } else if (maxPf <= 1.0) {
          score = 2;
          rec = 'High Power Factor - recondition insulation (Natural Ester: PF 0.9-1.0%)';
        } else {
          score = 1;
          rec = 'Critical Power Factor - exceeds 1.0% limit, investigate insulation breakdown';
        }
      } else if (is230kVorAbove) {
        if (maxPf < 0.3) {
          score = 5;
        } else if (maxPf <= 0.4) {
          score = 4;
        } else if (maxPf <= 0.6) {
          score = 3;
          rec = 'Check winding insulation & oil moisture (Mineral Oil ≥ 230 kV: PF 0.4-0.6%)';
        } else if (maxPf <= 1.0) {
          score = 2;
          rec = 'High Power Factor - recondition or dry out insulation (Mineral Oil ≥ 230 kV: PF 0.6-1.0%)';
        } else {
          score = 1;
          rec = 'Critical Power Factor - exceeds 1.0% service limit, investigate insulation breakdown';
        }
      } else {
        // Mineral Oil < 230 kV
        if (maxPf < 0.4) {
          score = 5;
        } else if (maxPf <= 0.5) {
          score = 4;
        } else if (maxPf <= 0.7) {
          score = 3;
          rec = 'Check winding insulation & oil moisture (Mineral Oil < 230 kV: PF 0.5-0.7%)';
        } else if (maxPf <= 1.0) {
          score = 2;
          rec = 'High Power Factor - recondition or dry out insulation (Mineral Oil < 230 kV: PF 0.7-1.0%)';
        } else {
          score = 1;
          rec = 'Critical Power Factor - exceeds 1.0% service limit, investigate insulation breakdown';
        }
      }

      return { value: val, testDate: date, ratingScore: score, recommendation: rec };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 9. Winding Capacitance (%Error from FAT/Oldest) (WindingPFData.csv)
  if (nameLower.includes('capacitance') && !ptLower.includes('bushing') && !subLower.includes('bushing') && !nameLower.includes('bushing') && !nameLower.includes('oil') && !nameLower.includes('surge') && !nameLower.includes('arrester')) {
    const latestWindingPf = (typeof windingPfCsvData !== 'undefined') ? findLatestRecord(windingPfCsvData, serialVal) : null;
    if (latestWindingPf) {
      const date = latestWindingPf.date || latestWindingPf.Date;
      const isTv = nameLower.includes('tv') || String(subName || '').toLowerCase().includes('tv') || String(subName || '').toLowerCase().includes('tertiary');
      const isLv = !isTv && (nameLower.includes('lv') || String(subName || '').toLowerCase().includes('lv'));

      const trInfoItem = (typeof trInfoCsvData !== 'undefined') ? findLatestRecord(trInfoCsvData, serialVal) : null;
      const vg = String((item && (item.VECTOR_GROUP || item.vectorGroup)) || (trInfoItem && trInfoItem.VECTOR_GROUP) || '').toUpperCase();
      const mt = String((item && (item.MODEL_TYPE || item.modelType)) || (trInfoItem && trInfoItem.MODEL_TYPE) || '').toUpperCase();
      const app = String((item && (item.APPLICATION || item.Service_Type)) || (trInfoItem && (trInfoItem.APPLICATION || trInfoItem.Service_Type)) || '').toUpperCase();
      const spec = String((item && (item.SPECIFICATION || item.REMARK || item.MODEL_TYPE)) || (trInfoItem && (trInfoItem.SPECIFICATION || trInfoItem.REMARK || trInfoItem.MODEL_TYPE)) || '').toUpperCase();
      const noWindingStr = String((item && (item.NO_WINDING || item.no_winding)) || (trInfoItem && trInfoItem.NO_WINDING) || '').trim();
      const lv2Rated = String((item && item.LV2_RATED) || (trInfoItem && trInfoItem.LV2_RATED) || '').trim();

      const isAuto = vg.includes('YNA') || vg.includes('AUTO') || mt.includes('AUTO') || app.includes('AUTO') || spec.includes('AUTO');
      const is3Winding = !isAuto && (noWindingStr === '3' || (lv2Rated !== '' && lv2Rated !== '-' && lv2Rated !== '0') || spec.includes('3W'));

      const isValidNum = (v) => {
        if (v === undefined || v === null) return false;
        const s = String(v).trim();
        if (s === '' || s === '-' || s === 'N/A' || s === 'null') return false;
        const num = parseFloat(s);
        return !isNaN(num);
      };

      const sUpper = String(serialVal || '').trim().toUpperCase();
      const oldestWindingPf = (typeof windingPfCsvData !== 'undefined') ? (function(dataset, serial) {
        if (!dataset || !serial) return null;
        const matches = dataset.filter(r => (r.serial || r.SERIAL_NUMBER || r.Serial_no || r.Serial_No || '').toUpperCase() === sUpper);
        if (matches.length === 0) return null;
        matches.sort((a, b) => new Date(a.date || a.DATE || 0) - new Date(b.date || b.DATE || 0));
        return matches[0];
      })(windingPfCsvData, serialVal) : null;

      const facItem = (typeof factoryDataCsvData !== 'undefined' && Array.isArray(factoryDataCsvData))
        ? factoryDataCsvData.find(x => String(x.Serial_No || x.serial || '').trim().toUpperCase() === sUpper)
        : null;

      const getCapDev = (currentCap, fallbackObjVal, fatCap, oldestCap, fallbackMaxVal) => {
        if (isValidNum(fallbackObjVal)) return Math.abs(parseFloat(fallbackObjVal));
        if (isValidNum(currentCap)) {
          const cur = parseFloat(currentCap);
          if (cur > 0) {
            if (isValidNum(fatCap)) {
              const fat = parseFloat(fatCap);
              if (fat > 0) return Math.abs(((cur - fat) / fat) * 100);
            }
            if (isValidNum(oldestCap)) {
              const old = parseFloat(oldestCap);
              if (old > 0) return Math.abs(((cur - old) / old) * 100);
            }
          }
        }
        if (isValidNum(fallbackMaxVal)) return Math.abs(parseFloat(fallbackMaxVal));
        return null;
      };

      let val = '';
      let errFat = null;
      let hasValidData = false;

      if (isAuto) {
        // Auto Transformer: HV (CH, CHT), LV (-, -), TV (CT, CTH)
        if (isLv) {
          return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
        } else if (isTv) {
          const fatCT = facItem ? (facItem.PF_C_Winding_TG || facItem.PF_C_Winding_T) : null;
          const fatCTH = facItem ? facItem.PF_C_Winding_TH : null;
          const ctDev = getCapDev(latestWindingPf.ct_cap, latestWindingPf.Object8, fatCT, oldestWindingPf ? oldestWindingPf.ct_cap : null, latestWindingPf.maxctv_change);
          const cthDev = getCapDev(latestWindingPf.cth_cap, latestWindingPf.Object9, fatCTH, oldestWindingPf ? oldestWindingPf.cth_cap : null, latestWindingPf.maxctv_change);
          const validDevs = [ctDev, cthDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const ctStr = ctDev !== null ? `${ctDev.toFixed(2)}%` : '-';
            const cthStr = cthDev !== null ? `${cthDev.toFixed(2)}%` : '-';
            val = `CT %Dev: ${ctStr}, CTH %Dev: ${cthStr}`;
          }
        } else {
          // HV Winding: CH, CHT (stored in ch_cap/Object2 and chl_cap/Object3)
          const fatCH = facItem ? (facItem.PF_C_Winding_HG || facItem.PF_C_Winding_H) : null;
          const fatCHT = facItem ? (facItem.PF_C_Winding_TH || facItem.PF_C_Winding_HL) : null;
          const chDev = getCapDev(latestWindingPf.ch_cap, latestWindingPf.Object2, fatCH, oldestWindingPf ? oldestWindingPf.ch_cap : null, latestWindingPf.maxchv_change);
          const chtDev = getCapDev(latestWindingPf.chl_cap, latestWindingPf.Object3, fatCHT, oldestWindingPf ? oldestWindingPf.chl_cap : null, latestWindingPf.maxchv_change);
          const validDevs = [chDev, chtDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const chStr = chDev !== null ? `${chDev.toFixed(2)}%` : '-';
            const chtStr = chtDev !== null ? `${chtDev.toFixed(2)}%` : '-';
            val = `CH %Dev: ${chStr}, CHT %Dev: ${chtStr}`;
          }
        }
      } else if (is3Winding) {
        // 3 Winding: HV (CH, CHL), LV (CL, CLT), TV (CT, CTH)
        if (isTv) {
          const fatCT = facItem ? (facItem.PF_C_Winding_TG || facItem.PF_C_Winding_T) : null;
          const fatCTH = facItem ? facItem.PF_C_Winding_TH : null;
          const ctDev = getCapDev(latestWindingPf.ct_cap, latestWindingPf.Object8, fatCT, oldestWindingPf ? oldestWindingPf.ct_cap : null, latestWindingPf.maxctv_change);
          const cthDev = getCapDev(latestWindingPf.cth_cap, latestWindingPf.Object9, fatCTH, oldestWindingPf ? oldestWindingPf.cth_cap : null, latestWindingPf.maxctv_change);
          const validDevs = [ctDev, cthDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const ctStr = ctDev !== null ? `${ctDev.toFixed(2)}%` : '-';
            const cthStr = cthDev !== null ? `${cthDev.toFixed(2)}%` : '-';
            val = `CT %Dev: ${ctStr}, CTH %Dev: ${cthStr}`;
          }
        } else if (isLv) {
          const fatCL = facItem ? (facItem.PF_C_Winding_LG || facItem.PF_C_Winding_L) : null;
          const fatCLT = facItem ? (facItem.PF_C_Winding_LH || facItem.PF_C_Winding_LT) : null;
          const clDev = getCapDev(latestWindingPf.cl_cap, latestWindingPf.Object5, fatCL, oldestWindingPf ? oldestWindingPf.cl_cap : null, latestWindingPf.maxclv_change);
          const cltDev = getCapDev(latestWindingPf.clh_cap, latestWindingPf.Object6, fatCLT, oldestWindingPf ? oldestWindingPf.clh_cap : null, latestWindingPf.maxclv_change);
          const validDevs = [clDev, cltDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const clStr = clDev !== null ? `${clDev.toFixed(2)}%` : '-';
            const cltStr = cltDev !== null ? `${cltDev.toFixed(2)}%` : '-';
            val = `CL %Dev: ${clStr}, CLT %Dev: ${cltStr}`;
          }
        } else {
          // HV Winding: CH, CHL
          const fatCH = facItem ? (facItem.PF_C_Winding_HG || facItem.PF_C_Winding_H) : null;
          const fatCHL = facItem ? (facItem.PF_C_Winding_HL || facItem.PF_C_Winding_HLHG) : null;
          const chDev = getCapDev(latestWindingPf.ch_cap, latestWindingPf.Object2, fatCH, oldestWindingPf ? oldestWindingPf.ch_cap : null, latestWindingPf.maxchv_change);
          const chlDev = getCapDev(latestWindingPf.chl_cap, latestWindingPf.Object3, fatCHL, oldestWindingPf ? oldestWindingPf.chl_cap : null, latestWindingPf.maxchv_change);
          const validDevs = [chDev, chlDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const chStr = chDev !== null ? `${chDev.toFixed(2)}%` : '-';
            const chlStr = chlDev !== null ? `${chlDev.toFixed(2)}%` : '-';
            val = `CH %Dev: ${chStr}, CHL %Dev: ${chlStr}`;
          }
        }
      } else {
        // 2 Winding: HV (CH, CHL), LV (CL, CLH), TV (-, -)
        if (isTv) {
          return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
        } else if (isLv) {
          const fatCL = facItem ? (facItem.PF_C_Winding_LG || facItem.PF_C_Winding_L) : null;
          const fatCLH = facItem ? (facItem.PF_C_Winding_LH || facItem.PF_C_Winding_LT) : null;
          const clDev = getCapDev(latestWindingPf.cl_cap, latestWindingPf.Object5, fatCL, oldestWindingPf ? oldestWindingPf.cl_cap : null, latestWindingPf.maxclv_change);
          const clhDev = getCapDev(latestWindingPf.clh_cap, latestWindingPf.Object6, fatCLH, oldestWindingPf ? oldestWindingPf.clh_cap : null, latestWindingPf.maxclv_change);
          const validDevs = [clDev, clhDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const clStr = clDev !== null ? `${clDev.toFixed(2)}%` : '-';
            const clhStr = clhDev !== null ? `${clhDev.toFixed(2)}%` : '-';
            val = `CL %Dev: ${clStr}, CLH %Dev: ${clhStr}`;
          }
        } else {
          // HV Winding: CH, CHL
          const fatCH = facItem ? (facItem.PF_C_Winding_HG || facItem.PF_C_Winding_H) : null;
          const fatCHL = facItem ? (facItem.PF_C_Winding_HL || facItem.PF_C_Winding_HLHG) : null;
          const chDev = getCapDev(latestWindingPf.ch_cap, latestWindingPf.Object2, fatCH, oldestWindingPf ? oldestWindingPf.ch_cap : null, latestWindingPf.maxchv_change);
          const chlDev = getCapDev(latestWindingPf.chl_cap, latestWindingPf.Object3, fatCHL, oldestWindingPf ? oldestWindingPf.chl_cap : null, latestWindingPf.maxchv_change);
          const validDevs = [chDev, chlDev].filter(v => v !== null);
          if (validDevs.length > 0) {
            hasValidData = true;
            errFat = Math.max(...validDevs);
            const chStr = chDev !== null ? `${chDev.toFixed(2)}%` : '-';
            const chlStr = chlDev !== null ? `${chlDev.toFixed(2)}%` : '-';
            val = `CH %Dev: ${chStr}, CHL %Dev: ${chlStr}`;
          }
        }
      }

      if (!hasValidData || errFat === null) {
        return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
      }

      // Scoring criteria: IEEE C57.152-2013 (%Dev <= 5.0%)
      let score = 5;
      if (errFat <= 1.0) {
        score = 5;
      } else if (errFat <= 5.0) {
        score = 4;
      } else if (errFat <= 7.0) {
        score = 3;
      } else if (errFat <= 10.0) {
        score = 2;
      } else {
        score = 1;
      }

      const rec = score >= 4 ? '-' : 'Check winding capacitance & deformation (IEEE C57.152: %Dev ≤ 5%)';
      return { value: val, testDate: date, ratingScore: score, recommendation: rec };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 10. Insulation Resistance and PI (IRandPIData.csv)
  if (nameLower.includes('polarization index') || nameLower.includes('pi') || nameLower.includes('insulation resistance and pi')) {
    const latestPi = (typeof irPiCsvData !== 'undefined') ? findLatestRecord(irPiCsvData, serialVal) : null;
    if (latestPi) {
      const date = latestPi.date || latestPi.Date || latestPi.DATE;
      const comment = String(latestPi.comment || latestPi.Comment || '').trim();
      const commentUpper = comment.toUpperCase();
      const subUpper = String(subName || '').toUpperCase();
      const itemUpper = String(itemName || '').toUpperCase();

      const getValidVal = (...keys) => {
        for (let k of keys) {
          const val = latestPi[k];
          if (val !== undefined && val !== null && val !== '-' && val !== 'N/A' && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
        return null;
      };

      let rawPi = null;
      let windingKey = 'HV';

      if (itemUpper.includes('HV-LV') || subUpper.includes('HV-LV')) {
        windingKey = 'HV-LV';
        rawPi = getValidVal('HV-LV', 'HV_LV', 'H_L_PI');
      } else if (itemUpper.includes('HV-TV') || subUpper.includes('HV-TV')) {
        windingKey = 'HV-TV';
        rawPi = getValidVal('HV-TV', 'HV_TV', 'H_T_PI');
      } else if (subUpper.includes('LV') || itemUpper.includes('LV WINDING') || itemUpper.includes('LV')) {
        windingKey = 'LV';
        rawPi = getValidVal('L_PI', 'l_pi', 'LV_PI');
      } else if (subUpper.includes('TV') || subUpper.includes('TERTIARY') || itemUpper.includes('TV WINDING') || itemUpper.includes('TV')) {
        windingKey = 'TV';
        rawPi = getValidVal('T_PI', 't_pi', 'TV_PI');
      } else {
        windingKey = 'HV';
        rawPi = getValidVal('H_PI', 'h_pi', 'HV_PI');
      }

      if (commentUpper.includes(windingKey)) {
        const regex = new RegExp(windingKey + '[\\s:=]+([0-9.]+)', 'i');
        const match = comment.match(regex);
        if (match && match[1]) rawPi = match[1];
      }

      let isCannotTest = false;
      if (windingKey === 'HV' && (commentUpper.includes('HV SIDE CAN NOT TEST') || commentUpper.includes('HIGH VOLTAGE WINDING CANNOT TEST') || commentUpper.includes('HV ไม่สามารถทดสอบได้'))) isCannotTest = true;
      else if (windingKey === 'LV' && (commentUpper.includes('LV CANNOT TEST') || commentUpper.includes('LV ไม่สามารถ'))) isCannotTest = true;
      else if (windingKey === 'TV' && (commentUpper.includes('NO TERTIARY') || commentUpper.includes('TV CANNOT TEST') || commentUpper.includes('TV ไม่สามารถ'))) isCannotTest = true;

      // Fallback calculation from 10m/1m resistance if explicit PI not given for the target winding
      if (!rawPi && !isCannotTest) {
        if (windingKey === 'HV') {
          const h10 = parseFloat(latestPi.H_10);
          const h1 = parseFloat(latestPi.H_1);
          if (!isNaN(h10) && !isNaN(h1) && h1 > 0) {
            rawPi = (h10 / h1).toFixed(4);
          }
        } else if (windingKey === 'LV') {
          const l10 = parseFloat(latestPi.L_10);
          const l1 = parseFloat(latestPi.L_1);
          if (!isNaN(l10) && !isNaN(l1) && l1 > 0) {
            rawPi = (l10 / l1).toFixed(4);
          }
        } else if (windingKey === 'TV') {
          const t10 = parseFloat(latestPi.T_10);
          const t1 = parseFloat(latestPi.T_1);
          if (!isNaN(t10) && !isNaN(t1) && t1 > 0) {
            rawPi = (t10 / t1).toFixed(4);
          }
        }
      }

      if (isCannotTest || !rawPi) {
        return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
      }

      const numPi = parseFloat(rawPi);
      if (isNaN(numPi) || numPi <= 0) return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };

      let score = 5;
      if (numPi <= 1.00) score = 1;
      else if (numPi < 1.10) score = 2;
      else if (numPi < 1.25) score = 3;
      else if (numPi < 2.00) score = 4;
      else score = 5;

      const valStr = 'PI = ' + (numPi > 100 ? numPi.toFixed(1) : numPi.toFixed(2));
      const rec = score >= 4 ? '-' : (score === 3 ? 'Monitor insulation dryness' : 'Perform insulation drying process');
      return { value: valStr, testDate: date, ratingScore: score, recommendation: rec };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 10. Oil & DGA (MTOilData.csv)
  const latestMt = (typeof mtOilCsvData !== 'undefined') ? findLatestRecord(mtOilCsvData, serialVal) : null;
  if (nameLower.includes('dga') || nameLower.includes('dissolve gas')) {
    if (latestMt) {
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const ieeeRes = (latestMt.IEEE_C57_104 || latestMt.IEEE_C57_155 || latestMt.Test_Result || '').toUpperCase();
      const h2   = parseFloat(latestMt.H2 || 0);
      const ch4  = parseFloat(latestMt.CH4 || 0);
      const c2h6 = parseFloat(latestMt.C2H6 || 0);
      const c2h4 = parseFloat(latestMt.C2H4 || 0);
      const c2h2 = parseFloat(latestMt.C2H2 || 0);
      const co   = parseFloat(latestMt.CO || 0);

      const trInfoItem = (typeof trInfoCsvData !== 'undefined' && trInfoCsvData && trInfoCsvData.length > 0 && serialVal)
        ? findLatestRecord(trInfoCsvData, serialVal)
        : (item?.trInfo || (typeof TR_DATA !== 'undefined' ? TR_DATA.find(x => String(x.SERIAL_NUMBER || x.Serial_No || '').trim().toLowerCase() === String(serialVal).trim().toLowerCase()) : null));
      const fluidType = String((item && (item.TYPE_OF_INSULATION || item.fluid)) || (trInfoItem && (trInfoItem.TYPE_OF_INSULATION || trInfoItem.WINDING_INSULATION)) || '').trim().toLowerCase();
      const isEster = fluidType.includes('ester') || fluidType.includes('fr3') || fluidType.includes('natural');

      let isCritical = false;
      let isCaution = false;

      if (isEster) {
        // IEEE C57.155-2014 (Natural Ester & Synthetic Ester)
        // Arcing/Thermal Fault (Status 3): C2H2 > 35 or C2H4 > 200 or H2 > 1000 or CH4 > 300 or C2H6 > 600
        // Caution/Monitoring (Status 2): C2H2 > 1 or C2H4 > 40 or H2 > 300 or CH4 > 50 or C2H6 > 250 or CO > 500
        isCritical = ieeeRes.includes('STATUS 3') || ieeeRes.includes('CRITICAL') || h2 > 1000 || ch4 > 300 || c2h6 > 600 || c2h4 > 200 || c2h2 > 35;
        isCaution = ieeeRes.includes('STATUS 2') || ieeeRes.includes('CAUTION') || ieeeRes.includes('MONITOR') || h2 > 300 || ch4 > 50 || c2h6 > 250 || c2h4 > 40 || c2h2 > 1 || co > 500;
      } else {
        // IEEE C57.104-2019 (Mineral Oil)
        // Status 3 Fault: C2H2 > 35 or C2H4 > 200 or H2 > 700 or CH4 > 400
        // Status 2 Caution: C2H2 > 1 or C2H4 > 50 or H2 > 100 or CH4 > 120 or C2H6 > 65 or CO > 350
        isCritical = ieeeRes.includes('STATUS 3') || ieeeRes.includes('CRITICAL') || h2 > 700 || ch4 > 400 || c2h4 > 200 || c2h2 > 35;
        isCaution = ieeeRes.includes('STATUS 2') || ieeeRes.includes('CAUTION') || ieeeRes.includes('MONITOR') || h2 > 100 || ch4 > 120 || c2h6 > 65 || c2h4 > 50 || c2h2 > 1 || co > 350;
      }

      if (isCritical) {
        return { 
          value: isEster ? 'Critical (IEEE C57.155 Status 3 Fault)' : 'Critical (IEEE C57.104 Status 3 Fault)', 
          testDate: date, 
          ratingScore: 1, 
          recommendation: 'Perform DGA trend & fault investigation' 
        };
      } else if (isCaution) {
        return { 
          value: isEster ? 'Monitoring (IEEE C57.155 Gas Exceed Table 1)' : 'Monitoring (IEEE C57.104 Gas Exceed Table 2)', 
          testDate: date, 
          ratingScore: 3, 
          recommendation: 'Perform DGA trend analysis & monitor gas generation' 
        };
      } else {
        return { 
          value: 'Normal (No Fault Detected)', 
          testDate: date, 
          ratingScore: 5, 
          recommendation: '-' 
        };
      }
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('dielectrc breakdown') || nameLower.includes('dielectric breakdown')) {
    if (latestMt && latestMt.BD) {
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const bdvVal = latestMt.BD;
      const numBdv = parseFloat(bdvVal);
      const hvVal = parseFloat(item.HV_RATED || item.hvRate || item['HV Rate (kV)'] || 115);
      let minTable5 = 47;
      if (hvVal <= 69) minTable5 = 40;
      else if (hvVal >= 230) minTable5 = 50;

      let score = 5;
      if (numBdv < minTable5) score = 1;
      else if (numBdv === minTable5) score = 2;
      else if (numBdv <= minTable5 + 4) score = 3;
      else if (numBdv <= minTable5 + 7) score = 4;
      else score = 5;

      return { value: `${bdvVal} kV`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : `Plan oil filtration (Min ${minTable5} kV)` };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('water content') && !ptLower.includes('oltc') && !subLower.includes('oltc')) {
    if (latestMt && latestMt.WC) {
      const date = latestMt.Date || latestMt.date;
      const wcVal = latestMt.WC;
      const numWc = parseFloat(wcVal);
      const score = numWc <= 15 ? 5 : (numWc <= 25 ? 4 : 3);
      return { value: `${wcVal} ppm`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Monitor water content' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('interfatial tension') || nameLower.includes('ift')) {
    if (latestMt && latestMt.IFT) {
      const date = latestMt.Date || latestMt.date;
      const iftVal = latestMt.IFT;
      return { value: `${iftVal} dynes/cm`, testDate: date, ratingScore: 5, recommendation: '-' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('acidity')) {
    if (latestMt && (latestMt.Acidity_No || latestMt.ACIDITY || latestMt.Acidity)) {
      const acidVal = latestMt.Acidity_No || latestMt.ACIDITY || latestMt.Acidity;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const num = parseFloat(acidVal);
      const score = isNaN(num) ? 5 : (num <= 0.05 ? 5 : (num <= 0.15 ? 4 : 3));
      return { value: `${acidVal} mgKOH/g`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Check acidity' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('conductivity')) {
    if (latestMt && (latestMt.Conductivity || latestMt.CONDUCTIVITY)) {
      const condVal = latestMt.Conductivity || latestMt.CONDUCTIVITY;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      return { value: `${condVal} pS/m`, testDate: date, ratingScore: 5, recommendation: '-' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('color')) {
    if (latestMt && (latestMt.Color_No || latestMt.COLOR)) {
      const colVal = latestMt.Color_No || latestMt.COLOR;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      return { value: `L ${colVal}`, testDate: date, ratingScore: 5, recommendation: '-' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('inhibitor')) {
    if (latestMt && (latestMt.Inhibitor || latestMt.INHIBITOR)) {
      const inhVal = latestMt.Inhibitor || latestMt.INHIBITOR;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      return { value: `${inhVal} %`, testDate: date, ratingScore: 5, recommendation: '-' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('furan') && !nameLower.includes('estimated dp')) {
    if (latestMt && (latestMt.Furan_Analysis || latestMt.FURAN || latestMt.Furan)) {
      const furanVal = latestMt.Furan_Analysis || latestMt.FURAN || latestMt.Furan;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const num = parseFloat(furanVal);
      const score = isNaN(num) ? 5 : (num <= 100 ? 5 : (num <= 500 ? 4 : 3));
      return { value: `${furanVal} ppb`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Monitor paper degradation' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('estimated dp')) {
    let dpVal = null;
    let date = latestMt ? (latestMt.Date || latestMt.date || latestMt.DATE) : '-';
    if (latestMt && (latestMt.Furan_Analysis || latestMt.FURAN || latestMt.Furan)) {
      const fur = parseFloat(latestMt.Furan_Analysis || latestMt.FURAN || latestMt.Furan);
      if (!isNaN(fur) && fur > 0) {
        const furanPpm = fur / 1000;
        const logF = Math.log10(furanPpm);
        const calcDp = Math.round((1.51 - logF) / 0.0035);
        if (!isNaN(calcDp) && calcDp > 0) dpVal = Math.max(100, Math.min(1200, calcDp));
      }
    }
    if (!dpVal) {
      dpVal = item.estimatedDP || item.ESTIMATED_DP || (item['Estimated DP (From Furan)']);
    }
    if (dpVal && dpVal !== '-' && dpVal !== 'N/A') {
      const num = parseFloat(dpVal);
      const score = isNaN(num) ? 5 : (num >= 700 ? 5 : (num >= 450 ? 4 : 3));
      return { value: `${dpVal}`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Monitor DP level' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('sludge')) {
    if (latestMt && (latestMt.Sludge_Condition || latestMt.SLUDGE)) {
      const sludgeVal = latestMt.Sludge_Condition || latestMt.SLUDGE;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const isNon = String(sludgeVal) === '0' || String(sludgeVal).toLowerCase().includes('non') || parseFloat(sludgeVal) < 0.05;
      const valDisplay = isNon ? 'Non-sludge' : `${sludgeVal} %`;
      return { value: valDisplay, testDate: date, ratingScore: isNon ? 5 : 3, recommendation: isNon ? '-' : 'Inspect oil sludge' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('corrosive sulfur')) {
    if (latestMt && (latestMt.Corrosive_Sulfur || latestMt.CORROSIVE_SULFUR)) {
      const corrVal = latestMt.Corrosive_Sulfur || latestMt.CORROSIVE_SULFUR;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const isPass = String(corrVal).toLowerCase().includes('non') || String(corrVal).toLowerCase().includes('pass') || String(corrVal) === '1a' || String(corrVal) === '1b' || String(corrVal) === '0';
      const valDisplay = isPass ? `Non-corrosive (${corrVal})` : `Corrosive (${corrVal})`;
      return { value: valDisplay, testDate: date, ratingScore: isPass ? 5 : 3, recommendation: isPass ? '-' : 'Add passivator' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('passivator') || nameLower.includes('irgamet')) {
    if (latestMt && (latestMt.Passivator !== undefined && latestMt.Passivator !== null && String(latestMt.Passivator).trim() !== '')) {
      const passVal = latestMt.Passivator || latestMt.PASSIVATOR;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const num = parseFloat(passVal);
      const corrVal = String(latestMt.Corrosive_Sulfur || latestMt.CORROSIVE_SULFUR || '').trim();
      const isCorrosive = corrVal && (corrVal.toLowerCase().includes('corrosive') || corrVal.toLowerCase().includes('3b') || corrVal.toLowerCase().includes('4a') || corrVal.toLowerCase().includes('poten'));

      if (isNaN(num) || num <= 0) {
        if (isCorrosive) {
          return { value: '0 ppm (Depleted)', testDate: date, ratingScore: 3, recommendation: 'Add passivator (Irgamet 39)' };
        } else {
          return { value: '0 ppm (Not Added)', testDate: date, ratingScore: 5, recommendation: '-' };
        }
      } else {
        const score = num >= 100 ? 5 : (num >= 50 ? 4 : 3);
        const rec = score >= 4 ? '-' : 'Top up metal passivator (> 100 ppm)';
        return { value: `${num} ppm`, testDate: date, ratingScore: score, recommendation: rec };
      }
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('power factor at 100') || nameLower.includes('pf at 100')) {
    if (latestMt && (latestMt.PF_100 || latestMt.pf_100)) {
      const pfVal = latestMt.PF_100 || latestMt.pf_100;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const num = parseFloat(pfVal);
      const score = isNaN(num) ? 5 : (num <= 1.0 ? 5 : (num <= 3.0 ? 4 : 3));
      return { value: `${pfVal} %`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Check oil PF at 100C' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  if (nameLower.includes('power factor at 25') || nameLower.includes('pf at 25')) {
    if (latestMt && (latestMt.PF_25 || latestMt.pf_25)) {
      const pfVal = latestMt.PF_25 || latestMt.pf_25;
      const date = latestMt.Date || latestMt.date || latestMt.DATE;
      const num = parseFloat(pfVal);
      const score = isNaN(num) ? 5 : (num <= 0.5 ? 5 : (num <= 1.0 ? 4 : 3));
      return { value: `${pfVal} %`, testDate: date, ratingScore: score, recommendation: score >= 4 ? '-' : 'Check oil PF at 25C' };
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 11. OLTC Oil (OLTCOilData.csv)
  if (ptLower.includes('oltc') || subLower.includes('oltc')) {
    const latestOltc = (typeof oltcOilCsvData !== 'undefined') ? findLatestRecord(oltcOilCsvData, serialVal) : null;
    if (nameLower.includes('breakdown voltage') || nameLower.includes('bdv')) {
      if (latestOltc && latestOltc.BD) {
        const date = latestOltc.Date || latestOltc.date;
        const bdv = parseFloat(latestOltc.BD);
        const score = bdv >= 40 ? 5 : (bdv >= 30 ? 4 : (bdv >= 25 ? 3 : (bdv >= 20 ? 2 : 1)));
        const rec = score >= 4 ? '-' : (score === 3 ? 'Plan OLTC oil filtration (BDV 25–39 kV)' : 'Urgent: Reclaim/filter OLTC oil immediately (BDV < 25 kV)');
        return { value: `${latestOltc.BD} kV`, testDate: date, ratingScore: score, recommendation: rec };
      }
    }
    if (nameLower.includes('water content') || nameLower.includes('wc')) {
      if (latestOltc && latestOltc.WC) {
        const date = latestOltc.Date || latestOltc.date;
        const wc = parseFloat(latestOltc.WC);
        const score = wc <= 20 ? 5 : (wc <= 30 ? 4 : (wc <= 40 ? 3 : (wc <= 50 ? 2 : 1)));
        const rec = score >= 4 ? '-' : (wc > 50 ? 'Critical: High moisture > 50 ppm (Risk of dielectric tracking/flashover). Perform dehydration immediately.' : 'Plan OLTC oil dehydration / check breather');
        return { value: `${latestOltc.WC} ppm`, testDate: date, ratingScore: score, recommendation: rec };
      }
    }
    if (nameLower.includes('dga') || nameLower.includes('dissolved gas') || nameLower.includes('c2h2') || nameLower.includes('acetylene')) {
      if (latestOltc) {
        const date = latestOltc.Date || latestOltc.date;
        const c2h2 = parseFloat(latestOltc.A_C2H2 || latestOltc.C2H2 || latestOltc.B_C2H2 || latestOltc.C_C2H2 || 0);
        let score = 5;
        let lvl = 'Level B (Normal)';
        let rec = '-';
        if (c2h2 <= 0) {
          lvl = 'Level A (Excellent)';
          score = 5;
        } else if (c2h2 <= 100) {
          lvl = 'Level B (Normal LTC Pattern)';
          score = 5;
        } else if (c2h2 <= 300) {
          lvl = 'Level C (Suspicious / Watch)';
          score = 4;
          rec = 'Monitor C2H2 evolution rate & perform Duval Triangle 2 analysis';
        } else if (c2h2 <= 500) {
          lvl = 'Level D (Poor / Warning)';
          score = 3;
          rec = 'Perform DRM & Infrared thermography to inspect contact coking/overheating';
        } else {
          lvl = 'Level E/F (Severe Degradation / Danger)';
          score = 1;
          rec = 'Inspect OLTC contacts for severe coking/arcing and verify barrier board for oil migration';
        }
        return { value: `C2H2: ${c2h2.toLocaleString()} ppm (${lvl})`, testDate: date, ratingScore: score, recommendation: rec };
      }
    }
  }

  // 12. Bushing (BushingPFData.csv)
  if (ptLower.includes('bushing') || subLower.includes('bushing') || nameLower.includes('bushing')) {
    const latestBush = (typeof bushingPfCsvData !== 'undefined') ? findLatestRecord(bushingPfCsvData, serialVal) : null;
    if (latestBush) {
      const date = latestBush.Date || latestBush.date;
      const isLv = subLower.includes('lv') || subLower.includes('x');

      if (nameLower.includes('power factor') || nameLower.includes('pf')) {
        if (isLv) {
          const pfX1 = parseFloat(latestBush.xbushing_h1_pf_20c && latestBush.xbushing_h1_pf_20c !== '-' ? latestBush.xbushing_h1_pf_20c : (latestBush.xbushing_h1_pf_tan && latestBush.xbushing_h1_pf_tan !== '-' ? latestBush.xbushing_h1_pf_tan : latestBush.bushing_l1_pf_20c));
          const pfX2 = parseFloat(latestBush.xbushing_h2_pf_20c && latestBush.xbushing_h2_pf_20c !== '-' ? latestBush.xbushing_h2_pf_20c : (latestBush.xbushing_h2_pf_tan && latestBush.xbushing_h2_pf_tan !== '-' ? latestBush.xbushing_h2_pf_tan : latestBush.bushing_l2_pf_20c));
          const pfX3 = parseFloat(latestBush.xbushing_h3_pf_20c && latestBush.xbushing_h3_pf_20c !== '-' ? latestBush.xbushing_h3_pf_20c : (latestBush.xbushing_h3_pf_tan && latestBush.xbushing_h3_pf_tan !== '-' ? latestBush.xbushing_h3_pf_tan : latestBush.bushing_l3_pf_20c));

          const parts = [];
          const scores = [];
          if (!isNaN(pfX1) && pfX1 > 0) {
            parts.push(`X1: ${pfX1.toFixed(2)}%`);
            scores.push(pfX1 <= 0.5 ? 5 : (pfX1 <= 0.7 ? 4 : (pfX1 <= 1.0 ? 3 : (pfX1 <= 1.5 ? 2 : 1))));
          }
          if (!isNaN(pfX2) && pfX2 > 0) {
            parts.push(`X2: ${pfX2.toFixed(2)}%`);
            scores.push(pfX2 <= 0.5 ? 5 : (pfX2 <= 0.7 ? 4 : (pfX2 <= 1.0 ? 3 : (pfX2 <= 1.5 ? 2 : 1))));
          }
          if (!isNaN(pfX3) && pfX3 > 0) {
            parts.push(`X3: ${pfX3.toFixed(2)}%`);
            scores.push(pfX3 <= 0.5 ? 5 : (pfX3 <= 0.7 ? 4 : (pfX3 <= 1.0 ? 3 : (pfX3 <= 1.5 ? 2 : 1))));
          }

          if (parts.length > 0) {
            const minScore = Math.min(...scores);
            const rec = minScore >= 4 ? '-' : 'Check LV Bushing Power Factor (IEEE C57.152: Normal ≤ 0.5%)';
            return { value: parts.join(', '), testDate: date, ratingScore: minScore, recommendation: rec };
          }
        } else {
          // HV Bushing
          const pfH1 = parseFloat(latestBush.bushing_h1_pf_20c && latestBush.bushing_h1_pf_20c !== '-' ? latestBush.bushing_h1_pf_20c : latestBush.bushing_h1_pf_tan);
          const pfH2 = parseFloat(latestBush.bushing_h2_pf_20c && latestBush.bushing_h2_pf_20c !== '-' ? latestBush.bushing_h2_pf_20c : latestBush.bushing_h2_pf_tan);
          const pfH3 = parseFloat(latestBush.bushing_h3_pf_20c && latestBush.bushing_h3_pf_20c !== '-' ? latestBush.bushing_h3_pf_20c : latestBush.bushing_h3_pf_tan);

          const parts = [];
          const scores = [];
          if (!isNaN(pfH1) && pfH1 > 0) {
            parts.push(`H1: ${pfH1.toFixed(2)}%`);
            scores.push(pfH1 <= 0.5 ? 5 : (pfH1 <= 0.7 ? 4 : (pfH1 <= 1.0 ? 3 : (pfH1 <= 1.5 ? 2 : 1))));
          }
          if (!isNaN(pfH2) && pfH2 > 0) {
            parts.push(`H2: ${pfH2.toFixed(2)}%`);
            scores.push(pfH2 <= 0.5 ? 5 : (pfH2 <= 0.7 ? 4 : (pfH2 <= 1.0 ? 3 : (pfH2 <= 1.5 ? 2 : 1))));
          }
          if (!isNaN(pfH3) && pfH3 > 0) {
            parts.push(`H3: ${pfH3.toFixed(2)}%`);
            scores.push(pfH3 <= 0.5 ? 5 : (pfH3 <= 0.7 ? 4 : (pfH3 <= 1.0 ? 3 : (pfH3 <= 1.5 ? 2 : 1))));
          }

          if (parts.length > 0) {
            const minScore = Math.min(...scores);
            const rec = minScore >= 4 ? '-' : 'Check HV Bushing Power Factor (IEEE C57.152: Normal ≤ 0.5%)';
            return { value: parts.join(', '), testDate: date, ratingScore: minScore, recommendation: rec };
          }
        }
      } else if (nameLower.includes('capacitance') || nameLower.includes('cap')) {
        if (isLv) {
          const chg1 = parseFloat(latestBush.maxbch1_change);
          const chg2 = parseFloat(latestBush.maxbch2_change);
          const chg3 = parseFloat(latestBush.maxbch3_change);

          const cap1 = parseFloat(latestBush.xbushing_h1_c1 && latestBush.xbushing_h1_c1 !== '-' ? latestBush.xbushing_h1_c1 : latestBush.bushing_l1_cap);
          const cap2 = parseFloat(latestBush.xbushing_h2_c1 && latestBush.xbushing_h2_c1 !== '-' ? latestBush.xbushing_h2_c1 : latestBush.bushing_l2_cap);
          const cap3 = parseFloat(latestBush.xbushing_h3_c1 && latestBush.xbushing_h3_c1 !== '-' ? latestBush.xbushing_h3_c1 : latestBush.bushing_l3_cap);

          const parts = [];
          const scores = [];
          const hasDev = !isNaN(chg1) || !isNaN(chg2) || !isNaN(chg3);

          if (hasDev) {
            if (!isNaN(chg1)) {
              parts.push(`X1: ${chg1 >= 0 ? '+' : ''}${chg1.toFixed(2)}%`);
              const abs = Math.abs(chg1);
              scores.push(abs <= 1.0 ? 5 : (abs <= 3.0 ? 4 : (abs <= 5.0 ? 3 : (abs <= 7.0 ? 2 : 1))));
            }
            if (!isNaN(chg2)) {
              parts.push(`X2: ${chg2 >= 0 ? '+' : ''}${chg2.toFixed(2)}%`);
              const abs = Math.abs(chg2);
              scores.push(abs <= 1.0 ? 5 : (abs <= 3.0 ? 4 : (abs <= 5.0 ? 3 : (abs <= 7.0 ? 2 : 1))));
            }
            if (!isNaN(chg3)) {
              parts.push(`X3: ${chg3 >= 0 ? '+' : ''}${chg3.toFixed(2)}%`);
              const abs = Math.abs(chg3);
              scores.push(abs <= 1.0 ? 5 : (abs <= 3.0 ? 4 : (abs <= 5.0 ? 3 : (abs <= 7.0 ? 2 : 1))));
            }
            if (parts.length > 0) {
              const minScore = Math.min(...scores);
              const rec = minScore >= 4 ? '-' : 'Check LV Bushing Capacitance Change (IEEE C57.152: ≤ 5%)';
              return { value: `%Dev: ${parts.join(', ')}`, testDate: date, ratingScore: minScore, recommendation: rec };
            }
          } else if (!isNaN(cap1) || !isNaN(cap2) || !isNaN(cap3)) {
            if (!isNaN(cap1) && cap1 > 0) parts.push(`X1: ${cap1.toFixed(1)} pF`);
            if (!isNaN(cap2) && cap2 > 0) parts.push(`X2: ${cap2.toFixed(1)} pF`);
            if (!isNaN(cap3) && cap3 > 0) parts.push(`X3: ${cap3.toFixed(1)} pF`);
            return { value: `C1: ${parts.join(', ')}`, testDate: date, ratingScore: 5, recommendation: '-' };
          }
        } else {
          // HV Bushing
          const chg1 = parseFloat(latestBush.maxbch1_change);
          const chg2 = parseFloat(latestBush.maxbch2_change);
          const chg3 = parseFloat(latestBush.maxbch3_change);

          const cap1 = parseFloat(latestBush.bushing_h1_c1);
          const cap2 = parseFloat(latestBush.bushing_h2_c1);
          const cap3 = parseFloat(latestBush.bushing_h3_c1);

          const parts = [];
          const scores = [];
          const hasDev = !isNaN(chg1) || !isNaN(chg2) || !isNaN(chg3);

          if (hasDev) {
            if (!isNaN(chg1)) {
              parts.push(`H1: ${chg1 >= 0 ? '+' : ''}${chg1.toFixed(2)}%`);
              const abs = Math.abs(chg1);
              scores.push(abs <= 1.0 ? 5 : (abs <= 3.0 ? 4 : (abs <= 5.0 ? 3 : (abs <= 7.0 ? 2 : 1))));
            }
            if (!isNaN(chg2)) {
              parts.push(`H2: ${chg2 >= 0 ? '+' : ''}${chg2.toFixed(2)}%`);
              const abs = Math.abs(chg2);
              scores.push(abs <= 1.0 ? 5 : (abs <= 3.0 ? 4 : (abs <= 5.0 ? 3 : (abs <= 7.0 ? 2 : 1))));
            }
            if (!isNaN(chg3)) {
              parts.push(`H3: ${chg3 >= 0 ? '+' : ''}${chg3.toFixed(2)}%`);
              const abs = Math.abs(chg3);
              scores.push(abs <= 1.0 ? 5 : (abs <= 3.0 ? 4 : (abs <= 5.0 ? 3 : (abs <= 7.0 ? 2 : 1))));
            }
            if (parts.length > 0) {
              const minScore = Math.min(...scores);
              const rec = minScore >= 4 ? '-' : 'Check HV Bushing Capacitance Change (IEEE C57.152: ≤ 5%)';
              return { value: `%Dev: ${parts.join(', ')}`, testDate: date, ratingScore: minScore, recommendation: rec };
            }
          } else if (!isNaN(cap1) || !isNaN(cap2) || !isNaN(cap3)) {
            if (!isNaN(cap1) && cap1 > 0) parts.push(`H1: ${cap1.toFixed(1)} pF`);
            if (!isNaN(cap2) && cap2 > 0) parts.push(`H2: ${cap2.toFixed(1)} pF`);
            if (!isNaN(cap3) && cap3 > 0) parts.push(`H3: ${cap3.toFixed(1)} pF`);
            return { value: `C1: ${parts.join(', ')}`, testDate: date, ratingScore: 5, recommendation: '-' };
          }
        }
      }
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  // 13. Surge Arrester (SurgePFData.csv)
  if (ptLower.includes('arrester') || subLower.includes('arrester') || nameLower.includes('surge') || nameLower.includes('arrester')) {
    const latestSurge = (typeof surgePfCsvData !== 'undefined') ? findLatestRecord(surgePfCsvData, serialVal) : null;
    if (latestSurge) {
      const date = latestSurge.Date || latestSurge.date;
      const isLv = subLower.includes('lv') || subLower.includes('x');

      if (nameLower.includes('leakage current') || nameLower.includes('current')) {
        if (isLv) {
          const cur1 = parseFloat(latestSurge.xh1_current);
          const cur2 = parseFloat(latestSurge.xh2_current);
          const cur3 = parseFloat(latestSurge.xh3_current);

          const parts = [];
          const scores = [];
          if (!isNaN(cur1) && cur1 > 0) {
            parts.push(`X1: ${cur1.toFixed(2)} mA`);
            scores.push(cur1 <= 0.5 ? 5 : (cur1 <= 1.0 ? 4 : (cur1 <= 2.0 ? 3 : 1)));
          }
          if (!isNaN(cur2) && cur2 > 0) {
            parts.push(`X2: ${cur2.toFixed(2)} mA`);
            scores.push(cur2 <= 0.5 ? 5 : (cur2 <= 1.0 ? 4 : (cur2 <= 2.0 ? 3 : 1)));
          }
          if (!isNaN(cur3) && cur3 > 0) {
            parts.push(`X3: ${cur3.toFixed(2)} mA`);
            scores.push(cur3 <= 0.5 ? 5 : (cur3 <= 1.0 ? 4 : (cur3 <= 2.0 ? 3 : 1)));
          }

          if (parts.length > 0) {
            const minScore = Math.min(...scores);
            const rec = minScore >= 4 ? '-' : 'Check LV Arrester Leakage Current';
            return { value: parts.join(', '), testDate: date, ratingScore: minScore, recommendation: rec };
          }
        } else {
          // HV Arrester
          const cur1 = parseFloat(latestSurge.h1_current && latestSurge.h1_current !== '-' ? latestSurge.h1_current : latestSurge.maxma1);
          const cur2 = parseFloat(latestSurge.h2_current && latestSurge.h2_current !== '-' ? latestSurge.h2_current : latestSurge.maxma2);
          const cur3 = parseFloat(latestSurge.h3_current && latestSurge.h3_current !== '-' ? latestSurge.h3_current : latestSurge.maxma3);

          const parts = [];
          const scores = [];
          if (!isNaN(cur1) && cur1 > 0) {
            parts.push(`H1: ${cur1.toFixed(2)} mA`);
            scores.push(cur1 <= 0.5 ? 5 : (cur1 <= 1.0 ? 4 : (cur1 <= 2.0 ? 3 : 1)));
          }
          if (!isNaN(cur2) && cur2 > 0) {
            parts.push(`H2: ${cur2.toFixed(2)} mA`);
            scores.push(cur2 <= 0.5 ? 5 : (cur2 <= 1.0 ? 4 : (cur2 <= 2.0 ? 3 : 1)));
          }
          if (!isNaN(cur3) && cur3 > 0) {
            parts.push(`H3: ${cur3.toFixed(2)} mA`);
            scores.push(cur3 <= 0.5 ? 5 : (cur3 <= 1.0 ? 4 : (cur3 <= 2.0 ? 3 : 1)));
          }

          if (parts.length > 0) {
            const minScore = Math.min(...scores);
            const rec = minScore >= 4 ? '-' : 'Check HV Arrester Leakage Current';
            return { value: parts.join(', '), testDate: date, ratingScore: minScore, recommendation: rec };
          }
        }
      } else if (nameLower.includes('watt loss') || nameLower.includes('watt')) {
        if (isLv) {
          const w1 = parseFloat(latestSurge.xh1_watt_loss);
          const w2 = parseFloat(latestSurge.xh2_watt_loss);
          const w3 = parseFloat(latestSurge.xh3_watt_loss);

          const parts = [];
          const scores = [];
          if (!isNaN(w1) && w1 > 0) {
            parts.push(`X1: ${w1.toFixed(2)} W`);
            scores.push(w1 <= 50 ? 5 : (w1 <= 100 ? 4 : (w1 <= 200 ? 3 : 1)));
          }
          if (!isNaN(w2) && w2 > 0) {
            parts.push(`X2: ${w2.toFixed(2)} W`);
            scores.push(w2 <= 50 ? 5 : (w2 <= 100 ? 4 : (w2 <= 200 ? 3 : 1)));
          }
          if (!isNaN(w3) && w3 > 0) {
            parts.push(`X3: ${w3.toFixed(2)} W`);
            scores.push(w3 <= 50 ? 5 : (w3 <= 100 ? 4 : (w3 <= 200 ? 3 : 1)));
          }

          if (parts.length > 0) {
            const minScore = Math.min(...scores);
            const rec = minScore >= 4 ? '-' : 'Check LV Arrester Watt Loss';
            return { value: parts.join(', '), testDate: date, ratingScore: minScore, recommendation: rec };
          }
        } else {
          // HV Arrester
          const w1 = parseFloat(latestSurge.h1_watt_loss && latestSurge.h1_watt_loss !== '-' ? latestSurge.h1_watt_loss : latestSurge.maxw1);
          const w2 = parseFloat(latestSurge.h2_watt_loss && latestSurge.h2_watt_loss !== '-' ? latestSurge.h2_watt_loss : latestSurge.maxw2);
          const w3 = parseFloat(latestSurge.h3_watt_loss && latestSurge.h3_watt_loss !== '-' ? latestSurge.h3_watt_loss : latestSurge.maxw3);

          const parts = [];
          const scores = [];
          if (!isNaN(w1) && w1 > 0) {
            parts.push(`H1: ${w1.toFixed(2)} W`);
            scores.push(w1 <= 50 ? 5 : (w1 <= 100 ? 4 : (w1 <= 200 ? 3 : 1)));
          }
          if (!isNaN(w2) && w2 > 0) {
            parts.push(`H2: ${w2.toFixed(2)} W`);
            scores.push(w2 <= 50 ? 5 : (w2 <= 100 ? 4 : (w2 <= 200 ? 3 : 1)));
          }
          if (!isNaN(w3) && w3 > 0) {
            parts.push(`H3: ${w3.toFixed(2)} W`);
            scores.push(w3 <= 50 ? 5 : (w3 <= 100 ? 4 : (w3 <= 200 ? 3 : 1)));
          }

          if (parts.length > 0) {
            const minScore = Math.min(...scores);
            const rec = minScore >= 4 ? '-' : 'Check HV Arrester Watt Loss';
            return { value: parts.join(', '), testDate: date, ratingScore: minScore, recommendation: rec };
          }
        }
      }
    }
    return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
  }

  return { value: '-', testDate: '-', ratingScore: null, isNA: true, recommendation: '-' };
}

// ==========================================
// computeHI: Authoritative Condition Health Index calculation
// ==========================================
function computeHI(item) {
  let overallSumHI = 0;
  let activePtCount = 0;
  let worstDgaOrBdvEval = 5;
  const ptStructure = buildPtStructure(item);

  ptStructure.forEach(ptObj => {
    if (ptObj.splitSubWeights) {
      ptObj.subs.forEach(subObj => {
        let minSubEval = 5;
        let subHasMethods = false;
        subObj.methods.forEach(m => {
          const match = getMeasuredValueForItem(m.name, item, ptObj.pt, subObj.sub);
          if (!match.isNA && match.ratingScore != null) {
            const evalScore = match.ratingScore;
            if (evalScore < minSubEval) {
              minSubEval = evalScore;
            }
            subHasMethods = true;
          }
        });
        if (subHasMethods) {
          const subHI = Math.round((minSubEval / 5) * 100);
          overallSumHI += subHI;
          activePtCount++;

          const subNameUpper = String(subObj.sub || '').toUpperCase();
          if (subNameUpper.includes('DGA') || subNameUpper.includes('DIELECTRIC') || subNameUpper.includes('BREAKDOWN') || subNameUpper.includes('WATER')) {
            if (minSubEval < worstDgaOrBdvEval) {
              worstDgaOrBdvEval = minSubEval;
            }
          }
        }
      });
    } else {
      let minEval = 5;
      let hasMethods = false;

      ptObj.subs.forEach(subObj => {
        subObj.methods.forEach(m => {
          const match = getMeasuredValueForItem(m.name, item, ptObj.pt, subObj.sub);
          if (!match.isNA && match.ratingScore != null) {
            const evalScore = match.ratingScore;
            if (evalScore < minEval) {
              minEval = evalScore;
            }
            hasMethods = true;
          }
        });
      });

      if (hasMethods) {
        const ptWeight = ptObj.weight || 1;
        const ptHI = Math.round(((minEval * ptWeight) / (5 * ptWeight)) * 100);
        overallSumHI += ptHI;
        activePtCount++;
      }
    }
  });

  const overallHIVal = overallSumHI;
  const maxOverallHI = activePtCount * 100;
  let percentHIVal = maxOverallHI > 0 ? Math.round((overallHIVal / maxOverallHI) * 100) : 0;

  // Capping Rule:
  // Score 1 (Critical) -> Cap at 49%
  // Score 2 (Warning)  -> Cap at 69%
  // Score 3 (Monitor)  -> Cap at 79%
  if (worstDgaOrBdvEval === 1 && percentHIVal > 49) {
    percentHIVal = 49;
  } else if (worstDgaOrBdvEval === 2 && percentHIVal > 69) {
    percentHIVal = 69;
  } else if (worstDgaOrBdvEval === 3 && percentHIVal > 79) {
    percentHIVal = 79;
  }

  return { overallHIVal, maxOverallHI, percentHIVal, worstDgaOrBdvEval };
}

// ==========================================
// computeAccuracy: Calculates Evaluation Result Accuracy %
// Formula: (Number of scored test items / Total applicable test items) * 100
// Excludes N/A (grey) PT components (OLTC, Bushing, Lightning Arrester)
// ==========================================
function computeAccuracy(item) {
  if (!item) return { totalApplicableMethods: 0, scoredMethods: 0, accuracyPct: 100, isOltcNA: false, isBushingNA: false, isSurgeNA: false, ptBreakdown: [] };

  const trInfoItem = (typeof trInfoCsvData !== 'undefined') ? findLatestRecord(trInfoCsvData, item.serial || item.SERIAL_NUMBER) : null;
  const rawTapStr = String(item.TAP_CHANGER_TYPE || item.tapChangerType || (trInfoItem && trInfoItem.TAP_CHANGER_TYPE) || '').toUpperCase();
  const isOltcNA = rawTapStr.includes('NLTC') || rawTapStr.includes('DETC') || item.oltc === 'N/A' || item.oltcOil === 'N/A';

  const serviceTypeStr = String(item['Service Type'] || item.serviceType || item.SERVICE_TYPE || item.Service_Type || item.APPLICATION || (trInfoItem && (trInfoItem['Service Type'] || trInfoItem.SERVICE_TYPE || trInfoItem.APPLICATION)) || '').toUpperCase();
  const serialStr = String(item.serial || item.SERIAL_NUMBER || item['Serial No'] || item.Name || '').toUpperCase();
  const isUatOrAux = serviceTypeStr.includes('UAT') || serviceTypeStr.includes('AUXILIARY') || serviceTypeStr.includes('AUX') || serialStr.includes('UAT') || serialStr.includes('AUX');

  const isBushingNA = isUatOrAux || item.bushing === 'N/A';
  const isSurgeNA = isUatOrAux || item.surgeArrester === 'N/A';

  const ptStructure = buildPtStructure(item);
  let totalApplicableMethods = 0;
  let scoredMethods = 0;
  const ptBreakdown = [];

  ptStructure.forEach(ptObj => {
    const ptKey = String(ptObj.pt || '').toLowerCase();
    const isGrey = (ptKey.includes('oltc') && isOltcNA) ||
                   (ptKey.includes('bush') && isBushingNA) ||
                   ((ptKey.includes('arrest') || ptKey.includes('surge')) && isSurgeNA);

    let ptApplicable = 0;
    let ptScored = 0;

    if (!isGrey) {
      ptObj.subs.forEach(subObj => {
        subObj.methods.forEach(m => {
          ptApplicable++;
          const match = getMeasuredValueForItem(m.name, item, ptObj.pt, subObj.sub);
          if (!match.isNA && match.ratingScore != null) {
            ptScored++;
          }
        });
      });
      totalApplicableMethods += ptApplicable;
      scoredMethods += ptScored;
    }

    const pct = ptApplicable > 0 ? Math.round((ptScored / ptApplicable) * 100) : (isGrey ? null : 100);
    ptBreakdown.push({
      pt: ptObj.pt,
      isNA: isGrey,
      applicable: ptApplicable,
      scored: ptScored,
      pct: pct
    });
  });

  const accuracyPct = totalApplicableMethods > 0 ? Math.round((scoredMethods / totalApplicableMethods) * 100) : 100;
  return { totalApplicableMethods, scoredMethods, accuracyPct, isOltcNA, isBushingNA, isSurgeNA, ptBreakdown };
}

// ==========================================
// syncAssessmentWithEvaluationEngine: Synchronizes fleet dataset
// ==========================================
function syncAssessmentWithEvaluationEngine() {
  if (typeof assessmentData === 'undefined' || !Array.isArray(assessmentData) || assessmentData.length === 0) {
    return;
  }

  // Check if at least some test CSVs have been loaded before running dynamic recalculation
  const hasLoadedCSVs = (typeof mtOilCsvData !== 'undefined' && mtOilCsvData.length > 0) ||
                        (typeof visualCsvData !== 'undefined' && visualCsvData.length > 0) ||
                        (typeof irPiCsvData !== 'undefined' && irPiCsvData.length > 0) ||
                        (typeof trInfoCsvData !== 'undefined' && trInfoCsvData.length > 0);

  if (!hasLoadedCSVs) {
    return;
  }

  function scoreToAqu(score, isNA) {
    if (isNA || score === null || score === undefined) return 'N/A';
    if (score >= 4) return 'A';
    if (score === 3) return 'Q';
    if (score === 2) return 'W';
    if (score <= 1) return 'U';
    return 'U';
  }

  assessmentData.forEach(item => {
    if (!item) return;
    try {
      const site = item.site || item.SITE || '';
      if (isExcludedSite(site)) return;

      const serial = item.serial || item.SERIAL_NUMBER || item['Serial No'];
      if (!serial) return;

      const ptStructure = buildPtStructure(item);

      let minPtScores = {
        activePart: 5,
        bushing: 5,
        surgeArrester: 5,
        oltc: 5,
        oil: 5,
        visual: 5
      };
      let ptHasData = {
        activePart: false,
        bushing: false,
        surgeArrester: false,
        oltc: false,
        oil: false,
        visual: false
      };

      const recs = [];

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
            const match = getMeasuredValueForItem(m.name, item, ptObj.pt, subObj.sub);
            if (!match.isNA && match.ratingScore != null) {
              const s = match.ratingScore;
              ptHasData[currentPtGroup] = true;
              if (s < minPtScores[currentPtGroup]) {
                minPtScores[currentPtGroup] = s;
              }
              if (match.recommendation && match.recommendation !== '-' && !match.recommendation.toLowerCase().includes('routine')) {
                if (!recs.includes(match.recommendation)) recs.push(match.recommendation);
              }
            }
          });
        });
      });

      const { percentHIVal } = computeHI(item);
      if (percentHIVal > 0) {
        item.healthIndex = percentHIVal;
        item.healthStatus = percentHIVal >= 80 ? 'Healthy' : (percentHIVal >= 70 ? 'Monitor' : (percentHIVal >= 50 ? 'Warning' : 'Critical'));
      }

      if (ptHasData.visual) item.visualInspection = scoreToAqu(minPtScores.visual);
      if (!item.activePart || typeof item.activePart !== 'object') item.activePart = {};
      if (ptHasData.activePart) item.activePart.overall = scoreToAqu(minPtScores.activePart);
      
      if (!item.mainTankOil || typeof item.mainTankOil !== 'object') item.mainTankOil = {};
      if (ptHasData.oil) item.mainTankOil.overall = scoreToAqu(minPtScores.oil);
      
      if (ptHasData.bushing) item.bushing = scoreToAqu(minPtScores.bushing);
      if (ptHasData.surgeArrester) item.surgeArrester = scoreToAqu(minPtScores.surgeArrester);
      if (ptHasData.oltc) {
        if (!item.oltcOil || typeof item.oltcOil !== 'object') item.oltcOil = {};
        item.oltcOil.overall = scoreToAqu(minPtScores.oltc);
      }

      // Sync latest PM date across all test CSV records
      const dateCandidates = [
        item.lastPM,
        item.Last_PM,
        item['Last PM']
      ];
      if (typeof mtOilCsvData !== 'undefined') {
        const r = findLatestRecord(mtOilCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }
      if (typeof irPiCsvData !== 'undefined') {
        const r = findLatestRecord(irPiCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }
      if (typeof ratioCsvData !== 'undefined') {
        const r = findLatestRecord(ratioCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }
      if (typeof windingCsvData !== 'undefined') {
        const r = findLatestRecord(windingCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }
      if (typeof bushingPfCsvData !== 'undefined') {
        const r = findLatestRecord(bushingPfCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }
      if (typeof visualCsvData !== 'undefined') {
        const r = findLatestRecord(visualCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }
      if (typeof oltcOilCsvData !== 'undefined') {
        const r = findLatestRecord(oltcOilCsvData, serial);
        if (r) dateCandidates.push(r.Date || r.date || r.DATE);
      }

      let maxPmYear = null;
      dateCandidates.forEach(d => {
        if (!d) return;
        const match = String(d).match(/\b(20\d\d)\b/);
        if (match) {
          const yr = parseInt(match[1], 10);
          if (!maxPmYear || yr > maxPmYear) maxPmYear = yr;
        }
      });
      if (maxPmYear) item.lastPM = String(maxPmYear);

      const recRes = generateDetailedRecommendation(item);
      item.recommendation = recRes.plainText;
      item.recommendationHtml = recRes.html;
    } catch (e) {
      console.warn('Error evaluating transformer', item.serial, e);
    }
  });

  if (typeof applyFilters === 'function' && typeof filteredAssessment !== 'undefined') {
    applyFilters();
  }
}

function cleanStandardRef(str) {
  if (!str) return '';
  return str
    .replace(/\s*\([^)]*(?:IEEE|IEC|CIGRE|C57|60422|60599|62535|Table|Std|Clause)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================
// generateDetailedRecommendation: Grouped by PT Component (No Standards)
// ==========================================
// generateDetailedRecommendation: Dynamic Diagnostic Evaluation (No HealthIndexSum dependence)
// ==========================================
function generateDetailedRecommendation(item) {
  const serial = item.serial || item.SERIAL_NUMBER || item['Serial No'];
  const ptStructure = (typeof buildPtStructure === 'function') ? buildPtStructure(item) : [];

  const groups = {
    critical: [],
    generalPart: [],
    activePart: [],
    insulationOil: [],
    bushing: [],
    arrester: [],
    oltc: []
  };

  // Helper to add unique recommendation item
  const addRec = (groupArr, text) => {
    if (!text || text === '-' || text.toLowerCase().includes('routine')) return;
    const cleanText = cleanStandardRef(text);
    if (!cleanText) return;
    if (!groupArr.some(existing => existing.toLowerCase() === cleanText.toLowerCase() || existing.toLowerCase().includes(cleanText.toLowerCase()) || cleanText.toLowerCase().includes(existing.toLowerCase()))) {
      groupArr.push(cleanText);
    }
  };

  // 1. Scan diagnostic test results from measured values across PT Structure
  ptStructure.forEach(ptObj => {
    const ptKey = ptObj.id || String(ptObj.pt || '').toLowerCase();
    ptObj.subs.forEach(subObj => {
      subObj.methods.forEach(m => {
        const match = getMeasuredValueForItem(m.name, item, ptObj.pt, subObj.sub);
        if (!match.isNA && match.ratingScore != null) {
          const score = match.ratingScore;
          const rec = cleanStandardRef(match.recommendation);
          const mName = m.name;
          const val = match.value;

          if (score <= 3 && rec && rec !== '-' && !rec.toLowerCase().includes('routine')) {
            if (score === 1) {
              groups.critical.push(`<strong>${mName}</strong>: ${rec} (Measured: ${val})`);
            } else if (ptKey.includes('oil') || ptKey.includes('dga') || mName.includes('DGA') || mName.includes('Breakdown') || mName.includes('Water') || mName.includes('Acidity') || mName.includes('Conductivity') || mName.includes('Corrosive') || mName.includes('Passivator') || mName.includes('Furan')) {
              addRec(groups.insulationOil, rec);
            } else if (ptKey.includes('active') || ptKey.includes('magnetic') || ptKey.includes('winding') || mName.includes('Winding') || mName.includes('Impedance') || mName.includes('Ratio') || mName.includes('Exciting') || mName.includes('Resistance') || mName.includes('PI') || mName.includes('Polarization')) {
              addRec(groups.activePart, rec);
            } else if (ptKey.includes('visual') || ptKey.includes('general')) {
              addRec(groups.generalPart, rec);
            } else if (ptKey.includes('bush')) {
              addRec(groups.bushing, rec);
            } else if (ptKey.includes('arrest') || ptKey.includes('surge')) {
              addRec(groups.arrester, rec);
            } else if (ptKey.includes('oltc') || ptKey.includes('tap')) {
              addRec(groups.oltc, rec);
            }
          }
        }
      });
    });
  });

  // 2. Scan visual inspection defects from VisualData.csv
  const latestVis = (typeof visualCsvData !== 'undefined') ? findLatestRecord(visualCsvData, serial) : null;
  if (latestVis) {
    const defects = [];
    ['comment1', 'comment2', 'comment3', 'comment4', 'comment5', 'comment6'].forEach(ck => {
      const cVal = String(latestVis[ck] || '').trim();
      if (cVal && cVal !== '-' && cVal !== 'None' && (
        cVal.toLowerCase().includes('leak') || 
        cVal.toLowerCase().includes('low') || 
        cVal.toLowerCase().includes('crack') || 
        cVal.toLowerCase().includes('rust') || 
        cVal.toLowerCase().includes('hot') || 
        cVal.toLowerCase().includes('defect') || 
        cVal.toLowerCase().includes('abnormal') ||
        cVal.toLowerCase().includes('damaged') ||
        cVal.toLowerCase().includes('repair')
      )) {
        if (!defects.some(d => d.toLowerCase() === cVal.toLowerCase())) defects.push(cVal);
      }
    });
    if (defects.length > 0) {
      addRec(groups.generalPart, `Plan visual maintenance & repair defects: ${defects.join(', ')}`);
    }
  }

  // 3. Evaluate specific electrical & oil conditions directly from CSV records
  // Oil condition check (MTOilData.csv)
  const latestOil = (typeof mtOilCsvData !== 'undefined') ? findLatestRecord(mtOilCsvData, serial) : null;
  if (latestOil) {
    const bdv = parseFloat(latestOil.bdv || latestOil.BDV || latestOil.Breakdown_Voltage || latestOil.breakdown_voltage);
    if (!isNaN(bdv) && bdv < 40) {
      addRec(groups.insulationOil, `Dielectric breakdown voltage low (${bdv} kV): Perform oil filtration and dehydration`);
    }
    const water = parseFloat(latestOil.water || latestOil.Water || latestOil.water_content || latestOil.Water_Content);
    if (!isNaN(water) && water > 25) {
      addRec(groups.insulationOil, `High water content in oil (${water} ppm): Perform vacuum oil dehydration`);
    }
    const acid = parseFloat(latestOil.acidity || latestOil.Acidity || latestOil.Acid || latestOil.NN);
    if (!isNaN(acid) && acid > 0.15) {
      addRec(groups.insulationOil, `Elevated oil acidity (${acid} mg KOH/g): Plan oil reclaiming or oil replacement`);
    }
    const ift = parseFloat(latestOil.ift || latestOil.IFT || latestOil.Interfacial_Tension);
    if (!isNaN(ift) && ift < 22) {
      addRec(groups.insulationOil, `Low interfacial tension (${ift} mN/m): Plan oil reclaiming`);
    }
    const cond = parseFloat(latestOil.conductivity || latestOil.Conductivity);
    if (!isNaN(cond) && cond > 100) {
      addRec(groups.insulationOil, `High oil conductivity (${cond} pS/m): Perform oil reclaiming / degumming`);
    }
    const corr = String(latestOil.corrosive || latestOil.Corrosive || latestOil.corrosive_sulfur || latestOil.Corrosive_Sulfur || '').trim();
    const isCorrosive = corr && (corr.toLowerCase().includes('corrosive') || corr.toLowerCase().includes('3b') || corr.toLowerCase().includes('4a') || corr.toLowerCase().includes('poten'));
    const pass = parseFloat(latestOil.passivator || latestOil.Passivator);

    if (isCorrosive) {
      if (isNaN(pass) || pass < 100) {
        addRec(groups.insulationOil, `Corrosive sulfur detected (${corr}): Add/top-up metal passivator (Irgamet 39 > 100 ppm, currently ${isNaN(pass) ? 0 : pass} ppm)`);
      }
    } else if (!isNaN(pass) && pass > 0 && pass < 50) {
      addRec(groups.insulationOil, `Passivator level depleting (${pass} ppm): Monitor passivator concentration`);
    }
  }

  // Active Part check (IRandPIData.csv)
  const latestPi = (typeof irPiCsvData !== 'undefined') ? findLatestRecord(irPiCsvData, serial) : null;
  if (latestPi) {
    const rawHPi = parseFloat(latestPi.H_PI || latestPi.h_pi || latestPi.HV_PI || latestPi['HV-LV']);
    if (!isNaN(rawHPi) && rawHPi > 0 && rawHPi < 1.3) {
      if (rawHPi < 1.0) {
        groups.critical.push(`<strong>Active Part Insulation</strong>: Low Polarization Index (PI = ${rawHPi.toFixed(2)} < 1.0): Urgent insulation dry-out required`);
      } else {
        addRec(groups.activePart, `Low Polarization Index (PI = ${rawHPi.toFixed(2)}): Perform insulation drying process and moisture investigation`);
      }
    }
  }

  // Check Overdue PM Testing
  const latestRatio = (typeof ratioCsvData !== 'undefined') ? findLatestRecord(ratioCsvData, serial) : null;
  const ratioDateStr = latestRatio ? (latestRatio.date || latestRatio.Date) : null;
  if (ratioDateStr) {
    const match = String(ratioDateStr).match(/\b(20\d\d)\b/);
    if (match) {
      const year = parseInt(match[1], 10);
      const currentYear = new Date().getFullYear();
      if ((currentYear - year) > 3) {
        addRec(groups.activePart, `PM Electrical Testing Overdue (${year}): Schedule and perform routine comprehensive preventive maintenance testing`);
      }
    }
  }

  const totalIssues = groups.critical.length + groups.generalPart.length + groups.activePart.length + groups.insulationOil.length + groups.bushing.length + groups.arrester.length + groups.oltc.length;

  if (totalIssues === 0) {
    return {
      isGood: true,
      isCritical: false,
      plainText: 'Normal Condition: All diagnostic tests, insulating oil properties, and visual inspections are within acceptable limits. The transformer is in normal operating condition. Perform routine inspection and preventive maintenance.',
      html: `
        <div class="rec-description">
          All diagnostic tests, insulating oil properties, and visual inspections are within acceptable limits. The transformer is in normal operating condition. Perform routine inspection and preventive maintenance.
        </div>
      `
    };
  }

  const isCritical = groups.critical.length > 0;
  let html = `<ul class="rec-list">`;

  if (groups.critical.length > 0) {
    html += `<li class="rec-item-critical"><strong>⚠️ Urgent Action:</strong> ${groups.critical.join(' | ')}</li>`;
  }
  if (groups.generalPart.length > 0) {
    html += `<li><strong>🔍 General Part (Visual Inspection):</strong> ${groups.generalPart.join('; ')}</li>`;
  }
  if (groups.activePart.length > 0) {
    html += `<li><strong>⚡ Active Part:</strong> ${groups.activePart.join('; ')}</li>`;
  }
  if (groups.insulationOil.length > 0) {
    html += `<li><strong>🛢️ Insulation Oil:</strong> ${groups.insulationOil.join('; ')}</li>`;
  }
  if (groups.bushing.length > 0) {
    html += `<li><strong>🔌 Bushing:</strong> ${groups.bushing.join('; ')}</li>`;
  }
  if (groups.arrester.length > 0) {
    html += `<li><strong>⚡ Arrester:</strong> ${groups.arrester.join('; ')}</li>`;
  }
  if (groups.oltc.length > 0) {
    html += `<li><strong>⚙️ OLTC:</strong> ${groups.oltc.join('; ')}</li>`;
  }

  html += `</ul>`;

  const plainText = [
    ...(groups.critical.length > 0 ? [`[Urgent Action] ${groups.critical.join(' | ')}`] : []),
    ...(groups.generalPart.length > 0 ? [`[General Part] ${groups.generalPart.join('; ')}`] : []),
    ...(groups.activePart.length > 0 ? [`[Active Part] ${groups.activePart.join('; ')}`] : []),
    ...(groups.insulationOil.length > 0 ? [`[Insulation Oil] ${groups.insulationOil.join('; ')}`] : []),
    ...(groups.bushing.length > 0 ? [`[Bushing] ${groups.bushing.join('; ')}`] : []),
    ...(groups.arrester.length > 0 ? [`[Arrester] ${groups.arrester.join('; ')}`] : []),
    ...(groups.oltc.length > 0 ? [`[OLTC] ${groups.oltc.join('; ')}`] : [])
  ].join(' | ');

  return {
    isGood: false,
    isCritical: isCritical,
    plainText: plainText,
    html: html
  };
}

// Robust DD-MMM-YYYY date formatter
function formatDateToDdMmmYyyy(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === 'N/A' || dateStr === 'null') return '-';
  const str = String(dateStr).trim();
  if (!str || str === '-') return '-';

  if (/^\d{4}$/.test(str)) return str;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  const ddMmmYyyyMatch = str.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2,4})$/);
  if (ddMmmYyyyMatch) {
    const day = String(parseInt(ddMmmYyyyMatch[1], 10)).padStart(2, '0');
    const mStr = ddMmmYyyyMatch[2].substring(0, 3).toLowerCase();
    let yr = parseInt(ddMmmYyyyMatch[3], 10);
    if (yr < 100) yr += 2000;
    const mIdx = monthMap[mStr];
    if (mIdx !== undefined) {
      return `${day}-${months[mIdx]}-${yr}`;
    }
  }

  const mmmDdYyyyMatch = str.match(/^([A-Za-z]{3,9})[-\/\s](\d{1,2})[-\/\s](\d{2,4})$/);
  if (mmmDdYyyyMatch) {
    const mStr = mmmDdYyyyMatch[1].substring(0, 3).toLowerCase();
    const day = String(parseInt(mmmDdYyyyMatch[2], 10)).padStart(2, '0');
    let yr = parseInt(mmmDdYyyyMatch[3], 10);
    if (yr < 100) yr += 2000;
    const mIdx = monthMap[mStr];
    if (mIdx !== undefined) {
      return `${day}-${months[mIdx]}-${yr}`;
    }
  }

  let d = new Date(str);
  if (isNaN(d.getTime())) {
    const parts = str.split(/[\/\-\s]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else if (parts[2].length === 4 || parts[2].length === 2) {
        let p1 = parseInt(parts[0]);
        let p2 = parseInt(parts[1]);
        let y = parseInt(parts[2]);
        if (y < 100) y += 2000;
        if (p1 > 12) {
          d = new Date(y, p2 - 1, p1);
        } else if (p2 > 12) {
          d = new Date(y, p1 - 1, p2);
        } else {
          d = new Date(y, p2 - 1, p1);
        }
      }
    }
  }

  if (isNaN(d.getTime())) return str;

  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

// Attach globally
if (typeof window !== 'undefined') {
  window.buildPtStructure = buildPtStructure;
  window.getMeasuredValueForItem = getMeasuredValueForItem;
  window.computeHI = computeHI;
  window.syncAssessmentWithEvaluationEngine = syncAssessmentWithEvaluationEngine;
  window.generateDetailedRecommendation = generateDetailedRecommendation;
  window.formatDateToDdMmmYyyy = formatDateToDdMmmYyyy;
  window.formatDate = formatDateToDdMmmYyyy;
}
