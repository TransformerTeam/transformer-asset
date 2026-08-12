/**
 * SCADA Single Line Diagram Dashboard - Core Logic
 * Loads and parses HealthIndexSum.csv dynamically in the browser
 */

// Global State
let rawTransformers = [];
let filteredTransformers = [];
let currentSite = 'CUP-1';
let currentSearch = '';
let scadaZoom = 1.0;

// DOM Elements
const siteTabsContainer = document.getElementById('site-tabs');
const searchInput = document.getElementById('scada-search');
const trRow230 = document.getElementById('row-230kv');
const trRow115 = document.getElementById('row-115kv');
const trRow22 = document.getElementById('row-22kv');
const trRow11 = document.getElementById('row-11kv');
const trRow69 = document.getElementById('row-69kv');
const detailModal = document.getElementById('detail-modal');

// Bottom Stats Elements
const statTotalUnits = document.getElementById('stat-total-units');
const statAvgHealth = document.getElementById('stat-avg-health');
const statHealthy = document.getElementById('stat-healthy');
const statMonitoring = document.getElementById('stat-monitoring');
const statWarning = document.getElementById('stat-warning');
const statCritical = document.getElementById('stat-critical');
const statNoAssess = document.getElementById('stat-noassess');

// Load Dashboard on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadCSVData();
  setupEventListeners();
  
  // Apply saved theme
  const savedTheme = localStorage.getItem('tr-dashboard-theme') || 'dark';
  setTheme(savedTheme);
  
  // Apply saved sidebar state
  const savedSidebar = localStorage.getItem('tr-sidebar-collapsed') === 'true';
  if (savedSidebar) {
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('sidebar-toggle-icon');
    if (sidebar && icon) {
      sidebar.classList.add('collapsed');
      icon.className = 'fa-solid fa-chevron-right';
    }
  }
});

// Setup Main Event Listeners
function setupEventListeners() {
  // Theme Toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Sidebar Collapse Toggle
  const sidebarToggle = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const icon = document.getElementById('sidebar-toggle-icon');
      if (sidebar && icon) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        icon.className = isCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
        localStorage.setItem('tr-sidebar-collapsed', isCollapsed);
      }
    });
  }
  
  // Search Input
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    applySearchFilter();
  });
  
  // Zoom Controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  
  if (btnZoomIn && btnZoomOut && btnZoomReset) {
    btnZoomIn.addEventListener('click', () => {
      if (scadaZoom < 2.0) {
        scadaZoom += 0.1;
        updateZoom();
      }
    });
    btnZoomOut.addEventListener('click', () => {
      if (scadaZoom > 0.5) {
        scadaZoom -= 0.1;
        updateZoom();
      }
    });
    btnZoomReset.addEventListener('click', () => {
      scadaZoom = 1.0;
      updateZoom();
    });
  }
  
  // SCADA Capture to PNG
  const btnCapture = document.getElementById('btn-capture-scada');
  if (btnCapture) {
    btnCapture.addEventListener('click', () => {
      const container = document.getElementById('scada-zoom-container');
      if (!container) return;
      
      // Save current zoom and padding
      const originalZoom = scadaZoom;
      const originalPadding = container.style.padding;
      
      // Reset zoom to 1.0 and add padding for a beautiful framed border
      scadaZoom = 1.0;
      updateZoom();
      container.style.padding = '24px';
      
      // Add a slight delay to allow the CSS zoom transition to finish
      setTimeout(() => {
        html2canvas(container, {
          backgroundColor: null, // Transparent background (keeps glassmorphism cards transparent)
          scale: 2, // 2x high resolution
          logging: false,
          useCORS: true
        }).then(canvas => {
          // Restore original zoom and padding
          scadaZoom = originalZoom;
          updateZoom();
          container.style.padding = originalPadding;
          
          // Download as PNG
          const link = document.createElement('a');
          const siteName = Array.isArray(currentSite) ? 'ALL' : currentSite;
          link.download = `SCADA_Diagram_${siteName}_${new Date().toISOString().slice(0, 10)}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }).catch(err => {
          console.error("Capture failed:", err);
          // Make sure to restore even on error
          scadaZoom = originalZoom;
          updateZoom();
          container.style.padding = originalPadding;
        });
      }, 250);
    });
  }
  
  // Modal Close
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  
  // CSV Import File Input
  document.getElementById('csv-file-input').addEventListener('change', handleCSVImport);
}

// Convert HEALTH_INDEX_DATA / TR_DATA array to SCADA record objects
function convertHealthIndexDataToRecords(dataArray) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
  
  return dataArray.map((item, idx) => {
    const trInfo = item.trInfo || {};
    const name = item.name || item.EQUIPMENT_NAME || item['Equipment Name'] || trInfo.LOCAL_EQUIPMENT_CODE || trInfo.DEVICE_CODE || `TR-${idx + 1}`;
    const serial = item.serial || item.SERIAL_NUMBER || item['Serial No'] || trInfo.SERIAL_NUMBER || '-';
    const site = item.site || item.SITE || item.LOCATION || trInfo.SITE || 'CUP-1';
    const hi = item.healthIndex || item.healthIndexVal || item['Condition Health Index'] || trInfo.HI || 0;
    const dp = item.estimatedDP || item['Estimated DP (From Furan)'] || '-';
    const power = item.ratedPower || item.POWER_RATING_DETAIL || trInfo.POWER_RATING_DETAIL || (trInfo.POWER_RATING ? `${trInfo.POWER_RATING} MVA` : '-');
    
    let hv = parseFloat(item.hvRate || item.hvVoltage || item.HV_RATED || trInfo.HV_RATED || item['HV Rate (kV)']) || 0;
    if (hv === 0 && (item.ratedVoltage || trInfo.HV_RATED)) {
      hv = parseFloat(String(item.ratedVoltage || trInfo.HV_RATED).split('/')[0]) || 0;
    }

    const voltage = item.ratedVoltage || ((item.HV_RATED && item.LV_RATED) ? `${item.HV_RATED}/${item.LV_RATED} kV` : (trInfo.HV_RATED ? `${trInfo.HV_RATED}/${trInfo.LV_RATED || ''} kV` : `${hv} kV`));

    return {
      "No.": String(idx + 1),
      "Equipment Name": name,
      "Serial No": serial,
      "SITE": site,
      "HV Rate (kV)": String(hv),
      "Condition Health Index": String(Math.round(parseFloat(hi) || 0)),
      "Estimated DP (From Furan)": typeof dp === 'number' ? String(Math.round(dp)) : (parseFloat(dp) ? String(Math.round(parseFloat(dp))) : String(dp)),
      "Rated Power (MVA)": power,
      "Rated Voltage (kV)": voltage,
      "Service_Type": item.serviceType || trInfo.Service_Type || '',
      "_rawItem": item
    };
  });
}

function tryFallbackData() {
  let dataArray = null;
  if (typeof window !== 'undefined' && window.HEALTH_INDEX_DATA && Array.isArray(window.HEALTH_INDEX_DATA) && window.HEALTH_INDEX_DATA.length > 0) {
    dataArray = window.HEALTH_INDEX_DATA;
  } else if (typeof HEALTH_INDEX_DATA !== 'undefined' && Array.isArray(HEALTH_INDEX_DATA) && HEALTH_INDEX_DATA.length > 0) {
    dataArray = HEALTH_INDEX_DATA;
  } else if (typeof window !== 'undefined' && window.TR_DATA && Array.isArray(window.TR_DATA) && window.TR_DATA.length > 0) {
    dataArray = window.TR_DATA;
  } else if (typeof TR_DATA !== 'undefined' && Array.isArray(TR_DATA) && TR_DATA.length > 0) {
    dataArray = TR_DATA;
  }

  if (dataArray && dataArray.length > 0) {
    const records = convertHealthIndexDataToRecords(dataArray);
    if (records && records.length > 0) {
      rawTransformers = records;
      initializeDashboard();
      return true;
    }
  }
  return false;
}

// Fetch and Parse CSV File with robust fallback to preloaded HEALTH_INDEX_DATA / TR_DATA
function loadCSVData() {
  if (typeof healthDataCsv !== 'undefined' && healthDataCsv) {
    const records = parseHealthIndexSumCSV(healthDataCsv);
    if (records && records.length > 0) {
      rawTransformers = records;
      initializeDashboard();
      return;
    }
  }

  // Try fallback pre-compiled data first
  if (tryFallbackData()) {
    return;
  }

  // Otherwise fetch HealthIndexSum.csv
  fetch('HealthIndexSum.csv')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load HealthIndexSum.csv');
      }
      return response.text();
    })
    .then(csvText => {
      const records = parseHealthIndexSumCSV(csvText);
      if (records && records.length > 0) {
        rawTransformers = records;
        initializeDashboard();
      } else {
        if (!tryFallbackData()) {
          showEmptyState("Could not parse HealthIndexSum.csv data.");
        }
      }
    })
    .catch(error => {
      console.warn("CSV fetch notice, using preloaded data:", error);
      if (!tryFallbackData()) {
        showEmptyState("HealthIndexSum.csv not found. Please import it manually.");
      }
    });
}

// Simple robust CSV parser that skips category header row
function parseHealthIndexSumCSV(csvText) {
  const headerMarker = "No.,Equipment Name";
  const markerIndex = csvText.indexOf(headerMarker);
  if (markerIndex === -1) {
    console.error("Header marker not found in CSV");
    return [];
  }
  
  const cleanCsv = csvText.substring(markerIndex);
  const rows = [];
  let row = [""];
  let inQuotes = false;
  
  for (let i = 0; i < cleanCsv.length; i++) {
    const c = cleanCsv[i];
    const next = cleanCsv[i+1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push("");
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      rows.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }
  
  if (rows.length < 2) return [];
  
  const rawHeaders = rows[0];
  const headers = rawHeaders.map(h => h.replace(/\r?\n/g, ' ').trim());
  
  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const lineValues = rows[i];
    if (lineValues.length === 1 && lineValues[0] === "") continue;
    
    const record = {};
    headers.forEach((header, idx) => {
      let val = lineValues[idx] !== undefined ? lineValues[idx].trim() : '';
      // Clean quotes if they wrap values
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).trim();
      }
      record[header] = val;
    });
    records.push(record);
  }
  
  return records;
}

// Initialize Dashboard components
function initializeDashboard() {
  // Extract all sites
  const sites = new Set();
  rawTransformers.forEach(tr => {
    if (tr.SITE) sites.add(tr.SITE.trim());
  });
  
  // Build Site Tabs dynamically
  buildSiteTabs(Array.from(sites));
  
  // Render active site
  renderActiveSite();
}

// Build Site tab buttons
function buildSiteTabs(sitesList) {
  // Define custom ordering / displays for the standard buttons
  const siteButtonsDef = [
    { id: 'CUP1', name: 'CUP1', match: 'CUP-1' },
    { id: 'CUP2', name: 'CUP2', match: 'CUP-2' },
    { id: 'CUP3', name: 'CUP3', match: 'CUP-3' },
    { id: 'CUP4', name: 'CUP4', match: 'CUP-4' },
    { id: 'GEN', name: 'GEN', match: 'GEN' },
    { id: 'GIPP', name: 'GIPP', match: 'GIPP' },
    { id: 'GSPP11', name: 'GSPP11', match: ['GSPP11 PLT1', 'GSPP11 PLT2'] },
    { id: 'GSPP2&3', name: 'GSPP2&3', match: ['GSPP2&3', 'SPARE GSPP2&3'] },
    { id: 'MTP1', name: 'MTP1', match: 'MTP-1' },
    { id: 'MTP3', name: 'MTP3', match: 'MTP-3' },
    { id: 'RDF', name: 'RDF', match: 'RDF' },
    { id: 'SRC', name: 'SRC', match: 'SRC' }
  ];

  siteTabsContainer.innerHTML = '';
  
  siteButtonsDef.forEach(btnDef => {
    const button = document.createElement('button');
    button.className = 'site-tab-btn';
    button.textContent = btnDef.name;
    
    // Check if this button is active
    if (btnDef.id === 'CUP1') {
      button.classList.add('active');
      currentSite = btnDef.match;
    }
    
    button.addEventListener('click', () => {
      document.querySelectorAll('.site-tab-btn').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      currentSite = btnDef.match;
      renderActiveSite();
    });
    
    siteTabsContainer.appendChild(button);
  });
}

// Render SCADA layout for active site
function renderActiveSite() {
  // Clear previous cards
  if (trRow230) trRow230.innerHTML = '';
  if (trRow115) trRow115.innerHTML = '';
  if (trRow22) trRow22.innerHTML = '';
  if (trRow11) trRow11.innerHTML = '';
  if (trRow69) trRow69.innerHTML = '';
  
  // Filter transformers for active site
  let siteTRs = [];
  if (Array.isArray(currentSite)) {
    siteTRs = rawTransformers.filter(tr => currentSite.includes(tr.SITE));
  } else {
    siteTRs = rawTransformers.filter(tr => tr.SITE === currentSite);
  }
  
  filteredTransformers = siteTRs;
  
  // Calculate stats for bottom bar
  calculateStats(siteTRs);
  
  // Distribute into 5 rows based on Rated Voltage or name-based mapping
  const row230 = [];
  const row115 = [];
  const row22 = [];
  const row11 = [];
  const row69 = [];
  
  siteTRs.forEach(tr => {
    const hv = parseFloat(tr["HV Rate (kV)"]) || 0;
    const name = tr["Equipment Name"] || "";
    
    if (hv >= 200) {
      row230.push(tr);
    } else if (hv >= 110 && hv < 200) {
      row115.push(tr);
    } else if (hv === 22 || hv === 24 || hv === 21) {
      row22.push(tr);
    } else if (hv === 11 || hv === 11.5 || name.startsWith('16120-TR-001') || name.startsWith('16120-TR-003') || name.startsWith('16120-TR-004') || name.startsWith('16120-TR-006') || name.startsWith('10060-TR-1')) {
      row11.push(tr);
    } else {
      row69.push(tr);
    }
  });

  // Dynamic renaming of 22 kV tag to 21 kV for GIPP
  const tag22 = document.getElementById('tag-22kv');
  if (tag22) {
    const isActiveGIPP = Array.isArray(currentSite) ? currentSite.includes('GIPP') : currentSite === 'GIPP';
    tag22.textContent = isActiveGIPP ? '21 kV' : '22 kV';
  }

  // Helper function to render a row and show/hide its container
  function renderRow(rowContainer, rowData, rowNum) {
    if (!rowContainer) return;
    const parentContainer = rowContainer.closest('.busbar-container');
    if (rowData.length > 0) {
      if (parentContainer) parentContainer.style.display = 'block';
      rowData.forEach(tr => {
        rowContainer.appendChild(createTransformerCard(tr, rowNum));
      });
    } else {
      if (parentContainer) parentContainer.style.display = 'none';
    }
  }

  // Render all 5 rows
  renderRow(trRow230, row230, 1);
  renderRow(trRow115, row115, 2);
  renderRow(trRow22, row22, 3);
  renderRow(trRow11, row11, 4);
  renderRow(trRow69, row69, 5);
  
  // Apply search filter if one is active
  if (currentSearch) {
    applySearchFilter();
  }
}

// Create Transformer HTML Card
function createTransformerCard(tr, rowNum) {
  const name = tr["Equipment Name"] || '-';
  const serial = tr["Serial No"] || '-';
  const hiVal = Math.round(parseFloat(tr["Condition Health Index"])) || 0;
  const rawDp = tr["Estimated DP (From Furan)"];
  const dpVal = rawDp && !isNaN(parseFloat(rawDp)) ? Math.round(parseFloat(rawDp)) : (rawDp || '-');
  const ratedPower = tr["Rated Power (MVA)"] || tr["Rated Power\n(MVA)"] || '-';
  const ratedVolts = tr["Rated Voltage (kV)"] || tr["Rated Voltage\n(kV)"] || '-';
  
  // Determine Status Class
  let statusClass = 'no-assess';
  if (hiVal === 0) statusClass = 'no-assess';
  else if (hiVal >= 80) statusClass = 'healthy';
  else if (hiVal >= 70) statusClass = 'monitoring';
  else if (hiVal >= 50) statusClass = 'warning';
  else statusClass = 'critical';
  
  // Calculate needle rotation angle (0% -> 0deg, 100% -> 180deg)
  const rotationAngle = (hiVal / 100) * 180;
  
  // Determine Gauge Arc Paths based on HI value (0% is gray)
  let gaugeArcHtml = '';
  if (hiVal === 0) {
    gaugeArcHtml = `<path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#64748b" stroke-width="8" stroke-linecap="round" style="opacity: 0.8;" />`;
  } else {
    gaugeArcHtml = `
      <path d="M 15 50 A 35 35 0 0 1 50 15" fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round" />
      <path d="M 50 15 A 35 35 0 0 1 70.57 21.68" fill="none" stroke="#f97316" stroke-width="8" stroke-linecap="round" />
      <path d="M 70.57 21.68 A 35 35 0 0 1 78.32 29.43" fill="none" stroke="#eab308" stroke-width="8" stroke-linecap="round" />
      <path d="M 78.32 29.43 A 35 35 0 0 1 85 50" fill="none" stroke="#10b981" stroke-width="8" stroke-linecap="round" />
    `;
  }
  
  // Classify DP Status Class
  const dpInt = parseInt(dpVal);
  let dpStatusClass = 'dp-unknown';
  if (isNaN(dpInt) || dpInt === 0 || dpVal === '-') {
    dpStatusClass = 'dp-unknown';
  } else if (dpInt >= 700) {
    dpStatusClass = 'dp-good';
  } else if (dpInt >= 450) {
    dpStatusClass = 'dp-fair';
  } else if (dpInt >= 250) {
    dpStatusClass = 'dp-poor';
  } else {
    dpStatusClass = 'dp-critical';
  }
  
  const cardElement = document.createElement('div');
  cardElement.className = `tr-scada-card ${statusClass} row-${rowNum}`;
  cardElement.setAttribute('data-serial', serial);
  cardElement.setAttribute('data-name', name.toLowerCase());
  cardElement.setAttribute('data-serial-low', serial.toLowerCase());
  
  // Build Card HTML
  let html = `
    <!-- Top connector line -->
    <div class="connector-line-top">
      <div class="breaker"></div>
    </div>
    
    <!-- Main Card Body -->
    <div class="tr-card-body">
      <!-- Semicircular Gauge SVG -->
      <svg viewBox="0 0 100 55" class="scada-gauge">
        <!-- Background track -->
        <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="#1e293b" stroke-width="8" stroke-linecap="round" style="opacity: 0.3;" />
        <!-- Segmented Colored Arc (follows the angle of the gauge) -->
        ${gaugeArcHtml}
        <!-- Needle -->
        <line x1="50" y1="50" x2="18" y2="50" stroke="var(--scada-text-primary)" stroke-width="2.5" stroke-linecap="round" class="scada-needle" style="transform-origin: 50px 50px; transform: rotate(${rotationAngle}deg);" />
        <circle cx="50" cy="50" r="3.5" fill="var(--scada-text-primary)" />
      </svg>
      
      <!-- Status Badges -->
      <div class="tr-status-container">
        <div class="status-badge ${statusClass}">HI:${hiVal}%</div>
        <div class="status-badge ${dpStatusClass}">DP:${dpVal}</div>
      </div>
      
      <!-- Overlapping circles SVG -->
      <svg viewBox="0 0 48 48" class="tr-circles-svg">
        <circle cx="24" cy="18" r="12" class="tr-circle-path" />
        <circle cx="24" cy="30" r="12" class="tr-circle-path" />
      </svg>
      
      <!-- Labels -->
      <div class="tr-name" title="${name}">${name}</div>
      <div class="tr-spec">${ratedVolts} kV</div>
      <div class="tr-spec">${ratedPower} MVA</div>
    </div>
    
    <!-- Bottom connector line -->
    <div class="connector-line-bottom"></div>
  `;
  
  // Custom bottom node based on row
  if (rowNum === 1) {
    // If generator transformer, show generator symbol at the bottom
    let genLabel = 'GEN';
    const isGSUT = name.includes('GTG') || name.includes('GTG1') || name.includes('GTG2');
    if (isGSUT) {
      // Extract GTG name like GTG11
      const match = name.match(/GTG\d+/);
      genLabel = match ? match[0] : 'GEN';
      html += `
        <div class="generator-node">
          <div class="gen-circle">${genLabel}</div>
        </div>
      `;
    }
  } else if (rowNum === 3) {
    // Show arrow pointing downwards (loads)
    html += `<div class="bottom-connector-arrow"></div>`;
  }
  
  cardElement.innerHTML = html;
  
  // Click handler to open detailed modal
  cardElement.addEventListener('click', () => {
    openDetailModal(serial);
  });
  
  return cardElement;
}

// Calculate Stats for active site
function calculateStats(trs) {
  const count = trs.length;
  statTotalUnits.textContent = `${count} Units`;
  
  const searchTotal = document.getElementById('search-stat-total');
  const searchAssessed = document.getElementById('search-stat-assessed');
  const searchNoAssess = document.getElementById('search-stat-noassess');
  
  if (count === 0) {
    statAvgHealth.textContent = '-';
    statHealthy.textContent = '0';
    statMonitoring.textContent = '0';
    statWarning.textContent = '0';
    statCritical.textContent = '0';
    statNoAssess.textContent = '0';
    
    if (searchTotal) searchTotal.textContent = '0 Units';
    if (searchAssessed) searchAssessed.textContent = '0%';
    if (searchNoAssess) searchNoAssess.textContent = '0%';
    return;
  }
  
  let totalHI = 0;
  let assessedCount = 0;
  let healthy = 0;
  let monitoring = 0;
  let warning = 0;
  let critical = 0;
  let noassess = 0;
  
  trs.forEach(tr => {
    const hi = parseInt(tr["Condition Health Index"]) || 0;
    if (hi === 0) {
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
  
  statAvgHealth.textContent = assessedCount > 0 ? `${(totalHI / assessedCount).toFixed(1)}%` : '-';
  statHealthy.textContent = healthy;
  statMonitoring.textContent = monitoring;
  statWarning.textContent = warning;
  statCritical.textContent = critical;
  statNoAssess.textContent = noassess;
  
  // Update Search Area Stats
  if (searchTotal) searchTotal.textContent = `${count} Units`;
  if (searchAssessed) searchAssessed.textContent = count > 0 ? `${Math.round((assessedCount / count) * 100)}%` : '0%';
  if (searchNoAssess) searchNoAssess.textContent = count > 0 ? `${Math.round((noassess / count) * 100)}%` : '0%';
}

// Apply text search by dimming non-matches
function applySearchFilter() {
  const cards = document.querySelectorAll('.tr-scada-card');
  
  cards.forEach(card => {
    if (!currentSearch) {
      // Clear dimming
      card.style.opacity = '1';
      card.style.pointerEvents = 'all';
    } else {
      const name = card.getAttribute('data-name');
      const serial = card.getAttribute('data-serial-low');
      
      if (name.includes(currentSearch) || serial.includes(currentSearch)) {
        card.style.opacity = '1';
        card.style.pointerEvents = 'all';
      } else {
        card.style.opacity = '0.18';
        card.style.pointerEvents = 'none';
      }
    }
  });
}

// Helper to set modal text elements safely
function setModalText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '-';
}

// Open Detail Page / Modal
function openDetailModal(serialNumber) {
  const tr = rawTransformers.find(t => t["Serial No"] === serialNumber || t["Equipment Name"] === serialNumber) || rawTransformers[0];
  if (!tr) return;

  const name = tr["Equipment Name"] || '-';
  const serial = tr["Serial No"] || '-';
  const site = tr["SITE"] || '-';
  const hiVal = parseInt(tr["Condition Health Index"]) || 0;
  const ratedPower = tr["Rated Power (MVA)"] || tr["Rated Power\n(MVA)"] || '-';
  const hvRate = tr["HV Rate (kV)"] || '-';
  const lvRate = '-';
  const dateToAssess = tr["Result_Date"] || tr["Date"] || '19-Jan-2026';
  const recommendation = tr["Recommendation"] || (tr._rawItem?.recommendation) || 'No specific maintenance recommended at this time.';

  // Populate spec text
  const titleEl = document.getElementById('modal-transformer-title');
  if (titleEl) titleEl.textContent = name;
  const subEl = document.getElementById('modal-transformer-subtitle');
  if (subEl) subEl.textContent = `Serial: ${serial} | Site: ${site}`;
  
  setModalText('spec-site', site);
  setModalText('spec-company', 'GPSC');
  setModalText('spec-brand', tr._rawItem?.trInfo?.BRAND || '-');
  setModalText('spec-mfg-date', tr._rawItem?.trInfo?.MANUFACTURING_DATE || '-');
  setModalText('spec-power-rating', `${ratedPower} MVA`);
  setModalText('spec-cooling', tr._rawItem?.trInfo?.TYPE_OF_COOLING || '-');
  setModalText('spec-tap-changer', tr._rawItem?.trInfo?.TAP_CHANGER_TYPE || '-');
  setModalText('spec-vector-group', tr._rawItem?.trInfo?.VECTOR_GROUP || '-');
  
  setModalText('spec-hv-voltage', `${hvRate} kV`);
  setModalText('spec-lv-voltage', `${lvRate} kV`);
  setModalText('spec-insulation', 'OIL TYPE');
  setModalText('spec-mass', '-');
  setModalText('spec-gps', tr._rawItem?.trInfo?.LOCATION_GPS || '-');
  
  // Set health ring & score
  const scoreEl = document.getElementById('modal-health-score');
  if (scoreEl) scoreEl.textContent = hiVal;
  const dateEl = document.getElementById('modal-inspection-date');
  if (dateEl) dateEl.textContent = dateToAssess;
  
  const ring = document.getElementById('modal-health-ring');
  if (ring) {
    ring.setAttribute('stroke-dasharray', `${hiVal}, 100`);
    ring.className.baseVal = "circle";
  }
  
  // Set health class & recommendation details
  const badge = document.getElementById('modal-health-badge');
  if (badge) badge.className = 'badge';
  
  const recCard = document.getElementById('rec-card');
  if (recCard) recCard.className = 'recommendation-card';
  
  const recTitle = document.getElementById('rec-title');
  const recText = document.getElementById('rec-text');
  
  if (hiVal === 0 || isNaN(hiVal)) {
    if (badge) { badge.classList.add('badge-noassess'); badge.textContent = 'NO ASSESS'; }
    if (ring) ring.classList.add('no-assess');
    if (recCard) recCard.classList.add('no-assess');
    if (recTitle) recTitle.textContent = 'No Assessment Available';
    if (recText) recText.textContent = 'This transformer has not been assessed yet or has a Health Index of 0%.';
  } else if (hiVal >= 80) {
    if (badge) { badge.classList.add('badge-healthy'); badge.textContent = 'HEALTHY'; }
    if (ring) ring.classList.add('healthy');
    if (recCard) recCard.classList.add('healthy');
    if (recTitle) recTitle.textContent = 'Healthy - Routine Maintenance';
    if (recText) recText.textContent = recommendation;
  } else if (hiVal >= 70) {
    if (badge) { badge.classList.add('badge-monitoring'); badge.textContent = 'MONITORING'; }
    if (ring) ring.classList.add('monitoring');
    if (recCard) recCard.classList.add('monitoring');
    if (recTitle) recTitle.textContent = 'Monitoring - Increased Surveillance';
    if (recText) recText.textContent = recommendation;
  } else if (hiVal >= 50) {
    if (badge) { badge.classList.add('badge-warning'); badge.textContent = 'WARNING'; }
    if (ring) ring.classList.add('warning');
    if (recCard) recCard.classList.add('warning');
    if (recTitle) recTitle.textContent = 'Warning - Plan Diagnostics';
    if (recText) recText.textContent = recommendation;
  } else {
    if (badge) { badge.classList.add('badge-critical'); badge.textContent = 'CRITICAL'; }
    if (ring) ring.classList.add('critical');
    if (recCard) recCard.classList.add('critical');
    if (recTitle) recTitle.textContent = 'Critical - Immediate Shutdown / Inspect';
    if (recText) recText.textContent = recommendation;
  }
  
  // Populate diagnostic subscores (A, Q, U, N/A)
  const rawItem = tr._rawItem || {};
  populateSubscoreRow('gi', rawItem.visualInspection || 'N/A', 'General Visual Inspection');
  populateSubscoreRow('api', rawItem.activePart?.overall || 'N/A', 'Active Part Tests');
  populateSubscoreRow('ioi', rawItem.mainTankOil?.overall || 'N/A', 'Insulating Oil Inspection');
  populateSubscoreRow('oltci', rawItem.oltcOil?.overall || 'N/A', 'OLTC Oil Inspection');
  populateSubscoreRow('bi', rawItem.bushing || 'N/A', 'Bushing Test');
  populateSubscoreRow('ari', rawItem.surgeArrester || 'N/A', 'Surge Arrester Test');
  populateSubscoreRow('dga', rawItem.mainTankOil?.dga || 'N/A', 'Dissolved Gas Analysis');
  
  // Open Modal window
  if (detailModal) detailModal.classList.add('active');
}

// Convert A/Q/U to visual progress bar and label text
function populateSubscoreRow(id, statusChar, nameLabel) {
  const nameSpan = document.getElementById(`name-${id}`);
  if (nameSpan) nameSpan.textContent = nameLabel;
  
  const valSpan = document.getElementById(`val-${id}`);
  const fillBar = document.getElementById(`bar-${id}`);
  
  let pct = 0;
  let statusText = 'Not Conducted';
  let color = 'var(--scada-text-muted)';
  
  if (statusChar === 'A') {
    pct = 100;
    statusText = 'Acceptable (A)';
    color = 'var(--color-good)';
  } else if (statusChar === 'Q') {
    pct = 60;
    statusText = 'Questionable (Q)';
    color = 'var(--color-fair)';
  } else if (statusChar === 'U') {
    pct = 30;
    statusText = 'Unacceptable (U)';
    color = 'var(--color-critical)';
  } else if (statusChar === 'N/A' || statusChar === '-' || !statusChar) {
    pct = 0;
    statusText = 'Not Applicable (N/A)';
    color = 'var(--scada-text-muted)';
  } else {
    // If it's a numeric score or another code
    pct = parseInt(statusChar) || 0;
    statusText = `Score: ${statusChar}`;
    color = 'var(--scada-blue-bus)';
  }
  
  valSpan.textContent = statusText;
  fillBar.style.width = `${pct}%`;
  fillBar.style.backgroundColor = color;
}

function closeModal() {
  detailModal.classList.remove('active');
}

// Handle Theme Toggles (Dark / Light)
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
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Handle Dynamic CSV Import
function handleCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const parsedData = parseHealthIndexSumCSV(text);
    if (parsedData && parsedData.length > 0) {
      rawTransformers = parsedData;
      initializeDashboard();
      alert(`Successfully loaded ${parsedData.length} records from ${file.name}!`);
    } else {
      alert("Error: Invalid or empty CSV file. Could not parse data.");
    }
  };
  reader.readAsText(file);
}

// Show Empty state on failure
function showEmptyState(message) {
  if (trRow230) trRow230.innerHTML = '';
  if (trRow115) trRow115.innerHTML = '';
  if (trRow22) trRow22.innerHTML = '';
  if (trRow11) trRow11.innerHTML = '';
  if (trRow69) trRow69.innerHTML = '';
  
  const container = document.querySelector('.scada-panel');
  container.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-file-excel"></i>
      <h3>No Data Available</h3>
      <p>${message}</p>
      <div class="upload-btn-wrapper">
        <button class="btn btn-primary"><i class="fa-solid fa-file-import"></i> Upload HealthIndexSum.csv</button>
        <input type="file" id="csv-file-input" accept=".csv" />
      </div>
    </div>
  `;
  document.getElementById('csv-file-input').addEventListener('change', handleCSVImport);
}

// Update SCADA Canvas Zoom
function updateZoom() {
  const container = document.getElementById('scada-zoom-container');
  const label = document.getElementById('zoom-level-val');
  if (!container || !label) return;
  
  container.style.transform = `scale(${scadaZoom})`;
  label.textContent = `${Math.round(scadaZoom * 100)}%`;
  
  // Dynamically adjust scrollable margins based on zoom factor
  if (scadaZoom > 1.0) {
    container.style.marginBottom = `${(scadaZoom - 1) * 480}px`;
    container.style.marginRight = `${(scadaZoom - 1) * 1100}px`;
  } else {
    container.style.marginBottom = '0px';
    container.style.marginRight = '0px';
  }
}
