/**
 * Transformer Health Index Assessment - Core Logic
 */

function getInitialHealthData() {
  if (typeof window !== 'undefined' && window.HEALTH_INDEX_DATA && Array.isArray(window.HEALTH_INDEX_DATA) && window.HEALTH_INDEX_DATA.length > 0) return window.HEALTH_INDEX_DATA;
  if (typeof HEALTH_INDEX_DATA !== 'undefined' && Array.isArray(HEALTH_INDEX_DATA) && HEALTH_INDEX_DATA.length > 0) return HEALTH_INDEX_DATA;
  return [];
}

let assessmentData = getInitialHealthData();
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

// ============ INITIALIZATION & CSV DATA HOLDERS ============

let mainTankDgaCsvData = [];
let piCsvData = [];
let trInfoCsvData = [];
let visualCsvData = [];
let bushingInfoCsvData = [];
let bushingPfCsvData = [];
let surgeInfoCsvData = [];
let surgePfCsvData = [];
let irPiCsvData = [];
let windingPfCsvData = [];
let ratioCsvData = [];
let excitingCsvData = [];
let windingCsvData = [];
let singleShortCsvData = [];
let threeShortCsvData = [];
let fraCsvData = [];
let dfrCsvData = [];
let drmCsvData = [];
let pdOnlineCsvData = [];
let thermoScanCsvData = [];
let mtOilCsvData = [];
let oltcOilCsvData = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!assessmentData || !assessmentData.length) {
    assessmentData = getInitialHealthData();
  }

  const isStandalone = window.isDetailStandalonePage || 
                       window.location.pathname.toLowerCase().includes('detail') || 
                       window.location.pathname.toLowerCase().includes('evaluation') || 
                       document.getElementById('detail-paper') !== null ||
                       document.getElementById('eval-transformer-select') !== null;
  if (!isStandalone) {
    initAssessment();
  }
  setupListeners();
});

// Start CSV fetch immediately
window.allCSVsPromise = loadAllTestDataCSVs();

function loadAllTestDataCSVs() {
  const isDetail = window.isDetailStandalonePage || 
                   window.location.pathname.toLowerCase().includes('detail') || 
                   window.location.pathname.toLowerCase().includes('evaluation') || 
                   document.getElementById('detail-paper') !== null ||
                   document.getElementById('eval-transformer-select') !== null;

  const csvFiles = [
    { url: 'HealthIndexSum.csv', target: d => {
        if (d && d.length > 0) {
          const parsed = parseHealthIndexSumCSV(d);
          if (parsed && parsed.length > 0) {
            assessmentData = parsed;
            if (typeof initAssessment === 'function') initAssessment();
          }
        }
      }
    },
    { url: 'TestData/TRinfo2.csv', target: d => trInfoCsvData = d },
    { url: 'TestData/BushingPFData.csv', target: d => bushingPfCsvData = d },
    { url: 'TestData/MTOilData.csv', target: d => { mtOilCsvData = d; mainTankDgaCsvData = d; } },
    { url: 'TestData/MainTankOilData.csv', target: d => { if (!mtOilCsvData.length) { mtOilCsvData = d; mainTankDgaCsvData = d; } } },
    { url: 'TestData/OLTCOilData.csv', target: d => oltcOilCsvData = d },
  ];

  csvFiles.push(
    { url: 'TestData/VisualData.csv', target: d => visualCsvData = d },
    { url: 'TestData/BushingInfo.csv', target: d => bushingInfoCsvData = d },
    { url: 'TestData/SurgeInfo.csv', target: d => surgeInfoCsvData = d },
    { url: 'TestData/SurgePFData.csv', target: d => surgePfCsvData = d },
    { url: 'TestData/IRandPIData.csv', target: d => { irPiCsvData = d; piCsvData = d; } },
    { url: 'TestData/WindingPFData.csv', target: d => windingPfCsvData = d },
    { url: 'TestData/RatioData.csv', target: d => ratioCsvData = d },
    { url: 'TestData/ExcitingData.csv', target: d => excitingCsvData = d },
    { url: 'TestData/WindingData.csv', target: d => windingCsvData = d },
    { url: 'TestData/SingleShortData.csv', target: d => singleShortCsvData = d },
    { url: 'TestData/ThreeShortData.csv', target: d => threeShortCsvData = d },
    { url: 'TestData/FRAData.csv', target: d => fraCsvData = d },
    { url: 'TestData/DFRData.csv', target: d => dfrCsvData = d },
    { url: 'TestData/DRMData.csv', target: d => drmCsvData = d },
    { url: 'TestData/PDonlineData.csv', target: d => pdOnlineCsvData = d },
    { url: 'TestData/ThermoScanData.csv', target: d => thermoScanCsvData = d }
  );

  return Promise.allSettled(
    csvFiles.map(item =>
      fetch(item.url)
        .then(r => r.ok ? r.text() : '')
        .then(txt => {
          if (txt) item.target(parseDgaCSV(txt));
        })
    )
  ).then(() => {
    document.dispatchEvent(new CustomEvent('allTestDataLoaded'));
  });
}

function parseHealthIndexSumCSV(rows) {
  if (!rows || rows.length === 0) return [];
  const results = [];
  rows.forEach((row, idx) => {
    const name = row['Equipment Name'] || row.name || row.Equipment_Name || row.EQUIPMENT_NAME || row.Equipment || row['Name'] || '';
    const serial = row['Serial No'] || row['Serial No.'] || row.serial || row.Serial_No || row.Serial || row.SERIAL_NUMBER || row.Serial_no || '';
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
        ratioPolarity: String(row['Ratio&Polarity'] || 'N/A'),
        windingResistance: String(row['Winding Resistance'] || 'N/A'),
        shortCircuit1P: String(row['1∅ Short Circuit Impedance'] || 'N/A'),
        shortCircuit3P: String(row['3∅ Short Circuit Impedance'] || 'N/A'),
        coreToGround: String(row['Core to Ground'] || 'N/A')
      },
      bushing: String(row.Bushing || 'N/A'),
      surgeArrester: String(row['Surge Arrester'] || 'N/A'),
      dynamicResistance: String(row['Dynamic Resistance Measurement (OLTC)'] || 'N/A'),
      fra: String(row['Frequency Response Analysis (FRA)'] || 'N/A'),
      moisturePaper: String(row['%Moisture in paper (FDS)'] || 'N/A'),
      mainTankOil: {
        overall: String(row['Main Tank Oil'] || 'N/A'),
        dga: String(row.DGA || 'N/A'),
        waterContent: String(row['Water Content'] || 'N/A'),
        dielectricBreakdown: String(row['Dielectric Breakdown'] || 'N/A'),
        pf25: String(row['PF at 25 °C'] || 'N/A'),
        pf100: String(row['PF at 100 °C'] || 'N/A'),
        conductivity: String(row.Conductivity || 'N/A'),
        ift: String(row['Interfratial Tension (IFT)'] || row['Interfacial Tension (IFT)'] || 'N/A'),
        acidity: String(row.Acidity || 'N/A'),
        color: String(row.Color || 'N/A'),
        inhibitor: String(row.Inhibitor || 'N/A'),
        corrosiveSulfur: String(row['Corrosive Sulfur'] || 'N/A')
      },
      passivator: String(row.Passivator || 'N/A'),
      furan: String(row.Furan || 'N/A'),
      sludge: String(row.Sludge || 'N/A'),
      oltcOil: {
        dga: String(row['DGA (OLTC)'] || 'N/A'),
        dielectricBreakdown: String(row['Dielectric Breakdown (OLTC)'] || 'N/A'),
        waterContent: String(row['Water Content (OLTC)'] || 'N/A')
      },
      dateToAssess: String(row['Date To Assess'] || ''),
      lastPM: String(row['Last PM'] || ''),
      nextPM: String(row['Next PM'] || ''),
      recommendation: String(row.Recommendation || '')
    });
  });
  return results;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === '-' || val === 'N/A') return null;
  const num = parseFloat(val);
  return (!isNaN(num)) ? num : null;
}

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
  if (!matches.length) return null;
  matches.sort((a, b) => {
    const dA = new Date(a.date || a.Date || a['Test Date'] || a.Test_Date || 0);
    const dB = new Date(b.date || b.Date || b['Test Date'] || b.Test_Date || 0);
    if (isNaN(dA.getTime())) return 1;
    if (isNaN(dB.getTime())) return -1;
    return dB - dA;
  });
  return matches[0];
}

function initAssessment() {
  const isDetail = window.isDetailStandalonePage || 
                   window.location.pathname.toLowerCase().includes('detail') || 
                   document.getElementById('detail-paper') !== null;
  if (isDetail) {
    const savedTheme = localStorage.getItem('tr-dashboard-theme') || 'dark';
    setTheme(savedTheme);
    return;
  }
  populateFilterDropdowns();
  const savedTheme = localStorage.getItem('tr-dashboard-theme') || 'dark';
  setTheme(savedTheme);
  applyFilters();
}

function setupListeners() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  
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
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => { 
        currentPage = 1; 
        activeParamAlertFilter = null; // Clear bar chart parameter filter when dropdown changes
        applyFilters(); 
      });
    }
  });
  
  // Search
  const searchBox = document.getElementById('search-box');
  if (searchBox) {
    searchBox.addEventListener('input', debounce(() => {
      currentPage = 1;
      applyFilters();
    }, 300));
  }
  
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
  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeModal);

  const detailModal = document.getElementById('detail-modal');
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target.id === 'detail-modal') closeModal();
    });
  }
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
  if (!sel || !sel.options || !sel.options[0]) return;
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
    ...(item.activePart ? Object.values(item.activePart) : []),
    item.bushing, item.surgeArrester,
    item.dynamicResistance, item.fra, item.moisturePaper,
    ...(item.mainTankOil ? Object.values(item.mainTankOil) : []),
    item.passivator, item.furan, item.sludge,
    ...(item.oltcOil ? Object.values(item.oltcOil) : [])
  ];
  return checks.some(v => v === value);
}

function allParamsAcceptable(item) {
  const checks = [
    item.visualInspection,
    ...(item.activePart ? Object.values(item.activePart) : []),
    item.bushing, item.surgeArrester,
    item.dynamicResistance, item.fra, item.moisturePaper,
    ...(item.mainTankOil ? Object.values(item.mainTankOil) : []),
    item.passivator, item.furan, item.sludge,
    ...(item.oltcOil ? Object.values(item.oltcOil) : [])
  ];
  return checks.every(v => v === 'A' || v === 'N/A' || !v);
}

function applyFilters() {
  const elSite = document.getElementById('filter-site');
  const elService = document.getElementById('filter-service');
  const elStatus = document.getElementById('filter-health-status');
  const elParam = document.getElementById('filter-param');
  const elSearch = document.getElementById('search-box');

  const siteFilter = elSite ? elSite.value : 'all';
  const serviceFilter = elService ? elService.value : 'all';
  const statusFilter = elStatus ? elStatus.value : 'all';
  const paramFilter = elParam ? elParam.value : 'all';
  const searchQuery = elSearch ? elSearch.value.toLowerCase().trim() : '';
  
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
        if ((statusFilter === 'Monitoring' || statusFilter === 'Warning') && (hi < 51 || hi >= 80)) return false;
        if (statusFilter === 'Critical' && hi > 50) return false;
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
  const monitoring = filteredAssessment.filter(i => i.healthIndex >= 51 && i.healthIndex < 80).length;
  const critical = filteredAssessment.filter(i => i.healthIndex <= 50 && i.healthIndex > 0).length;
  const warning = monitoring;
  
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
  let counts = { healthy: 0, monitoring: 0, critical: 0, noData: 0 };
  filteredAssessment.forEach(item => {
    const hi = item.healthIndex;
    if (hi === null || hi === undefined || hi === 0) { counts.noData++; return; }
    if (hi >= 80) counts.healthy++;
    else if (hi >= 51) counts.monitoring++;
    else counts.critical++;
  });

  // Calculate Assessed and Non-Assessed stats
  const total = counts.healthy + counts.monitoring + counts.critical + counts.noData;
  const assessed = counts.healthy + counts.monitoring + counts.critical;
  const nonAssessed = counts.noData;
  const assessedPct = total > 0 ? ((assessed / total) * 100).toFixed(1) : '0.0';
  const nonAssessedPct = total > 0 ? ((nonAssessed / total) * 100).toFixed(1) : '0.0';

  const elAssessed = document.getElementById('stat-assessed-val');
  const elNonAssessed = document.getElementById('stat-non-assessed-val');
  if (elAssessed) elAssessed.textContent = `${assessed} (${assessedPct}%)`;
  if (elNonAssessed) elNonAssessed.textContent = `${nonAssessed} (${nonAssessedPct}%)`;
  
  const colors = getChartColors();
  const opts = {
    series: [counts.healthy, counts.monitoring, counts.critical, counts.noData],
    labels: ['Healthy (>= 80%)', 'Fair / Monitor (51-79%)', 'Critical (<= 50%)', 'No Assess (=0)'],
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
          
          const statusValues = ['Healthy', 'Monitoring', 'Critical', 'No Assess'];
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
    colors: ['#10b981', '#eab308', '#ef4444', '#6b7280'],
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
  } else if (hi >= 51) {
    displayStatus = 'Monitor';
    badgeClass = 'badge-monitoring';
    iconClass = 'fa-eye';
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
  if (hi >= 51) return 'hi-fair';
  return 'hi-critical';
}

function renderLastPM(lastPM) {
  if (!lastPM || lastPM === '-' || lastPM === 'None') return '-';
  const match = String(lastPM).match(/\b(20\d\d)\b/);
  if (match) {
    const year = parseInt(match[1], 10);
    const currentYear = new Date().getFullYear();
    const isOver3Years = (currentYear - year) > 3;
    if (isOver3Years) {
      return `<span class="param-indicator param-Q" style="width:auto; padding: 2px 8px; border-radius: 4px; display: inline-block; text-align: center;" title="Ratio test date is over 3 years old (${lastPM})">${lastPM}</span>`;
    }
  }
  return lastPM;
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
      <td>${renderLastPM(item.lastPM)}</td>
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
  if ((typeof assessmentData === 'undefined' || !assessmentData || !assessmentData.length) && typeof HEALTH_INDEX_DATA !== 'undefined') {
    assessmentData = HEALTH_INDEX_DATA;
  }

  let item = null;
  if (typeof assessmentData !== 'undefined' && assessmentData && assessmentData.length > 0) {
    if (typeof no === 'number') {
      item = assessmentData.find(i => i.no === no);
    }
    if (!item && no !== undefined && no !== null) {
      const target = String(no).trim();
      item = assessmentData.find(i => i.no === Number(target) || String(i.serial) === target || String(i.serial).includes(target) || target.includes(String(i.serial)));
    }
  }
  if (!item) return;
  
  const isDetailPage = window.isDetailStandalonePage || 
                       window.location.pathname.toLowerCase().includes('detail') || 
                       document.getElementById('detail-paper') !== null;

  if (!isDetailPage) {
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

  // Look up dynamic TRInfo record from TRinfo2.csv
  const trInfo = findLatestRecord(trInfoCsvData, item.serial) || item.trInfo;

  const setElTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  // 1. Transformer Information Table
  setElTxt('ex-info-name', (trInfo ? (trInfo.LOCAL_EQUIPMENT_CODE || trInfo.DEVICE_CODE) : null) || item.name || '-');
  setElTxt('ex-info-serial', item.serial || '-');
  setElTxt('ex-info-code', (trInfo ? trInfo.DEVICE_CODE : null) || item.name || '-');
  setElTxt('ex-info-manufacture', (trInfo ? (trInfo.MANUFACTURER_COMPANY || trInfo.BRAND) : null) || item.manufacture || 'DAIHEN');
  const fluidVal = trInfo ? (trInfo.TYPE_OF_INSULATION && isNaN(trInfo.TYPE_OF_INSULATION) ? trInfo.TYPE_OF_INSULATION : (trInfo.WINDING_INSULATION && isNaN(trInfo.WINDING_INSULATION) ? trInfo.WINDING_INSULATION : null)) || item.fluid || 'Mineral Oil' : item.fluid || 'Mineral Oil';
  setElTxt('ex-info-fluid', fluidVal);
  setElTxt('ex-info-site', (trInfo ? trInfo.SITE : null) || item.site || '-');
  
  const pVal = trInfo ? trInfo.POWER_RATING : item.ratedPower;
  let powerMvaStr = '-';
  if (pVal !== null && pVal !== undefined && pVal !== '') {
    const numP = Number(pVal);
    powerMvaStr = numP >= 1000 ? `${(numP / 1000).toLocaleString()} MVA` : `${numP} MVA`;
  }
  setElTxt('ex-info-power', powerMvaStr);
  
  const hvVal = trInfo ? trInfo.HV_RATED : item.hvRate;
  const lvVal = trInfo ? trInfo.LV_RATED : item.lvRate;
  setElTxt('ex-info-voltage', hvVal ? `${hvVal} / ${lvVal || ''} kV` : (item.ratedVoltage ? `${item.ratedVoltage} kV` : '-'));
  
  setElTxt('ex-info-service', item.serviceType || (trInfo ? trInfo.Service_Type : null) || '-');
  setElTxt('ex-info-year', serviceAgeYears !== '-' ? `${serviceAgeYears} Years` : '-');
  setElTxt('ex-info-vector', (trInfo ? trInfo.VECTOR_GROUP : null) || 'Dyn1');
  
  // Visual Inspection from VisualData.csv
  const visRec = findLatestRecord(visualCsvData, item.serial);
  const exVisualText = document.getElementById('ex-visual-text');
  if (exVisualText) {
    const visVal = visRec ? (visRec.Test_Result || visRec.Summary || visRec.Visual || item.visualInspection || 'A') : (item.visualInspection || 'A');
    let visLabel = 'Normal (A)';
    let visClass = 'ex-status-good';
    if (visVal === 'Q' || visVal === 'Questionable' || visVal === 'Monitor' || visVal === 'Fair') {
      visLabel = 'Questionable (Q)';
      visClass = 'ex-status-fair';
    } else if (visVal === 'U' || visVal === 'Unacceptable' || visVal === 'Critical' || visVal === 'Poor') {
      visLabel = 'Unacceptable (U)';
      visClass = 'ex-status-poor';
    }
    exVisualText.textContent = visLabel;
    exVisualText.className = `excel-visual-box ${visClass}`;
  }
  const exVisualLink = document.getElementById('ex-visual-link');
  if (exVisualLink) {
    exVisualLink.href = `visual_report.html?serial=${item.serial}`;
  }
  
  // Recommendation Dynamic Population from HealthIndexSum
  const recEl = document.getElementById('ex-recommendation-text');
  if (recEl) {
    const recText = (item.recommendation && item.recommendation.trim()) ? item.recommendation.trim() : 'No specific recommendation recorded.';

    const recCardParent = recEl.closest('.excel-card');
    const recCardHeader = recCardParent ? recCardParent.querySelector('.excel-card-header') : null;

    const isRoutine = /^routine/i.test(recText);
    if (!isRoutine) {
      if (recCardParent) {
        recCardParent.classList.add('rec-alert-yellow');
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
    } else {
      if (recCardParent) {
        recCardParent.classList.remove('rec-alert-yellow');
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

  // 2. Center Top: Speedometer Gauge + Remaining Life
  const hi = item.healthIndex;
  setElTxt('ex-est-life', item.estimatedLife || '-');
  setElTxt('ex-est-dp', item.estimatedDP || '0');

  const exEvalGaugeLink = document.getElementById('ex-eval-gauge-link');
  if (exEvalGaugeLink) {
    exEvalGaugeLink.href = `evaluation_report.html?serial=${encodeURIComponent(item.serial)}`;
  }

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

  // 3. Bushing Card (Dynamic from BushingPFData.csv)
  const exBushingLink = document.getElementById('ex-bushing-link');
  if (exBushingLink) {
    exBushingLink.href = `bushing_pf_report.html?serial=${item.serial}`;
  }
  const exOilLink = document.getElementById('ex-oil-link');
  if (exOilLink) {
    exOilLink.href = `oil_report.html?serial=${item.serial}`;
  }
  const bushBody = document.getElementById('ex-bushing-rows');
  const bushRec = findLatestRecord(bushingPfCsvData, item.serial) || item.bushRec;

  if (bushRec) {
    const parsePf = (val) => {
      const num = parseFloat(val);
      return (!isNaN(num) && num > 0) ? num : null;
    };
    const parseCap = (val) => {
      const num = parseFloat(val);
      return (!isNaN(num) && num > 0) ? num : null;
    };


    const h1_pf = parsePf(bushRec.bushing_h1_pf_20c || bushRec.bushing_h1_pf_tan);
    const h2_pf = parsePf(bushRec.bushing_h2_pf_20c || bushRec.bushing_h2_pf_tan);
    const h3_pf = parsePf(bushRec.bushing_h3_pf_20c || bushRec.bushing_h3_pf_tan);
    const l1_pf = parsePf(bushRec.xbushing_h1_pf_20c || bushRec.bushing_l1_pf_20c);
    const l2_pf = parsePf(bushRec.xbushing_h2_pf_20c || bushRec.bushing_l2_pf_20c);
    const l3_pf = parsePf(bushRec.xbushing_h3_pf_20c || bushRec.bushing_l3_pf_20c);

    const h1_c1 = parseCap(bushRec.bushing_h1_c1);
    const h2_c1 = parseCap(bushRec.bushing_h2_c1);
    const h3_c1 = parseCap(bushRec.bushing_h3_c1);
    const l1_c1 = parseCap(bushRec.xbushing_h1_c1 || bushRec.bushing_l1_cap);
    const l2_c1 = parseCap(bushRec.xbushing_h2_c1 || bushRec.bushing_l2_cap);
    const l3_c1 = parseCap(bushRec.xbushing_h3_c1 || bushRec.bushing_l3_cap);

    // Calculate %Error PF against nameplate
    const getPfDev = (measPf, phaseStr) => {
      if (measPf === null || isNaN(measPf)) return null;
      if (typeof bushingInfoCsvData !== 'undefined' && bushingInfoCsvData.length > 0) {
        const info = bushingInfoCsvData.find(i => {
          const s = (i.Parent_Serial_No || i.Serial_No || i['SN&Phase'] || '');
          const p = (i.Phase || '').toUpperCase();
          return (s === item.serial || s.startsWith(item.serial) || item.serial.startsWith(s)) && (p === phaseStr || p.includes(phaseStr));
        });
        if (info) {
          const npPf = parseFloat(info.Meas_PF_C1 || info.Corr_PF || 0);
          if (!isNaN(npPf) && npPf > 0) {
            return ((measPf - npPf) / npPf) * 100;
          }
        }
      }
      return null;
    };

    const h1_pf_dev = parseNum(bushRec.maxbh1_tand) ?? parseNum(bushRec.bushing_h0_cap) ?? parseNum(bushRec.xbushingl1_pf_error) ?? getPfDev(h1_pf, 'H1');
    const h2_pf_dev = parseNum(bushRec.maxbh2_tand) ?? parseNum(bushRec.bushing_h0_pf_20c) ?? parseNum(bushRec.xbushingl2_pf_error) ?? getPfDev(h2_pf, 'H2');
    const h3_pf_dev = parseNum(bushRec.maxbh3_tand) ?? parseNum(bushRec.bushing_l1_pf_tan) ?? parseNum(bushRec.xbushingl3_pf_error) ?? getPfDev(h3_pf, 'H3');
    const l1_pf_dev = parseNum(bushRec.xbushingl1_pf_error) ?? parseNum(bushRec.xbushing_h0_cap) ?? getPfDev(l1_pf, 'X1');
    const l2_pf_dev = parseNum(bushRec.xbushingl2_pf_error) ?? parseNum(bushRec.xbushing_h0_pf_20c) ?? getPfDev(l2_pf, 'X2');
    const l3_pf_dev = parseNum(bushRec.xbushingl3_pf_error) ?? parseNum(bushRec.xbushing_l1_pf_tan) ?? getPfDev(l3_pf, 'X3');

    const h1_cap_dev = parseNum(bushRec.maxbch1_change) ?? parseNum(bushRec.bushing_h0_ma) ?? parseNum(bushRec.xbushingl1_cap_error) ?? getCapDev(h1_c1, 'H1');
    const h2_cap_dev = parseNum(bushRec.maxbch2_change) ?? parseNum(bushRec.bushing_l1_cap) ?? parseNum(bushRec.xbushingl2_cap_error) ?? getCapDev(h2_c1, 'H2');
    const h3_cap_dev = parseNum(bushRec.maxbch3_change) ?? parseNum(bushRec.bushing_l1_pf_20c) ?? parseNum(bushRec.xbushingl3_cap_error) ?? getCapDev(h3_c1, 'H3');
    const l1_cap_dev = parseNum(bushRec.xbushingl1_cap_error) ?? parseNum(bushRec.xbushing_h0_ma) ?? getCapDev(l1_c1, 'X1');
    const l2_cap_dev = parseNum(bushRec.xbushingl2_cap_error) ?? parseNum(bushRec.xbushing_l1_cap) ?? getCapDev(l2_c1, 'X2');
    const l3_cap_dev = parseNum(bushRec.xbushingl3_cap_error) ?? parseNum(bushRec.xbushing_l1_pf_20c) ?? getCapDev(l3_c1, 'X3');

    // Helper to get Manufacturer for a phase
    const getMfgForPhase = (phaseStr) => {
      if (typeof bushingInfoCsvData !== 'undefined' && bushingInfoCsvData.length > 0) {
        const info = bushingInfoCsvData.find(i => {
          const s = (i.Parent_Serial_No || i.Serial_No || i['SN&Phase'] || '');
          const p = (i.Phase || '').toUpperCase();
          return (s === item.serial || s.startsWith(item.serial) || item.serial.startsWith(s)) && (p === phaseStr || p.includes(phaseStr));
        });
        return info ? (info.Manufacturer || '') : '';
      }
      return '';
    };

    const getPfDevCell = (pfDevVal, phaseStr) => {
      if (pfDevVal === null || isNaN(pfDevVal)) return `<td>-</td>`;
      const mfg = getMfgForPhase(phaseStr).toUpperCase();
      let statusCls = 'status-normal';

      if (pfDevVal < 0 && !mfg.includes('MGC')) {
        statusCls = 'status-normal';
      } else if (mfg.includes('ABB')) {
        statusCls = pfDevVal >= 75.0 ? 'status-critical' : (pfDevVal > 40.0 ? 'status-monitor' : 'status-normal');
      } else if (mfg.includes('PASSONI') || mfg.includes('VILLA')) {
        statusCls = pfDevVal >= 30.0 ? 'status-critical' : (pfDevVal > 0 ? 'status-monitor' : 'status-normal');
      } else if (mfg.includes('MGC')) {
        statusCls = pfDevVal > 3.0 ? 'status-critical' : (pfDevVal > 0.7 ? 'status-monitor' : 'status-normal');
      } else if (mfg.includes('TRENCH')) {
        statusCls = pfDevVal > 100.0 ? 'status-critical' : (pfDevVal > 0 ? 'status-monitor' : 'status-normal');
      } else {
        // IEEE C57.152
        statusCls = pfDevVal > 100.0 ? 'status-critical' : (pfDevVal > 50.0 ? 'status-monitor' : 'status-normal');
      }
      const sign = pfDevVal > 0 ? '+' : '';
      return `<td class="${statusCls}">${sign}${pfDevVal.toFixed(2)}%</td>`;
    };

    const getCapDevCell = (devVal, phaseStr) => {
      if (devVal === null || isNaN(devVal)) return `<td>-</td>`;
      const absDev = Math.abs(devVal);
      const mfg = getMfgForPhase(phaseStr).toUpperCase();
      let statusCls = 'status-normal';

      if (devVal < 0) {
        statusCls = 'status-normal';
      } else if (mfg.includes('ABB')) {
        statusCls = absDev > 5.0 ? 'status-critical' : (absDev > 3.0 ? 'status-monitor' : 'status-normal');
      } else if (mfg.includes('PASSONI') || mfg.includes('VILLA')) {
        statusCls = absDev > 3.0 ? 'status-critical' : (absDev > 1.0 ? 'status-monitor' : 'status-normal');
      } else if (mfg.includes('MGC')) {
        statusCls = absDev > 20.0 ? 'status-critical' : (absDev > 10.0 ? 'status-monitor' : 'status-normal');
      } else if (mfg.includes('TRENCH')) {
        statusCls = absDev > 110.0 ? 'status-critical' : 'status-normal';
      } else {
        // IEEE C57.152
        statusCls = absDev > 10.0 ? 'status-critical' : (absDev > 5.0 ? 'status-monitor' : 'status-normal');
      }

      const sign = devVal > 0 ? '+' : '';
      return `<td class="${statusCls}">${sign}${devVal.toFixed(2)}%</td>`;
    };

    const getRawPfCell = (pfVal) => {
      if (pfVal === null || isNaN(pfVal)) return `<td>-</td>`;
      const statusCls = pfVal > 1.0 ? 'status-critical' : (pfVal > 0.5 ? 'status-monitor' : 'status-normal');
      return `<td class="${statusCls}">${pfVal.toFixed(2)}%</td>`;
    };

    bushBody.innerHTML = `
      <tr>
        <td>%Error PF [C1]</td>
        <td>IEEE C57.152</td>
        ${getPfDevCell(h1_pf_dev, 'H1')}
        ${getPfDevCell(h2_pf_dev, 'H2')}
        ${getPfDevCell(h3_pf_dev, 'H3')}
        ${getPfDevCell(l1_pf_dev, 'X1')}
        ${getPfDevCell(l2_pf_dev, 'X2')}
        ${getPfDevCell(l3_pf_dev, 'X3')}
      </tr>
      <tr>
        <td>%Error Capacitance [C1]</td>
        <td>IEEE C57.152</td>
        ${getCapDevCell(h1_cap_dev, 'H1')}
        ${getCapDevCell(h2_cap_dev, 'H2')}
        ${getCapDevCell(h3_cap_dev, 'H3')}
        ${getCapDevCell(l1_cap_dev, 'X1')}
        ${getCapDevCell(l2_cap_dev, 'X2')}
        ${getCapDevCell(l3_cap_dev, 'X3')}
      </tr>
    `;
    const bDate = bushRec.date || bushRec.Date;
    document.getElementById('ex-update-bushing').textContent = `Updated tests: ${bDate ? formatDgaDate(bDate) : '-'}`;
  } else {
    bushBody.innerHTML = `
      <tr>
        <td>%Error PF [C1]</td>
        <td>IEEE C57.152</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>%Error Capacitance [C1]</td>
        <td>IEEE C57.152</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
    document.getElementById('ex-update-bushing').textContent = `Updated tests: -`;
  }

  // 4. Surge Arrester Card (Dynamic from SurgePFData.csv)
  const saBody = document.getElementById('ex-arrester-rows');
  const surgeRec = findLatestRecord(surgePfCsvData, item.serial);

  if (surgeRec) {
    const h1_ir = surgeRec.h1_mohm || surgeRec.h1_ir || '> 1000';
    const h2_ir = surgeRec.h2_mohm || surgeRec.h2_ir || '> 1000';
    const h3_ir = surgeRec.h3_mohm || surgeRec.h3_ir || '> 1000';
    const h1_2_ir = surgeRec.h1_mohm_2 || '> 1000';
    const h2_2_ir = surgeRec.h2_mohm_2 || '> 1000';
    const h3_2_ir = surgeRec.h3_mohm_2 || '> 1000';
    const l1_ir = surgeRec.xh1_mohm || surgeRec.l1_mohm || '-';
    const l2_ir = surgeRec.xh2_mohm || surgeRec.l2_mohm || '-';
    const l3_ir = surgeRec.xh3_mohm || surgeRec.l3_mohm || '-';

    const h1_curr = surgeRec.h1_current || '-';
    const h2_curr = surgeRec.h2_current || '-';
    const h3_curr = surgeRec.h3_current || '-';
    const h1_2_curr = surgeRec.h1_current_2 || '-';
    const h2_2_curr = surgeRec.h2_current_2 || '-';
    const h3_2_curr = surgeRec.h3_current_2 || '-';
    const l1_curr = surgeRec.xh1_current || surgeRec.l1_current || '-';
    const l2_curr = surgeRec.xh2_current || surgeRec.l2_current || '-';
    const l3_curr = surgeRec.xh3_current || surgeRec.l3_current || '-';

    const h1_watt = surgeRec.h1_watt_loss || '-';
    const h2_watt = surgeRec.h2_watt_loss || '-';
    const h3_watt = surgeRec.h3_watt_loss || '-';
    const h1_2_watt = surgeRec.h1_watt_loss_2 || '-';
    const h2_2_watt = surgeRec.h2_watt_loss_2 || '-';
    const h3_2_watt = surgeRec.h3_watt_loss_2 || '-';
    const l1_watt = surgeRec.xh1_watt_loss || surgeRec.l1_watt_loss || '-';
    const l2_watt = surgeRec.xh2_watt_loss || surgeRec.l2_watt_loss || '-';
    const l3_watt = surgeRec.xh3_watt_loss || surgeRec.l3_watt_loss || '-';

    saBody.innerHTML = `
      <tr>
        <td>Insulation Resistance (MΩ)</td>
        <td>EGAT</td>
        <td>${h1_ir}</td>
        <td>${h2_ir}</td>
        <td>${h3_ir}</td>
        <td>${h1_2_ir}</td>
        <td>${h2_2_ir}</td>
        <td>${h3_2_ir}</td>
        <td>${l1_ir}</td>
        <td>${l2_ir}</td>
        <td>${l3_ir}</td>
      </tr>
      <tr>
        <td>Current (mA)</td>
        <td>EGAT</td>
        <td>${h1_curr}</td>
        <td>${h2_curr}</td>
        <td>${h3_curr}</td>
        <td>${h1_2_curr}</td>
        <td>${h2_2_curr}</td>
        <td>${h3_2_curr}</td>
        <td>${l1_curr}</td>
        <td>${l2_curr}</td>
        <td>${l3_curr}</td>
      </tr>
      <tr>
        <td>Watt Loss (mW)</td>
        <td>EGAT</td>
        <td>${h1_watt}</td>
        <td>${h2_watt}</td>
        <td>${h3_watt}</td>
        <td>${h1_2_watt}</td>
        <td>${h2_2_watt}</td>
        <td>${h3_2_watt}</td>
        <td>${l1_watt}</td>
        <td>${l2_watt}</td>
        <td>${l3_watt}</td>
      </tr>
    `;
    const sDate = surgeRec.date || surgeRec.Date || item.dateToAssess;
    document.getElementById('ex-update-arrester').textContent = `Updated tests: ${formatDgaDate(sDate)}`;
  } else {
    const saVal = item.surgeArrester || 'N/A';
    const saClass = getStatusClass(saVal);
    saBody.innerHTML = `
      <tr>
        <td>Insulation Resistance (MΩ)</td>
        <td>EGAT</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '> 1000'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '> 1000'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '> 1000'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '> 1000'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '> 1000'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '> 1000'}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td>%Dev Current (mA)</td>
        <td>EGAT</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.12'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.15'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.11'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.10'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.13'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '0.09'}</td>
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
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '10'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '13'}</td>
        <td class="${saClass}">${saVal === 'N/A' ? '-' : '9'}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
    document.getElementById('ex-update-arrester').textContent = `Updated tests: ${item.dateToAssess}`;
  }

  // 5. Active Part Card (Dynamic from TestData CSVs)
  const ap = item.activePart || {};
  
  // Look up active part test records
  const irRec = findLatestRecord(irPiCsvData, item.serial);
  const wPfRec = findLatestRecord(windingPfCsvData, item.serial);
  const ratioRec = findLatestRecord(ratioCsvData, item.serial);
  const exRec = findLatestRecord(excitingCsvData, item.serial);
  const wRec = findLatestRecord(windingCsvData, item.serial);

  const basicBody = document.getElementById('ex-active-basic-rows');

  const piValNum = irRec ? parseFloat(irRec.H_PI || irRec.L_PI || 1.73) : (ap.insulationResistance === 'A' ? 1.73 : 1.15);
  const piValStr = isNaN(piValNum) ? '1.73' : piValNum.toFixed(2);
  const piDateStr = irRec ? (irRec.date || irRec.Date) : item.dateToAssess;
  const piDateDisp = formatDgaDate(piDateStr);

  const cgValStr = irRec ? (irRec.coregnd ? (parseFloat(irRec.coregnd) >= 100 ? `${irRec.coregnd} MΩ` : `${irRec.coregnd} MΩ (Low)`) : '> 1000 MΩ') : (ap.coreToGround === 'A' ? '> 1000 MΩ' : 'Low (< 100 MΩ)');

  const wPfValNum = wPfRec ? parseFloat(wPfRec.chl_ch_pf_20c || wPfRec.chl_ch_pf_1 || 0.35) : 0.35;
  const wPfValStr = isNaN(wPfValNum) ? '0.35%' : `${wPfValNum.toFixed(2)}%`;
  const wPfDateDisp = formatDgaDate(wPfRec ? (wPfRec.date || wPfRec.Date) : item.dateToAssess);

  const ratioValStr = ratioRec ? (ratioRec.H1_max_err ? `${parseFloat(ratioRec.H1_max_err).toFixed(2)}% Dev` : '< 0.5% Dev') : '< 0.5% Dev';
  const ratioDateDisp = formatDgaDate(ratioRec ? (ratioRec.date || ratioRec.Date) : item.dateToAssess);

  const exValStr = exRec ? (exRec.H1CENTER ? `${parseFloat(exRec.H1CENTER).toFixed(1)} mA (Normal)` : 'Normal Pattern') : 'Normal Pattern';
  const exDateDisp = formatDgaDate(exRec ? (exRec.DATE || exRec.date) : item.dateToAssess);

  const wValStr = wRec ? (wRec.H1RCENTER ? `${parseFloat(wRec.H1RCENTER).toFixed(2)} mΩ (< 2% Dev)` : '< 2% Dev') : '< 2% Dev';
  const wDateDisp = formatDgaDate(wRec ? (wRec.DATE || wRec.date) : item.dateToAssess);

  // Dynamic PI Date age calculation (3-year threshold)
  let isPiOverThreeYears = true;
  if (piDateStr) {
    const testDate = new Date(piDateStr);
    if (!isNaN(testDate.getTime())) {
      const today = new Date();
      const diffDays = Math.abs(today - testDate) / (1000 * 60 * 60 * 24);
      isPiOverThreeYears = diffDays > (3 * 365);
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
      <td><span style="${piDateStyle}">${piDateDisp}</span></td>
      <td>IEEE C57.152: PI > 1.25</td>
      <td class="${getStatusClass(piValNum > 1.25 ? 'A' : 'Q')}" colspan="3">${piValStr} (${piValNum > 1.25 ? 'Good' : 'Alert'})</td>
    </tr>
    <tr>
      <td>
        Core to Ground
        <a href="pi_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PI Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
          <i class="fa-solid fa-file-invoice"></i>
        </a>
      </td>
      <td><span style="${piDateStyle}">${piDateDisp}</span></td>
      <td>IEEE C57.152: > 100 MΩ</td>
      <td class="ex-status-good" colspan="3">${cgValStr}</td>
    </tr>
    <tr>
      <td>
        Insulation Power Factor
        <a href="pf_report.html?serial=${item.serial}" target="_blank" class="btn-report-link" title="Open PF Report" style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px; display: inline-flex; align-items: center;">
          <i class="fa-solid fa-file-invoice"></i>
        </a>
      </td>
      <td><span style="${piDateStyle}">${wPfDateDisp}</span></td>
      <td>IEEE C57.152: %PF <= 1.0%</td>
      <td class="${getStatusClass(wPfValNum <= 1.0 ? 'A' : 'Q')}" colspan="3">${wPfValStr} (${wPfValNum <= 1.0 ? 'Good' : 'Warning'})</td>
    </tr>
    <tr>
      <td>Transformer Turn Ratio</td>
      <td><span style="${piDateStyle}">${ratioDateDisp}</span></td>
      <td>IEEE C57.152: <= 0.5% Dev</td>
      <td class="ex-status-good" colspan="3">${ratioValStr}</td>
    </tr>
    <tr>
      <td>Exciting Current</td>
      <td><span style="${piDateStyle}">${exDateDisp}</span></td>
      <td>EGAT Vectors</td>
      <td class="ex-status-good" colspan="3">${exValStr}</td>
    </tr>
    <tr>
      <td>Winding Resistance</td>
      <td><span style="${piDateStyle}">${wDateDisp}</span></td>
      <td>IEEE C57.152: <= 5% Dev</td>
      <td class="ex-status-good" colspan="3">${wValStr}</td>
    </tr>
  `;

  // Special Tests
  const fraRec = findLatestRecord(fraCsvData, item.serial);
  const dfrRec = findLatestRecord(dfrCsvData, item.serial);
  const thermoRec = findLatestRecord(thermoScanCsvData, item.serial);

  const specialBody = document.getElementById('ex-active-special-rows');

  const fraVal = fraRec ? (fraRec.Summary || fraRec['Trace 1'] || 'Normal [Pattern]') : (item.fra === 'A' ? 'Normal [Pattern]' : 'Deformed');
  const fraDate = formatDgaDate(fraRec ? (fraRec['Test Date'] || fraRec.date) : item.dateToAssess);

  const dfrVal = dfrRec ? (dfrRec['PercentMoisture (CHL)'] ? `${dfrRec['PercentMoisture (CHL)']}% [Normal]` : '0.8% [Normal]') : (item.moisturePaper === 'A' ? '0.8% [Normal]' : 'High (Warning)');
  const dfrDate = formatDgaDate(dfrRec ? (dfrRec['Test Date'] || dfrRec.date) : item.dateToAssess);

  const thermoVal = thermoRec ? (thermoRec.Summary || thermoRec['HV Terminator'] || 'Normal') : 'Normal';
  const thermoDate = formatDgaDate(thermoRec ? (thermoRec['Test Date'] || thermoRec.date) : item.dateToAssess);

  specialBody.innerHTML = `
    <tr>
      <td>Frequency Response Analysis (FRA)</td>
      <td><span style="${piDateStyle}">${fraDate}</span></td>
      <td>IEEE C57.149</td>
      <td class="ex-status-good">${fraVal}</td>
    </tr>
    <tr>
      <td>Moisture in Paper [FDS]</td>
      <td><span style="${piDateStyle}">${dfrDate}</span></td>
      <td>IEEE C57.161</td>
      <td class="ex-status-good">${dfrVal}</td>
    </tr>
    <tr>
      <td>Thermography Scan</td>
      <td><span style="${piDateStyle}">${thermoDate}</span></td>
      <td>NETA Recommend</td>
      <td class="ex-status-good">${thermoVal}</td>
    </tr>
  `;
  document.getElementById('ex-update-active').textContent = `Updated tests: ${item.dateToAssess}`;

  // 6. Main Tank DGA
  const mt = item.mainTankOil || {};
  const dgaVal = mt.dga || 'N/A';

  const dgaLink = document.getElementById('ex-dga-link');
  if (dgaLink) {
    dgaLink.href = `dga_report.html?serial=${item.serial}`;
  }

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
    const formattedDate = formatDgaDate(dgaDateStr);
    let isOverOneYear = true;
    if (dgaDateStr) {
      const testDate = new Date(dgaDateStr);
      if (!isNaN(testDate.getTime())) {
        const today = new Date();
        const diffDays = Math.abs(today - testDate) / (1000 * 60 * 60 * 24);
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

    const o2Val = parseFloat(latestDGA.O2 || 0);
    const n2Val = parseFloat(latestDGA.N2 || 0);
    const o2n2Ratio = n2Val > 0 ? (o2Val / n2Val) : 0.25;
    const isLowRatio = o2n2Ratio <= 0.2;

    let ageCat = 'Unknown';
    if (serviceAgeYears !== '-' && !isNaN(parseInt(serviceAgeYears, 10))) {
      const age = parseInt(serviceAgeYears, 10);
      if (age >= 1) {
        if (age <= 9) ageCat = '1-9';
        else if (age <= 30) ageCat = '10-30';
        else ageCat = '>30';
      }
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

    const catKey = isLowRatio ? 'low' : 'high';
    const limits = T1_NORMS[catKey][ageCat];

    colorGasCell('ex-dga-h2', latestDGA.H2, limits.H2);
    colorGasCell('ex-dga-ch4', latestDGA.CH4, limits.CH4);
    colorGasCell('ex-dga-c2h6', latestDGA.C2H6, limits.C2H6);
    colorGasCell('ex-dga-c2h4', latestDGA.C2H4, limits.C2H4);
    colorGasCell('ex-dga-c2h2', latestDGA.C2H2, limits.C2H2);
    colorGasCell('ex-dga-co', latestDGA.CO, limits.CO);
    colorGasCell('ex-dga-co2', latestDGA.CO2, limits.CO2);
    colorGasCell('ex-dga-tdcg', latestDGA.TDCG, 720);

    // Check if Status 1 (only check H2, CH4, C2H6, C2H4, C2H2 for Duval applicability)
    const isStatus1 = (() => {
      const gasesKeys = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2'];
      for (let key of gasesKeys) {
        const num = parseFloat(latestDGA[key] || 0);
        if (num > limits[key]) {
          return false;
        }
      }
      return true;
    })();

    const ch4Val = parseFloat(latestDGA.CH4 || 0);
    const c2h4Val = parseFloat(latestDGA.C2H4 || 0);
    const c2h2Val = parseFloat(latestDGA.C2H2 || 0);
    const duvalRes = evaluateDuval1(ch4Val, c2h4Val, c2h2Val);

    let duvalText = duvalRes.name;
    let duvalColor = '#eab308';
    let faultText = 'Warning / Monitor';
    let faultColor = '#eab308';

    if (dgaVal === 'A' || isStatus1) {
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

    const h2Val = parseFloat(latestDGA.H2 || 0);
    const c2h6Val = parseFloat(latestDGA.C2H6 || 0);

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
  const mtOilRec = findLatestRecord(mtOilCsvData, item.serial) || item.mtOilRec;
  const physicalBody = document.getElementById('ex-oil-physical-rows');
  const agingBody = document.getElementById('ex-oil-aging-rows');
  const sulfurBody = document.getElementById('ex-oil-sulfur-rows');

  // Helper check functions
  const getBDClass = (n) => n >= 50 ? 'ex-status-good' : (n >= 40 ? 'ex-status-fair' : 'ex-status-poor');
  const getPF25Class = (n) => n <= 0.5 ? 'ex-status-good' : (n <= 1.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getPF100Class = (n) => n <= 0.5 ? 'ex-status-good' : (n <= 2.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getCondClass = (n) => n <= 0.1 ? 'ex-status-good' : (n <= 1.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getWCClass = (n) => n <= 20 ? 'ex-status-good' : (n <= 30 ? 'ex-status-fair' : 'ex-status-poor');
  const getIFTClass = (n) => n >= 25 ? 'ex-status-good' : (n >= 20 ? 'ex-status-fair' : 'ex-status-poor');
  const getAcidityClass = (n) => n <= 0.1 ? 'ex-status-good' : (n <= 0.2 ? 'ex-status-fair' : 'ex-status-poor');
  const getMoistCalClass = (n) => n <= 2.0 ? 'ex-status-good' : (n <= 4.0 ? 'ex-status-fair' : 'ex-status-poor');

  const getCell = (val, checkFn) => {
    const parsed = parseNum(val);
    if (parsed === null || parsed === undefined) return `<td>-</td>`;
    const statusCls = checkFn ? checkFn(parsed) : '';
    return `<td class="${statusCls}">${val}</td>`;
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
      <tr><td>Water Content</td><td>ASTM D1533</td>${getCell(wcVal, getWCClass)}<td>ppm</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td>${getCell(pf25Val, getPF25Class)}<td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td>${getCell(pf100Val, getPF100Class)}<td>%</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td>${getCell(iftVal, getIFTClass)}<td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td>${getCell(acVal, getAcidityClass)}<td>mgKOH/g</td></tr>
      <tr><td>Oil Conductivity</td><td>IEC 61620</td>${getCell(condVal, getCondClass)}<td>pS/m</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td>${getCellString(colorVal)}<td>-</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td>${getCellString(inhibitorVal)}<td>%</td></tr>
    `;

    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td>${getCellString(furanVal)}<td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td>${getCellString(dpVal)}<td>-</td></tr>
      <tr><td>Sludge condition</td><td>Visual</td><td class="${sludgeVal.toLowerCase().includes('non') ? 'ex-status-good' : 'ex-status-fair'}">${sludgeVal}</td><td>-</td></tr>
    `;

    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td><td class="${sulfurVal.toLowerCase().includes('non') ? 'ex-status-good' : 'ex-status-poor'}">${sulfurVal}</td><td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td>${getCellString(passivatorVal)}<td>ppm</td></tr>
    `;
    const mtDate = mtOilRec.Date || mtOilRec.date || item.dateToAssess;
    document.getElementById('ex-update-oil').textContent = `Updated tests: ${formatDgaDate(mtDate)}`;
  } else {
    // Fallback to defaults matching the photo layout
    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td><td class="ex-status-good">72.7</td><td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td><td class="ex-status-good">6.7</td><td>ppm</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td><td class="ex-status-good">0.001</td><td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td><td class="ex-status-good">0.017</td><td>%</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td><td class="ex-status-good">38</td><td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td><td class="ex-status-good">0.01</td><td>mgKOH/g</td></tr>
      <tr><td>Oil Conductivity</td><td>IEC 61620</td><td class="ex-status-good">0.1</td><td>pS/m</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td><td>0.5</td><td>-</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td><td>-</td><td>%</td></tr>
    `;

    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td><td>4</td><td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td><td>1117</td><td>-</td></tr>
      <tr><td>Sludge condition</td><td>Visual</td><td>-</td><td>-</td></tr>
    `;

    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td><td>Non-Corrosive</td><td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td><td>-</td><td>ppm</td></tr>
    `;
    document.getElementById('ex-update-oil').textContent = `Updated tests: ${item.dateToAssess}`;
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
    const oDate = oltcRec.Date || oltcRec.date || item.dateToAssess;
    document.getElementById('ex-update-oltc').textContent = `Updated tests: ${formatDgaDate(oDate)}`;
  } else {
    const oo = item.oltcOil || {};
    const odbVal = oo.dielectricBreakdown || 'N/A';
    const owcVal = oo.waterContent || 'N/A';
    
    oltcBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>IEC 60156</td><td class="${getStatusClass(odbVal)}">${odbVal === 'N/A' ? '-' : (odbVal === 'A' ? '85.2' : '45.0')}</td><td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td><td class="${getStatusClass(owcVal)}">${owcVal === 'N/A' ? '-' : (owcVal === 'A' ? '12.5' : '35.0')}</td><td>ppm</td></tr>
    `;
    document.getElementById('ex-update-oltc').textContent = `Updated tests: ${item.dateToAssess}`;
  }

  const modalEl = document.getElementById('detail-modal');
  if (modalEl) modalEl.classList.add('active');
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
  
  if (darkIcon && lightIcon) {
    if (theme === 'dark') {
      darkIcon.style.display = 'inline-block';
      lightIcon.style.display = 'none';
    } else {
      darkIcon.style.display = 'none';
      lightIcon.style.display = 'inline-block';
    }
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

// Robust CSV Parser supporting multiline quotes
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

  const headers = rows[0].map(h => h.replace(/^\ufeff/, '').trim());
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

