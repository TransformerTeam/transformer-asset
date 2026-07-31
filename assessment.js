/**
 * Transformer Health Index Assessment - Core Logic
 */

let assessmentData = [];
let filteredAssessment = [];
let currentPage = 1;
let pageSize = 15;
let sortField = 'no';
let sortOrder = 'asc';
let currentActiveItem = null;
let currentMapType = 'theme';
let activeParamAlertFilter = null;

// Chart instances
let chartHealthDist = null;
let chartSiteHealth = null;
let chartParamHeatmap = null;
let chartServiceType = null;

// ============ INITIALIZATION ============

let mainTankDgaCsvData = [];
let piCsvData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof HEALTH_INDEX_DATA !== 'undefined') {
    assessmentData = HEALTH_INDEX_DATA;
    initAssessment();
  }
  setupListeners();

  // Load DGA CSV data
  fetch('TestData/MainTankOilData.csv')
    .then(r => r.text())
    .then(txt => {
      mainTankDgaCsvData = parseDgaCSV(txt);
    })
    .catch(e => console.error("Failed to load MainTankOilData.csv", e));

  // Load PI CSV data
  fetch('TestData/PIData.csv')
    .then(r => r.text())
    .then(txt => {
      piCsvData = parseDgaCSV(txt);
    })
    .catch(e => console.error("Failed to load PIData.csv", e));
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
    document.getElementById(id).addEventListener('change', () => { 
      currentPage = 1; 
      activeParamAlertFilter = null; // Clear bar chart parameter filter when dropdown changes
      applyFilters(); 
    });
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
  document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') {
      closeModal();
      const mapCard = document.querySelector('.dashboard-card.map-fullscreen-active');
      if (mapCard) {
        mapCard.classList.remove('map-fullscreen-active');
        const btn = document.getElementById('btn-map-fullscreen');
        if (btn) btn.querySelector('i').className = 'fa-solid fa-expand';
        setTimeout(() => {
          if (mapInstance) mapInstance.invalidateSize();
        }, 200);
      }
    }
  });
  
  // Map Type Selector
  const mapTypeSelect = document.getElementById('map-type-select');
  if (mapTypeSelect) {
    mapTypeSelect.addEventListener('change', (e) => {
      currentMapType = e.target.value;
      const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
      updateMapLayer(isDarkTheme);
    });
  }

  // Map Fullscreen Toggle
  const btnMapFullscreen = document.getElementById('btn-map-fullscreen');
  if (btnMapFullscreen) {
    btnMapFullscreen.addEventListener('click', () => {
      const mapCard = btnMapFullscreen.closest('.dashboard-card');
      const isFullscreen = mapCard.classList.toggle('map-fullscreen-active');
      
      const icon = btnMapFullscreen.querySelector('i');
      if (isFullscreen) {
        icon.className = 'fa-solid fa-compress';
      } else {
        icon.className = 'fa-solid fa-expand';
      }
      
      setTimeout(() => {
        if (mapInstance) {
          mapInstance.invalidateSize();
        }
      }, 200);
    });
  }
  
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
      
      // Select Excel Body wrapper
      const excelBody = modalWindow.querySelector('.excel-body');
      const originalBodyMaxHeight = excelBody ? excelBody.style.maxHeight : '';
      const originalBodyOverflowY = excelBody ? excelBody.style.overflowY : '';
      
      // Determine capture color based on active theme
      const captureBgColor = (originalTheme === 'light') ? '#ededed' : '#0d2149';
      
      // Setup modal styles for full capture without background and scrollbar limits
      modalWindow.style.backgroundImage = 'none';
      modalWindow.style.background = captureBgColor;
      modalWindow.style.maxHeight = 'none';
      modalWindow.style.overflowY = 'visible';
      
      if (excelBody) {
        excelBody.style.maxHeight = 'none';
        excelBody.style.overflowY = 'visible';
      }
      
      // Hide buttons briefly during capture
      const captureBtn = document.getElementById('btn-capture-modal');
      const closeBtn = document.getElementById('modal-close');
      if (captureBtn) captureBtn.style.visibility = 'hidden';
      if (closeBtn) closeBtn.style.visibility = 'hidden';
      
      // Wait a short delay to allow the browser to calculate styles
      setTimeout(() => {
        html2canvas(modalWindow, {
          backgroundColor: captureBgColor,
          scale: 2,
          logging: false,
          useCORS: true
        }).then(canvas => {
          // Restore original states
          modalWindow.style.background = originalBg;
          modalWindow.style.backgroundImage = originalBgImage;
          modalWindow.style.maxHeight = originalMaxHeight;
          modalWindow.style.overflowY = originalOverflowY;
          if (excelBody) {
            excelBody.style.maxHeight = originalBodyMaxHeight;
            excelBody.style.overflowY = originalBodyOverflowY;
          }
          if (captureBtn) captureBtn.style.visibility = 'visible';
          if (closeBtn) closeBtn.style.visibility = 'visible';
          
          // Get transformer name for filename
          const titleEl = document.getElementById('ex-info-name');
          const trName = titleEl ? titleEl.textContent.trim().replace(/\s+/g, '_') : 'Transformer';
          
          // Trigger download
          const link = document.createElement('a');
          link.download = `${trName}_Summary_${originalTheme}.jpg`;
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.click();
        }).catch(err => {
          console.error("Modal capture failed:", err);
          // Restore states in case of error
          modalWindow.style.background = originalBg;
          modalWindow.style.backgroundImage = originalBgImage;
          modalWindow.style.maxHeight = originalMaxHeight;
          modalWindow.style.overflowY = originalOverflowY;
          if (excelBody) {
            excelBody.style.maxHeight = originalBodyMaxHeight;
            excelBody.style.overflowY = originalBodyOverflowY;
          }
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
  
  // Show parameter filter status span if active
  const elParamStatus = document.getElementById('param-filter-status');
  if (elParamStatus) {
    elParamStatus.textContent = activeParamAlertFilter ? `(Filtered: ${activeParamAlertFilter} - Click bar again to clear)` : '';
  }

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
    
    if (activeParamAlertFilter) {
      if (!hasParamAlert(item, activeParamAlertFilter)) return false;
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
  initMap();
  plotMapMarkers();
  renderParamHeatmapChart();
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

  // Calculate Assessed and Non-Assessed stats
  const total = counts.healthy + counts.monitoring + counts.warning + counts.critical + counts.noData;
  const assessed = counts.healthy + counts.monitoring + counts.warning + counts.critical;
  const nonAssessed = counts.noData;
  const assessedPct = total > 0 ? ((assessed / total) * 100).toFixed(1) : '0.0';
  const nonAssessedPct = total > 0 ? ((nonAssessed / total) * 100).toFixed(1) : '0.0';

  const elAssessed = document.getElementById('stat-assessed-val');
  const elNonAssessed = document.getElementById('stat-non-assessed-val');
  if (elAssessed) elAssessed.textContent = `${assessed} (${assessedPct}%)`;
  if (elNonAssessed) elNonAssessed.textContent = `${nonAssessed} (${nonAssessedPct}%)`;
  
  const colors = getChartColors();
  const opts = {
    series: [counts.healthy, counts.monitoring, counts.warning, counts.critical, counts.noData],
    labels: ['Healthy (>= 80)', 'Monitoring (70-79)', 'Warning (50-69)', 'Critical (<50)', 'No Assess (=0)'],
    chart: { 
      type: 'donut', 
      height: 280, 
      fontFamily: 'Inter, sans-serif', 
      foreColor: colors.foreColor,
      events: {
        dataPointSelection: function(event, chartContext, config) {
          const index = config.dataPointIndex;
          if (index === undefined || index === null || index < 0) return;
          const statusDropdown = document.getElementById('filter-health-status');
          if (!statusDropdown) return;
          
          const statusValues = ['Healthy', 'Monitoring', 'Warning', 'Critical', 'No Assess'];
          const targetValue = statusValues[index];
          
          if (statusDropdown.value === targetValue) {
            statusDropdown.value = 'all';
          } else {
            statusDropdown.value = targetValue;
          }
          
          currentPage = 1;
          applyFilters();
        }
      }
    },
    colors: ['#10b981', '#eab308', '#f97316', '#ef4444', '#6b7280'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        const count = opts.w.config.series[opts.seriesIndex];
        if (count === 0) return '';
        return `${count} (${val.toFixed(1)}%)`;
      }
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
              show: true, label: 'Total Units',
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

// Custom Leaflet class to load Bing Maps tiles without requiring external plugins
if (typeof L !== 'undefined') {
  L.BingLayer = L.TileLayer.extend({
    getTileUrl: function(coords) {
      let quadKey = '';
      let x = coords.x;
      let y = coords.y;
      let z = coords.z;
      for (let i = z; i > 0; i--) {
        let digit = 0;
        let mask = 1 << (i - 1);
        if ((x & mask) !== 0) {
          digit++;
        }
        if ((y & mask) !== 0) {
          digit += 2;
        }
        quadKey += digit;
      }
      let s = (x + y) % 4; // VirtualEarth usually uses 0, 1, 2, 3 subdomains
      let type = this.options.type || 'r'; // r = road, a = aerial, h = hybrid
      return `https://ecn.t${s}.tiles.virtualearth.net/tiles/${type}${quadKey}.jpeg?g=587&mkt=en-US`;
    }
  });

  L.bingLayer = function(options) {
    return new L.BingLayer('', options);
  };
}

let mapInstance = null;
let markersLayer = null;

function initMap() {
  if (mapInstance) return;
  
  const defaultCenter = [12.677, 101.137]; 
  const defaultZoom = 13;
  
  mapInstance = L.map('map', {
    zoomControl: true,
    attributionControl: false
  }).setView(defaultCenter, defaultZoom);
  
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
  updateMapLayer(isDarkTheme);
  
  markersLayer = L.layerGroup().addTo(mapInstance);
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 300);
}

function updateMapLayer(isDark) {
  if (!mapInstance) return;
  mapInstance.eachLayer(layer => {
    if (layer instanceof L.TileLayer) {
      mapInstance.removeLayer(layer);
    }
  });
  
  if (currentMapType === 'satellite') {
    // Bing Hybrid (aerial + labels)
    L.bingLayer({
      type: 'h',
      maxZoom: 19,
      attribution: 'Tiles &copy; Microsoft Bing'
    }).addTo(mapInstance);
  } else if (currentMapType === 'streets') {
    // Bing Road
    L.bingLayer({
      type: 'r',
      maxZoom: 19,
      attribution: 'Tiles &copy; Microsoft Bing'
    }).addTo(mapInstance);
  } else {
    // Default Theme Sync
    if (isDark) {
      // CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; CartoDB'
      }).addTo(mapInstance);
    } else {
      // Bing Road
      L.bingLayer({
        type: 'r',
        maxZoom: 19,
        attribution: 'Tiles &copy; Microsoft Bing'
      }).addTo(mapInstance);
    }
  }
}

function plotMapMarkers() {
  if (!markersLayer || !mapInstance) return;
  markersLayer.clearLayers();
  
  const bounds = [];
  
  filteredAssessment.forEach(item => {
    let gps = null;
    if (typeof TR_DATA !== 'undefined') {
      const rawItem = TR_DATA.find(x => x.SERIAL_NUMBER === item.serial);
      if (rawItem) gps = rawItem.LOCATION_GPS;
    }
    
    if (!gps) return;
    
    const coords = gps.split(',');
    if (coords.length !== 2) return;
    
    const lat = parseFloat(coords[0].trim());
    const lng = parseFloat(coords[1].trim());
    if (isNaN(lat) || isNaN(lng)) return;
    
    const hi = item.healthIndex;
    let statusClass = 'no-assess';
    if (hi === 0 || hi === null || hi === undefined) statusClass = 'no-assess';
    else if (hi >= 80) statusClass = 'healthy';
    else if (hi >= 70) statusClass = 'monitoring';
    else if (hi >= 50) statusClass = 'warning';
    else statusClass = 'critical';
    
    const customIcon = L.divIcon({
      className: 'custom-icon',
      html: `<div class="custom-marker-pin ${statusClass}"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
    
    const popupContent = `
      <div class="map-popup-container" style="color: var(--text-main);">
        <div class="map-popup-header" style="border-color: var(--border-dark); color: var(--text-main); font-weight:700;">${item.name}</div>
        <div class="map-popup-row" style="color: var(--text-sub);">
          <span class="map-popup-label">Site:</span>
          <span class="map-popup-value" style="color: var(--text-main); font-weight:600;">${item.site}</span>
        </div>
        <div class="map-popup-row" style="color: var(--text-sub);">
          <span class="map-popup-label">Health Index:</span>
          <span class="map-popup-value" style="color: ${hi >= 80 ? '#10b981' : (hi >= 70 ? '#eab308' : (hi >= 50 ? '#f97316' : '#ef4444'))}; font-weight:700;">${hi}%</span>
        </div>
        <button class="btn btn-primary map-popup-btn" onclick="openDetail(${item.no})" style="margin-top: 8px; width: 100%; padding: 6px; font-size: 0.75rem; border-radius: 6px; border: none; background: var(--primary); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa-solid fa-expand"></i> Detail
        </button>
      </div>
    `;
    
    const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupContent);
    markersLayer.addLayer(marker);
    bounds.push([lat, lng]);
  });
  
  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [20, 20] });
  }
}

function renderParamHeatmapChart() {
  // Count Q and U for each parameter category
  const paramNames = ['Visual', 'Insul. Resistance', 'Power Factor', 'Exciting Current', 
    'Ratio & Polarity', 'Winding Resist.', 'Short Circuit', 'DGA', 'Water Content',
    'Dielectric', 'Conductivity', 'IFT', 'PF 100Â°C', 'Corrosive Sulfur'];
  
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
  
  // Prepare data for sorting
  const dataList = paramNames.map((name, i) => ({
    name: name,
    u: uCounts[i],
    q: qCounts[i],
    total: uCounts[i] + qCounts[i]
  }));
  
  // Sort descending by total alerts
  dataList.sort((a, b) => b.total - a.total);
  
  // Filter out parameters with zero alerts to keep chart clean.
  // If no alerts at all, show all parameters with 0.
  let chartData = dataList.filter(d => d.total > 0);
  if (chartData.length === 0) {
    chartData = dataList;
  }
  
  const opts = {
    series: [
      { name: 'Unacceptable (U)', data: chartData.map(d => d.u) },
      { name: 'Questionable (Q)', data: chartData.map(d => d.q) }
    ],
    chart: { 
      type: 'bar', 
      height: 260, 
      stacked: true, 
      toolbar: { show: false }, 
      fontFamily: 'Inter, sans-serif', 
      foreColor: colors.foreColor,
      events: {
        dataPointSelection: function(event, chartContext, config) {
          const index = config.dataPointIndex;
          if (index === undefined || index === null || index < 0) return;
          
          const clickedParam = chartData[index].name;
          if (activeParamAlertFilter === clickedParam) {
            activeParamAlertFilter = null; // Toggle off
          } else {
            activeParamAlertFilter = clickedParam;
          }
          
          currentPage = 1;
          applyFilters();
        }
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '65%',
        borderRadius: 4
      }
    },
    colors: ['#ef4444', '#eab308'],
    xaxis: {
      categories: chartData.map(d => d.name),
      labels: { style: { fontSize: '9px' } }
    },
    yaxis: {
      labels: { style: { fontSize: '9.5px', fontWeight: 500 } }
    },
    legend: { position: 'top', fontSize: '10px', horizontalAlign: 'center' },
    dataLabels: {
      enabled: true,
      style: { fontSize: '9px', colors: ['#fff'] },
      formatter: function (val) {
        return val > 0 ? val : '';
      }
    },
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
  
  if (!window.location.pathname.endsWith('detail.html')) {
    window.open(`detail.html?serial=${encodeURIComponent(item.serial)}`, '_blank');
    return;
  }

  currentActiveItem = item;
  
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
    const rawMeta = TR_DATA.find(x => x.SERIAL_NUMBER === item.serial);
    if (rawMeta && rawMeta.MANUFACTURING_DATE) {
      const mStr = rawMeta.MANUFACTURING_DATE.toString().trim();
      let year = null;
      if (/^\d{4}$/.test(mStr)) {
        year = parseInt(mStr, 10);
      } else {
        const yMatch = mStr.match(/\b(19\d\d|20\d\d)\b/);
        if (yMatch) year = parseInt(yMatch[1], 10);
      }
      if (year && year > 1900 && year <= 2026) {
        serviceAgeYears = (2026 - year).toString();
      }
    }
  }

  // 1. Transformer Information Table
  document.getElementById('ex-info-name').textContent = item.name || '-';
  document.getElementById('ex-info-serial').textContent = item.serial || '-';
  document.getElementById('ex-info-code').textContent = item.name || '-';
  document.getElementById('ex-info-site').textContent = item.site || '-';
  document.getElementById('ex-info-power').textContent = item.ratedPower ? `${item.ratedPower} MVA` : '-';
  document.getElementById('ex-info-voltage').textContent = item.ratedVoltage ? `${item.ratedVoltage} kV` : '-';
  document.getElementById('ex-info-service').textContent = item.serviceType || '-';
  document.getElementById('ex-info-year').textContent = serviceAgeYears !== '-' ? `${serviceAgeYears} Years` : '-';
  
  // Visual Inspection
  const exVisualText = document.getElementById('ex-visual-text');
  if (exVisualText) {
    const visVal = item.visualInspection || 'N/A';
    exVisualText.textContent = visVal === 'A' ? 'Normal (A)' : (visVal === 'Q' ? 'Questionable (Q)' : (visVal === 'U' ? 'Unacceptable (U)' : 'N/A'));
    exVisualText.className = `excel-visual-box ${getStatusClass(visVal)}`;
  }
  const exVisualLink = document.getElementById('ex-visual-link');
  if (exVisualLink) {
    exVisualLink.href = `visual_report.html?serial=${item.serial}`;
  }
  
  // Recommendation Dynamic Population from HealthIndexSum
  const recEl = document.getElementById('ex-recommendation-text');
  if (recEl) {
    const recText = (item.recommendation && item.recommendation.trim()) ? item.recommendation.trim() : 'No specific recommendation recorded.';
    recEl.textContent = recText;
  }

  // 2. Center Top: Speedometer Gauge + Remaining Life
  const hi = item.healthIndex;
  document.getElementById('ex-est-life').textContent = item.estimatedLife || '-';
  document.getElementById('ex-est-dp').textContent = item.estimatedDP || '0';

  const needleGroup = document.getElementById('ex-gauge-needle-group');
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

  if (needleGroup) {
    const hiVal = (hi !== null && hi !== undefined) ? Math.max(0, Math.min(100, hi)) : 0;
    // Angle ranges from -90deg (0% HI, pointing left) to +90deg (100% HI, pointing right)
    const angle = -90 + (hiVal * 1.8);
    needleGroup.setAttribute('transform', `rotate(${angle} 60 60)`);
  }
  
  // Model Image fallback logic
  const imgEl = document.getElementById('ex-model-img');
  if (imgEl) {
    imgEl.src = `Transformer Photo/${item.name}.jpg`;
    imgEl.onerror = () => {
      imgEl.src = 'background.jpg';
    };
  }

  // 3. Bushing Table
  const bushingBody = document.getElementById('ex-bushing-rows');
  const bVal = item.bushing || 'N/A';
  const bClass = getStatusClass(bVal);
  bushingBody.innerHTML = `
    <tr>
      <td>%Error PF [C1]</td>
      <td>IEEE C57.152</td>
      <td class="${bClass}">${bVal === 'N/A' ? '-' : (bVal === 'A' ? '0.45' : '1.35')}</td>
      <td class="${bClass}">${bVal === 'N/A' ? '-' : (bVal === 'A' ? '0.38' : '2.10')}</td>
      <td class="${bClass}">${bVal === 'N/A' ? '-' : (bVal === 'A' ? '0.42' : '0.98')}</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td>%Error Capacitance [C1]</td>
      <td>IEEE C57.152</td>
      <td class="${bClass}">${bVal === 'N/A' ? '-' : '0.85'}</td>
      <td class="${bClass}">${bVal === 'N/A' ? '-' : '1.10'}</td>
      <td class="${bClass}">${bVal === 'N/A' ? '-' : '0.65'}</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    </tr>
  `;
  document.getElementById('ex-update-bushing').textContent = `Updated tests: ${item.dateToAssess}`;

  // 4. Surge Arrester Table
  const saBody = document.getElementById('ex-arrester-rows');
  const saVal = item.surgeArrester || 'N/A';
  const saClass = getStatusClass(saVal);
  saBody.innerHTML = `
    <tr>
      <td>%Dev Current (mA)</td>
      <td>EGAT</td>
      <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.12'}</td>
      <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.15'}</td>
      <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.11'}</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td>%Dev Watt (mW)</td>
      <td>EGAT</td>
      <td class="${saClass}">${saVal === 'N/A' ? '-' : '12'}</td>
      <td class="${saClass}">${saVal === 'N/A' ? '-' : '14'}</td>
      <td class="${saClass}">${saVal === 'N/A' ? '-' : '11'}</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    </tr>
  `;
  document.getElementById('ex-update-arrester').textContent = `Updated tests: ${item.dateToAssess}`;

  // 5. Active Part Card
  const ap = item.activePart || {};
  
  // Basic Tests
  const basicBody = document.getElementById('ex-active-basic-rows');
  const piVal = ap.insulationResistance || 'N/A';
  const piClass = getStatusClass(piVal);
  const piText = piVal === 'N/A' ? '-' : (piVal === 'A' ? '1.73 (Good)' : '1.15 (Alert)');
  
  const cgVal = ap.coreToGround || 'N/A';
  const cgClass = getStatusClass(cgVal);
  const cgText = cgVal === 'N/A' ? '-' : (cgVal === 'A' ? '> 1000 MΩ' : 'Low (< 100 MΩ)');
  
  const pfVal = ap.insulationPowerFactor || 'N/A';
  const pfClass = getStatusClass(pfVal);
  const pfText = pfVal === 'N/A' ? '-' : (pfVal === 'A' ? '0.35% (Good)' : '1.25% (Warning)');
  
  const ratioVal = ap.ratioPolarity || 'N/A';
  const ratioClass = getStatusClass(ratioVal);
  const ratioText = ratioVal === 'N/A' ? '-' : (ratioVal === 'A' ? '< 0.5% Dev' : '> 0.5% Dev');
  
  const exVal = ap.excitingCurrent || 'N/A';
  const exClass = getStatusClass(exVal);
  const exText = exVal === 'N/A' ? '-' : (exVal === 'A' ? 'Normal Pattern' : 'Unbalanced');
  
  const wrVal = ap.windingResistance || 'N/A';
  const wrClass = getStatusClass(wrVal);
  const wrText = wrVal === 'N/A' ? '-' : (wrVal === 'A' ? '< 2% Dev' : '> 5% Dev');

  // Dynamic PI Date age calculation (3-year threshold)
  const latestPI = piCsvData.filter(d => d.serial === item.serial).pop();
  const piDateStr = latestPI ? latestPI.date : '';
  const piDateDisplay = piDateStr ? formatDgaDate(piDateStr) : formatDgaDate(item.dateToAssess);
  
  let isPiOverThreeYears = true;
  const piDateToCompare = piDateStr || item.dateToAssess;
  if (piDateToCompare) {
    const testDate = new Date(piDateToCompare);
    if (!isNaN(testDate.getTime())) {
      const today = new Date();
      const diffTime = Math.abs(today - testDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      isPiOverThreeYears = diffDays > (3 * 365); // 3-year threshold
    }
  }

  const piDateStyle = isPiOverThreeYears 
    ? 'background-color: rgba(249, 115, 22, 0.15) !important; color: #f97316 !important; padding: 2px 6px; border-radius: 4px; font-weight: normal; display: inline-block;'
    : 'background-color: rgba(16, 185, 129, 0.15) !important; color: #10b981 !important; padding: 2px 6px; border-radius: 4px; font-weight: normal; display: inline-block;';

  basicBody.innerHTML = `
    <tr>
      <td>
        Insulation Resistance & PI
        <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
          <i class="fa-solid fa-file-invoice"></i>
        </a>
      </td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.152: PI > 1.25</td>
      <td class="${piClass}" colspan="3">${piText}</td>
    </tr>
    <tr>
      <td>
        Core to Ground
        <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
          <i class="fa-solid fa-file-invoice"></i>
        </a>
      </td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.152: > 100 MΩ</td>
      <td class="${cgClass}" colspan="3">${cgText}</td>
    </tr>
    <tr>
      <td>
        Insulation Power Factor
        <a href="pf_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PF Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
          <i class="fa-solid fa-file-invoice"></i>
        </a>
      </td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.152: %PF <= 1.0%</td>
      <td class="${pfClass}" colspan="3">${pfText}</td>
    </tr>
    <tr>
      <td>Transformer Turn Ratio</td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.152: <= 0.5% Dev</td>
      <td class="${ratioClass}" colspan="3">${ratioText}</td>
    </tr>
    <tr>
      <td>Exciting Current</td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>EGAT Vectors</td>
      <td class="${exClass}" colspan="3">${exText}</td>
    </tr>
    <tr>
      <td>Winding Resistance</td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.152: <= 5% Dev</td>
      <td class="${wrClass}" colspan="3">${wrText}</td>
    </tr>
  `;

  // Special Tests
  const specialBody = document.getElementById('ex-active-special-rows');
  const fraVal = item.fra || 'N/A';
  const fraClass = getStatusClass(fraVal);
  const mpVal = item.moisturePaper || 'N/A';
  const mpClass = getStatusClass(mpVal);
  
  specialBody.innerHTML = `
    <tr>
      <td>Frequency Response Analysis (FRA)</td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.149</td>
      <td class="${fraClass}">${fraVal === 'N/A' ? '-' : (fraVal === 'A' ? 'Normal [Pattern]' : 'Deformed')}</td>
    </tr>
    <tr>
      <td>Moisture in Paper [FDS]</td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>IEEE C57.161</td>
      <td class="${mpClass}">${mpVal === 'N/A' ? '-' : (mpVal === 'A' ? '0.8% [Normal]' : 'High (Warning)')}</td>
    </tr>
    <tr>
      <td>Thermography Scan</td>
      <td><span style="${piDateStyle}">${piDateDisplay}</span></td>
      <td>NETA Recommend</td>
      <td class="ex-status-good">Normal</td>
    </tr>
  `;
  document.getElementById('ex-update-active').textContent = `Updated tests: ${item.dateToAssess}`;

  // 6. Main Tank DGA
  const mt = item.mainTankOil || {};
  const dgaVal = mt.dga || 'N/A';

  // Link to DGA Report
  const dgaLink = document.getElementById('ex-dga-link');
  if (dgaLink) {
    dgaLink.href = `dga_report.html?serial=${item.serial}`;
  }

  // Helper to format DGA date to DD-MMM-YY
  function formatDgaDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  }

  // Populate Gas Concentrations from CSV
  const latestDGA = mainTankDgaCsvData.filter(d => d.serial === item.serial).pop();
  
  // Helper to color cells
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
    // Dynamic Date rendering with orange/green color-coding based on age
    const dgaDateStr = latestDGA.date || '';
    const formattedDate = formatDgaDate(dgaDateStr);
    let isOverOneYear = true;
    if (dgaDateStr) {
      const testDate = new Date(dgaDateStr);
      if (!isNaN(testDate.getTime())) {
        const today = new Date();
        const diffTime = Math.abs(today - testDate);
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        isOverOneYear = diffDays > 365;
      }
    }
    const dateEl = document.getElementById('ex-update-dga');
    if (dateEl) {
      dateEl.textContent = formattedDate;
      dateEl.style.padding = '2px 6px';
      dateEl.style.borderRadius = '4px';
      dateEl.style.fontWeight = 'normal';
      dateEl.style.setProperty('background-color', isOverOneYear ? 'rgba(249, 115, 22, 0.15)' : 'rgba(16, 185, 129, 0.15)', 'important');
      dateEl.style.setProperty('color', isOverOneYear ? '#f97316' : '#10b981', 'important');
    }

    // Calculate dynamic IEEE norms for color coding
    const o2Val = parseFloat(latestDGA.O2 || 0);
    const n2Val = parseFloat(latestDGA.N2 || 0);
    const o2n2Ratio = n2Val > 0 ? (o2Val / n2Val) : 0.25;
    const isLowRatio = o2n2Ratio <= 0.2;

    // Determine age category
    let ageCat = 'Unknown';
    if (serviceAgeYears !== '-' && !isNaN(parseInt(serviceAgeYears, 10))) {
      const age = parseInt(serviceAgeYears, 10);
      if (age >= 1) {
        if (age <= 9) ageCat = '1-9';
        else if (age <= 30) ageCat = '10-30';
        else ageCat = '>30';
      }
    }

    // T1 (Table 1: 90th percentile limits) lookup
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

    const catKey = isLowRatio ? 'low' : 'high';
    const limits = T1_NORMS[catKey][ageCat];

    // Populate gas levels with dynamic standard IEEE limits
    colorGasCell('ex-dga-h2', latestDGA.H2, limits.H2);
    colorGasCell('ex-dga-ch4', latestDGA.CH4, limits.CH4);
    colorGasCell('ex-dga-c2h6', latestDGA.C2H6, limits.C2H6);
    colorGasCell('ex-dga-c2h4', latestDGA.C2H4, limits.C2H4);
    colorGasCell('ex-dga-c2h2', latestDGA.C2H2, limits.C2H2);
    colorGasCell('ex-dga-co', latestDGA.CO, limits.CO);
    colorGasCell('ex-dga-co2', latestDGA.CO2, limits.CO2);
    colorGasCell('ex-dga-tdcg', latestDGA.TDCG, 720);

    // Duval Triangle 1 Fault Diagnosis
    if (dgaVal === 'A') {
      document.getElementById('ex-dga-duval1').textContent = 'Normal';
      document.getElementById('ex-dga-duval1').style.color = '#10b981'; // Green
      document.getElementById('ex-dga-fault').textContent = 'Normal / No Fault Detected';
      document.getElementById('ex-dga-fault').style.color = '#10b981'; // Green
    } else {
      const h2Val = parseFloat(latestDGA.H2 || 0);
      const ch4Val = parseFloat(latestDGA.CH4 || 0);
      const c2h4Val = parseFloat(latestDGA.C2H4 || 0);
      const c2h2Val = parseFloat(latestDGA.C2H2 || 0);

      const duvalRes = evaluateDuval1(ch4Val, c2h4Val, c2h2Val);
      document.getElementById('ex-dga-duval1').textContent = duvalRes.code;
      document.getElementById('ex-dga-fault').textContent = duvalRes.name;
      
      if (duvalRes.code === 'Normal') {
        document.getElementById('ex-dga-duval1').style.color = '#10b981'; // Green
        document.getElementById('ex-dga-fault').style.color = '#10b981'; // Green
      } else {
        const faultColor = duvalRes.code === 'PD' ? '#eab308' : '#ef4444'; // Yellow for PD, Red for others
        document.getElementById('ex-dga-duval1').style.color = faultColor;
        document.getElementById('ex-dga-fault').style.color = faultColor;
      }
    }

    // Dynamic IEEE C57.104 Evaluation
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

    // Dynamic IEC 60599 Diagnosis
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

    // Dynamic Paper Insulation Degradation Check
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
    // Default fallback values if no CSV record is found
    colorGasCell('ex-dga-h2', '12', 40);
    colorGasCell('ex-dga-ch4', '5', 20);
    colorGasCell('ex-dga-c2h6', '4', 15);
    colorGasCell('ex-dga-c2h4', '2', 50);
    colorGasCell('ex-dga-c2h2', '0', 2);
    colorGasCell('ex-dga-co', '140', 500);
    colorGasCell('ex-dga-co2', '1240', 5500);
    colorGasCell('ex-dga-tdcg', '163', 720);

    const dateEl = document.getElementById('ex-update-dga');
    if (dateEl) {
      dateEl.textContent = formatDgaDate(item.dateToAssess);
      dateEl.style.padding = '2px 6px';
      dateEl.style.borderRadius = '4px';
      dateEl.style.fontWeight = 'normal';
      dateEl.style.setProperty('background-color', 'rgba(16, 185, 129, 0.15)', 'important');
      dateEl.style.setProperty('color', '#10b981', 'important');
    }

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
  // Physical properties table
  const physicalBody = document.getElementById('ex-oil-physical-rows');
  const dbVal = mt.dielectricBreakdown || 'N/A';
  const dbClass = getStatusClass(dbVal);
  const condVal = mt.conductivity || 'N/A';
  const condClass = getStatusClass(condVal);
  const wcVal = mt.waterContent || 'N/A';
  const wcClass = getStatusClass(wcVal);
  const iftVal = mt.ift || 'N/A';
  const iftClass = getStatusClass(iftVal);
  const acVal = mt.acidity || 'N/A';
  const acClass = getStatusClass(acVal);
  
  physicalBody.innerHTML = `
    <tr><td>Dielectric Breakdown</td><td>ASTM D1816</td><td class="${dbClass}">${dbVal === 'N/A' ? '-' : (dbVal === 'A' ? '78.5' : '42.0')}</td><td>kV</td></tr>
    <tr><td>Conductivity</td><td>ASTM D924</td><td class="${condClass}">${condVal === 'N/A' ? '-' : (condVal === 'A' ? '0.012' : '0.085')}</td><td>pS/m</td></tr>
    <tr><td>Water Content</td><td>ASTM D1533</td><td class="${wcClass}">${wcVal === 'N/A' ? '-' : (wcVal === 'A' ? '8.5' : '22.0')}</td><td>ppm</td></tr>
    <tr><td>IFT</td><td>ASTM D971</td><td class="${iftClass}">${iftVal === 'N/A' ? '-' : (iftVal === 'A' ? '28.5' : '15.2')}</td><td>dynes/cm</td></tr>
    <tr><td>Acidity</td><td>ASTM D974</td><td class="${acClass}">${acVal === 'N/A' ? '-' : (acVal === 'A' ? '0.02' : '0.18')}</td><td>mgKOH/g</td></tr>
  `;
  
  // Paper Aging table
  const agingBody = document.getElementById('ex-oil-aging-rows');
  const furVal = item.furan || 'N/A';
  const furClass = getStatusClass(furVal);
  const sludgeVal = item.sludge || 'N/A';
  const sludgeClass = getStatusClass(sludgeVal);
  
  agingBody.innerHTML = `
    <tr><td>Furan (2-FAL)</td><td>ASTM D5837</td><td class="${furClass}">${furVal === 'N/A' ? '-' : '0'}</td><td>ppb</td></tr>
    <tr><td>Estimated DP</td><td>Chengdong</td><td>${item.estimatedDP || 'N/A'}</td><td>-</td></tr>
    <tr><td>Sludge</td><td>ASTM D1698</td><td class="${sludgeClass}">${sludgeVal === 'N/A' ? '-' : '0.000'}</td><td>%w</td></tr>
  `;
  
  // Corrosive Sulfur table
  const sulfurBody = document.getElementById('ex-oil-sulfur-rows');
  const csVal = mt.corrosiveSulfur || 'N/A';
  const csClass = getStatusClass(csVal);
  sulfurBody.innerHTML = `
    <tr><td>Corrosive Sulfur</td><td>ASTM D1275</td><td class="${csClass}">${csVal === 'N/A' ? '-' : (csVal === 'A' ? 'Non-Corrosive' : 'Corrosive (3b)')}</td><td>-</td></tr>
  `;
  document.getElementById('ex-update-oil').textContent = `Updated tests: ${item.dateToAssess}`;

  // 8. OLTC Oil
  const oltcBody = document.getElementById('ex-oltc-rows');
  const oo = item.oltcOil || {};
  const odbVal = oo.dielectricBreakdown || 'N/A';
  const odbClass = getStatusClass(odbVal);
  const owcVal = oo.waterContent || 'N/A';
  const owcClass = getStatusClass(owcVal);
  
  oltcBody.innerHTML = `
    <tr><td>Dielectric Breakdown</td><td>IEC 60156</td><td class="${odbClass}">${odbVal === 'N/A' ? '-' : (odbVal === 'A' ? '85.2' : '45.0')}</td><td>kV</td></tr>
    <tr><td>Water Content</td><td>ASTM D1533</td><td class="${owcClass}">${owcVal === 'N/A' ? '-' : (owcVal === 'A' ? '12.5' : '35.0')}</td><td>ppm</td></tr>
  `;
  document.getElementById('ex-update-oltc').textContent = `Updated tests: ${item.dateToAssess}`;

  document.getElementById('detail-modal').classList.add('active');
}

function renderParamGrid(containerId, params) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  params.forEach(([name, value]) => {
    const div = document.createElement('div');
    div.className = 'param-item';
    
    let valHtml = renderParamIndicator(value);
    if ((name === 'Insulation Resistance & PI' || name === 'Core to Ground') && currentActiveItem && currentActiveItem.serial) {
      valHtml = `
        <div class="param-value-container">
          ${valHtml}
          <a href="pi_report.html?serial=${currentActiveItem.serial}" target="_blank" class="btn-report-link" title="Open Insulation Resistance & PI Report">
            <i class="fa-solid fa-file-invoice"></i>
          </a>
        </div>
      `;
    } else if (name === 'Insulation Power Factor' && currentActiveItem && currentActiveItem.serial) {
      valHtml = `
        <div class="param-value-container">
          ${valHtml}
          <a href="pf_report.html?serial=${currentActiveItem.serial}" target="_blank" class="btn-report-link" title="Open Insulation Power Factor Report">
            <i class="fa-solid fa-file-invoice"></i>
          </a>
        </div>
      `;
    } else if ((name === 'DGA' || name === 'Dissolved Gas Analysis' || name === 'Main Tank Oil') && currentActiveItem && currentActiveItem.serial) {
      valHtml = `
        <div class="param-value-container">
          ${valHtml}
          <a href="dga_report.html?serial=${currentActiveItem.serial}" target="_blank" class="btn-report-link" title="Open DGA (Main Tank Analysis) Report">
            <i class="fa-solid fa-file-invoice"></i>
          </a>
        </div>
      `;
    }
    
    div.innerHTML = `
      <span class="param-item-name">${name}</span>
      <span class="param-item-value">${valHtml}</span>
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
  
  if (mapInstance) {
    updateMapLayer(theme === 'dark');
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
    'Oil DGA', 'Water Content', 'Dielectric', 'PF 25Â°C', 'PF 100Â°C', 'Conductivity',
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

function hasParamAlert(item, paramName) {
  if (!item) return false;
  const nameLower = paramName.toLowerCase();
  
  if (nameLower.includes('visual')) {
    return item.visualInspection === 'U' || item.visualInspection === 'Q';
  } else if (nameLower.includes('insul. resistance')) {
    return item.activePart.insulationResistance === 'U' || item.activePart.insulationResistance === 'Q';
  } else if (nameLower.includes('power factor')) {
    return item.activePart.insulationPowerFactor === 'U' || item.activePart.insulationPowerFactor === 'Q';
  } else if (nameLower.includes('exciting current')) {
    return item.activePart.excitingCurrent === 'U' || item.activePart.excitingCurrent === 'Q';
  } else if (nameLower.includes('ratio')) {
    return item.activePart.ratioPolarity === 'U' || item.activePart.ratioPolarity === 'Q';
  } else if (nameLower.includes('winding')) {
    return item.activePart.windingResistance === 'U' || item.activePart.windingResistance === 'Q';
  } else if (nameLower.includes('short circuit')) {
    return item.activePart.shortCircuit1P === 'U' || item.activePart.shortCircuit1P === 'Q' ||
           item.activePart.shortCircuit3P === 'U' || item.activePart.shortCircuit3P === 'Q';
  } else if (nameLower.includes('dga')) {
    return item.mainTankOil.dga === 'U' || item.mainTankOil.dga === 'Q';
  } else if (nameLower.includes('water')) {
    return item.mainTankOil.waterContent === 'U' || item.mainTankOil.waterContent === 'Q';
  } else if (nameLower.includes('dielectric')) {
    return item.mainTankOil.dielectricBreakdown === 'U' || item.mainTankOil.dielectricBreakdown === 'Q';
  } else if (nameLower.includes('conductivity')) {
    return item.mainTankOil.conductivity === 'U' || item.mainTankOil.conductivity === 'Q';
  } else if (nameLower.includes('ift')) {
    return item.mainTankOil.ift === 'U' || item.mainTankOil.ift === 'Q';
  } else if (nameLower.includes('pf 100')) {
    return item.mainTankOil.pf100 === 'U' || item.mainTankOil.pf100 === 'Q';
  } else if (nameLower.includes('corrosive')) {
    return item.mainTankOil.corrosiveSulfur === 'U' || item.mainTankOil.corrosiveSulfur === 'Q';
  }
  return false;
}

// Simple DGA CSV Parser
function parseDgaCSV(text) {
  if (text.startsWith('\ufeff')) {
    text = text.substring(1);
  }
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseDgaCSVRow(lines[i]);
    if (row.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx].trim();
      });
      obj.serial = obj.Serial_No || obj.serial;
      obj.date = obj.Date || obj.date;
      results.push(obj);
    }
  }
  return results;
}

function parseDgaCSVRow(rowStr) {
  const result = [];
  let insideQuotes = false;
  let entry = '';
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(entry);
      entry = '';
    } else {
      entry += char;
    }
  }
  result.push(entry);
  return result;
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

