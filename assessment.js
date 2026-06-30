/**
 * Transformer Health Index Assessment - Core Logic
 */

let assessmentData = [];
let filteredAssessment = [];
let currentPage = 1;
let pageSize = 15;
let sortField = 'no';
let sortOrder = 'asc';

// Chart instances
let chartHealthDist = null;
let chartSiteHealth = null;
let chartParamHeatmap = null;
let chartServiceType = null;

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
  if (typeof HEALTH_INDEX_DATA !== 'undefined') {
    assessmentData = HEALTH_INDEX_DATA;
    initAssessment();
  }
  setupListeners();
});

function initAssessment() {
  populateFilterDropdowns();
  const savedTheme = localStorage.getItem('tr-dashboard-theme') || 'dark';
  setTheme(savedTheme);
  applyFilters();
}

function setupListeners() {
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Sidebar Collapse Toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');

  if (sidebar && sidebarToggleBtn) {
    // Load state
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
      if (sidebarToggleIcon) {
        sidebarToggleIcon.classList.remove('fa-chevron-left');
        sidebarToggleIcon.classList.add('fa-chevron-right');
      }
    }

    sidebarToggleBtn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar-collapsed', collapsed);
      
      if (sidebarToggleIcon) {
        if (collapsed) {
          sidebarToggleIcon.classList.remove('fa-chevron-left');
          sidebarToggleIcon.classList.add('fa-chevron-right');
        } else {
          sidebarToggleIcon.classList.remove('fa-chevron-right');
          sidebarToggleIcon.classList.add('fa-chevron-left');
        }
      }
    });
  }
  
  // Filters
  ['filter-site', 'filter-service', 'filter-health-status', 'filter-param'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => { currentPage = 1; applyFilters(); });
  });
  
  // Search
  document.getElementById('search-box').addEventListener('input', debounce(() => {
    currentPage = 1;
    applyFilters();
  }, 300));
  
  // Table sorting
  document.querySelectorAll('.assessment-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortOrder = 'asc';
      }
      sortData();
      renderTable();
    });
  });
  
  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  
  // Capture Modal Button
  const btnCaptureModal = document.getElementById('btn-capture-modal');
  if (btnCaptureModal) {
    btnCaptureModal.addEventListener('click', () => {
      const modalWindow = document.querySelector('.modal-window');
      if (!modalWindow) return;
      
      // Save current states
      const originalTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const originalBg = modalWindow.style.background;
      const originalBgImage = modalWindow.style.backgroundImage;
      const originalMaxHeight = modalWindow.style.maxHeight;
      const originalOverflowY = modalWindow.style.overflowY;
      
      // Force Light theme for exporting
      document.documentElement.setAttribute('data-theme', 'light');
      
      // Setup modal styles for full capture without background and scrollbar limits
      modalWindow.style.backgroundImage = 'none';
      modalWindow.style.background = '#f8fafc';
      modalWindow.style.maxHeight = 'none';
      modalWindow.style.overflowY = 'visible';
      
      // Hide buttons briefly during capture
      const captureBtn = document.getElementById('btn-capture-modal');
      const closeBtn = document.getElementById('modal-close');
      if (captureBtn) captureBtn.style.visibility = 'hidden';
      if (closeBtn) closeBtn.style.visibility = 'hidden';
      
      // Wait a short delay to allow the browser to calculate styles in light mode
      setTimeout(() => {
        html2canvas(modalWindow, {
          backgroundColor: '#f8fafc',
          scale: 2,
          logging: false,
          useCORS: true
        }).then(canvas => {
          // Restore original states
          document.documentElement.setAttribute('data-theme', originalTheme);
          modalWindow.style.background = originalBg;
          modalWindow.style.backgroundImage = originalBgImage;
          modalWindow.style.maxHeight = originalMaxHeight;
          modalWindow.style.overflowY = originalOverflowY;
          if (captureBtn) captureBtn.style.visibility = 'visible';
          if (closeBtn) closeBtn.style.visibility = 'visible';
          
          // Get transformer name for filename
          const titleEl = document.getElementById('modal-title');
          const trName = titleEl ? titleEl.textContent.trim().replace(/\s+/g, '_') : 'Transformer';
          
          // Trigger download
          const link = document.createElement('a');
          link.download = `${trName}_Summary.jpg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        }).catch(err => {
          console.error("Modal capture failed:", err);
          // Restore states in case of error
          document.documentElement.setAttribute('data-theme', originalTheme);
          modalWindow.style.background = originalBg;
          modalWindow.style.backgroundImage = originalBgImage;
          modalWindow.style.maxHeight = originalMaxHeight;
          modalWindow.style.overflowY = originalOverflowY;
          if (captureBtn) captureBtn.style.visibility = 'visible';
          if (closeBtn) closeBtn.style.visibility = 'visible';
        });
      }, 50);
    });
  }
  
  // Export
  document.getElementById('btn-export-report').addEventListener('click', exportReport);
  
  // Export PPTX
  const btnExportPptx = document.getElementById('btn-export-pptx');
  if (btnExportPptx) {
    btnExportPptx.addEventListener('click', () => {
      exportPPTX(filteredAssessment, true);
    });
  }
}

// ============ FILTERS ============

function populateFilterDropdowns() {
  const sites = new Set();
  const services = new Set();
  assessmentData.forEach(item => {
    if (item.site) sites.add(item.site);
    if (item.serviceType) services.add(item.serviceType);
  });
  
  fillDropdown('filter-site', [...sites].sort());
  fillDropdown('filter-service', [...services].sort());
}

function fillDropdown(id, items) {
  const sel = document.getElementById(id);
  const first = sel.options[0].outerHTML;
  sel.innerHTML = first;
  items.forEach(item => {
    if (item) {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      sel.appendChild(opt);
    }
  });
}

function hasParamValue(item, value) {
  // Check all parameter fields for a specific value (Q or U)
  const checks = [
    item.visualInspection,
    ...Object.values(item.activePart),
    item.bushing, item.surgeArrester,
    item.dynamicResistance, item.fra, item.moisturePaper,
    ...Object.values(item.mainTankOil),
    item.passivator, item.furan, item.sludge,
    ...Object.values(item.oltcOil)
  ];
  return checks.some(v => v === value);
}

function allParamsAcceptable(item) {
  const checks = [
    item.visualInspection,
    ...Object.values(item.activePart),
    item.bushing, item.surgeArrester,
    item.dynamicResistance, item.fra, item.moisturePaper,
    ...Object.values(item.mainTankOil),
    item.passivator, item.furan, item.sludge,
    ...Object.values(item.oltcOil)
  ];
  return checks.every(v => v === 'A' || v === 'N/A' || !v);
}

function applyFilters() {
  const siteFilter = document.getElementById('filter-site').value;
  const serviceFilter = document.getElementById('filter-service').value;
  const statusFilter = document.getElementById('filter-health-status').value;
  const paramFilter = document.getElementById('filter-param').value;
  const searchQuery = document.getElementById('search-box').value.toLowerCase().trim();
  
  filteredAssessment = assessmentData.filter(item => {
    if (siteFilter !== 'all' && item.site !== siteFilter) return false;
    if (serviceFilter !== 'all' && item.serviceType !== serviceFilter) return false;
    
    if (statusFilter !== 'all') {
      const hi = item.healthIndex;
      if (statusFilter === 'No Assess') {
        if (hi !== null && hi !== undefined && hi !== 0) return false;
      } else {
        if (hi === null || hi === undefined || hi === 0) return false;
        if (statusFilter === 'Healthy' && hi < 80) return false;
        if (statusFilter === 'Monitoring' && (hi < 70 || hi >= 80)) return false;
        if (statusFilter === 'Warning' && (hi < 50 || hi >= 70)) return false;
        if (statusFilter === 'Critical' && hi >= 50) return false;
      }
    }
    
    if (paramFilter !== 'all') {
      if (paramFilter === 'has-U' && !hasParamValue(item, 'U')) return false;
      if (paramFilter === 'has-Q' && !hasParamValue(item, 'Q')) return false;
      if (paramFilter === 'all-A' && !allParamsAcceptable(item)) return false;
    }
    
    if (searchQuery) {
      const match = (item.name || '').toLowerCase().includes(searchQuery) ||
                    (item.serial || '').toLowerCase().includes(searchQuery) ||
                    (item.site || '').toLowerCase().includes(searchQuery);
      if (!match) return false;
    }
    
    return true;
  });
  
  sortData();
  updateKPIs();
  renderCharts();
  renderTable();
}

// ============ SORTING ============

function sortData() {
  filteredAssessment.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    if (['no', 'healthIndex', 'ratedPower', 'estimatedDP'].includes(sortField)) {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============ KPIs ============

function updateKPIs() {
  const total = filteredAssessment.length;
  const withHI = filteredAssessment.filter(i => i.healthIndex !== null && i.healthIndex !== undefined).length;
  const healthy = filteredAssessment.filter(i => i.healthIndex >= 80).length;
  const monitoring = filteredAssessment.filter(i => i.healthIndex >= 70 && i.healthIndex < 80).length;
  const warning = filteredAssessment.filter(i => i.healthIndex >= 50 && i.healthIndex < 70).length;
  const critical = filteredAssessment.filter(i => i.healthIndex < 50 && i.healthIndex > 0).length;
  
  const kpiAssessed = document.getElementById('kpi-assessed');
  const kpiAssessedSub = document.getElementById('kpi-assessed-sub');
  const kpiHealthy = document.getElementById('kpi-healthy');
  const kpiMonitor = document.getElementById('kpi-monitor');
  const kpiWarning = document.getElementById('kpi-warning');
  const kpiCritical = document.getElementById('kpi-critical');
  
  if (kpiAssessed) kpiAssessed.textContent = total;
  if (kpiAssessedSub) kpiAssessedSub.textContent = `${withHI} with Health Index`;
  if (kpiHealthy) kpiHealthy.textContent = healthy;
  if (kpiMonitor) kpiMonitor.textContent = monitoring;
  if (kpiWarning) kpiWarning.textContent = warning;
  if (kpiCritical) kpiCritical.textContent = critical;

  // Update bottom SCADA-style indicators
  const hiValues = filteredAssessment
    .filter(i => i.healthIndex !== null && i.healthIndex !== undefined)
    .map(i => i.healthIndex);
  const avgHI = hiValues.length > 0 ? Math.round(hiValues.reduce((a, b) => a + b, 0) / hiValues.length) : 0;

  const bottomTotal = document.getElementById('bottom-total-assets');
  if (bottomTotal) bottomTotal.textContent = `${total.toLocaleString()} Units`;
  const bottomHealth = document.getElementById('bottom-avg-health');
  if (bottomHealth) bottomHealth.textContent = `${avgHI}%`;
}

// ============ CHARTS ============

function renderCharts() {
  renderHealthDistChart();
  renderSiteHealthChart();
  renderParamHeatmapChart();
  renderServiceTypeChart();
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    foreColor: isDark ? '#cbd5e1' : '#475569',
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  };
}

function renderHealthDistChart() {
  let counts = { healthy: 0, monitoring: 0, warning: 0, critical: 0, noData: 0 };
  filteredAssessment.forEach(item => {
    const hi = item.healthIndex;
    if (hi === null || hi === undefined || hi === 0) { counts.noData++; return; }
    if (hi >= 80) counts.healthy++;
    else if (hi >= 70) counts.monitoring++;
    else if (hi >= 50) counts.warning++;
    else counts.critical++;
  });
  
  const colors = getChartColors();
  const opts = {
    series: [counts.healthy, counts.monitoring, counts.warning, counts.critical, counts.noData],
    labels: ['Healthy (≥80)', 'Monitoring (70-79)', 'Warning (50-69)', 'Critical (<50)', 'No Assess (=0)'],
    chart: { type: 'donut', height: 280, fontFamily: 'Inter, sans-serif', foreColor: colors.foreColor },
    colors: ['#10b981', '#eab308', '#f97316', '#ef4444', '#6b7280'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => opts.w.config.series[opts.seriesIndex]
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px' },
            value: { show: true, fontSize: '18px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 },
            total: {
              show: true, label: 'Assessed',
              fontSize: '10px',
              formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    },
    stroke: { show: false }
  };
  
  if (chartHealthDist) {
    chartHealthDist.updateOptions(opts);
  } else {
    chartHealthDist = new ApexCharts(document.getElementById('chart-health-dist'), opts);
    chartHealthDist.render();
  }
}

function renderSiteHealthChart() {
  const siteData = {};
  filteredAssessment.forEach(item => {
    if (!item.site || item.healthIndex === null || item.healthIndex === undefined) return;
    if (!siteData[item.site]) siteData[item.site] = { sum: 0, count: 0 };
    siteData[item.site].sum += item.healthIndex;
    siteData[item.site].count++;
  });
  
  const siteAvgs = Object.keys(siteData).map(s => ({
    site: s,
    avg: Math.round(siteData[s].sum / siteData[s].count),
    count: siteData[s].count
  })).sort((a, b) => b.avg - a.avg);
  
  const colors = getChartColors();
  const opts = {
    series: [{ name: 'Avg HI %', data: siteAvgs.map(s => s.avg) }],
    chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif', foreColor: colors.foreColor },
    plotOptions: {
      bar: { horizontal: true, barHeight: '55%', borderRadius: 4, distributed: true }
    },
    colors: siteAvgs.map(s => s.avg >= 80 ? '#10b981' : s.avg >= 70 ? '#eab308' : s.avg >= 50 ? '#f97316' : '#ef4444'),
    legend: { show: false },
    dataLabels: { enabled: true, formatter: v => v + '%', style: { fontSize: '10px' } },
    xaxis: { categories: siteAvgs.map(s => `${s.site} (${s.count})`), max: 100 },
    grid: { borderColor: colors.gridColor, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: {
      y: { formatter: v => v + '%' },
      custom: ({ seriesIndex, dataPointIndex }) => {
        const s = siteAvgs[dataPointIndex];
        return `<div style="padding:8px 12px;font-size:12px"><strong>${s.site}</strong><br>Avg HI: ${s.avg}%<br>Count: ${s.count}</div>`;
      }
    }
  };
  
  if (chartSiteHealth) {
    chartSiteHealth.updateOptions(opts);
  } else {
    chartSiteHealth = new ApexCharts(document.getElementById('chart-site-health'), opts);
    chartSiteHealth.render();
  }
}

function renderParamHeatmapChart() {
  // Count Q and U for each parameter category
  const paramNames = ['Visual', 'Insul. Resistance', 'Power Factor', 'Exciting Current', 
    'Ratio & Polarity', 'Winding Resist.', 'Short Circuit', 'DGA', 'Water Content',
    'Dielectric', 'Conductivity', 'IFT', 'PF 100°C', 'Corrosive Sulfur'];
  
  const qCounts = new Array(paramNames.length).fill(0);
  const uCounts = new Array(paramNames.length).fill(0);
  
  filteredAssessment.forEach(item => {
    const params = [
      item.visualInspection,
      item.activePart.insulationResistance,
      item.activePart.insulationPowerFactor,
      item.activePart.excitingCurrent,
      item.activePart.ratioPolarity,
      item.activePart.windingResistance,
      item.activePart.shortCircuit1P === 'U' || item.activePart.shortCircuit3P === 'U' ? 'U' :
        item.activePart.shortCircuit1P === 'Q' || item.activePart.shortCircuit3P === 'Q' ? 'Q' : 'A',
      item.mainTankOil.dga,
      item.mainTankOil.waterContent,
      item.mainTankOil.dielectricBreakdown,
      item.mainTankOil.conductivity,
      item.mainTankOil.ift,
      item.mainTankOil.pf100,
      item.mainTankOil.corrosiveSulfur
    ];
    
    params.forEach((v, i) => {
      if (v === 'Q') qCounts[i]++;
      if (v === 'U') uCounts[i]++;
    });
  });
  
  const colors = getChartColors();
  const opts = {
    series: [
      { name: 'Unacceptable (U)', data: uCounts },
      { name: 'Questionable (Q)', data: qCounts }
    ],
    chart: { type: 'bar', height: 280, stacked: true, toolbar: { show: false }, fontFamily: 'Inter, sans-serif', foreColor: colors.foreColor },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 3 } },
    colors: ['#ef4444', '#eab308'],
    xaxis: { categories: paramNames, labels: { rotate: -45, style: { fontSize: '9px' } } },
    yaxis: { title: { text: 'Count' } },
    legend: { position: 'top', fontSize: '11px' },
    dataLabels: { enabled: false },
    grid: { borderColor: colors.gridColor }
  };
  
  if (chartParamHeatmap) {
    chartParamHeatmap.updateOptions(opts);
  } else {
    chartParamHeatmap = new ApexCharts(document.getElementById('chart-param-heatmap'), opts);
    chartParamHeatmap.render();
  }
}

function renderServiceTypeChart() {
  const serviceData = {};
  filteredAssessment.forEach(item => {
    if (!item.serviceType) return;
    if (!serviceData[item.serviceType]) serviceData[item.serviceType] = { healthy: 0, monitor: 0, warning: 0, total: 0 };
    serviceData[item.serviceType].total++;
    const hi = item.healthIndex;
    if (hi >= 80) serviceData[item.serviceType].healthy++;
    else if (hi >= 70) serviceData[item.serviceType].monitor++;
    else serviceData[item.serviceType].warning++;
  });
  
  const types = Object.keys(serviceData).sort();
  const colors = getChartColors();
  
  const opts = {
    series: [
      { name: 'Healthy', data: types.map(t => serviceData[t].healthy) },
      { name: 'Monitoring', data: types.map(t => serviceData[t].monitor) },
      { name: 'Warning', data: types.map(t => serviceData[t].warning) }
    ],
    chart: { type: 'bar', height: 280, stacked: true, toolbar: { show: false }, fontFamily: 'Inter, sans-serif', foreColor: colors.foreColor },
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
    colors: ['#10b981', '#eab308', '#f97316'],
    xaxis: { categories: types },
    legend: { position: 'top', fontSize: '11px' },
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    grid: { borderColor: colors.gridColor }
  };
  
  if (chartServiceType) {
    chartServiceType.updateOptions(opts);
  } else {
    chartServiceType = new ApexCharts(document.getElementById('chart-service-type'), opts);
    chartServiceType.render();
  }
}

// ============ TABLE ============

function getStatusBadge(hi, status) {
  if (hi === null || hi === undefined || hi === 0) return '<span class="badge badge-noassess"><i class="fa-solid fa-circle-question"></i> No Assess</span>';
  
  let displayStatus = '';
  let badgeClass = '';
  let iconClass = '';
  
  if (hi >= 80) {
    displayStatus = 'Healthy';
    badgeClass = 'badge-healthy';
    iconClass = 'fa-check-circle';
  } else if (hi >= 70) {
    displayStatus = 'Monitor';
    badgeClass = 'badge-monitoring';
    iconClass = 'fa-eye';
  } else if (hi >= 50) {
    displayStatus = 'Warning';
    badgeClass = 'badge-warning';
    iconClass = 'fa-exclamation-circle';
  } else {
    displayStatus = 'Critical';
    badgeClass = 'badge-critical';
    iconClass = 'fa-times-circle';
  }
  
  return `<span class="badge ${badgeClass}"><i class="fa-solid ${iconClass}"></i> ${displayStatus}</span>`;
}

function getHIClass(hi) {
  if (hi === null || hi === undefined || hi === 0) return 'hi-noassess';
  if (hi >= 80) return 'hi-good';
  if (hi >= 70) return 'hi-fair';
  if (hi >= 50) return 'hi-poor';
  return 'hi-critical';
}

function renderParamIndicator(value) {
  if (!value || value === '') return '';
  if (value === 'N/A') return '<span class="param-indicator param-NA">-</span>';
  if (value === 'A') return '<span class="param-indicator param-A">A</span>';
  if (value === 'Q') return '<span class="param-indicator param-Q">Q</span>';
  if (value === 'U') return '<span class="param-indicator param-U">U</span>';
  return `<span class="param-indicator param-NA">${value}</span>`;
}

function getWorstParam(values) {
  if (values.includes('U')) return 'U';
  if (values.includes('Q')) return 'Q';
  return 'A';
}

function getActiveSummary(item) {
  const vals = Object.values(item.activePart).filter(v => v && v !== 'N/A');
  return getWorstParam(vals);
}

function getOilSummary(item) {
  const vals = Object.values(item.mainTankOil).filter(v => v && v !== 'N/A');
  return getWorstParam(vals);
}

function getOltcSummary(item) {
  const vals = Object.values(item.oltcOil).filter(v => v && v !== 'N/A');
  if (vals.length === 0) return 'N/A';
  return getWorstParam(vals);
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  
  if (filteredAssessment.length === 0) {
    tbody.innerHTML = `<tr><td colspan="17" style="text-align:center;padding:3rem;color:var(--text-muted);">
      <i class="fa-solid fa-database" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
      No matching transformers found.
    </td></tr>`;
    updatePagination(0);
    return;
  }
  
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, filteredAssessment.length);
  const pageData = filteredAssessment.slice(start, end);
  
  pageData.forEach((item, index) => {
    const rowNumber = start + index + 1;
    const hi = item.healthIndex;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rowNumber}</td>
      <td class="eq-name">${item.name}</td>
      <td>${item.site}</td>
      <td>${item.ratedPower} MVA</td>
      <td>${item.ratedVoltage} kV</td>
      <td>${item.serviceType}</td>
      <td class="hi-cell ${getHIClass(hi)}">${hi !== null && hi !== undefined ? hi + '%' : '-'}</td>
      <td>${getStatusBadge(hi, item.healthStatus)}</td>
      <td>${item.estimatedDP || '-'}</td>
      <td>${renderParamIndicator(item.visualInspection)}</td>
      <td><div class="param-summary">${renderParamIndicator(getActiveSummary(item))}</div></td>
      <td><div class="param-summary">${renderParamIndicator(getOilSummary(item))}</div></td>
      <td>${renderParamIndicator(item.bushing)}</td>
      <td>${renderParamIndicator(getOltcSummary(item))}</td>
      <td>${item.dateToAssess}</td>
      <td>${item.lastPM}</td>
      <td><button class="btn-view" onclick="openDetail(${item.no})"><i class="fa-solid fa-expand"></i> Detail</button></td>
    `;
    tbody.appendChild(row);
  });
  
  updatePagination(filteredAssessment.length);
}

function updatePagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  
  document.getElementById('pagination-info').textContent = `Showing ${start} to ${end} of ${total} entries`;
  
  const container = document.getElementById('pagination-buttons');
  container.innerHTML = '';
  if (totalPages <= 1) return;
  
  // Previous
  const prev = document.createElement('button');
  prev.className = 'page-btn';
  prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prev.disabled = currentPage === 1;
  prev.onclick = () => { currentPage--; renderTable(); };
  container.appendChild(prev);
  
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; renderTable(); };
    container.appendChild(btn);
  }
  
  // Next
  const next = document.createElement('button');
  next.className = 'page-btn';
  next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  next.disabled = currentPage === totalPages;
  next.onclick = () => { currentPage++; renderTable(); };
  container.appendChild(next);
}

// ============ DETAIL MODAL ============

function openDetail(no) {
  const item = assessmentData.find(i => i.no === no);
  if (!item) return;
  
  document.getElementById('modal-title').textContent = item.name;
  document.getElementById('modal-subtitle').textContent = `Serial: ${item.serial} | Site: ${item.site} | ${item.serviceType}`;
  
  // Health gauge
  const hi = item.healthIndex;
  document.getElementById('modal-score').textContent = hi || '0';
  
  const ring = document.getElementById('modal-ring');
  ring.setAttribute('stroke-dasharray', `${(hi || 0) * 0.5}, 100`);
  ring.className.baseVal = 'circle';
  
  const badge = document.getElementById('modal-badge');
  badge.className = 'badge';
  
  const recCard = document.getElementById('modal-rec-card');
  recCard.className = 'recommendation-card';

  // Get status based on database status first, otherwise fallback to HI score
  let status = item.healthStatus ? item.healthStatus.toUpperCase() : null;
  if (!status) {
    if (hi === 0 || hi === null || hi === undefined) status = 'NO ASSESS';
    else if (hi >= 80) status = 'HEALTHY';
    else if (hi >= 70) status = 'MONITORING';
    else if (hi >= 50) status = 'WARNING';
    else status = 'CRITICAL';
  }
  
  badge.textContent = status;
  
  if (status === 'HEALTHY') {
    ring.classList.add('healthy');
    badge.classList.add('badge-healthy');
    recCard.classList.add('healthy');
  } else if (status === 'MONITOR' || status === 'MONITORING') {
    ring.classList.add('monitoring');
    badge.classList.add('badge-monitoring');
    recCard.classList.add('monitoring');
  } else if (status === 'WARNING') {
    ring.classList.add('warning');
    badge.classList.add('badge-warning');
    recCard.classList.add('warning');
  } else if (status === 'CRITICAL') {
    ring.classList.add('critical');
    badge.classList.add('badge-critical');
    recCard.classList.add('critical');
  } else {
    ring.classList.add('no-assess');
    badge.classList.add('badge-noassess');
    recCard.classList.add('no-assess');
  }
  
  // Update circular chart stroke color again to match status exactly
  ring.className.baseVal = `circle ${status === 'HEALTHY' ? 'healthy' : (status === 'MONITOR' || status === 'MONITORING' ? 'monitoring' : (status === 'WARNING' ? 'warning' : (status === 'CRITICAL' ? 'critical' : 'no-assess')))}`;
  
  document.getElementById('modal-dp').textContent = item.estimatedDP || 'N/A';
  document.getElementById('modal-date').textContent = item.dateToAssess;
  document.getElementById('modal-lastpm').textContent = item.lastPM;
  
  // Specs
  document.getElementById('modal-power').textContent = `${item.ratedPower} MVA`;
  document.getElementById('modal-voltage').textContent = `${item.ratedVoltage} kV`;
  document.getElementById('modal-service').textContent = item.serviceType;
  document.getElementById('modal-site').textContent = item.site;
  
  document.getElementById('modal-rec-text').textContent = item.recommendation || 'Routine maintenance - no specific concerns identified.';
  
  // Dynamic Transformer Photo Loading
  const imgEl = document.getElementById('modal-transformer-img');
  const placeholderEl = document.getElementById('photo-placeholder');
  if (imgEl && placeholderEl) {
    imgEl.style.display = 'none';
    placeholderEl.style.display = 'flex';
    
    // Construct photo path
    const photoUrl = `Transformer Photo/${item.name}.jpg`;
    imgEl.src = photoUrl;
    
    imgEl.onload = () => {
      imgEl.style.display = 'block';
      placeholderEl.style.display = 'none';
    };
    
    imgEl.onerror = () => {
      imgEl.style.display = 'none';
      placeholderEl.style.display = 'flex';
    };
  }
  
  // Active Part Parameters
  const activeParams = [
    ['Insulation Resistance & PI', item.activePart.insulationResistance],
    ['Insulation Power Factor', item.activePart.insulationPowerFactor],
    ['Exciting Current', item.activePart.excitingCurrent],
    ['Ratio & Polarity', item.activePart.ratioPolarity],
    ['Winding Resistance', item.activePart.windingResistance],
    ['1Φ Short Circuit', item.activePart.shortCircuit1P],
    ['3Φ Short Circuit', item.activePart.shortCircuit3P],
    ['Core to Ground', item.activePart.coreToGround]
  ];
  renderParamGrid('params-active-part', activeParams);
  
  // Additional Tests
  const additionalParams = [
    ['Visual Inspection', item.visualInspection],
    ['Dynamic Resistance (OLTC)', item.dynamicResistance],
    ['FRA', item.fra],
    ['Moisture in paper (FDS)', item.moisturePaper]
  ];
  renderParamGrid('params-additional', additionalParams);
  
  // Bushing
  const bushingParams = [
    ['Bushing', item.bushing]
  ];
  renderParamGrid('params-bushing', bushingParams);
  
  // Surge Arrester
  const arresterParams = [
    ['Surge Arrester', item.surgeArrester]
  ];
  renderParamGrid('params-arrester', arresterParams);
  
  // Main Tank Oil
  const oilParams = [
    ['DGA', item.mainTankOil.dga],
    ['Water Content', item.mainTankOil.waterContent],
    ['Dielectric Breakdown', item.mainTankOil.dielectricBreakdown],
    ['PF at 25°C', item.mainTankOil.pf25],
    ['PF at 100°C', item.mainTankOil.pf100],
    ['Conductivity', item.mainTankOil.conductivity],
    ['IFT', item.mainTankOil.ift],
    ['Acidity', item.mainTankOil.acidity],
    ['Color', item.mainTankOil.color],
    ['Inhibitor', item.mainTankOil.inhibitor],
    ['Corrosive Sulfur', item.mainTankOil.corrosiveSulfur],
    ['Passivator', item.passivator],
    ['Furan', item.furan],
    ['Sludge', item.sludge],
    ['%Moisture Paper (Furan)', item.moisturePaper]
  ];
  renderParamGrid('params-oil', oilParams);
  
  // OLTC Oil
  const oltcParams = [
    ['DGA (OLTC)', item.oltcOil.dga],
    ['Dielectric Breakdown (OLTC)', item.oltcOil.dielectricBreakdown],
    ['Water Content (OLTC)', item.oltcOil.waterContent]
  ];
  renderParamGrid('params-oltc', oltcParams);
  
  document.getElementById('detail-modal').classList.add('active');
}

function renderParamGrid(containerId, params) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  params.forEach(([name, value]) => {
    const div = document.createElement('div');
    div.className = 'param-item';
    div.innerHTML = `
      <span class="param-item-name">${name}</span>
      <span class="param-item-value">${renderParamIndicator(value)}</span>
    `;
    container.appendChild(div);
  });
}

function closeModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

// ============ THEME ============

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tr-dashboard-theme', theme);
  
  const darkIcon = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');
  
  if (theme === 'dark') {
    darkIcon.style.display = 'inline-block';
    lightIcon.style.display = 'none';
  } else {
    darkIcon.style.display = 'none';
    lightIcon.style.display = 'inline-block';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ============ EXPORT ============

function exportReport() {
  if (filteredAssessment.length === 0) return;
  
  const headers = ['No', 'Equipment Name', 'Serial No', 'Site', 'Rated Power (MVA)', 'Voltage (kV)',
    'Service Type', 'Health Index', 'Status', 'Estimated DP', 'Visual Inspection',
    'Active Part (Overall)', 'Insulation Resistance', 'Power Factor', 'Exciting Current',
    'Ratio & Polarity', 'Winding Resistance', '1P Short Circuit', '3P Short Circuit',
    'Oil DGA', 'Water Content', 'Dielectric', 'PF 25°C', 'PF 100°C', 'Conductivity',
    'IFT', 'Acidity', 'Color', 'Corrosive Sulfur', 'Bushing', 'Surge Arrester',
    'Date Assessed', 'Last PM', 'Recommendation'];
  
  let csv = '\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\r\n';
  
  filteredAssessment.forEach(item => {
    const row = [
      item.no, item.name, item.serial, item.site, item.ratedPower, item.ratedVoltage,
      item.serviceType, item.healthIndex, item.healthStatus, item.estimatedDP,
      item.visualInspection, item.activePart.overall,
      item.activePart.insulationResistance, item.activePart.insulationPowerFactor,
      item.activePart.excitingCurrent, item.activePart.ratioPolarity,
      item.activePart.windingResistance, item.activePart.shortCircuit1P, item.activePart.shortCircuit3P,
      item.mainTankOil.dga, item.mainTankOil.waterContent, item.mainTankOil.dielectricBreakdown,
      item.mainTankOil.pf25, item.mainTankOil.pf100, item.mainTankOil.conductivity,
      item.mainTankOil.ift, item.mainTankOil.acidity, item.mainTankOil.color,
      item.mainTankOil.corrosiveSulfur, item.bushing, item.surgeArrester,
      item.dateToAssess, item.lastPM, item.recommendation
    ];
    csv += row.map(v => `"${(v === null || v === undefined ? '' : v).toString().replace(/"/g, '""')}"`).join(',') + '\r\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `transformer_assessment_report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============ HELPERS ============

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ============ PPTX EXPORT ============
function exportPPTX(data, isAssessment = false) {
  if (data.length === 0) return;
  
  // Initialize presentation
  let pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  
  // 1. Cover Slide
  let slide1 = pptx.addSlide();
  slide1.background = { color: '0D2149' };
  
  // Title
  slide1.addText("GPSC Group Transformer Asset Management", {
    x: 1.0, y: 2.0, w: 11.3, h: 1.5,
    fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Outfit'
  });
  
  // Subtitle
  slide1.addText("Transformer Fleet Health Assessment Report", {
    x: 1.0, y: 3.2, w: 11.3, h: 1.0,
    fontSize: 20, color: 'CBE6F9', fontFace: 'Inter'
  });
  
  // Metadata
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalUnits = data.length;
  
  // Calculate average HI
  let totalHI = 0;
  let assessedCount = 0;
  let healthy = 0;
  let monitoring = 0;
  let warning = 0;
  let critical = 0;
  let noassess = 0;
  
  data.forEach(item => {
    const hi = isAssessment ? item.healthIndex : parseFloat(item.HI);
    if (hi === 0 || isNaN(hi)) {
      noassess++;
    } else {
      totalHI += hi;
      assessedCount++;
      if (hi >= 80) healthy++;
      else if (hi >= 70) monitoring++;
      else if (hi >= 50) warning++;
      else critical++;
    }
  });
  const avgHI = assessedCount > 0 ? Math.round(totalHI / assessedCount) : 0;
  
  slide1.addText(`Report Date: ${today}\nTotal Fleet Units: ${totalUnits} | Fleet Average Health: ${avgHI}%`, {
    x: 1.0, y: 5.5, w: 11.3, h: 1.0,
    fontSize: 14, color: '8EB4E0', fontFace: 'Inter'
  });
  
  // 2. Executive Summary Slide
  let slide2 = pptx.addSlide();
  slide2.addText("Executive Summary", { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: '0D2149', fontFace: 'Outfit' });
  
  // KPI Cards as shapes
  const kpis = [
    { label: 'Healthy', count: healthy, color: '10b981', x: 0.5 },
    { label: 'Monitoring', count: monitoring, color: 'eab308', x: 2.9 },
    { label: 'Warning', count: warning, color: 'f97316', x: 5.3 },
    { label: 'Critical', count: critical, color: 'ef4444', x: 7.7 },
    { label: 'No Assess', count: noassess, color: '6b7280', x: 10.1 }
  ];
  
  kpis.forEach(kpi => {
    // Background card
    slide2.addShape(pptx.shapes.RECTANGLE, {
      x: kpi.x, y: 1.2, w: 2.2, h: 1.5,
      fill: { color: 'F1F5F9' }, line: { color: kpi.color, width: 2 }
    });
    // Label
    slide2.addText(kpi.label, {
      x: kpi.x + 0.1, y: 1.3, w: 2.0, h: 0.3,
      fontSize: 12, bold: true, color: kpi.color, align: 'center', fontFace: 'Outfit'
    });
    // Value
    slide2.addText(kpi.count.toString(), {
      x: kpi.x + 0.1, y: 1.7, w: 2.0, h: 0.8,
      fontSize: 28, bold: true, color: '0D2149', align: 'center', fontFace: 'Outfit'
    });
  });
  
  // Insights
  let insights = [
    `The overall transformer fleet comprises ${totalUnits} units with an average Health Index of ${avgHI}%.`,
    `Currently, ${healthy} units (${Math.round(healthy/totalUnits*100)}%) are classified as Healthy (HI >= 80%).`,
    `There are ${critical} Critical units (HI < 50%) requiring immediate offline diagnostic testing and maintenance.`,
    `Additionally, ${warning} units are in Warning status (HI 50-69%) and should be scheduled for close parameter monitoring.`
  ];
  
  slide2.addText(insights.join('\n\n'), {
    x: 0.5, y: 3.2, w: 12.3, h: 3.5,
    fontSize: 14, color: '333333', bullet: true, lineSpacing: 22, fontFace: 'Inter'
  });
  
  // 3. Site Analysis
  let slide3 = pptx.addSlide();
  slide3.addText("Site-wise Fleet Performance", { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: '0D2149', fontFace: 'Outfit' });
  
  // Calculate site-wise data
  const siteData = {};
  data.forEach(item => {
    const site = isAssessment ? item.site : item.SITE;
    const hi = isAssessment ? item.healthIndex : parseFloat(item.HI);
    if (!site) return;
    if (!siteData[site]) siteData[site] = { total: 0, assessed: 0, sumHI: 0, critical: 0 };
    siteData[site].total++;
    if (hi > 0 && !isNaN(hi)) {
      siteData[site].assessed++;
      siteData[site].sumHI += hi;
      if (hi < 50) siteData[site].critical++;
    }
  });
  
  let tableRows = [
    [
      { text: 'Site Name', options: { fill: '0D2149', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Total Units', options: { fill: '0D2149', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Assessed Units', options: { fill: '0D2149', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Avg Health Index', options: { fill: '0D2149', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Critical Units', options: { fill: '0D2149', color: 'FFFFFF', bold: true, align: 'center' } }
    ]
  ];
  
  Object.keys(siteData).sort().forEach(site => {
    const s = siteData[site];
    const avg = s.assessed > 0 ? Math.round(s.sumHI / s.assessed) : 0;
    tableRows.push([
      { text: site, options: { align: 'left' } },
      { text: s.total.toString(), options: { align: 'center' } },
      { text: s.assessed.toString(), options: { align: 'center' } },
      { text: `${avg}%`, options: { align: 'center', bold: true, color: (avg < 50 ? 'EF4444' : (avg >= 80 ? '10B981' : 'EAB308')) } },
      { text: s.critical.toString(), options: { align: 'center', color: (s.critical > 0 ? 'EF4444' : '333333') } }
    ]);
  });
  
  slide3.addTable(tableRows, {
    x: 0.5, y: 1.2, w: 12.3,
    colW: [3.3, 2.0, 2.0, 2.5, 2.5],
    border: { type: 'solid', color: 'CBD5E1', width: 1 },
    fontSize: 12,
    fontFace: 'Inter'
  });
  
  // 4. Critical & Warning Assets Table (Top 8 worst)
  let slide4 = pptx.addSlide();
  slide4.addText("Critical & Warning Assets List (Action Required)", { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: '0D2149', fontFace: 'Outfit' });
  
  // Sort and filter worst assets
  let worstAssets = data
    .filter(item => {
      const hi = isAssessment ? item.healthIndex : parseFloat(item.HI);
      return hi > 0 && hi < 70 && !isNaN(hi);
    })
    .sort((a, b) => {
      const hiA = isAssessment ? a.healthIndex : parseFloat(a.HI);
      const hiB = isAssessment ? b.healthIndex : parseFloat(b.HI);
      return hiA - hiB;
    })
    .slice(0, 8);
    
  let worstRows = [
    [
      { text: 'Equipment Name', options: { fill: 'EF4444', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Site', options: { fill: 'EF4444', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Health Index', options: { fill: 'EF4444', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Status', options: { fill: 'EF4444', color: 'FFFFFF', bold: true, align: 'center' } },
      { text: 'Recommended Action', options: { fill: 'EF4444', color: 'FFFFFF', bold: true, align: 'center' } }
    ]
  ];
  
  worstAssets.forEach(item => {
    const name = isAssessment ? item.name : item.LOCAL_EQUIPMENT_CODE;
    const site = isAssessment ? item.site : item.SITE;
    const hi = isAssessment ? item.healthIndex : parseFloat(item.HI);
    const status = hi < 50 ? 'Critical' : 'Warning';
    const rec = isAssessment ? item.recommendation : (hi < 50 ? 'Immediate offline diagnostics required.' : 'Surveillance & diagnostics scheduling.');
    
    worstRows.push([
      { text: name, options: { align: 'left' } },
      { text: site, options: { align: 'center' } },
      { text: `${hi}%`, options: { align: 'center', bold: true } },
      { text: status, options: { align: 'center', bold: true, color: (hi < 50 ? 'EF4444' : 'F97316') } },
      { text: rec, options: { align: 'left' } }
    ]);
  });
  
  if (worstAssets.length === 0) {
    slide4.addText("No assets are currently in Critical or Warning status (HI < 70%). All fleet units are operating normally.", {
      x: 0.5, y: 2.0, w: 12.3, h: 1.0, fontSize: 14, color: '10B981', fontFace: 'Inter'
    });
  } else {
    slide4.addTable(worstRows, {
      x: 0.5, y: 1.2, w: 12.3,
      colW: [2.5, 1.5, 1.3, 1.5, 5.5],
      border: { type: 'solid', color: 'CBD5E1', width: 1 },
      fontSize: 10,
      fontFace: 'Inter'
    });
  }
  
  // Save presentation
  pptx.writeFile({ fileName: `GPSC_Transformer_Health_Report_${today.replace(/ /g, '_')}` });
}
