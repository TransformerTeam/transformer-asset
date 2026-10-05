/**
 * ==========================================================================
 * SPARE TRANSFORMER & INTERCHANGEABILITY MANAGEMENT - JAVASCRIPT
 * GPSC Transformer Asset Management Portal (spare_management.js)
 * ==========================================================================
 */

let operatingFleet = [];
let filteredFleet = [];
let activeOperatingUnit = null;
let activeCandidateSpare = null;
let activeCoverageFilter = 'ALL';

/**
 * Dedicated GPSC Spare Transformer Inventory
 * Integrated with actual fleet reserves across Rayong, GSPP, Central Hub, GHECO-ONE, and Nam Lik
 */
const SPARE_INVENTORY = [
  {
    id: 'SPARE-01',
    name: 'SPARE 63.5 MVA 123/11 kV',
    serial: 'EDP021401',
    site: 'SPARE GSPP2&3',
    location: 'GSPP2&3 Heavy Storage Yard (Rayong)',
    ratedPower: 63.5, // MVA
    hvRate: 123,      // kV
    lvRate: 11,       // kV
    vectorGroup: 'YNd1',
    impedance: 12.8,   // %Z
    tapChanger: 'OLTC',
    tapRange: '±16 × 1.25%',
    cooling: 'ONAN/ONAF',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 28500, // Liters
    totalMass: 68500, // kg
    dimensions: '6.8m × 3.6m × 4.4m',
    healthIndex: 96,
    readiness: 'Ready to Energize',
    nitrogenBlanket: '0.22 bar (Optimal)',
    dewPoint: '-48°C (Dry)',
    lastDGA: 'A (Normal)',
    lastInspection: '2025-11-15',
    remarks: 'Main high-capacity reserve for 115/11 kV generator step-up & heavy distribution transformers.'
  },
  {
    id: 'SPARE-02',
    name: 'SPARE 50 MVA 123/11 kV',
    serial: '4710346',
    site: 'SPARE GSPP2&3',
    location: 'GSPP2&3 Heavy Storage Yard (Rayong)',
    ratedPower: 50.0,
    hvRate: 123,
    lvRate: 11,
    vectorGroup: 'YNd1',
    impedance: 11.5,
    tapChanger: 'OLTC',
    tapRange: '±16 × 1.25%',
    cooling: 'ONAN/ONAF',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 24200,
    totalMass: 58000,
    dimensions: '6.4m × 3.4m × 4.2m',
    healthIndex: 100,
    readiness: 'Ready to Energize',
    nitrogenBlanket: '0.24 bar (Optimal)',
    dewPoint: '-52°C (Dry)',
    lastDGA: 'A (Normal)',
    lastInspection: '2026-01-10',
    remarks: 'Top-tier condition cold spare. Compatible with 115/11 kV GSUT units across CUP and GSPP.'
  },
  {
    id: 'SPARE-03',
    name: 'SPARE 40 MVA 115/22 kV',
    serial: 'SP-CUP-40MVA',
    site: 'Central Warehouse Rayong',
    location: 'Central Asset Yard (Map Ta Phut)',
    ratedPower: 40.0,
    hvRate: 115,
    lvRate: 22,
    vectorGroup: 'Dyn1',
    impedance: 10.2,
    tapChanger: 'OLTC',
    tapRange: '±16 × 1.25%',
    cooling: 'ONAN/ONAF',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 21500,
    totalMass: 49000,
    dimensions: '5.9m × 3.2m × 3.9m',
    healthIndex: 92,
    readiness: 'Ready to Energize',
    nitrogenBlanket: '0.20 bar (Optimal)',
    dewPoint: '-44°C (Dry)',
    lastDGA: 'A (Normal)',
    lastInspection: '2025-08-20',
    remarks: 'Strategic spare for 115/22 kV Tie & Distribution transformers (CUP-1, CUP-3, CUP-4, SITE5, SITE6).'
  },
  {
    id: 'SPARE-04',
    name: 'Main Transformer Phase Spare 26 MVA 115/15 kV',
    serial: '54LYPT10970.4',
    site: 'Nam Lik 1',
    location: 'Nam Lik 1 Switchyard Reserve Bay',
    ratedPower: 26.0,
    hvRate: 115,
    lvRate: 15,
    vectorGroup: 'YNd11',
    impedance: 12.0,
    tapChanger: 'NLTC',
    tapRange: '±2 × 2.5%',
    cooling: 'ONAN/ONAF',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 16500,
    totalMass: 34500,
    dimensions: '5.1m × 2.8m × 3.7m',
    healthIndex: 94,
    readiness: 'Standby Energized',
    nitrogenBlanket: 'Conservator with Silica Gel (Active)',
    dewPoint: '-40°C',
    lastDGA: 'A (Normal)',
    lastInspection: '2025-09-12',
    remarks: 'Hydro station spare, can support 115/15 kV GSUT generators or 15 kV industrial feeders.'
  },
  {
    id: 'SPARE-05',
    name: 'GH1 Back Up Transformer 10 MVA 22/11 kV',
    serial: '5513053',
    site: 'GHECO-ONE',
    location: 'GHECO-ONE Auxiliary Substation',
    ratedPower: 10.0,
    hvRate: 22,
    lvRate: 11,
    vectorGroup: 'Dyn1',
    impedance: 7.8,
    tapChanger: 'OLTC',
    tapRange: '±12 × 1.25%',
    cooling: 'ONAN',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 8200,
    totalMass: 18200,
    dimensions: '4.2m × 2.4m × 3.1m',
    healthIndex: 88,
    readiness: 'Standby Energized',
    nitrogenBlanket: 'Sealed Conservator',
    dewPoint: '-38°C',
    lastDGA: 'A (Normal)',
    lastInspection: '2025-07-18',
    remarks: 'Inter-plant back-up for 22/11 kV auxiliary and starter systems.'
  },
  {
    id: 'SPARE-06',
    name: 'SPARE 10 MVA 11/6.9 kV',
    serial: 'SP-CUP-10MVA',
    site: 'CUP-1',
    location: 'CUP-1 Auxiliary Transformer Bay',
    ratedPower: 10.0,
    hvRate: 11,
    lvRate: 6.9,
    vectorGroup: 'Dyn5',
    impedance: 8.2,
    tapChanger: 'OLTC',
    tapRange: '±8 × 1.5%',
    cooling: 'ONAN',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 7900,
    totalMass: 17400,
    dimensions: '4.0m × 2.3m × 3.0m',
    healthIndex: 90,
    readiness: 'Ready to Energize',
    nitrogenBlanket: '0.18 bar',
    dewPoint: '-42°C',
    lastDGA: 'A (Normal)',
    lastInspection: '2025-10-04',
    remarks: 'Direct replacement for 11/6.9 kV UAT & large cooling water pump transformers (CUP, GSPP).'
  },
  {
    id: 'SPARE-07',
    name: 'SPARE 3 MVA 22/11 kV',
    serial: '63310466',
    site: 'Central Warehouse Rayong',
    location: 'Central Storage Workshop',
    ratedPower: 3.0,
    hvRate: 22,
    lvRate: 11,
    vectorGroup: 'Dyn11',
    impedance: 6.5,
    tapChanger: 'NLTC',
    tapRange: '±2 × 2.5%',
    cooling: 'ONAN',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 3200,
    totalMass: 7800,
    dimensions: '3.1m × 1.8m × 2.5m',
    healthIndex: 82,
    readiness: 'Needs Conditioning',
    nitrogenBlanket: 'Atmospheric / Desiccant',
    dewPoint: '-28°C (Requires Oil Dehydration)',
    lastDGA: 'B (Minor Gas)',
    lastInspection: '2025-06-15',
    remarks: 'Standby for 22/11 kV auxiliary loads; requires oil filtering and insulation test prior to energization.'
  },
  {
    id: 'SPARE-08',
    name: 'SPARE 1.6 MVA 6.6/0.4 kV (Dry-Type Cast Resin)',
    serial: 'SP-DRY-1600KVA',
    site: 'SITE2',
    location: 'SITE2 Indoor Spare Warehouse',
    ratedPower: 1.6,
    hvRate: 6.6,
    lvRate: 0.4,
    vectorGroup: 'Dyn11',
    impedance: 6.0,
    tapChanger: 'NLTC',
    tapRange: '±2 × 2.5%',
    cooling: 'AN',
    fluidType: 'Cast Resin (Dry)',
    isDry: true,
    oilVolume: 0,
    totalMass: 4200,
    dimensions: '2.4m × 1.4m × 2.2m',
    healthIndex: 98,
    readiness: 'Ready to Energize',
    nitrogenBlanket: 'N/A (Dry Cast Resin)',
    dewPoint: 'N/A (Dry Room Storage)',
    lastDGA: 'N/A',
    lastInspection: '2026-02-01',
    remarks: 'Direct drop-in spare for 54 indoor dry-type plant service transformers (6.6/0.4 kV Dyn11).'
  },
  {
    id: 'SPARE-09',
    name: 'SPARE 1.25 MVA 11/0.415 kV',
    serial: 'SP-OIL-1250KVA',
    site: 'SITE3',
    location: 'SITE3 Switchyard Warehouse',
    ratedPower: 1.25,
    hvRate: 11,
    lvRate: 0.415,
    vectorGroup: 'Dyn5',
    impedance: 5.8,
    tapChanger: 'NLTC',
    tapRange: '±2 × 2.5%',
    cooling: 'ONAN',
    fluidType: 'Mineral Oil',
    isDry: false,
    oilVolume: 1850,
    totalMass: 4600,
    dimensions: '2.6m × 1.6m × 2.3m',
    healthIndex: 95,
    readiness: 'Ready to Energize',
    nitrogenBlanket: 'Sealed Tank',
    dewPoint: '-44°C',
    lastDGA: 'A (Normal)',
    lastInspection: '2025-12-05',
    remarks: 'Covers 11/0.415 kV plant station service units (40BFT10, 40BFT20, 60BFT10, 60BFT20).'
  }
];

/**
 * Initialize on DOM Ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initOperatingFleet();
  setupEventListeners();
  calculateFleetCoverage();
  renderHeroKPIs();
  populateOperatingSelector();
  renderCoverageTable();
  renderInventoryRegistry();
  renderStrategicAdvisor();
});

/**
 * 1. Ingest Operating Fleet Data
 */
function initOperatingFleet() {
  const trLookup = {};
  if (typeof TR_DATA !== 'undefined' && Array.isArray(TR_DATA)) {
    TR_DATA.forEach(tr => {
      const sn = (tr.SERIAL_NUMBER || tr.serial || '').trim();
      const code = (tr.DEVICE_CODE || '').trim();
      const eq = (tr.LOCAL_EQUIPMENT_CODE || '').trim();
      if (sn) trLookup[sn] = tr;
      if (code) trLookup[code] = tr;
      if (eq) trLookup[eq] = tr;
    });
  }

  let sourceHealth = [];
  if (typeof HEALTH_INDEX_DATA !== 'undefined' && Array.isArray(HEALTH_INDEX_DATA)) {
    sourceHealth = HEALTH_INDEX_DATA;
  }

  // Filter valid operating units (exclude scrap/spare yards from operating list)
  const validUnits = sourceHealth.filter(item => {
    const site = String(item.site || item['SITE'] || item['Site'] || '');
    if (/scrap/i.test(site) || /spare/i.test(site)) return false;
    const name = item.name || item['Equipment Name'] || '';
    const serial = item.serial || item['Serial No'] || '';
    return Boolean(name || serial);
  });

  operatingFleet = validUnits.map(item => {
    const sn = String(item.serial || item['Serial No'] || item['Serial No.'] || '').trim();
    const name = String(item.name || item['Equipment Name'] || '').trim();
    let trMatch = trLookup[sn] || trLookup[name] || {};

    let rawSType = item.serviceType || item['Service Type'] || trMatch.Service_Type || trMatch.APPLICATION || 'Auxiliary';
    let sType = String(rawSType).trim();
    if (/GSU|Step-Up|Generator Step/i.test(sType)) sType = 'GSUT';
    else if (/UAT|Unit Aux/i.test(sType)) sType = 'UAT';
    else if (/Distribution/i.test(sType)) sType = 'Distribution';
    else sType = 'Auxiliary';

    // MVA
    let rawMVA = item.ratedPower !== undefined ? item.ratedPower : (item['Rated Power (MVA)'] !== undefined ? item['Rated Power (MVA)'] : null);
    let mva = parseFloat(rawMVA);
    if (isNaN(mva) && trMatch.POWER_RATING) {
      mva = parseFloat(trMatch.POWER_RATING) / 1000.0;
    }
    if (isNaN(mva)) mva = 1.6;

    // Voltage Ratings
    let hv = parseFloat(item.hvRate || item['HV Rate (kV)'] || trMatch.HV_RATED || 0);
    let lv = parseFloat(item.lvRate || item['LV Rate (kV)'] || trMatch.LV_RATED || 0);
    if (isNaN(hv) || hv === 0) hv = 22;
    if (isNaN(lv) || lv === 0) lv = 0.4;

    // Vector Group
    let vectorGroup = String(trMatch.VECTOR_GROUP || item.vectorGroup || 'Dyn11').trim();
    if (!vectorGroup || vectorGroup === '-') vectorGroup = 'Dyn11';

    // %Z
    let imp = parseFloat(trMatch.IMPEDANCE_MIDDLE_TAP || 6.5);
    if (isNaN(imp)) imp = 6.5;

    // Tap Changer
    let tapType = String(trMatch.TAP_CHANGER_TYPE || 'NLTC').toUpperCase();

    // Insulation & Dry type
    const dataCol = String(trMatch.DATA || '').toUpperCase();
    const insul = String(trMatch.TYPE_OF_INSULATION || '').toUpperCase();
    const isDry = dataCol.includes('DRY') || insul.includes('DRY') || insul.includes('RESIN') || insul.includes('CAST');

    // Health Index
    let rawHI = item.healthIndex !== undefined ? item.healthIndex : item['Condition Health Index'];
    let hi = parseFloat(rawHI);
    if (isNaN(hi)) hi = 80;

    // Criticality / CoF proxy
    let cof = 2;
    if (sType === 'GSUT' || mva >= 80) cof = 5;
    else if (sType === 'UAT' || mva >= 25) cof = 4;
    else if (mva >= 10 || sType === 'Distribution') cof = 3;

    return {
      sn,
      name,
      site: String(item.site || item['SITE'] || 'Unknown').trim(),
      sType,
      mva,
      hv,
      lv,
      vectorGroup,
      impedance: imp,
      tapType,
      isDry,
      hi,
      cof,
      trMatch
    };
  });

  filteredFleet = [...operatingFleet];
}

/**
 * 2. Interchangeability & Compatibility Algorithm
 * Calculates compatibility score (0 to 100%) between operating unit and candidate spare
 */
function evaluateCompatibility(target, spare) {
  let score = 0;
  const breakdown = {
    voltage: { score: 0, max: 35, status: 'fail', note: '' },
    vector: { score: 0, max: 20, status: 'fail', note: '' },
    capacity: { score: 0, max: 25, status: 'fail', note: '' },
    impedance: { score: 0, max: 10, status: 'fail', note: '' },
    features: { score: 0, max: 10, status: 'fail', note: '' }
  };
  const adaptations = [];

  // --- 1. Voltage Ratio Match (35 pts) ---
  const hvDev = Math.abs(spare.hvRate - target.hv) / target.hv;
  const lvDev = Math.abs(spare.lvRate - target.lv) / target.lv;

  if (hvDev <= 0.05 && lvDev <= 0.05) {
    breakdown.voltage.score = 35;
    breakdown.voltage.status = 'pass';
    breakdown.voltage.note = `Exact voltage match (${spare.hvRate}/${spare.lvRate} kV vs ${target.hv}/${target.lv} kV)`;
  } else if (hvDev <= 0.10 && lvDev <= 0.05) {
    breakdown.voltage.score = 25;
    breakdown.voltage.status = 'warning';
    breakdown.voltage.note = `HV rated ${spare.hvRate} kV (${(hvDev * 100).toFixed(1)}% dev); usable via tap changer adjustment`;
    adaptations.push(`Set spare tap changer to nominal voltage position (${target.hv} kV)`);
  } else if (hvDev <= 0.05 && lvDev <= 0.10) {
    breakdown.voltage.score = 22;
    breakdown.voltage.status = 'warning';
    breakdown.voltage.note = `LV rated ${spare.lvRate} kV (${(lvDev * 100).toFixed(1)}% dev); acceptable for plant bus tolerance`;
  } else {
    breakdown.voltage.score = 0;
    breakdown.voltage.status = 'fail';
    breakdown.voltage.note = `Incompatible voltage ratio: Spare ${spare.hvRate}/${spare.lvRate} kV vs Target ${target.hv}/${target.lv} kV`;
    return { score: 0, level: 'incompatible', breakdown, adaptations: ['Voltage ratio mismatch cannot be bridged without autotransformer'] };
  }

  // --- 2. Vector Group & Phase Displacement (20 pts) ---
  const vNorm = (v) => String(v).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const vTarget = vNorm(target.vectorGroup);
  const vSpare = vNorm(spare.vectorGroup);

  if (vTarget === vSpare) {
    breakdown.vector.score = 20;
    breakdown.vector.status = 'pass';
    breakdown.vector.note = `Identical vector group (${target.vectorGroup}): Direct busduct/cable termination`;
  } else if (
    (vTarget.startsWith('DYN') && vSpare.startsWith('DYN')) ||
    (vTarget.startsWith('YND') && vSpare.startsWith('YND'))
  ) {
    // Both Delta-Wye or Wye-Delta with different hour angle (e.g. Dyn11 vs Dyn1)
    breakdown.vector.score = 14;
    breakdown.vector.status = 'warning';
    breakdown.vector.note = `Same winding topology (${spare.vectorGroup} vs ${target.vectorGroup}), but phase angle difference requires external re-phasing`;
    adaptations.push(`Swap phase leads on external busduct/cable terminals (Roll phases A→B→C) to align 300° phase displacement`);
    adaptations.push(`Verify standalone operation (Do NOT run in parallel with original unit on same secondary bus)`);
  } else if (vTarget.startsWith('YND') && vSpare.startsWith('DYN')) {
    breakdown.vector.score = 8;
    breakdown.vector.status = 'warning';
    breakdown.vector.note = `Primary is Delta instead of Wye-Grounded: Neutral Grounding Resistor (NGR) cannot be connected`;
    adaptations.push(`Install external Grounding Transformer (Zig-Zag) for system zero-sequence ground fault protection`);
  } else {
    breakdown.vector.score = 5;
    breakdown.vector.status = 'warning';
    breakdown.vector.note = `Different vector group (${spare.vectorGroup} vs ${target.vectorGroup}): Thorough protection engineering check required`;
    adaptations.push(`Update 87T Transformer Differential Relay settings to account for phase angle transformation`);
  }

  // --- 3. Power Capacity (MVA Headroom) (25 pts) ---
  const mvaRatio = spare.ratedPower / target.mva;
  if (mvaRatio >= 1.0) {
    breakdown.capacity.score = 25;
    breakdown.capacity.status = 'pass';
    breakdown.capacity.note = `100% full capacity available (${spare.ratedPower} MVA $\\ge$ ${target.mva} MVA)`;
  } else if (mvaRatio >= 0.80) {
    breakdown.capacity.score = 18;
    breakdown.capacity.status = 'warning';
    const deratePct = (mvaRatio * 100).toFixed(0);
    breakdown.capacity.note = `Derated operation possible at ${deratePct}% capacity (${spare.ratedPower} MVA vs ${target.mva} MVA)`;
    adaptations.push(`Limit turbine/generator output or shed non-essential auxiliary loads to stay within ${spare.ratedPower} MVA`);
  } else if (mvaRatio >= 0.60) {
    breakdown.capacity.score = 10;
    breakdown.capacity.status = 'warning';
    breakdown.capacity.note = `Severe derating: only ${(mvaRatio * 100).toFixed(0)}% output available (${spare.ratedPower} MVA vs ${target.mva} MVA)`;
    adaptations.push(`Restricted emergency operation: Essential loads only`);
  } else {
    breakdown.capacity.score = 2;
    breakdown.capacity.status = 'fail';
    breakdown.capacity.note = `Undersized capacity (${spare.ratedPower} MVA is too small for ${target.mva} MVA target)`;
  }

  // --- 4. Short-Circuit Impedance %Z (10 pts) ---
  const zDiff = Math.abs(spare.impedance - target.impedance) / target.impedance;
  if (zDiff <= 0.10) {
    breakdown.impedance.score = 10;
    breakdown.impedance.status = 'pass';
    breakdown.impedance.note = `%Z match within ±10% (${spare.impedance}% vs ${target.impedance}%); fault levels & relay slopes preserved`;
  } else if (zDiff <= 0.20) {
    breakdown.impedance.score = 7;
    breakdown.impedance.status = 'warning';
    breakdown.impedance.note = `%Z difference is ${(zDiff * 100).toFixed(1)}% (${spare.impedance}% vs ${target.impedance}%); acceptable for standalone operation`;
    adaptations.push(`Recalculate 50/51 overcurrent fault reach and adjust 87T slope settings`);
  } else {
    breakdown.impedance.score = 4;
    breakdown.impedance.status = 'warning';
    breakdown.impedance.note = `High %Z deviation (${spare.impedance}% vs ${target.impedance}%): Motor-start voltage drop or short-circuit limits must be audited`;
  }

  // --- 5. Tap Changer & Physical Insulation (10 pts) ---
  let featScore = 10;
  if (target.isDry && !spare.isDry) {
    featScore -= 4;
    adaptations.push(`Target is Dry-Type: Oil-type spare requires outdoor containment pit or indoor blast/fire barrier`);
  } else if (!target.isDry && spare.isDry) {
    featScore -= 5;
    adaptations.push(`Dry-type spare cannot be placed in outdoor rain environment without weather-proof enclosure (IP54)`);
  }

  if (target.tapType === 'OLTC' && spare.tapType === 'NLTC') {
    featScore -= 3;
    breakdown.features.note = `Spare is No-Load Tap (NLTC) while target is OLTC: Automatic on-load voltage regulation disabled`;
    adaptations.push(`Lock tap at fixed nominal voltage; monitor bus voltage during peak loading`);
  } else {
    breakdown.features.note = `Compatible tap changer & cooling arrangement`;
  }
  breakdown.features.score = Math.max(2, featScore);
  breakdown.features.status = featScore >= 8 ? 'pass' : 'warning';

  // Add standard rigging action
  adaptations.push(`Rigging & Hauling: Prepare heavy-transport permit (${spare.totalMass ? (spare.totalMass / 1000).toFixed(1) + ' tons' : 'heavy'}) and mobile crane setup`);

  score = breakdown.voltage.score + breakdown.vector.score + breakdown.capacity.score + breakdown.impedance.score + breakdown.features.score;

  let level = 'incompatible';
  if (score >= 85) level = 'optimal';
  else if (score >= 60) level = 'conditional';

  return { score, level, breakdown, adaptations };
}

/**
 * 3. Fleet Spare Coverage & Gap Analysis Calculation
 */
function calculateFleetCoverage() {
  operatingFleet.forEach(unit => {
    let bestScore = 0;
    let bestSpare = null;
    let bestResult = null;

    SPARE_INVENTORY.forEach(spare => {
      const result = evaluateCompatibility(unit, spare);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestSpare = spare;
        bestResult = result;
      }
    });

    unit.bestMatchScore = bestScore;
    unit.bestMatchSpare = bestSpare;
    unit.bestMatchResult = bestResult;

    if (bestScore >= 85) {
      unit.coverageStatus = 'OPTIMAL';
      unit.coverageText = 'Direct Optimal Spare';
    } else if (bestScore >= 60) {
      unit.coverageStatus = 'CONDITIONAL';
      unit.coverageText = 'Conditional (Derated/Adaptable)';
    } else {
      unit.coverageStatus = 'UNCOVERED';
      unit.coverageText = 'CRITICAL GAP (No Spare)';
    }
  });
}

/**
 * 4. Render Hero KPI Cards
 */
function renderHeroKPIs() {
  const totalSpares = SPARE_INVENTORY.length;
  const readySpares = SPARE_INVENTORY.filter(s => s.readiness.includes('Ready') || s.readiness.includes('Standby')).length;
  
  const totalOperating = operatingFleet.length;
  const coveredUnits = operatingFleet.filter(u => u.coverageStatus === 'OPTIMAL' || u.coverageStatus === 'CONDITIONAL').length;
  const coverageRatio = totalOperating > 0 ? ((coveredUnits / totalOperating) * 100).toFixed(1) : 0;

  // Critical Uncovered Units (GSUT / UAT with CoF >= 4 and UNCOVERED)
  const criticalUncovered = operatingFleet.filter(u => u.coverageStatus === 'UNCOVERED' && (u.cof >= 4 || u.sType === 'GSUT' || u.mva >= 40)).length;

  // Total Reserve Capacity
  const totalReserveMVA = SPARE_INVENTORY.reduce((sum, s) => sum + (s.ratedPower || 0), 0);

  document.getElementById('kpi-total-spares').textContent = totalSpares;
  document.getElementById('kpi-spares-sub').textContent = `${readySpares} Ready to Energize | ${totalSpares - readySpares} Maintenance`;

  document.getElementById('kpi-coverage-ratio').textContent = `${coverageRatio}%`;
  document.getElementById('kpi-coverage-sub').textContent = `${coveredUnits} of ${totalOperating} Fleet Transformers Covered`;

  document.getElementById('kpi-critical-uncovered').textContent = criticalUncovered;
  document.getElementById('kpi-uncovered-sub').textContent = `High-Risk GSUT & Critical Units with Zero Reserve`;

  document.getElementById('kpi-reserve-mva').textContent = `${totalReserveMVA.toFixed(1)} MVA`;
  document.getElementById('kpi-reserve-sub').textContent = `Est. Capital Valuation ~ ฿215M Across 5 Yards`;
}

/**
 * 5. Populate Operating Unit Selector
 */
function populateOperatingSelector() {
  const select = document.getElementById('operating-tr-select');
  if (!select) return;

  select.innerHTML = '';
  
  // Sort high-risk / GSUT units to the top
  const sorted = [...operatingFleet].sort((a, b) => {
    if (a.sType === 'GSUT' && b.sType !== 'GSUT') return -1;
    if (b.sType === 'GSUT' && a.sType !== 'GSUT') return 1;
    return b.mva - a.mva;
  });

  sorted.forEach(unit => {
    const opt = document.createElement('option');
    opt.value = unit.sn || unit.name;
    opt.textContent = `${unit.name} (${unit.site} | ${unit.mva} MVA ${unit.hv}/${unit.lv} kV - ${unit.sType})`;
    select.appendChild(opt);
  });

  if (sorted.length > 0) {
    const defaultUnit = sorted.find(u => u.bestMatchScore >= 90 && (u.sType === 'GSUT' || u.mva >= 30)) ||
                        sorted.find(u => u.bestMatchScore >= 85) ||
                        sorted[0];
    select.value = defaultUnit.sn || defaultUnit.name;
    selectOperatingUnit(defaultUnit);
  }
}

/**
 * 6. Select Operating Unit & Trigger Matchmaker
 */
function selectOperatingUnit(unit) {
  activeOperatingUnit = unit;
  renderOperatingSpecs(unit);
  renderMatchCandidates(unit);
}

function renderOperatingSpecs(unit) {
  document.getElementById('spec-op-name').textContent = unit.name;
  document.getElementById('spec-op-sn').textContent = unit.sn || '-';
  document.getElementById('spec-op-site').textContent = unit.site;
  document.getElementById('spec-op-type').textContent = unit.sType;
  document.getElementById('spec-op-mva').textContent = `${unit.mva} MVA`;
  document.getElementById('spec-op-voltage').textContent = `${unit.hv} / ${unit.lv} kV`;
  document.getElementById('spec-op-vector').textContent = unit.vectorGroup;
  document.getElementById('spec-op-imp').textContent = `${unit.impedance}%`;
  document.getElementById('spec-op-tap').textContent = unit.tapType;
  document.getElementById('spec-op-hi').textContent = `${unit.hi}% (${unit.hi >= 80 ? 'Healthy' : (unit.hi >= 50 ? 'Warning' : 'Critical')})`;
}

/**
 * 7. Render Matchmaker Candidates Ranking
 */
function renderMatchCandidates(unit) {
  const list = document.getElementById('candidate-cards-list');
  if (!list) return;

  const results = SPARE_INVENTORY.map(spare => {
    const evalRes = evaluateCompatibility(unit, spare);
    return { spare, ...evalRes };
  });

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  list.innerHTML = results.map(item => {
    const s = item.spare;
    const score = item.score;
    const lvl = item.level;

    let scoreClass = 'optimal';
    let badgeText = 'Optimal Drop-In Match';
    let badgeClass = 'badge-optimal';
    if (lvl === 'conditional') {
      scoreClass = 'conditional';
      badgeText = 'Conditional (Derate/Adaptable)';
      badgeClass = 'badge-conditional';
    } else if (lvl === 'incompatible') {
      scoreClass = 'incompatible';
      badgeText = 'Incompatible / Unsafe';
      badgeClass = 'badge-incompatible';
    }

    return `
      <div class="candidate-card ${scoreClass}">
        <!-- Score Ring -->
        <div class="score-ring-wrapper">
          <div class="score-circle ${scoreClass}">
            ${score}%
          </div>
          <div class="score-sub">${lvl}</div>
        </div>

        <!-- Candidate Info -->
        <div class="candidate-info">
          <div class="candidate-name-row">
            <span class="candidate-name">${s.name}</span>
            <span class="badge-pill ${badgeClass}">${badgeText}</span>
            <span class="pill-badge pill-good" style="font-size:0.75rem;"><i class="fa-solid fa-location-dot"></i> ${s.site}</span>
          </div>

          <div class="candidate-specs-pills">
            <span class="spec-pill">Rating: <strong>${s.ratedPower} MVA</strong></span>
            <span class="spec-pill">Voltage: <strong>${s.hvRate}/${s.lvRate} kV</strong></span>
            <span class="spec-pill">Vector: <strong>${s.vectorGroup}</strong></span>
            <span class="spec-pill">%Z: <strong>${s.impedance}%</strong></span>
            <span class="spec-pill">Tap: <strong>${s.tapChanger}</strong></span>
            <span class="spec-pill">Status: <strong>${s.readiness}</strong></span>
          </div>

          <div class="candidate-remarks">
            <i class="fa-solid fa-circle-info"></i> ${item.breakdown.voltage.note} | ${item.breakdown.capacity.note}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="candidate-actions">
          <button class="btn-action-primary" onclick="openComparisonModal('${s.id}')">
            <i class="fa-solid fa-scale-balanced"></i> Compare & Swap
          </button>
          <button class="btn-action-outline" onclick="showAdaptationRoadmap('${s.id}')">
            <i class="fa-solid fa-list-check"></i> Action Checklist (${item.adaptations.length})
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 8. Render Fleet Spare Coverage Table
 */
function renderCoverageTable() {
  const tbody = document.getElementById('coverage-table-body');
  if (!tbody) return;

  const searchTerm = (document.getElementById('table-search-input')?.value || '').toLowerCase().trim();
  const siteFilter = document.getElementById('table-site-filter')?.value || 'ALL';

  const rows = operatingFleet.filter(u => {
    if (activeCoverageFilter === 'UNCOVERED' && u.coverageStatus !== 'UNCOVERED') return false;
    if (activeCoverageFilter === 'OPTIMAL' && u.coverageStatus !== 'OPTIMAL') return false;
    if (activeCoverageFilter === 'GSUT' && u.sType !== 'GSUT' && u.mva < 25) return false;
    if (siteFilter !== 'ALL' && u.site !== siteFilter) return false;

    if (searchTerm) {
      const match = u.name.toLowerCase().includes(searchTerm) ||
                    u.sn.toLowerCase().includes(searchTerm) ||
                    u.site.toLowerCase().includes(searchTerm) ||
                    u.sType.toLowerCase().includes(searchTerm);
      if (!match) return false;
    }
    return true;
  });

  tbody.innerHTML = rows.map((u, idx) => {
    let dotClass = 'dot-optimal';
    let badgeClass = 'badge-optimal';
    if (u.coverageStatus === 'CONDITIONAL') {
      dotClass = 'dot-conditional';
      badgeClass = 'badge-conditional';
    } else if (u.coverageStatus === 'UNCOVERED') {
      dotClass = 'dot-uncovered';
      badgeClass = 'badge-incompatible';
    }

    const spareName = u.bestMatchSpare ? `${u.bestMatchSpare.name} (${u.bestMatchScore}%)` : '<span style="color:#ef4444; font-weight:700;">No Candidate</span>';
    const spareLoc = u.bestMatchSpare ? u.bestMatchSpare.site : '-';

    return `
      <tr>
        <td><code>${idx + 1}</code></td>
        <td>
          <strong>${u.name}</strong><br>
          <small style="color:var(--text-muted);">${u.sn || 'SN: -'}</small>
        </td>
        <td><span class="badge-status badge-info">${u.site}</span></td>
        <td>${u.sType}</td>
        <td><strong>${u.mva} MVA</strong></td>
        <td>${u.hv} / ${u.lv} kV</td>
        <td><code>${u.vectorGroup}</code></td>
        <td>
          <span style="font-weight:700; color:${u.hi >= 80 ? '#10b981' : (u.hi >= 50 ? '#f59e0b' : '#ef4444')}">${u.hi}%</span>
        </td>
        <td>
          <span class="status-indicator">
            <span class="status-dot ${dotClass}"></span>
            <span class="badge-pill ${badgeClass}">${u.coverageText}</span>
          </span>
        </td>
        <td>
          <span style="font-size:0.8rem;">${spareName}</span><br>
          <small style="color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${spareLoc}</small>
        </td>
        <td>
          <button class="btn-action-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="quickSelectMatch('${u.sn || u.name}')">
            <i class="fa-solid fa-crosshairs"></i> Simulate
          </button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('table-count-badge').textContent = `Showing ${rows.length} of ${operatingFleet.length} Units`;
}

/**
 * Quick select operating unit from table
 */
function quickSelectMatch(identifier) {
  const match = operatingFleet.find(u => (u.sn === identifier || u.name === identifier));
  if (match) {
    const select = document.getElementById('operating-tr-select');
    if (select) select.value = match.sn || match.name;
    selectOperatingUnit(match);
    window.scrollTo({ top: document.getElementById('matchmaker-section').offsetTop - 60, behavior: 'smooth' });
  }
}

/**
 * 9. Render Spare Inventory Registry Cards
 */
function renderInventoryRegistry() {
  const grid = document.getElementById('inventory-cards-grid');
  if (!grid) return;

  grid.innerHTML = SPARE_INVENTORY.map(s => {
    let badgeClass = 'readiness-ready';
    if (s.readiness.includes('Standby')) badgeClass = 'readiness-standby';
    else if (s.readiness.includes('Conditioning')) badgeClass = 'readiness-conditioning';

    return `
      <div class="inventory-card">
        <div class="inv-card-header">
          <div>
            <div class="inv-card-title">${s.name}</div>
            <div class="inv-card-sub"><i class="fa-solid fa-tag"></i> SN: ${s.serial} | <i class="fa-solid fa-location-dot"></i> ${s.location}</div>
          </div>
          <span class="inv-readiness-badge ${badgeClass}">${s.readiness}</span>
        </div>

        <div class="inv-specs-grid">
          <div><span class="spec-k">Power Rating:</span> <span class="spec-v">${s.ratedPower} MVA</span></div>
          <div><span class="spec-k">Voltage:</span> <span class="spec-v">${s.hvRate} / ${s.lvRate} kV</span></div>
          <div><span class="spec-k">Vector Group:</span> <span class="spec-v">${s.vectorGroup}</span></div>
          <div><span class="spec-k">Impedance:</span> <span class="spec-v">${s.impedance}%</span></div>
          <div><span class="spec-k">Tap Changer:</span> <span class="spec-v">${s.tapChanger} (${s.tapRange})</span></div>
          <div><span class="spec-k">Cooling / Fluid:</span> <span class="spec-v">${s.cooling} (${s.fluidType})</span></div>
        </div>

        <div class="inv-preservation-row">
          <span><i class="fa-solid fa-gauge"></i> N2 Blanket: <strong>${s.nitrogenBlanket}</strong></span>
          <span><i class="fa-solid fa-droplet"></i> Dew Pt: <strong>${s.dewPoint}</strong></span>
        </div>

        <div style="font-size:0.775rem; color:var(--text-muted); line-height:1.4;">
          ${s.remarks}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <small style="color:var(--text-muted);">Last PM: ${s.lastInspection}</small>
          <button class="btn-action-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="openSpareDetailModal('${s.id}')">
            <i class="fa-solid fa-eye"></i> Specs & History
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 10. Render Strategic Universal Spare Advisor Cards
 */
function renderStrategicAdvisor() {
  const container = document.getElementById('advisor-cards-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Strategy Card 1 -->
    <div class="advisor-card">
      <div class="advisor-title-row">
        <i class="fa-solid fa-bullseye advisor-icon"></i>
        <div class="advisor-title">Strategic Multi-Ratio GSUT Spare (115/11-15 kV 80 MVA)</div>
        <span class="advisor-impact-badge">+18 Critical Units Protected</span>
      </div>
      <div class="advisor-desc">
        현재ฝูงหม้อแปลงโรงไฟฟ้าขนาดใหญ่ (GSUT 45–91 MVA) ที่ CUP-1, CUP-4, SITE3, SITE6 มีความเสี่ยงสูญเสียรายได้สูงมากหากเกิด Fault เนื่องจากไม่มี Spare คุ้มครอง การจัดซื้อ <strong>Universal Spare 115/11-15.75 kV Dual-Secondary ขนาด 80 MVA</strong> จะช่วยปลดล็อกความเสี่ยงครอบคลุม 18 เครื่องสำคัญที่สุดของบริษัททันที
      </div>
      <div class="advisor-impact-metrics">
        <div class="metric-box">
          <span class="metric-val">฿1.2B</span>
          <span class="metric-lbl">Protected Generation Revenue</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">94.5%</span>
          <span class="metric-lbl">Projected Fleet Coverage</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">14 Days</span>
          <span class="metric-lbl">Lead Time to Restore (vs 14 Months)</span>
        </div>
      </div>
    </div>

    <!-- Strategy Card 2 -->
    <div class="advisor-card">
      <div class="advisor-title-row">
        <i class="fa-solid fa-handshake advisor-icon" style="color:#10b981;"></i>
        <div class="advisor-title">PTT Group Inter-Plant Shared Spare Mutual Agreement</div>
        <span class="advisor-impact-badge" style="background:rgba(56,189,248,0.2); color:#38bdf8; border-color:rgba(56,189,248,0.4);">Zero Capex Solution</span>
      </div>
      <div class="advisor-desc">
        จัดทำข้อตกลงแลกเปลี่ยนใช้งานหม้อแปลงสำรองฉุกเฉิน (Mutual Emergency Interchangeability Pact) ระหว่างโรงไฟฟ้าในกลุ่ม GPSC และโรงแยกก๊าซ ปตท. สำหรับหม้อแปลงขนาด <strong>115/22 kV 40 MVA</strong> และ <strong>22/6.9 kV 10 MVA</strong> โดยทำ Standardization ของ Terminals และ Protection Setting ล่วงหน้า
      </div>
      <div class="advisor-impact-metrics">
        <div class="metric-box">
          <span class="metric-val">฿0</span>
          <span class="metric-lbl">Immediate Capex Saved</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">12 Units</span>
          <span class="metric-lbl">Cross-Plant Mutual Backups</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">48 Hours</span>
          <span class="metric-lbl">Standard Transport Response</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 11. Side-by-Side Comparison & Simulation Modal
 */
function openComparisonModal(spareId) {
  const spare = SPARE_INVENTORY.find(s => s.id === spareId);
  const target = activeOperatingUnit;
  if (!spare || !target) return;

  const result = evaluateCompatibility(target, spare);

  document.getElementById('modal-target-title').textContent = `${target.name} (${target.site})`;
  document.getElementById('modal-spare-title').textContent = `${spare.name} (${spare.site})`;
  document.getElementById('modal-compat-score').textContent = `${result.score}%`;

  const tbody = document.getElementById('comparison-tbody');
  const compRows = [
    { label: 'Equipment Name', t: target.name, s: spare.name, match: 'match' },
    { label: 'Service Type / Application', t: target.sType, s: spare.readiness, match: 'match' },
    { label: 'MVA Capacity Rating', t: `${target.mva} MVA`, s: `${spare.ratedPower} MVA`, match: spare.ratedPower >= target.mva ? 'match' : (spare.ratedPower >= 0.8 * target.mva ? 'diff' : 'critical') },
    { label: 'Voltage Ratio (HV / LV)', t: `${target.hv} / ${target.lv} kV`, s: `${spare.hvRate} / ${spare.lvRate} kV`, match: (spare.hvRate === target.hv && spare.lvRate === target.lv) ? 'match' : 'diff' },
    { label: 'Vector Group (Phase Shift)', t: target.vectorGroup, s: spare.vectorGroup, match: target.vectorGroup === spare.vectorGroup ? 'match' : 'diff' },
    { label: 'Short Circuit Impedance (%Z)', t: `${target.impedance}%`, s: `${spare.impedance}%`, match: Math.abs(spare.impedance - target.impedance) <= 1.0 ? 'match' : 'diff' },
    { label: 'Tap Changer Type & Range', t: target.tapType, s: `${spare.tapChanger} (${spare.tapRange})`, match: target.tapType === spare.tapChanger ? 'match' : 'diff' },
    { label: 'Insulation & Fluid Type', t: target.isDry ? 'Dry-Type Cast Resin' : 'Oil Immersed', s: spare.fluidType, match: target.isDry === spare.isDry ? 'match' : 'critical' },
    { label: 'Preservation / Readiness', t: `Operational (HI: ${target.hi}%)`, s: `${spare.readiness} (Dew Pt: ${spare.dewPoint})`, match: 'match' },
    { label: 'Estimated Rigging & Weight', t: '~ Standard bay', s: `Total: ${(spare.totalMass / 1000).toFixed(1)} tons (${spare.dimensions})`, match: 'match' }
  ];

  tbody.innerHTML = compRows.map(r => {
    let cls = 'val-match';
    if (r.match === 'diff') cls = 'val-diff';
    else if (r.match === 'critical') cls = 'val-critical-diff';

    return `
      <tr>
        <td><strong>${r.label}</strong></td>
        <td>${r.t}</td>
        <td class="${cls}">${r.s}</td>
      </tr>
    `;
  }).join('');

  // Action checklist
  const ul = document.getElementById('action-checklist-ul');
  ul.innerHTML = result.adaptations.map(a => `
    <li><i class="fa-solid fa-square-check"></i> <span>${a}</span></li>
  `).join('');

  document.getElementById('comparison-modal').classList.add('active');
}

function showAdaptationRoadmap(spareId) {
  openComparisonModal(spareId);
}

function closeComparisonModal() {
  document.getElementById('comparison-modal').classList.remove('active');
}

/**
 * 12. Setup Event Listeners
 */
function setupEventListeners() {
  const opSelect = document.getElementById('operating-tr-select');
  if (opSelect) {
    opSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const unit = operatingFleet.find(u => u.sn === val || u.name === val);
      if (unit) selectOperatingUnit(unit);
    });
  }

  // Filter tabs for table
  document.querySelectorAll('.filter-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeCoverageFilter = e.currentTarget.getAttribute('data-filter') || 'ALL';
      renderCoverageTable();
    });
  });

  const searchInput = document.getElementById('table-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderCoverageTable());
  }

  const siteFilter = document.getElementById('table-site-filter');
  if (siteFilter) {
    const sites = {};
    operatingFleet.forEach(u => { sites[u.site] = true; });
    Object.keys(sites).sort().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      siteFilter.appendChild(opt);
    });
    siteFilter.addEventListener('change', () => renderCoverageTable());
  }

  // Global Site Filter in Navbar
  const globalSite = document.getElementById('global-site-filter');
  if (globalSite) {
    globalSite.addEventListener('change', (e) => {
      const val = e.target.value;
      if (siteFilter) {
        siteFilter.value = val;
        renderCoverageTable();
      }
    });
  }

  // Theme change
  window.addEventListener('themeChanged', () => {
    // Re-render components if needed
  });
}

/**
 * Export Coverage Summary to CSV
 */
function exportCoverageCSV() {
  if (operatingFleet.length === 0) return;
  const headers = ['Operating Name', 'Serial No', 'Site', 'Service Type', 'MVA', 'HV (kV)', 'LV (kV)', 'Vector Group', '%Z', 'Health Index', 'Coverage Status', 'Best Match Spare', 'Match Score (%)', 'Spare Location'];
  const rows = [headers.join(',')];

  operatingFleet.forEach(u => {
    const spareName = u.bestMatchSpare ? u.bestMatchSpare.name : 'None';
    const spareLoc = u.bestMatchSpare ? u.bestMatchSpare.site : '-';
    const r = [
      `"${u.name}"`,
      `"${u.sn}"`,
      `"${u.site}"`,
      `"${u.sType}"`,
      u.mva,
      u.hv,
      u.lv,
      `"${u.vectorGroup}"`,
      u.impedance,
      u.hi,
      `"${u.coverageStatus}"`,
      `"${spareName}"`,
      u.bestMatchScore,
      `"${spareLoc}"`
    ];
    rows.push(r.join(','));
  });

  const blob = new Blob(["\uFEFF" + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GPSC_Spare_Coverage_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Quick View for Strategic Spare Asset Card & Maintenance History
 */
function openSpareDetailModal(spareId) {
  const spare = SPARE_INVENTORY.find(s => s.id === spareId);
  if (!spare) return;
  alert(`[GPSC Strategic Reserve Asset Card]\n\nAsset: ${spare.name}\nSerial No: ${spare.serial}\nStorage Location: ${spare.location}\n\n• Technical Rating: ${spare.ratedPower} MVA | ${spare.hvRate}/${spare.lvRate} kV\n• Vector Group: ${spare.vectorGroup} | %Z: ${spare.impedance}%\n• Tap Changer: ${spare.tapChanger} (${spare.tapRange})\n• Readiness Status: ${spare.readiness}\n• Nitrogen Blanket: ${spare.nitrogenBlanket}\n• Dew Point: ${spare.dewPoint}\n• Oil Volume: ${(spare.oilVolume || 0).toLocaleString()} Liters | Total Mass: ${spare.totalMass ? (spare.totalMass/1000).toFixed(1) : '-'} Tons\n• Last Maintenance: ${spare.lastInspection}\n\nRemarks: ${spare.remarks}`);
}

