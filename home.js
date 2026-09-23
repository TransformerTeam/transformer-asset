/**
 * ==========================================================================
 * EXECUTIVE FLEET HOME PAGE - JAVASCRIPT (home.js)
 * GPSC Transformer Asset Management Portal
 * ==========================================================================
 */

let fleetData = [];
let filteredData = [];
let planTasks = [];
let chartAgeHealth = null;
let chartRUL = null;
let chartCAPEX = null;
let gaugeDGA = null, gaugeOil = null, gaugeElec = null, gaugeThermo = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initData();
  setupEventListeners();
  loadPlanData();
  applyFilters();
});

function isExcludedSite(site) {
  if (!site) return false;
  const s = String(site).trim().toLowerCase();
  if (s === 'scrap' || s.includes('scrap')) return true;
  if (s === 'spare gspp2&3' || s === 'spare gspp2 & 3' || (s.includes('spare') && s.includes('gspp'))) return true;
  return false;
}

/**
 * Convert composite decimal CoF (1.00 - 5.00) to standard 1..5 matrix level
 */
function getCofLevelFromComposite(comp) {
  const c = parseFloat(comp);
  if (isNaN(c)) return null;
  if (c < 1.8) return 1;
  if (c < 2.6) return 2;
  if (c < 3.4) return 3;
  if (c < 4.2) return 4;
  return 5;
}

/**
 * Retrieve saved Part 3 Criticality / Consequence of Failure assessment from localStorage
 */
function getSavedPart3CoF(sn, name, trMatch) {
  const keysToTry = [
    sn,
    name,
    name ? name.split('(')[0].trim() : '',
    trMatch ? trMatch.SERIAL_NUMBER : '',
    trMatch ? trMatch.DEVICE_CODE : '',
    trMatch ? trMatch.LOCAL_EQUIPMENT_CODE : ''
  ].filter(Boolean);

  for (const k of keysToTry) {
    try {
      const raw = localStorage.getItem('gpsc_part3_criticality_' + String(k).trim());
      if (raw) {
        const data = JSON.parse(raw);
        if (data) {
          let lvl = null;
          if (typeof data.cofLevel === 'number' && data.cofLevel >= 1 && data.cofLevel <= 5) {
            lvl = data.cofLevel;
          } else if (data.compositeCof !== undefined) {
            lvl = getCofLevelFromComposite(data.compositeCof);
          }
          if (lvl !== null) {
            return {
              cofLevel: lvl,
              compositeCof: data.compositeCof,
              savedAt: data.savedAt,
              isCustom: true
            };
          }
        }
      }
    } catch (e) {
      // Ignore corrupted entries
    }
  }
  return null;
}

/**
 * 1. Data Initialization & Risk Metric Calculations
 */
function initData() {
  if (typeof HEALTH_INDEX_DATA === 'undefined' || !Array.isArray(HEALTH_INDEX_DATA)) {
    console.error("HEALTH_INDEX_DATA not found!");
    return;
  }

  // Filter valid assessment units (exclude scrap / spare) exactly as assessment.js
  const validHealthData = HEALTH_INDEX_DATA.filter(item => {
    const site = String(item['SITE'] || item.site || '');
    if (isExcludedSite(site)) return false;
    const name = item['Equipment Name'] || item.name || '';
    const serial = item['Serial No'] || item.serial || '';
    return Boolean(name || serial);
  });

  // Build lookup from TR_DATA if available
  const trLookup = {};
  if (typeof TR_DATA !== 'undefined' && Array.isArray(TR_DATA)) {
    TR_DATA.forEach(tr => {
      const sn = (tr.SERIAL_NUMBER || '').trim();
      const code = (tr.DEVICE_CODE || '').trim();
      const eq = (tr.LOCAL_EQUIPMENT_CODE || '').trim();
      if (sn) trLookup[sn] = tr;
      if (code) trLookup[code] = tr;
      if (eq) trLookup[eq] = tr;
    });
  }

  fleetData = validHealthData.map(item => {
    const sn = (item['Serial No'] || '').trim();
    const name = (item['Equipment Name'] || '').trim();
    let trMatch = trLookup[sn] || trLookup[name];
    if (!trMatch && name) {
      const clean = name.split('(')[0].trim();
      trMatch = trLookup[clean];
    }
    trMatch = trMatch || {};

    // Insulation and Fluid classification (Oil-type vs Dry-type, Mineral / Natural / Synthetic)
    const dataCol = String(trMatch.DATA || '').toUpperCase();
    const insul = String(trMatch.TYPE_OF_INSULATION || '').toUpperCase();
    const isDry = dataCol.includes('DRY') || insul.includes('DRY') || insul.includes('RESIN') || insul.includes('RASIN') || insul.includes('CAST') || /dry/i.test(String(trMatch.MODEL_TYPE || '')) || /dry/i.test(String(trMatch.APPLICATION || '')) || String(item['Service Type'] || '').toUpperCase().includes('DRY');

    let oilType = null;
    if (!isDry) {
      if (insul.includes('NATURAL')) oilType = 'natural';
      else if (insul.includes('SYNTHETIC')) oilType = 'synthetic';
      else oilType = 'mineral'; // Defaults to Mineral Oil per IEEE/assessment standards
    }

    const rawHI = parseFloat(item['Condition Health Index']);
    const hi = isNaN(rawHI) ? null : rawHI;
    
    // Rated Power in MVA
    let mva = parseFloat(item['Rated Power (MVA)']);
    if (isNaN(mva) && trMatch.POWER_RATING) {
      mva = parseFloat(trMatch.POWER_RATING) / 1000.0;
    }
    if (isNaN(mva)) mva = 1.6;

    // Service Age
    let age = parseFloat(item['Service Age (Year)']);
    if (isNaN(age) && trMatch.MANUFACTURING_DATE) {
      const yr = new Date(trMatch.MANUFACTURING_DATE).getFullYear();
      if (!isNaN(yr)) age = Math.max(0, 2026 - yr);
    }
    if (isNaN(age)) age = 15;

    // Service Type Normalization
    let sType = (item['Service Type'] || trMatch.Service_Type || 'Auxiliary').trim();
    if (/GSU|Step-Up|Generator Step/i.test(sType)) sType = 'GSUT';
    else if (/UAT|Unit Aux/i.test(sType)) sType = 'UAT';
    else if (/Distribution/i.test(sType)) sType = 'Distribution';
    else sType = 'Auxiliary';

    // 1. Calculate Probability of Failure (PoF: 1 to 5)
    let pof = 1;
    if (hi === null) {
      pof = 2; // Dry-type or non-assessed default
    } else if (hi <= 50) {
      pof = 5; // Very High
    } else if (hi <= 68) {
      pof = 4; // High
    } else if (hi <= 79) {
      pof = 3; // Medium
    } else if (hi <= 88) {
      pof = 2; // Low
    } else {
      pof = 1; // Very Low
    }

    // Adjust PoF for active DGA critical fault or severe dielectric breakdown
    const dga = (item['DGA'] || '').toUpperCase();
    const bd = (item['Dielectric Breakdown'] || '').toUpperCase();
    const dp = parseFloat(item['Estimated DP (From Furan)']);
    if (dga === 'U' || dga === 'Q') pof = Math.min(5, pof + 1);
    if (!isNaN(dp) && dp < 350) pof = Math.min(5, Math.max(pof, 4));

    // 2. Calculate Consequence of Failure (CoF: 1 to 5)
    // Check if user evaluated or customized CoF via Part 3 Assessment or Quick Editor
    const savedPart3 = getSavedPart3CoF(sn, name, trMatch);
    let cof = 2;
    let hasCustomCof = false;

    if (savedPart3) {
      cof = savedPart3.cofLevel;
      hasCustomCof = true;
    } else {
      if (sType === 'GSUT' || mva >= 80) {
        cof = 5; // Catastrophic: Total generation loss
      } else if (sType === 'UAT' || mva >= 25) {
        cof = 4; // Major: Plant trip risk
      } else if (mva >= 10 || sType === 'Distribution') {
        cof = 3; // Moderate: Bus outage / redundancy
      } else if (mva >= 2) {
        cof = 2; // Minor: Local feeder
      } else {
        cof = 1; // Negligible: Standby / Low voltage
      }
    }

    // 3. Risk Score & Financial Exposure (THB)
    const riskScore = pof * cof;
    
    // Estimated Asset Replacement Value (THB)
    // ~ 450,000 THB per MVA base, multiplier for GSUT / HV
    let unitValueTHB = Math.max(3000000, mva * 450000);
    if (sType === 'GSUT') unitValueTHB *= 2.2;
    else if (sType === 'UAT') unitValueTHB *= 1.5;

    // Outage Impact Cost (THB)
    let outageImpactTHB = cof === 5 ? 85000000 : (cof === 4 ? 30000000 : (cof === 3 ? 6000000 : 1500000));
    
    // Probability weighting: PoF 5 ~ 45%, PoF 4 ~ 22%, PoF 3 ~ 8%, PoF 2 ~ 2.5%, PoF 1 ~ 0.5%
    const pofProb = [0, 0.005, 0.025, 0.08, 0.22, 0.45][pof];
    const financialExposureTHB = pofProb * (unitValueTHB + outageImpactTHB);

    // 4. Condition-based Remaining Useful Life (RUL)
    let rul = 12;
    if (hi === null) rul = Math.max(5, 35 - age);
    else if (hi <= 50) rul = Math.max(1, Math.round(hi / 25)); // 1-2 years
    else if (hi <= 68 || age >= 30) rul = Math.max(3, Math.round(3 + (hi - 50) / 6)); // 3-6 years
    else if (hi <= 79 || age >= 22) rul = Math.max(7, Math.round(7 + (hi - 68) / 4)); // 7-10 years
    else rul = Math.max(11, Math.round(11 + (hi - 80) / 2)); // > 10 years

    // 5. Primary Warning Factor
    let primaryFactor = 'Normal Operation';
    if (hi !== null && hi <= 50) {
      if (item['Recommendation'] && item['Recommendation'].includes('DGA')) primaryFactor = 'Active DGA Gas Fault';
      else if (bd === 'U') primaryFactor = 'Low Oil Dielectric';
      else if (!isNaN(dp) && dp < 350) primaryFactor = 'Insulation Paper Degradation';
      else primaryFactor = 'Critical Condition Degradation';
    } else if (hi !== null && hi <= 70) {
      if (dga === 'Q') primaryFactor = 'Elevated DGA Trend';
      else if (item['Main Tank Oil'] === 'Q' || item['Main Tank Oil'] === 'U') primaryFactor = 'Oil Quality Aging';
      else if (bd === 'Q') primaryFactor = 'Moderate Dielectric Drop';
      else primaryFactor = 'Medium Condition Aging';
    } else {
      if (age >= 25) primaryFactor = 'High Operating Age';
      else primaryFactor = 'Optimal Asset Condition';
    }

    return {
      sn,
      name,
      site: item['SITE'] || item.site || 'Unknown',
      mva,
      age,
      sType,
      isDry,
      oilType,
      hi,
      status: (() => {
        if (hi === null) return 'Not Assessed';
        if (hi >= 80) return 'Healthy';
        if (hi >= 70) return 'Monitoring';
        if (hi >= 50) return 'Warning';
        return 'Critical';
      })(),
      dp: isNaN(dp) ? null : dp,
      pof,
      cof,
      hasCustomCof,
      compositeCof: savedPart3 ? savedPart3.compositeCof : null,
      savedPart3Date: savedPart3 ? savedPart3.savedAt : null,
      riskScore,
      unitValueTHB,
      financialExposureTHB,
      rul,
      recommendation: item['Recommendation'] || 'Standard Maintenance',
      primaryFactor,
      rawItem: item
    };
  });

  // Populate Site Filter Options dynamically
  const siteFilter = document.getElementById('site-filter');
  if (siteFilter) {
    const siteCounts = {};
    fleetData.forEach(d => { siteCounts[d.site] = (siteCounts[d.site] || 0) + 1; });
    
    // Clear and rebuild options
    siteFilter.innerHTML = `<option value="ALL">All Substations & Sites (${fleetData.length})</option>`;
    Object.keys(siteCounts).sort().forEach(site => {
      const opt = document.createElement('option');
      opt.value = site;
      opt.textContent = `${site} (${siteCounts[site]})`;
      siteFilter.appendChild(opt);
    });
  }
}

/**
 * 2. Setup Event Listeners
 */
function setupEventListeners() {
  const siteFilter = document.getElementById('site-filter');
  const typeFilter = document.getElementById('type-filter');
  const searchInput = document.getElementById('search-ranking');

  if (siteFilter) siteFilter.addEventListener('change', applyFilters);
  if (typeFilter) typeFilter.addEventListener('change', applyFilters);
  if (searchInput) searchInput.addEventListener('input', () => renderRankingTable());

  // Listen to Theme Changes from Theme Engine
  window.addEventListener('themeChanged', () => {
    refreshAllCharts();
  });

  // Real-time dynamic sync for Part 3 CoF updates across tabs & windows
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('gpsc_part3_sync');
      bc.onmessage = (event) => {
        initData();
        applyFilters();
      };
    } catch (e) {}
  }

  window.addEventListener('storage', (e) => {
    if (!e.key || e.key.startsWith('gpsc_part3_') || e.key === 'gpsc_part3_last_update') {
      initData();
      applyFilters();
    }
  });

  window.addEventListener('focus', () => {
    initData();
    applyFilters();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      initData();
      applyFilters();
    }
  });

  // Heartbeat check every 2.5s for instant multi-window detection
  let lastPart3UpdateSeen = localStorage.getItem('gpsc_part3_last_update') || '';
  setInterval(() => {
    const cur = localStorage.getItem('gpsc_part3_last_update') || '';
    if (cur && cur !== lastPart3UpdateSeen) {
      lastPart3UpdateSeen = cur;
      initData();
      applyFilters();
    }
  }, 2500);
}

/**
 * 3. Filter Application & Redraw
 */
function applyFilters() {
  const siteVal = document.getElementById('site-filter')?.value || 'ALL';
  const typeVal = document.getElementById('type-filter')?.value || 'ALL';

  filteredData = fleetData.filter(d => {
    if (siteVal !== 'ALL' && d.site !== siteVal) return false;
    if (typeVal !== 'ALL' && d.sType !== typeVal) return false;
    return true;
  });

  renderExecutiveKPIs();
  renderRiskMatrix();
  renderAgeVsHealthChart();
  renderRankingTable();
  renderCriticalWatchlist();
  renderActionPillars();
  renderInterventionTimeline();
  renderRULDistributionChart();
  renderCAPEXForecastChart();
  renderComplianceGauges();
  renderSAPBacklog();
}

/**
 * MODULE 1.1: Executive KPI Cards
 */
function renderExecutiveKPIs() {
  const total = filteredData.length;
  const assessed = filteredData.filter(d => d.hi !== null);
  
  let good = 0, fair = 0, warning = 0, critical = 0, totalHI = 0;
  let totalFinancialRisk = 0;

  filteredData.forEach(d => {
    totalFinancialRisk += d.financialExposureTHB;
    if (d.hi !== null) {
      totalHI += d.hi;
      if (d.hi >= 80) good++;
      else if (d.hi >= 70) fair++;
      else if (d.hi >= 50) warning++;
      else critical++;
    }
  });

  const avgHI = assessed.length > 0 ? (totalHI / assessed.length).toFixed(1) : 'N/A';
  const goodPct = assessed.length > 0 ? ((good / assessed.length) * 100).toFixed(0) : 0;
  const fairPct = assessed.length > 0 ? (((fair + warning) / assessed.length) * 100).toFixed(0) : 0;
  const critPct = assessed.length > 0 ? ((critical / assessed.length) * 100).toFixed(0) : 0;

  // Update DOM
  document.getElementById('kpi-total-tr').textContent = total;

  const oilCount = filteredData.filter(d => !d.isDry).length;
  const dryCount = filteredData.filter(d => d.isDry).length;
  const mineralCount = filteredData.filter(d => !d.isDry && d.oilType === 'mineral').length;
  const naturalCount = filteredData.filter(d => !d.isDry && d.oilType === 'natural').length;
  const syntheticCount = filteredData.filter(d => !d.isDry && d.oilType === 'synthetic').length;

  const elTotalSub = document.getElementById('kpi-total-sub');
  if (elTotalSub) {
    elTotalSub.innerHTML = `
      <div class="kpi-sub-line line-main">
        <span><strong>${oilCount}</strong> Oil-type</span> <span class="sep">|</span> <span><strong>${dryCount}</strong> Dry-type</span>
      </div>
      <div class="kpi-sub-line line-detail">
        <span>${mineralCount} Mineral</span> <span class="sep">|</span> <span>${naturalCount} Natural</span> <span class="sep">|</span> <span>${syntheticCount} Synthetic</span>
      </div>
    `;
  }

  // Card 2: Risk Matrix Transformers (ผลรวมหม้อแปลง ตาม Risk Matrix)
  let critCount = 0, highCount = 0, medCount = 0, lowCount = 0;
  filteredData.forEach(d => {
    if (d.riskScore >= 16) critCount++;
    else if (d.riskScore >= 12) highCount++;
    else if (d.riskScore >= 6) medCount++;
    else lowCount++;
  });

  const elMatrixTotal = document.getElementById('kpi-matrix-total');
  if (elMatrixTotal) elMatrixTotal.textContent = total;

  const elMatrixSub = document.getElementById('kpi-matrix-sub');
  if (elMatrixSub) {
    elMatrixSub.innerHTML = `
      <div class="quadrant-cell extreme">
        <span class="q-lbl">Extreme</span>
        <span class="q-val" style="color:var(--risk-extreme);">${critCount}</span>
      </div>
      <div class="quadrant-cell high">
        <span class="q-lbl">High</span>
        <span class="q-val" style="color:var(--risk-high);">${highCount}</span>
      </div>
      <div class="quadrant-cell med">
        <span class="q-lbl">Medium</span>
        <span class="q-val" style="color:var(--risk-med);">${medCount}</span>
      </div>
      <div class="quadrant-cell low">
        <span class="q-lbl">Low</span>
        <span class="q-val" style="color:var(--risk-low);">${lowCount}</span>
      </div>
    `;
  }

  // Fallbacks if legacy elements exist
  const elAvgHI = document.getElementById('kpi-avg-hi');
  if (elAvgHI) elAvgHI.textContent = avgHI !== 'N/A' ? `${avgHI}%` : 'N/A';
  const elHiBreakdown = document.getElementById('kpi-hi-breakdown');
  if (elHiBreakdown) {
    elHiBreakdown.innerHTML = `
      <span class="pill-badge pill-good"><i class="fa-solid fa-circle-check"></i> ${goodPct}% Good</span>
      <span class="pill-badge pill-fair"><i class="fa-solid fa-circle-exclamation"></i> ${fairPct}% Fair</span>
      <span class="pill-badge pill-crit"><i class="fa-solid fa-triangle-exclamation"></i> ${critPct}% Crit</span>
    `;
  }

  document.getElementById('kpi-high-risk').textContent = critical + warning;
  document.getElementById('kpi-risk-sub').innerHTML = `
    <strong style="color:var(--risk-extreme);">${critical} Critical</strong> (&lt;50%) | 
    <span style="color:var(--risk-high);">${warning} Warning</span> (50-69%)
  `;

  // Estimated Cost (This Year) from Maintenance Plan
  renderCostKPI();
}

/**
 * MODULE 1.1b: Estimated Cost (This Year) Engine & Sub-breakdowns
 */
async function loadPlanData() {
  // Check localStorage first
  try {
    const cached = localStorage.getItem('GPSC_PLAN_TASKS_2026');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        planTasks = parsed;
      }
    }
  } catch (e) {}

  // Fetch plan_data.json
  try {
    const res = await fetch('plan_data.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tasks)) {
        planTasks = data.tasks;
      }
    }
  } catch (e) {}

  renderCostKPI();
}

function classifyPlanTask(t) {
  const name = (t.task || '').toLowerCase();
  const cat = (t.cat || '').toLowerCase();
  
  // Improvement / Life Extension / Major Overhaul / Oil Regeneration / Re-gasket
  if (name.includes('oil regeneration') || 
      name.includes('overhaul') || 
      name.includes('re-gasket') || 
      name.includes('insulation paper')) {
    return { expense: 'IMP', funding: 'CAPEX' };
  }
  
  // Corrective Maintenance (Replace damaged/defective parts, repair, connection inspection)
  if (name.includes('replace') || 
      name.includes('inspection oltc connection') || 
      name.includes('repair') || 
      name.includes('corrective') || 
      cat.includes('corrective')) {
    return { expense: 'CM', funding: 'OPEX' };
  }
  
  // Otherwise Preventive Maintenance / Routine / Life Assessment / Scaffolding / Passivator
  return { expense: 'PM', funding: 'OPEX' };
}

function matchesPlanPlant(plantName, filterSite) {
  if (!plantName || !filterSite) return false;
  const p = plantName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s = filterSite.toLowerCase().replace(/[^a-z0-9]/g, '');
  return p === s || p.includes(s) || s.includes(p);
}

function renderCostKPI() {
  const elVal = document.getElementById('kpi-cost-total');
  const elSub = document.getElementById('kpi-cost-sub');
  if (!elVal || !elSub) return;

  const siteVal = document.getElementById('site-filter')?.value || 'ALL';

  let totalCost = 0;
  let capex = 0, opex = 0;
  let pm = 0, cm = 0, imp = 0;

  let activeTasks = planTasks;
  if (siteVal !== 'ALL') {
    activeTasks = planTasks.filter(t => matchesPlanPlant(t.plant, siteVal));
  }

  if (activeTasks && activeTasks.length > 0) {
    const parents = activeTasks.filter(t => !t.parentId);
    parents.forEach(p => {
      const subs = activeTasks.filter(s => s.parentId === p.id);
      if (subs.length > 0 && subs.some(s => (s.cost || 0) > 0)) {
        subs.forEach(s => {
          const c = Number(s.cost) || 0;
          if (c > 0) {
            totalCost += c;
            const cls = classifyPlanTask(s);
            if (cls.funding === 'CAPEX') capex += c; else opex += c;
            if (cls.expense === 'IMP') imp += c;
            else if (cls.expense === 'CM') cm += c;
            else pm += c;
          }
        });
      } else {
        const c = Number(p.cost) || 0;
        if (c > 0) {
          totalCost += c;
          const cls = classifyPlanTask(p);
          if (cls.funding === 'CAPEX') capex += c; else opex += c;
          if (cls.expense === 'IMP') imp += c;
          else if (cls.expense === 'CM') cm += c;
          else pm += c;
        }
      }
    });
  } else if (siteVal === 'ALL') {
    // Fallback baseline totals for fleet-wide if plan_data.json has not loaded
    totalCost = 5469870;
    capex = 3667500;
    opex = 1802370;
    pm = 1032830;
    cm = 769540;
    imp = 3667500;
  }

  const totalM = (totalCost / 1000000).toFixed(2);
  const capexM = (capex / 1000000).toFixed(2);
  const opexM = (opex / 1000000).toFixed(2);
  const pmM = (pm / 1000000).toFixed(2);
  const cmM = (cm / 1000000).toFixed(2);
  const impM = (imp / 1000000).toFixed(2);

  elVal.textContent = `฿ ${totalM}M`;
  elSub.innerHTML = `
    <div class="kpi-sub-line line-main">
      <span><strong>CAPEX</strong> ${capexM} M</span> <span class="sep">|</span> <span><strong>OPEX</strong> ${opexM} M</span>
    </div>
    <div class="kpi-sub-line line-detail">
      <span>PM ${pmM} M</span> <span class="sep">|</span> <span>CM ${cmM} M</span> <span class="sep">|</span> <span title="Improvement (IMP)">IMP ${impM} M</span>
    </div>
  `;
}

/**
 * MODULE 1.2: Transformer Risk Matrix
 */
function renderRiskMatrix() {
  const gridContainer = document.getElementById('risk-matrix-grid');
  if (!gridContainer) return;

  // Matrix cells: 5 rows (PoF 5 down to 1) x 5 cols (CoF 1 to 5)
  // Clear existing cells except labels
  gridContainer.innerHTML = '';

  const yLabels = ['5 (Almost Certain)', '4 (Likely)', '3 (Possible)', '2 (Unlikely)', '1 (Rare)'];
  const xLabels = ['1 (Negligible)', '2 (Minor)', '3 (Moderate)', '4 (Major)', '5 (Catastrophic)'];

  // Matrix Cell Definition: [pof][cof] = array of items
  const matrixBuckets = {};
  for (let r = 5; r >= 1; r--) {
    matrixBuckets[r] = {};
    for (let c = 1; c <= 5; c++) {
      matrixBuckets[r][c] = [];
    }
  }

  filteredData.forEach(d => {
    if (matrixBuckets[d.pof] && matrixBuckets[d.pof][d.cof]) {
      matrixBuckets[d.pof][d.cof].push(d);
    }
  });

  // Build Grid HTML
  // 1. Vertical Y-axis Title: Probability of Failure (spans rows 1 to 5, column 1)
  const yAxisTitle = document.createElement('div');
  yAxisTitle.className = 'matrix-axis-y-title';
  yAxisTitle.textContent = 'Probability of Failure';
  gridContainer.appendChild(yAxisTitle);

  for (let pof = 5; pof >= 1; pof--) {
    // Y-axis Label (column 2)
    const yLabelEl = document.createElement('div');
    yLabelEl.className = 'matrix-y-label';
    yLabelEl.textContent = pof;
    yLabelEl.title = yLabels[5 - pof];
    gridContainer.appendChild(yLabelEl);

    // 5 Columns (CoF 1 to 5) (columns 3 to 7)
    for (let cof = 1; cof <= 5; cof++) {
      const items = matrixBuckets[pof][cof];
      const count = items.length;
      const score = pof * cof;

      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      
      // Determine Risk Zone Color
      if (score >= 16) cell.classList.add('cell-crit');
      else if (score >= 12) cell.classList.add('cell-high');
      else if (score >= 6) cell.classList.add('cell-med');
      else cell.classList.add('cell-low');

      cell.innerHTML = `
        <span class="cell-count">${count}</span>
      `;

      cell.title = `PoF: ${pof}, CoF: ${cof} (Score: ${score}) - ${count} transformers. Click to view list.`;
      cell.onclick = () => showMatrixDetailModal(pof, cof, items);

      gridContainer.appendChild(cell);
    }
  }

  // Row 6: Empty corner (spans columns 1-2) + X-axis labels (columns 3-7)
  const corner = document.createElement('div');
  corner.className = 'matrix-corner';
  gridContainer.appendChild(corner);

  for (let cof = 1; cof <= 5; cof++) {
    const xLabelEl = document.createElement('div');
    xLabelEl.className = 'matrix-x-label';
    xLabelEl.textContent = cof;
    xLabelEl.title = xLabels[cof - 1];
    gridContainer.appendChild(xLabelEl);
  }

  // Row 7: Horizontal X-axis Title: Consequence of Failure (spans columns 3 to 7)
  const xAxisTitle = document.createElement('div');
  xAxisTitle.className = 'matrix-axis-x-title';
  xAxisTitle.textContent = 'Consequence of Failure';
  gridContainer.appendChild(xAxisTitle);

  // Update Summary Counts
  let critCount = 0, highCount = 0, medCount = 0, lowCount = 0;
  filteredData.forEach(d => {
    if (d.riskScore >= 16) critCount++;
    else if (d.riskScore >= 12) highCount++;
    else if (d.riskScore >= 6) medCount++;
    else lowCount++;
  });

  const legendCrit = document.getElementById('legend-crit-count');
  const legendHigh = document.getElementById('legend-high-count');
  const legendMed = document.getElementById('legend-med-count');
  const legendLow = document.getElementById('legend-low-count');

  if (legendCrit) legendCrit.textContent = `${critCount} Units`;
  if (legendHigh) legendHigh.textContent = `${highCount} Units`;
  if (legendMed) legendMed.textContent = `${medCount} Units`;
  if (legendLow) legendLow.textContent = `${lowCount} Units`;
}

/**
 * Modal Popup for Risk Matrix Cell Details
 */
function showMatrixDetailModal(pof, cof, items) {
  const modal = document.getElementById('matrix-modal');
  const modalTitle = document.getElementById('modal-matrix-title');
  const modalBody = document.getElementById('modal-matrix-body');
  if (!modal || !modalTitle || !modalBody) return;

  const score = pof * cof;
  let zoneName = score >= 16 ? 'Extreme Risk' : (score >= 12 ? 'High Risk' : (score >= 6 ? 'Medium Risk' : 'Low Risk'));
  
  modalTitle.innerHTML = `<i class="fa-solid fa-layer-group text-indigo-400"></i> Risk Matrix Cell: PoF ${pof} × CoF ${cof} (${zoneName} - ${items.length} Transformers)`;

  if (items.length === 0) {
    modalBody.innerHTML = `<p style="padding:20px; text-align:center; color:var(--exec-text-body);">No transformers in this risk category.</p>`;
  } else {
    let rowsHtml = items.map((it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${it.name}</strong></td>
        <td><code>${it.sn}</code></td>
        <td>${it.site}</td>
        <td>${it.sType}</td>
        <td>${it.mva} MVA</td>
        <td><span class="badge-status ${it.hi <= 50 ? 'badge-critical' : (it.hi <= 70 ? 'badge-warning' : (it.hi <= 79 ? 'badge-caution' : 'badge-normal'))}">${it.hi !== null ? it.hi + '%' : 'N/A'}</span></td>
        <td>${it.primaryFactor}</td>
        <td style="white-space:nowrap;">
          <a href="assessment.html?search=${encodeURIComponent(it.name)}" class="action-btn-sm" target="_blank" title="View Assessment">
            <i class="fa-solid fa-stethoscope"></i> View
          </a>
          <a href="evaluation_report.html?serial=${encodeURIComponent(it.sn || it.name)}#part-3-wrapper" class="action-btn-sm" target="_blank" title="Open Part 3 CoF Evaluation in Evaluation Report" style="margin-left:4px;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Evaluation
          </a>
        </td>
      </tr>
    `).join('');

    modalBody.innerHTML = `
      <div class="table-responsive">
        <table class="exec-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipment Name</th>
              <th>Serial No</th>
              <th>Site</th>
              <th>Type</th>
              <th>Rating</th>
              <th>Health Index</th>
              <th>Primary Condition Alert</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  modal.classList.add('active');
}

function closeMatrixModal() {
  const modal = document.getElementById('matrix-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * MODULE 1.3: Fleet Age vs Health Profile (Scatter Plot)
 */
function renderAgeVsHealthChart() {
  const chartEl = document.querySelector("#chart-age-health");
  if (!chartEl) return;

  // Prepare scatter data series grouped by 4-tier status
  const goodSeries = [];
  const monitorSeries = [];
  const warnSeries = [];
  const critSeries = [];

  filteredData.forEach(d => {
    if (d.hi !== null) {
      const point = { x: d.age, y: d.hi, name: d.name, site: d.site, sn: d.sn, sType: d.sType };
      if (d.hi >= 80) goodSeries.push(point);
      else if (d.hi >= 70) monitorSeries.push(point);
      else if (d.hi >= 50) warnSeries.push(point);
      else critSeries.push(point);
    }
  });

  // Standard Aging Degradation Curve (CIGRE TB 761 / IEEE 30-40 Year Design Life Model)
  const baselineData = [
    { x: 0, y: 100 },
    { x: 5, y: 97 },
    { x: 10, y: 93 },
    { x: 15, y: 88 },
    { x: 20, y: 82 },
    { x: 25, y: 76 },
    { x: 30, y: 70 },
    { x: 35, y: 60 },
    { x: 40, y: 50 }
  ];

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  const options = {
    series: [
      {
        name: 'เกณฑ์เสื่อมสภาพปกติ (Standard Degradation)',
        type: 'line',
        data: baselineData
      },
      {
        name: 'Healthy (HI ≥ 80%)',
        type: 'scatter',
        data: goodSeries
      },
      {
        name: 'Monitoring (70-79%)',
        type: 'scatter',
        data: monitorSeries
      },
      {
        name: 'Warning (50-69%)',
        type: 'scatter',
        data: warnSeries
      },
      {
        name: 'Critical (HI < 50%)',
        type: 'scatter',
        data: critSeries
      }
    ],
    chart: {
      height: 350,
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false }
    },
    stroke: {
      width: [2.5, 0, 0, 0, 0],
      curve: 'smooth',
      dashArray: [5, 0, 0, 0, 0]
    },
    colors: ['#6366f1', '#10b981', '#eab308', '#f97316', '#ef4444'],
    markers: {
      size: [0, 5.5, 5.5, 5.5, 6.5],
      strokeColors: ['#6366f1', '#059669', '#ca8a04', '#ea580c', '#dc2626'],
      strokeWidth: [0, 1.5, 1.5, 1.5, 1.5],
      hover: { size: [0, 8, 8, 8, 8.5] }
    },
    xaxis: {
      title: { text: 'Service Age (Years)', style: { color: textColor, fontWeight: 600 } },
      labels: { style: { colors: textColor } },
      min: 0,
      max: 40,
      tickAmount: 8
    },
    yaxis: {
      title: { text: 'Health Index (%)', style: { color: textColor, fontWeight: 600 } },
      labels: { style: { colors: textColor } },
      min: 0,
      max: 100,
      tickAmount: 5
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 3
    },
    legend: {
      show: false // Custom legend in DOM
    },
    annotations: {
      yaxis: [
        {
          y: 80,
          borderColor: '#10b981',
          strokeDashArray: 3,
          label: {
            position: 'left',
            textAnchor: 'start',
            text: 'Healthy (80%)',
            borderColor: '#34d399',
            borderWidth: 1,
            borderRadius: 4,
            style: { color: '#ffffff', background: '#059669', fontWeight: 600, padding: { left: 6, right: 6, top: 2, bottom: 2 }, fontSize: '10px' }
          }
        },
        {
          y: 70,
          borderColor: '#eab308',
          strokeDashArray: 3,
          label: {
            position: 'left',
            textAnchor: 'start',
            text: 'Monitoring (70%)',
            borderColor: '#facc15',
            borderWidth: 1,
            borderRadius: 4,
            style: { color: '#ffffff', background: '#ca8a04', fontWeight: 600, padding: { left: 6, right: 6, top: 2, bottom: 2 }, fontSize: '10px' }
          }
        },
        {
          y: 50,
          borderColor: '#ef4444',
          strokeDashArray: 3,
          label: {
            position: 'left',
            textAnchor: 'start',
            text: 'Critical Limit (50%)',
            borderColor: '#f87171',
            borderWidth: 1,
            borderRadius: 4,
            style: { color: '#ffffff', background: '#dc2626', fontWeight: 600, padding: { left: 6, right: 6, top: 2, bottom: 2 }, fontSize: '10px' }
          }
        }
      ],
      xaxis: [
        {
          x: 30,
          borderColor: '#818cf8',
          strokeDashArray: 4,
          label: {
            orientation: 'vertical',
            textAnchor: 'end',
            offsetY: 10,
            text: '30-Yr Design Life',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 4,
            style: { color: '#ffffff', background: '#4f46e5', fontWeight: 600, padding: { left: 5, right: 5, top: 2, bottom: 2 }, fontSize: '10px' }
          }
        },
        {
          x: 40,
          borderColor: '#ea580c',
          strokeDashArray: 4,
          label: {
            orientation: 'vertical',
            textAnchor: 'end',
            offsetY: 10,
            text: '40-Yr Max Life',
            borderColor: '#ea580c',
            borderWidth: 1,
            borderRadius: 4,
            style: { color: '#ffffff', background: '#c2410c', fontWeight: 600, padding: { left: 5, right: 5, top: 2, bottom: 2 }, fontSize: '10px' }
          }
        }
      ]
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        if (seriesIndex === 0) {
          const d = baselineData[dataPointIndex];
          return `
            <div style="padding:8px 12px; font-size:12px; background:var(--exec-card-bg); border:1px solid var(--exec-card-border); border-radius:6px;">
              <strong style="color:#818cf8;">เกณฑ์เสื่อมสภาพมาตรฐาน (Design Life Baseline)</strong><br/>
              <span style="color:var(--exec-text-body);">อายุ: <strong>${d.x} ปี</strong> | เกณฑ์ HI: <strong>${d.y}%</strong></span><br/>
              <small style="color:var(--exec-text-body);">เกณฑ์อายุใช้งานหม้อแปลง 30-40 ปี ตาม CIGRE/IEEE</small>
            </div>
          `;
        }
        const d = w.config.series[seriesIndex].data[dataPointIndex];
        const statusNames = ['', 'Healthy', 'Monitoring', 'Warning', 'Critical'];
        const statusColors = ['', '#10b981', '#eab308', '#f97316', '#ef4444'];
        
        // Accelerated degradation detection: age <= 25 and HI <= 65, or HI <= 50 at age < 30
        const isAccelerated = (d.x <= 25 && d.y <= 65) || (d.x < 30 && d.y <= 50);

        return `
          <div style="padding:8px 12px; font-size:12px; background:var(--exec-card-bg); border:1px solid var(--exec-card-border); border-radius:6px; min-width:190px;">
            <strong style="color:var(--exec-text-title);">${d.name}</strong><br/>
            <span style="color:var(--exec-text-body);">SN: <code>${d.sn}</code> | ${d.site}</span><br/>
            <span style="color:var(--exec-text-body);">Type: ${d.sType}</span><br/>
            <span style="color:var(--exec-text-body);">Status: <strong style="color:${statusColors[seriesIndex]};">${statusNames[seriesIndex]}</strong></span><br/>
            <span>Age: <strong>${d.x} yrs</strong> | HI: <strong>${d.y}%</strong></span>
            ${isAccelerated ? `<div style="margin-top:5px; padding:3px 7px; border-radius:4px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#f87171; font-size:11px; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> เสื่อมสภาพเร็วกว่าเกณฑ์ (Accelerated)</div>` : ''}
          </div>
        `;
      }
    }
  };

  if (chartAgeHealth) {
    chartAgeHealth.destroy();
  }
  chartAgeHealth = new ApexCharts(chartEl, options);
  chartAgeHealth.render();

  // Update HTML Legend Counts (matching 1.2 Risk Matrix style)
  const elHealthy = document.getElementById('legend-age-healthy-count');
  const elMonitor = document.getElementById('legend-age-monitor-count');
  const elWarn = document.getElementById('legend-age-warning-count');
  const elCrit = document.getElementById('legend-age-crit-count');
  if (elHealthy) elHealthy.textContent = `${goodSeries.length} Units`;
  if (elMonitor) elMonitor.textContent = `${monitorSeries.length} Units`;
  if (elWarn) elWarn.textContent = `${warnSeries.length} Units`;
  if (elCrit) elCrit.textContent = `${critSeries.length} Units`;
}

/**
 * MODULE 2.1: Fleet Health Index Ranking Table
 */
function renderRankingTable() {
  const container = document.getElementById('ranking-table-tbody');
  if (!container) return;

  const searchVal = (document.getElementById('search-ranking')?.value || '').toLowerCase();

  let list = filteredData.filter(d => {
    if (!searchVal) return true;
    return d.name.toLowerCase().includes(searchVal) ||
           d.sn.toLowerCase().includes(searchVal) ||
           d.site.toLowerCase().includes(searchVal) ||
           d.sType.toLowerCase().includes(searchVal);
  });

  // Sort by Health Index Ascending (Worst first)
  list.sort((a, b) => {
    const aVal = a.hi === null ? 999 : a.hi;
    const bVal = b.hi === null ? 999 : b.hi;
    return aVal - bVal;
  });

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--exec-text-body);">No transformers found.</td></tr>`;
    return;
  }

  container.innerHTML = list.map((d, idx) => {
    let badgeClass = 'badge-normal';
    if (d.hi === null) badgeClass = 'badge-secondary';
    else if (d.hi <= 50) badgeClass = 'badge-critical';
    else if (d.hi <= 70) badgeClass = 'badge-warning';
    else if (d.hi <= 79) badgeClass = 'badge-caution';

    return `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <a href="evaluation_report.html?serial=${encodeURIComponent(d.sn || d.name)}#part-3-wrapper" style="color:var(--exec-text-title); text-decoration:none;" class="tr-link-hover" title="Click to view & edit in Evaluation Report">
            <strong>${d.name}</strong>
          </a><br/>
          <small style="color:var(--exec-text-body);">SN: ${d.sn}</small>
        </td>
        <td>${d.site}</td>
        <td>${d.sType}</td>
        <td>${d.mva} MVA</td>
        <td>${d.age} yrs</td>
        <td><span class="badge-status ${badgeClass}">${d.hi !== null ? d.hi + '%' : 'Non-Assessed'}</span></td>
        <td>${d.primaryFactor}</td>
        <td>
          <a href="assessment.html?search=${encodeURIComponent(d.name)}" class="action-btn-sm" target="_blank">
            <i class="fa-solid fa-stethoscope"></i> Detail
          </a>
        </td>
      </tr>
    `;
  }).join('');
}



/**
 * MODULE 3.1: Top Critical Watchlist
 */
function renderCriticalWatchlist() {
  const container = document.getElementById('critical-watchlist-tbody');
  if (!container) return;

  // Filter top critical (HI <= 50) or top 10 worst
  const criticalUnits = [...filteredData]
    .filter(d => d.hi !== null && d.hi <= 50)
    .sort((a, b) => (b.pof * b.cof) - (a.pof * a.cof))
    .slice(0, 10);

  if (criticalUnits.length === 0) {
    container.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--exec-text-body);">No critical assets in the selected filter.</td></tr>`;
    return;
  }

  container.innerHTML = criticalUnits.map((d, idx) => {
    let actionBadge = 'Plan Oil Reclamation';
    if (d.recommendation.includes('Replacement') || d.recommendation.includes('new oil')) actionBadge = 'Replace / Top-up Oil';
    else if (d.recommendation.includes('DGA') || d.recommendation.includes('fault')) actionBadge = 'DGA Diagnostics & De-gas';
    else if (d.recommendation.includes('regeneration')) actionBadge = 'Hot Oil Regeneration';

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <a href="evaluation_report.html?serial=${encodeURIComponent(d.sn || d.name)}#part-3-wrapper" style="color:var(--exec-text-title); text-decoration:none;" class="tr-link-hover" title="Open Evaluation Report (Part 3 CoF)">
            <strong>${d.name}</strong>
          </a><br/>
          <small style="color:var(--exec-text-body);">SN: ${d.sn}</small>
        </td>
        <td>${d.site}</td>
        <td>${d.sType} (${d.mva} MVA)</td>
        <td><span class="badge-status badge-critical">${d.hi}%</span></td>
        <td>
          <span class="pill-badge pill-crit">Risk Score ${d.riskScore}</span><br/>
          <div style="display:inline-flex; align-items:center; gap:5px; margin-top:3px; flex-wrap:wrap;">
            <small style="color:var(--exec-text-body); font-weight:600;">PoF ${d.pof} × CoF ${d.cof}</small>
            ${d.hasCustomCof ? `<span style="display:inline-flex; align-items:center; gap:2px; font-size:0.64rem; padding:1px 5px; border-radius:4px; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.4);" title="Dynamic CoF evaluated from Part 3 (${d.compositeCof ? Number(d.compositeCof).toFixed(2) : d.cof})"><i class="fa-solid fa-check"></i> Part 3</span>` : ''}
          </div>
        </td>
        <td style="max-width:240px; white-space:normal; font-size:0.75rem; color:var(--exec-text-body);">
          ${d.recommendation.replace(/<[^>]*>?/gm, '').substring(0, 95)}...
        </td>
        <td>
          <span class="badge-status badge-warning">${actionBadge}</span>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * MODULE 3.2: 4 Action Pillars
 */
function renderActionPillars() {
  let countReplace = 0, countReclaim = 0, countTopup = 0, countOverhaul = 0;

  fleetData.forEach(d => {
    const rec = (d.recommendation || '').toLowerCase();
    if (rec.includes('replace') || (d.dp && d.dp < 250)) countReplace++;
    else if (rec.includes('reclaim') || rec.includes('regenerat') || rec.includes('de-gas')) countReclaim++;
    else if (rec.includes('top up') || rec.includes('leak') || rec.includes('purify')) countTopup++;
    else if (d.hi !== null && d.hi <= 60) countOverhaul++;
  });

  const elRep = document.getElementById('count-action-replace');
  const elRec = document.getElementById('count-action-reclaim');
  const elTop = document.getElementById('count-action-topup');
  const elOvh = document.getElementById('count-action-overhaul');

  if (elRep) elRep.textContent = countReplace;
  if (elRec) elRec.textContent = countReclaim;
  if (elTop) elTop.textContent = countTopup;
  if (elOvh) elOvh.textContent = countOverhaul;
}

/**
 * MODULE 3.3: Timeline of Intervention (Mini-Gantt)
 */
function renderInterventionTimeline() {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  // Sample planned interventions for key critical units
  const timelineItems = [
    { name: '16120-TR-005B (5001700)', site: 'CUP-1', action: 'Oil Top-up & Gasket Overhaul', start: 10, width: 25, color: '#ef4444', window: 'Q1-Q2 2026 Planned Outage' },
    { name: '11BAT10 (T012006)', site: 'GIPP', action: 'GSUT DGA Active Fault Inspection', start: 20, width: 35, color: '#f97316', window: 'Q2 2026 Minor Shutdown' },
    { name: '21BAT10 (T012023)', site: 'GIPP', action: 'Passivator Top-up & De-gassing', start: 30, width: 30, color: '#f59e0b', window: 'Q3 2026 Turnaround' },
    { name: '1APC-XF-24 (PCL1429)', site: 'GSPP2&3', action: 'Radiator Leak Fix & Oil Reclaiming', start: 45, width: 30, color: '#38bdf8', window: 'Q4 2026 Maintenance Window' },
    { name: '24201-TR-111 (5000574)', site: 'CUP-2', action: 'Oil Regeneration & IR Diagnostic', start: 55, width: 35, color: '#10b981', window: 'Q1 2027 Major Overhaul' }
  ];

  container.innerHTML = timelineItems.map(item => `
    <div class="timeline-row">
      <div class="timeline-asset-info">
        <span class="timeline-asset-name">${item.name}</span>
        <span class="timeline-asset-site">${item.site} • ${item.action}</span>
      </div>
      <div class="timeline-track">
        <div class="timeline-bar" style="left:${item.start}%; width:${item.width}%; background:${item.color};">
          ${item.window}
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * MODULE 4.1: Remaining Useful Life (RUL) Distribution
 */
function renderRULDistributionChart() {
  const chartEl = document.querySelector("#chart-rul-distribution");
  if (!chartEl) return;

  let rLess3 = 0, r3to7 = 0, r7to10 = 0, rMore10 = 0;

  filteredData.forEach(d => {
    if (d.rul < 3) rLess3++;
    else if (d.rul <= 7) r3to7++;
    else if (d.rul <= 10) r7to10++;
    else rMore10++;
  });

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  const options = {
    series: [{
      name: 'Transformers Count',
      data: [rLess3, r3to7, r7to10, rMore10]
    }],
    chart: {
      type: 'bar',
      height: 250,
      background: 'transparent',
      toolbar: { show: false }
    },
    colors: ['#ef4444', '#f97316', '#38bdf8', '#10b981'],
    plotOptions: {
      bar: { distributed: true, borderRadius: 6, columnWidth: '55%' }
    },
    xaxis: {
      categories: ['< 3 Years (Critical)', '3 – 7 Years (Mid Term)', '7 – 10 Years (Planned)', '> 10 Years (Healthy)'],
      labels: { style: { colors: textColor, fontSize: '11px' } }
    },
    yaxis: {
      labels: { style: { colors: textColor } }
    },
    grid: { borderColor: borderColor, strokeDashArray: 3 },
    legend: { show: false }
  };

  if (chartRUL) {
    chartRUL.updateOptions(options);
  } else {
    chartRUL = new ApexCharts(chartEl, options);
    chartRUL.render();
  }
}

/**
 * MODULE 4.2: 5-to-10 Year CAPEX Replacement Forecast (Stacked Bar)
 */
function renderCAPEXForecastChart() {
  const chartEl = document.querySelector("#chart-capex-forecast");
  if (!chartEl) return;

  // Years 2026 to 2035 projected replacement expenditure (in Million THB)
  const years = ['2026', '2027', '2028', '2029', '2030', '2031-2035'];
  const gsutCapex = [85.0, 70.0, 45.0, 30.0, 60.0, 180.0];
  const uatCapex  = [35.0, 40.0, 25.0, 20.0, 25.0, 95.0];
  const auxCapex  = [18.0, 15.0, 12.0, 10.0, 15.0, 45.0];

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  const options = {
    series: [
      { name: 'GSUT Replacements', data: gsutCapex },
      { name: 'UAT Replacements', data: uatCapex },
      { name: 'Auxiliary / Distribution', data: auxCapex }
    ],
    chart: {
      type: 'bar',
      height: 250,
      stacked: true,
      background: 'transparent',
      toolbar: { show: false }
    },
    colors: ['#ef4444', '#6366f1', '#10b981'],
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '50%' }
    },
    xaxis: {
      categories: years,
      labels: { style: { colors: textColor } }
    },
    yaxis: {
      title: { text: 'Million THB (฿)', style: { color: textColor } },
      labels: { style: { colors: textColor } }
    },
    grid: { borderColor: borderColor, strokeDashArray: 3 },
    legend: { position: 'top', labels: { colors: textColor } }
  };

  if (chartCAPEX) {
    chartCAPEX.updateOptions(options);
  } else {
    chartCAPEX = new ApexCharts(chartEl, options);
    chartCAPEX.render();
  }
}

/**
 * MODULE 5.1: Testing Completion Rate Gauges
 */
function renderComplianceGauges() {
  renderSingleGauge('#gauge-dga', 96.4, '#10b981', chart => { gaugeDGA = chart; });
  renderSingleGauge('#gauge-oil', 94.2, '#38bdf8', chart => { gaugeOil = chart; });
  renderSingleGauge('#gauge-elec', 88.5, '#f59e0b', chart => { gaugeElec = chart; });
  renderSingleGauge('#gauge-thermo', 98.0, '#6366f1', chart => { gaugeThermo = chart; });
}

function renderSingleGauge(selector, pct, color, callback) {
  const el = document.querySelector(selector);
  if (!el) return;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#ffffff' : '#0f172a';

  const options = {
    series: [pct],
    chart: {
      type: 'radialBar',
      height: 140,
      sparkline: { enabled: true }
    },
    colors: [color],
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: '16px',
            fontWeight: 700,
            color: textColor,
            offsetY: 6,
            formatter: val => `${val}%`
          }
        }
      }
    }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
  if (callback) callback(chart);
}

/**
 * MODULE 5.3: Work Order Backlog from SAP
 */
function renderSAPBacklog() {
  const tbody = document.getElementById('sap-backlog-tbody');
  if (!tbody) return;

  // Key active backlog orders from SAPorder.csv
  const orders = [
    { order: '10000001990', desc: '14100TR-003 กระแส phase#C bad (CUP-1)', type: 'CM01', prio: 'Prio 4', target: '2023-12-31', status: 'Backlog' },
    { order: '10000011705', desc: 'Hotspot 115kV E15 to MTP1 E08 (GSPP2&3)', type: 'CM01', prio: 'Prio 3', target: '2024-04-12', status: 'Backlog' },
    { order: '10000013310', desc: 'GIS E20 TR2 OLTC alarm oil level low (GEN)', type: 'CM01', prio: 'Prio 3', target: '2024-07-31', status: 'Backlog' },
    { order: '10000013626', desc: 'GSUT62:(NOD) Transf. oil leak Radiator (GEN)', type: 'CM01', prio: 'Prio 3', target: '2024-08-31', status: 'Pending Review' }
  ];

  tbody.innerHTML = orders.map(ord => `
    <tr>
      <td><code>${ord.order}</code></td>
      <td><strong>${ord.desc}</strong></td>
      <td><span class="badge-status badge-warning">${ord.type}</span></td>
      <td>${ord.prio}</td>
      <td>${ord.target}</td>
      <td><span class="badge-status badge-critical">${ord.status}</span></td>
    </tr>
  `).join('');
}

/**
 * Helper: Refresh all charts on theme switch
 */
function refreshAllCharts() {
  renderAgeVsHealthChart();
  renderRULDistributionChart();
  renderCAPEXForecastChart();
}

/**
 * Export Fleet Summary to CSV
 */
function exportExecutiveSummaryCSV() {
  if (filteredData.length === 0) return;
  const headers = ['Equipment Name', 'Serial No', 'Site', 'Service Type', 'MVA Rating', 'Health Index', 'Status', 'PoF', 'CoF', 'Risk Score', 'Remaining Life (Years)', 'Primary Factor', 'Recommendation'];
  
  const csvRows = [headers.join(',')];
  filteredData.forEach(d => {
    const row = [
      `"${d.name}"`,
      `"${d.sn}"`,
      `"${d.site}"`,
      `"${d.sType}"`,
      d.mva,
      d.hi !== null ? d.hi : '',
      `"${d.status}"`,
      d.pof,
      d.cof,
      d.riskScore,
      d.rul,
      `"${d.primaryFactor}"`,
      `"${(d.recommendation || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob(["\uFEFF" + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `GPSC_Executive_Fleet_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
