/**
 * ==========================================================================
 * EXECUTIVE FLEET HOME PAGE - JAVASCRIPT (home.js)
 * GPSC Transformer Asset Management Portal
 * ==========================================================================
 */

let fleetData = [];
let filteredData = [];
let chartAgeHealth = null;
let chartRUL = null;
let chartCAPEX = null;
let gaugeDGA = null, gaugeOil = null, gaugeElec = null, gaugeThermo = null;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initData();
  setupEventListeners();
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
      if (sn) trLookup[sn] = tr;
      if (code) trLookup[code] = tr;
    });
  }

  fleetData = validHealthData.map(item => {
    const sn = (item['Serial No'] || '').trim();
    const name = (item['Equipment Name'] || '').trim();
    const trMatch = trLookup[sn] || trLookup[name] || {};

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
    let cof = 2;
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
      else primaryFactor = 'Maintenance Warning';
    }

    return {
      name,
      sn,
      site: (item.SITE || 'Other').trim(),
      mva,
      voltage: (item['Rated Voltage (kV)'] || trMatch.HV_RATED || '-').trim(),
      sType,
      age,
      hi,
      status: item['Health Index Status'] || (hi === null ? 'Non-Assessed' : (hi >= 80 ? 'Healthy' : (hi >= 51 ? 'Warning' : 'Critical'))),
      dp: isNaN(dp) ? null : dp,
      pof,
      cof,
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
  document.getElementById('kpi-total-sub').textContent = `${assessed.length} with Health Index | ${total - assessed.length} Dry-type`;

  document.getElementById('kpi-avg-hi').textContent = avgHI !== 'N/A' ? `${avgHI}%` : 'N/A';
  document.getElementById('kpi-hi-breakdown').innerHTML = `
    <span class="pill-badge pill-good"><i class="fa-solid fa-circle-check"></i> ${goodPct}% Good</span>
    <span class="pill-badge pill-fair"><i class="fa-solid fa-circle-exclamation"></i> ${fairPct}% Fair</span>
    <span class="pill-badge pill-crit"><i class="fa-solid fa-triangle-exclamation"></i> ${critPct}% Crit</span>
  `;

  document.getElementById('kpi-high-risk').textContent = critical + warning;
  document.getElementById('kpi-risk-sub').innerHTML = `
    <strong style="color:var(--risk-extreme);">${critical} Critical</strong> (&lt;50%) | 
    <span style="color:var(--risk-high);">${warning} Warning</span> (50-69%)
  `;

  // Financial Risk Exposure formatted in Million THB
  const riskMB = (totalFinancialRisk / 1000000).toFixed(1);
  document.getElementById('kpi-financial-risk').textContent = `฿ ${riskMB}M`;
  document.getElementById('kpi-financial-sub').textContent = `Calculated PoF × Failure CoF exposure`;
}

/**
 * MODULE 1.2: 5x5 Risk Matrix Map (PoF vs CoF)
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
        <td>
          <a href="assessment.html?search=${encodeURIComponent(it.name)}" class="action-btn-sm" target="_blank">
            <i class="fa-solid fa-stethoscope"></i> View
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

  // Prepare scatter data series grouped by status
  const goodSeries = [];
  const fairSeries = [];
  const critSeries = [];

  filteredData.forEach(d => {
    if (d.hi !== null) {
      const point = { x: d.age, y: d.hi, name: d.name, site: d.site, sn: d.sn, sType: d.sType };
      if (d.hi >= 80) goodSeries.push(point);
      else if (d.hi >= 51) fairSeries.push(point);
      else critSeries.push(point);
    }
  });

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  const options = {
    series: [
      { name: `Healthy: ${goodSeries.length} Units`, data: goodSeries },
      { name: `Warning / Fair: ${fairSeries.length} Units`, data: fairSeries },
      { name: `Critical: ${critSeries.length} Units`, data: critSeries }
    ],
    chart: {
      height: 310,
      type: 'scatter',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: false }
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontWeight: 600,
      labels: { colors: textColor },
      markers: {
        width: 10,
        height: 10,
        radius: 12
      },
      itemMargin: {
        horizontal: 10,
        vertical: 4
      }
    },
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    xaxis: {
      title: { text: 'Service Age (Years)', style: { color: textColor, fontWeight: 600 } },
      min: 0,
      max: 40,
      tickAmount: 8,
      labels: { style: { colors: textColor } }
    },
    yaxis: {
      title: { text: 'Condition Health Index (%)', style: { color: textColor, fontWeight: 600 } },
      min: 0,
      max: 100,
      labels: { style: { colors: textColor } }
    },
    grid: {
      borderColor: borderColor,
      strokeDashArray: 3
    },
    markers: {
      size: 6.5,
      strokeColors: ['#059669', '#d97706', '#dc2626'],
      strokeWidth: 1.5,
      strokeOpacity: 0.9,
      fillOpacity: 0.88,
      hover: { size: 8.5, strokeWidth: 2 }
    },
    annotations: {
      yaxis: [
        {
          y: 50,
          borderColor: '#ef4444',
          strokeDashArray: 3,
          label: {
            text: 'Critical',
            borderColor: '#f87171',
            borderWidth: 1.5,
            borderRadius: 5,
            style: { color: '#ffffff', background: '#dc2626', fontWeight: 700, padding: { left: 8, right: 8, top: 3, bottom: 3 } }
          }
        },
        {
          y: 80,
          borderColor: '#10b981',
          strokeDashArray: 3,
          label: {
            text: 'Healthy',
            borderColor: '#34d399',
            borderWidth: 1.5,
            borderRadius: 5,
            style: { color: '#ffffff', background: '#059669', fontWeight: 700, padding: { left: 8, right: 8, top: 3, bottom: 3 } }
          }
        }
      ]
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const p = w.config.series[seriesIndex].data[dataPointIndex];
        return `
          <div style="padding:10px 14px; font-size:12px;">
            <strong style="color:#38bdf8;">${p.name}</strong> (SN: ${p.sn})<br/>
            <span>Site: ${p.site} | ${p.sType}</span><br/>
            <span>Age: <strong>${p.x} Years</strong> | Health Index: <strong>${p.y}%</strong></span>
          </div>
        `;
      }
    }
  };

  if (chartAgeHealth) {
    chartAgeHealth.updateOptions(options);
  } else {
    chartAgeHealth = new ApexCharts(chartEl, options);
    chartAgeHealth.render();
  }
}

/**
 * MODULE 2.1: Transformer Ranking Table
 */
function renderRankingTable() {
  const tbody = document.getElementById('ranking-tbody');
  if (!tbody) return;

  const searchVal = (document.getElementById('search-ranking')?.value || '').toLowerCase().trim();

  // Sort ascending by Health Index (worst first)
  const sorted = [...filteredData].sort((a, b) => {
    if (a.hi === null && b.hi === null) return 0;
    if (a.hi === null) return 1;
    if (b.hi === null) return -1;
    return a.hi - b.hi;
  });

  const matching = sorted.filter(d => {
    if (!searchVal) return true;
    return d.name.toLowerCase().includes(searchVal) ||
           d.sn.toLowerCase().includes(searchVal) ||
           d.site.toLowerCase().includes(searchVal) ||
           d.primaryFactor.toLowerCase().includes(searchVal);
  });

  if (matching.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--exec-text-body);">No matching transformers found.</td></tr>`;
    return;
  }

  // Render first 50 rows for snappy performance
  tbody.innerHTML = matching.slice(0, 50).map((d, idx) => {
    let badgeClass = 'badge-normal';
    if (d.hi === null) badgeClass = 'badge-normal';
    else if (d.hi <= 50) badgeClass = 'badge-critical';
    else if (d.hi <= 70) badgeClass = 'badge-warning';
    else if (d.hi <= 79) badgeClass = 'badge-caution';

    return `
      <tr>
        <td><strong>#${idx + 1}</strong></td>
        <td><strong>${d.name}</strong></td>
        <td><code>${d.sn}</code></td>
        <td>${d.site}</td>
        <td>${d.sType}</td>
        <td>${d.mva} MVA</td>
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
          <strong>${d.name}</strong><br/>
          <small style="color:var(--exec-text-body);">SN: ${d.sn}</small>
        </td>
        <td>${d.site}</td>
        <td>${d.sType} (${d.mva} MVA)</td>
        <td><span class="badge-status badge-critical">${d.hi}%</span></td>
        <td>
          <span class="pill-badge pill-crit">Risk Score ${d.riskScore}</span><br/>
          <small style="color:var(--exec-text-body);">PoF ${d.pof} × CoF ${d.cof}</small>
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
