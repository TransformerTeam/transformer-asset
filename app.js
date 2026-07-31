/**
 * Transformer Condition Monitoring Dashboard - Core Logic
 */

// Global App State
let rawData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 25;
let sortField = 'SERIAL_NUMBER';
let sortOrder = 'asc';

// Charts and Map instances
let chartHealthDist = null;
let chartSiteHealth = null;
let chartBrandHealth = null;
let mapInstance = null;
let markersLayer = null;
let currentMapType = 'theme';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Load default dataset from data.js
  if (typeof TR_DATA !== 'undefined') {
    rawData = TR_DATA;
    initializeDashboard(rawData);
  } else {
    showEmptyState("No data available. Please import a CSV file.");
  }
  
  setupEventListeners();
});

// Setup Main Event Listeners
function setupEventListeners() {
  // Reset Filters button
  document.getElementById('btn-reset-filters').addEventListener('click', resetFilters);
  
  // Export CSV button
  document.getElementById('btn-export-filtered').addEventListener('click', exportFilteredToCSV);
  
  // Export PPTX button
  const btnExportPptx = document.getElementById('btn-export-pptx');
  if (btnExportPptx) {
    btnExportPptx.addEventListener('click', () => {
      exportPPTX(filteredData, false);
    });
  }
  
  // Theme Toggle button
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
  
  // Filter Dropdowns
  const filters = ['filter-site', 'filter-brand', 'filter-insulation', 'filter-tapchanger', 'filter-status'];
  filters.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  });
  
  // Text Search
  document.getElementById('table-search').addEventListener('input', debounce(() => {
    currentPage = 1;
    applyFilters();
  }, 300));
  
  // Page Size Selector
  document.getElementById('table-page-size').addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  });
  
  // CSV Import File Input
  document.getElementById('csv-file-input').addEventListener('change', handleCSVImport);
  
  // Table Sorting
  document.querySelectorAll('.tr-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortOrder = 'asc';
      }
      
      // Update sort icons
      document.querySelectorAll('.tr-table th i').forEach(icon => {
        icon.className = 'fa-solid fa-sort';
      });
      const icon = th.querySelector('i');
      icon.className = sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
      
      sortData();
      renderTable();
    });
  });
  
  // Modal Close Button
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeModal();
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
  
  // Escape key close modal and map fullscreen
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
}

// Initialize Dashboard Components with Data
function initializeDashboard(data) {
  rawData = data;
  
  // Populate filter dropdown choices
  populateFilterOptions();
  
  // Set theme from local storage
  const savedTheme = localStorage.getItem('tr-dashboard-theme') || 'dark';
  setTheme(savedTheme);
  
  // Initial filtering & rendering
  applyFilters();
  
  // Init Map (first time only)
  initMap();
  plotMapMarkers();
}

// Populate dropdown menus with unique options from dataset
function populateFilterOptions() {
  const sites = new Set();
  const brands = new Set();
  const tapChangers = new Set();
  
  rawData.forEach(item => {
    if (item.SITE) sites.add(item.SITE.trim());
    if (item.BRAND) brands.add(item.BRAND.trim());
    if (item.TAP_CHANGER_TYPE) tapChangers.add(item.TAP_CHANGER_TYPE.trim());
  });
  
  populateDropdown('filter-site', Array.from(sites).sort());
  populateDropdown('filter-brand', Array.from(brands).sort());
  populateDropdown('filter-tapchanger', Array.from(tapChangers).sort());
}

function populateDropdown(id, items) {
  const select = document.getElementById(id);
  // Keep the first option ("All")
  select.innerHTML = select.options[0].outerHTML;
  items.forEach(item => {
    if (item) {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    }
  });
}

// Apply Selected Filters and Search Query to Data
function applyFilters() {
  const siteFilter = document.getElementById('filter-site').value;
  const brandFilter = document.getElementById('filter-brand').value;
  const insulationFilter = document.getElementById('filter-insulation').value;
  const tapchangerFilter = document.getElementById('filter-tapchanger').value;
  const statusFilter = document.getElementById('filter-status').value;
  const searchQuery = document.getElementById('table-search').value.toLowerCase().trim();
  
  filteredData = rawData.filter(item => {
    // Site filter
    if (siteFilter !== 'all' && item.SITE !== siteFilter) return false;
    
    // Brand filter
    if (brandFilter !== 'all' && item.BRAND !== brandFilter) return false;
    
    // Insulation type filter
    if (insulationFilter !== 'all') {
      const dataIns = (item.DATA || '').toUpperCase();
      if (insulationFilter === 'OIL TYPE' && !dataIns.includes('OIL')) return false;
      if (insulationFilter === 'DRY TYPE' && !dataIns.includes('DRY')) return false;
    }
    
    // Tap changer filter
    if (tapchangerFilter !== 'all' && item.TAP_CHANGER_TYPE !== tapchangerFilter) return false;
    
    // Health status filter
    if (statusFilter !== 'all') {
      const hi = parseFloat(item.HI);
      if (statusFilter === 'No Assess') {
        if (!isNaN(hi) && hi !== 0) return false;
      } else {
        if (isNaN(hi) || hi === 0) return false;
        if (statusFilter === 'Healthy' && hi < 80) return false;
        if (statusFilter === 'Monitoring' && (hi < 70 || hi >= 80)) return false;
        if (statusFilter === 'Warning' && (hi < 50 || hi >= 70)) return false;
        if (statusFilter === 'Critical' && hi >= 50) return false;
      }
    }
    
    // Search text filter
    if (searchQuery) {
      const serial = (item.SERIAL_NUMBER || '').toLowerCase();
      const code = (item.DEVICE_CODE || '').toLowerCase();
      const equipment = (item.LOCAL_EQUIPMENT_CODE || '').toLowerCase();
      const brand = (item.BRAND || '').toLowerCase();
      const model = (item.MODEL_TYPE || '').toLowerCase();
      
      const match = serial.includes(searchQuery) || 
                    code.includes(searchQuery) || 
                    equipment.includes(searchQuery) || 
                    brand.includes(searchQuery) ||
                    model.includes(searchQuery);
                    
      if (!match) return false;
    }
    
    return true;
  });
  
  sortData();
  calculateKPIs();
  renderCharts();
  plotMapMarkers();
  renderTable();
}

// Sort filtered dataset
function sortData() {
  filteredData.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    // Handle numeric sorting for HI, power rating, weights
    if (sortField === 'HI') {
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

// Calculate and Display KPI summary statistics
function calculateKPIs() {
  const total = filteredData.length;
  
  let oilTypeCount = 0;
  let dryTypeCount = 0;
  let totalHI = 0;
  let validHICount = 0;
  let criticalCount = 0;
  const sites = new Set();
  
  filteredData.forEach(item => {
    // Type breakdown
    const dataIns = (item.DATA || '').toUpperCase();
    if (dataIns.includes('OIL')) oilTypeCount++;
    else if (dataIns.includes('DRY')) dryTypeCount++;
    
    // Health Index
    const hi = parseFloat(item.HI);
    if (!isNaN(hi)) {
      totalHI += hi;
      validHICount++;
      if (hi < 50) criticalCount++;
    }
    
    // Site counts
    if (item.SITE) sites.add(item.SITE.trim());
  });
  
  const avgHI = validHICount > 0 ? Math.round(totalHI / validHICount) : 0;
  
  // Render KPI texts
  document.getElementById('kpi-total-val').textContent = total.toLocaleString();
  document.getElementById('kpi-total-sub').textContent = `${oilTypeCount} Oil Type | ${dryTypeCount} Dry Type`;
  
  document.getElementById('kpi-health-val').textContent = `${avgHI}%`;
  
  // Set color for health KPI card based on avg HI
  const healthCard = document.getElementById('kpi-health-card');
  healthCard.className = 'kpi-card kpi-health';
  if (avgHI >= 80) healthCard.classList.add('good');
  else if (avgHI >= 70) healthCard.classList.add('medium');
  else if (avgHI >= 50) healthCard.classList.add('poor');
  else healthCard.classList.add('critical');
  
  document.getElementById('kpi-critical-val').textContent = criticalCount.toLocaleString();
  document.getElementById('kpi-active-val').textContent = sites.size.toLocaleString();

  // Update bottom SCADA-style indicators
  const bottomTotal = document.getElementById('bottom-total-assets');
  if (bottomTotal) bottomTotal.textContent = `${total.toLocaleString()} Units`;
  const bottomHealth = document.getElementById('bottom-avg-health');
  if (bottomHealth) bottomHealth.textContent = `${avgHI}%`;
}

// Reset Filters
function resetFilters() {
  document.getElementById('filter-site').value = 'all';
  document.getElementById('filter-brand').value = 'all';
  document.getElementById('filter-insulation').value = 'all';
  document.getElementById('filter-tapchanger').value = 'all';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('table-search').value = '';
  currentPage = 1;
  applyFilters();
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

// Initialize Leaflet Map
function initMap() {
  if (mapInstance) return;
  
  // Default map position (Rayong / Map Ta Phut Industrial Estate area where most coords are)
  const defaultCenter = [12.677, 101.137]; 
  const defaultZoom = 13;
  
  // Set up the Leaflet Map
  mapInstance = L.map('map', {
    zoomControl: true,
    attributionControl: false
  }).setView(defaultCenter, defaultZoom);
  
  // Dark Matter tiles for premium dark theme styling
  const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
  updateMapLayer(isDarkTheme);
  
  markersLayer = L.layerGroup().addTo(mapInstance);
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 300);
}

function updateMapLayer(isDark) {
  if (!mapInstance) return;
  
  // Remove existing tile layers
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

// Re-plot map markers based on filteredData
function plotMapMarkers() {
  if (!markersLayer) return;
  
  markersLayer.clearLayers();
  
  const bounds = [];
  
  filteredData.forEach(item => {
    if (!item.LOCATION_GPS) return;
    
    // Parse coordinates "lat, lng"
    const coords = item.LOCATION_GPS.split(',');
    if (coords.length !== 2) return;
    
    const lat = parseFloat(coords[0].trim());
    const lng = parseFloat(coords[1].trim());
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    // Health classification
    const hi = parseFloat(item.HI);
    let statusClass = 'no-assess';
    let statusLabel = 'NO ASSESS';
    
    if (isNaN(hi) || hi === 0) {
      statusClass = 'no-assess';
      statusLabel = 'NO ASSESS';
    } else if (hi >= 80) {
      statusClass = 'healthy';
      statusLabel = 'HEALTHY';
    } else if (hi >= 70) {
      statusClass = 'monitoring';
      statusLabel = 'MONITORING';
    } else if (hi >= 50) {
      statusClass = 'warning';
      statusLabel = 'WARNING';
    } else {
      statusClass = 'critical';
      statusLabel = 'CRITICAL';
    }
    
    // Custom DIV icon for markers
    const customIcon = L.divIcon({
      className: 'custom-icon',
      html: `<div class="custom-marker-pin ${statusClass}"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
    
    // Build popup HTML content
    const popupHtml = `
      <div class="map-popup-container">
        <div class="map-popup-header">${item.LOCAL_EQUIPMENT_CODE || 'Transformer Info'}</div>
        <div class="map-popup-row">
          <span class="map-popup-label">Serial:</span>
          <span class="map-popup-value">${item.SERIAL_NUMBER}</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Device Code:</span>
          <span class="map-popup-value">${item.DEVICE_CODE || '-'}</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Site / Brand:</span>
          <span class="map-popup-value">${item.SITE || '-'} / ${item.BRAND || '-'}</span>
        </div>
        <div class="map-popup-row">
          <span class="map-popup-label">Condition:</span>
          <span class="map-popup-value"><span class="badge badge-${statusClass}">${statusLabel} (${hi}%)</span></span>
        </div>
        <button class="btn btn-primary map-popup-btn" onclick="openDetailModal('${item.SERIAL_NUMBER}')">
          <i class="fa-solid fa-eye"></i> View Details
        </button>
      </div>
    `;
    
    const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupHtml);
    markersLayer.addLayer(marker);
    bounds.push([lat, lng]);
  });
  
  // Adjust map viewport to fit all points automatically
  if (bounds.length > 0 && mapInstance) {
    mapInstance.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}

// Generate & Render ApexCharts Visualizations
function renderCharts() {
  // 1. Chart 1: Health Index distribution donut chart
  let counts = { healthy: 0, monitoring: 0, warning: 0, critical: 0, noassess: 0 };
  filteredData.forEach(item => {
    const hi = parseFloat(item.HI);
    if (isNaN(hi) || hi === 0) {
      counts.noassess++;
    } else if (hi >= 80) {
      counts.healthy++;
    } else if (hi >= 70) {
      counts.monitoring++;
    } else if (hi >= 50) {
      counts.warning++;
    } else {
      counts.critical++;
    }
  });
  
  const donutOptions = {
    series: [counts.healthy, counts.monitoring, counts.warning, counts.critical, counts.noassess],
    labels: ['Healthy (>=80%)', 'Monitoring (70-79%)', 'Warning (50-69%)', 'Critical (<50%)', 'No Assess (=0)'],
    chart: {
      type: 'donut',
      height: 250,
      fontFamily: 'Inter, sans-serif',
      foreColor: 'var(--text-secondary)'
    },
    colors: ['#10b981', '#eab308', '#f97316', '#ef4444', '#6b7280'],
    legend: {
      position: 'bottom',
      fontSize: '11px',
      markers: { radius: 12 }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val, opts) {
        return opts.w.config.series[opts.seriesIndex]; // show counts instead of percentages
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          background: 'transparent',
          labels: {
            show: true,
            name: { show: true, fontSize: '11px' },
            value: {
              show: true,
              fontSize: '18px',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              color: 'var(--text-primary)',
              formatter: function (val) { return val; }
            },
            total: {
              show: true,
              label: 'Total Assessed',
              fontSize: '10px',
              color: 'var(--text-muted)',
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              }
            }
          }
        }
      }
    },
    stroke: { show: false }
  };
  
  if (chartHealthDist) {
    chartHealthDist.updateOptions(donutOptions);
  } else {
    chartHealthDist = new ApexCharts(document.getElementById('chart-health-dist'), donutOptions);
    chartHealthDist.render();
  }
  
  // 2. Chart 2: Average Health Index by Site (Horizontal Bar Chart)
  const siteData = {};
  filteredData.forEach(item => {
    if (!item.SITE) return;
    const hi = parseFloat(item.HI);
    if (isNaN(hi)) return;
    
    if (!siteData[item.SITE]) {
      siteData[item.SITE] = { sum: 0, count: 0 };
    }
    siteData[item.SITE].sum += hi;
    siteData[item.SITE].count++;
  });
  
  const siteNames = Object.keys(siteData);
  const siteAverages = siteNames.map(name => {
    return {
      site: name,
      avg: Math.round(siteData[name].sum / siteData[name].count),
      count: siteData[name].count
    };
  }).sort((a, b) => b.avg - a.avg).slice(0, 10); // Top 10 sites by health
  
  const siteOptions = {
    series: [{
      name: 'Average Health Index',
      data: siteAverages.map(s => s.avg)
    }],
    chart: {
      type: 'bar',
      height: 250,
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      foreColor: 'var(--text-secondary)'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '65%',
        borderRadius: 4,
        distributed: true
      }
    },
    colors: siteAverages.map(s => {
      if (s.avg >= 85) return '#10b981';
      if (s.avg >= 70) return '#eab308';
      if (s.avg >= 50) return '#f97316';
      return '#ef4444';
    }),
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: function (val) { return val + '%'; },
      style: { fontSize: '10px' }
    },
    xaxis: {
      categories: siteAverages.map(s => s.site),
      max: 100,
      labels: {
        formatter: function (val) { return val + '%'; }
      }
    },
    grid: {
      borderColor: 'var(--border-color)',
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } }
    }
  };
  
  if (chartSiteHealth) {
    chartSiteHealth.updateOptions(siteOptions);
  } else {
    chartSiteHealth = new ApexCharts(document.getElementById('chart-site-health'), siteOptions);
    chartSiteHealth.render();
  }
  
  // 3. Chart 3: Brand count and Brand Health matrix
  const brandData = {};
  filteredData.forEach(item => {
    if (!item.BRAND) return;
    const hi = parseFloat(item.HI);
    if (isNaN(hi)) return;
    
    if (!brandData[item.BRAND]) {
      brandData[item.BRAND] = { count: 0, sumHI: 0 };
    }
    brandData[item.BRAND].count++;
    brandData[item.BRAND].sumHI += hi;
  });
  
  const sortedBrands = Object.keys(brandData).map(name => {
    return {
      brand: name,
      count: brandData[name].count,
      avgHI: Math.round(brandData[name].sumHI / brandData[name].count)
    };
  }).sort((a, b) => b.count - a.count).slice(0, 8); // Top 8 brands
  
  const brandOptions = {
    series: [
      {
        name: 'Asset Count',
        type: 'column',
        data: sortedBrands.map(b => b.count)
      },
      {
        name: 'Avg Health Index (%)',
        type: 'line',
        data: sortedBrands.map(b => b.avgHI)
      }
    ],
    chart: {
      height: 250,
      type: 'line',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      foreColor: 'var(--text-secondary)'
    },
    stroke: {
      width: [0, 3],
      curve: 'smooth'
    },
    colors: ['var(--primary)', 'var(--accent)'],
    dataLabels: {
      enabled: true,
      enabledOnSeries: [0, 1],
      style: { fontSize: '9px' }
    },
    labels: sortedBrands.map(b => b.brand),
    xaxis: {
      type: 'category'
    },
    yaxis: [
      {
        title: {
          text: 'Asset Count',
          style: { color: 'var(--primary)', fontWeight: 600 }
        }
      },
      {
        opposite: true,
        max: 100,
        title: {
          text: 'Health Index (%)',
          style: { color: 'var(--accent)', fontWeight: 600 }
        },
        labels: {
          formatter: function (val) { return val + '%'; }
        }
      }
    ],
    grid: {
      borderColor: 'var(--border-color)'
    },
    legend: {
      position: 'top',
      fontSize: '11px'
    }
  };
  
  if (chartBrandHealth) {
    chartBrandHealth.updateOptions(brandOptions);
  } else {
    chartBrandHealth = new ApexCharts(document.getElementById('chart-brand-health'), brandOptions);
    chartBrandHealth.render();
  }
}

// Render Asset Registry Datatable
function renderTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  
  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>No matching transformers found based on filters.</p>
        </td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);
  
  pageData.forEach(item => {
    const hi = parseFloat(item.HI);
    let badgeClass = 'badge-noassess';
    let statusText = 'No Assess';
    
    if (isNaN(hi) || hi === 0) {
      badgeClass = 'badge-noassess';
      statusText = 'No Assess';
    } else if (hi >= 80) {
      badgeClass = 'badge-healthy';
      statusText = 'Healthy';
    } else if (hi >= 70) {
      badgeClass = 'badge-monitoring';
      statusText = 'Monitoring';
    } else if (hi >= 50) {
      badgeClass = 'badge-warning';
      statusText = 'Warning';
    } else {
      badgeClass = 'badge-critical';
      statusText = 'Critical';
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 600; color: var(--text-primary);">${item.SERIAL_NUMBER}</td>
      <td>${item.DEVICE_CODE || '-'}</td>
      <td>${item.SITE || '-'}</td>
      <td>${item.BRAND || '-'}</td>
      <td>${item.DATA || 'OIL TYPE'}</td>
      <td style="text-align: center;">
        <span class="badge ${badgeClass}">${hi}% (${statusText})</span>
      </td>
      <td>${item.Result_Date || '-'}</td>
      <td style="text-align: center;">
        <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openDetailModal('${item.SERIAL_NUMBER}')">
          <i class="fa-solid fa-eye"></i> View
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  updatePaginationControls(filteredData.length);
}

// Update Pagination Numbers and Info Texts
function updatePaginationControls(totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  
  document.getElementById('pagination-info-text').textContent = `Showing ${start} to ${end} of ${totalItems} entries`;
  
  const buttonsContainer = document.getElementById('pagination-buttons');
  buttonsContainer.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  buttonsContainer.appendChild(prevBtn);
  
  // Page numbers (smart pagination, max 5 numbers)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      renderTable();
    });
    buttonsContainer.appendChild(pageBtn);
  }
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  buttonsContainer.appendChild(nextBtn);
}

// Export Filtered Dataset to CSV Format
function exportFilteredToCSV() {
  if (filteredData.length === 0) return;
  
  // Get all columns from first item
  const headers = Object.keys(filteredData[0]);
  
  let csvContent = '\uFEFF'; // UTF-8 BOM for MS Excel compatibility
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';
  
  filteredData.forEach(row => {
    const line = headers.map(h => {
      let cell = row[h] === null || row[h] === undefined ? '' : row[h].toString();
      // Escape double quotes
      cell = cell.replace(/"/g, '""');
      return `"${cell}"`;
    }).join(',');
    csvContent += line + '\r\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `transformer_condition_report_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    updateMapLayer(true);
  } else {
    darkIcon.style.display = 'none';
    lightIcon.style.display = 'inline-block';
    updateMapLayer(false);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function openDetailModal(serialNumber) {
  window.open(`assessment.html?serial=${encodeURIComponent(serialNumber)}`, '_blank');
}

function updateSubscoreBar(id, val, max) {
  const percentage = max > 0 ? Math.round((val / max) * 100) : 0;
  
  document.getElementById(`val-${id}`).textContent = `${val} / ${max}`;
  const fillBar = document.getElementById(`bar-${id}`);
  fillBar.style.width = `${percentage}%`;
  
  // Color the progress bars based on their scores
  fillBar.style.backgroundColor = 'var(--primary)';
  if (percentage >= 80) fillBar.style.backgroundColor = 'var(--color-good)';
  else if (percentage >= 70) fillBar.style.backgroundColor = 'var(--color-fair)';
  else if (percentage >= 50) fillBar.style.backgroundColor = 'var(--color-poor)';
  else fillBar.style.backgroundColor = 'var(--color-critical)';
}

function closeModal() {
  document.getElementById('detail-modal').classList.remove('active');
}

// Handle Custom CSV Import Parsing
function handleCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const parsedData = parseCSVText(text);
    if (parsedData && parsedData.length > 0) {
      // Re-initialize dashboard with new data
      initializeDashboard(parsedData);
      alert(`Successfully loaded ${parsedData.length} records from ${file.name}!`);
    } else {
      alert("Error: Invalid or empty CSV file. Could not parse data.");
    }
  };
  reader.readAsText(file);
}

// Simple robust CSV parser
function parseCSVText(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    
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
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }
  
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  
  if (lines.length < 2) return null;
  
  const headers = lines[0].map(h => h.trim());
  const jsonRecords = [];
  
  for (let i = 1; i < lines.length; i++) {
    const lineValues = lines[i];
    // Skip empty lines
    if (lineValues.length === 1 && lineValues[0] === "") continue;
    
    const record = {};
    headers.forEach((header, index) => {
      record[header] = lineValues[index] !== undefined ? lineValues[index].trim() : '';
    });
    
    jsonRecords.push(record);
  }
  
  return jsonRecords;
}

// Helpers
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showEmptyState(message) {
  const container = document.querySelector('.app-container');
  container.innerHTML = `
    <div class="empty-state" style="margin-top: 100px;">
      <i class="fa-solid fa-database" style="font-size: 4rem;"></i>
      <h2 style="margin: 1rem 0;">No Data Loaded</h2>
      <p style="margin-bottom: 2rem;">${message}</p>
      <div class="upload-btn-wrapper">
        <button class="btn btn-primary"><i class="fa-solid fa-file-import"></i> Choose TRInfo.csv File</button>
        <input type="file" id="csv-file-input" accept=".csv" />
      </div>
    </div>
  `;
  document.getElementById('csv-file-input').addEventListener('change', handleCSVImport);
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
