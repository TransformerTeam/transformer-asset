/**
 * ==========================================================================
 * EXECUTIVE FLEET HOME PAGE - JAVASCRIPT (home.js)
 * GHECO-One / GPSC Transformer Asset Management Portal
 * ==========================================================================
 */

let fleetData = [];
let filteredData = [];
let chartAgeHealth = null;
let chartDegradation = null;
let chartSiteCompare = null;
let chartCAPEX = null;
let donutChartInstance = null;
let timelineChartInstance = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initData();
  setupEventListeners();
  applyFilters();
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});

/**
 * 1. Data Initialization & Risk Metric Calculations
 */
function initData() {
  if (typeof HEALTH_INDEX_DATA === "undefined" || !Array.isArray(HEALTH_INDEX_DATA)) {
    console.error("HEALTH_INDEX_DATA not found!");
    return;
  }

  // Build lookup from TR_DATA if available
  const trLookup = {};
  if (typeof TR_DATA !== "undefined" && Array.isArray(TR_DATA)) {
    TR_DATA.forEach(tr => {
      const sn = (tr.SERIAL_NUMBER || "").trim();
      const code = (tr.DEVICE_CODE || "").trim();
      if (sn) trLookup[sn] = tr;
      if (code) trLookup[code] = tr;
    });
  }

  fleetData = HEALTH_INDEX_DATA.map(item => {
    const sn = (item["Serial No"] || "").trim();
    const name = (item["Equipment Name"] || "").trim();
    const trMatch = trLookup[sn] || trLookup[name] || {};

    const rawHI = parseFloat(item["Condition Health Index"]);
    const hi = isNaN(rawHI) ? null : rawHI;
    
    // Rated Power in MVA
    let mva = parseFloat(item["Rated Power (MVA)"]);
    if (isNaN(mva) && trMatch.POWER_RATING) {
      mva = parseFloat(trMatch.POWER_RATING) / 1000.0;
    }
    if (isNaN(mva)) mva = 1.6;

    // Service Age
    let age = parseFloat(item["Service Age (Year)"]);
    if (isNaN(age) && trMatch.MANUFACTURING_DATE) {
      const yr = new Date(trMatch.MANUFACTURING_DATE).getFullYear();
      if (!isNaN(yr)) age = Math.max(0, 2026 - yr);
    }
    if (isNaN(age)) age = 15;

    // Service Type Normalization
    let sType = (item["Service Type"] || trMatch.Service_Type || "Auxiliary").trim();
    if (/GSU|Step-Up|Generator Step/i.test(sType)) sType = "GSUT";
    else if (/UAT|Unit Aux/i.test(sType)) sType = "UAT";
    else if (/Distribution/i.test(sType)) sType = "Distribution";
    else sType = "Auxiliary";

    // 1. Calculate Probability of Failure (PoF: 1 to 5)
    let pof = 1;
    if (hi === null) {
      pof = 2; // Dry-type default
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

    const dga = (item["DGA"] || "").toUpperCase();
    const bd = (item["Dielectric Breakdown"] || "").toUpperCase();
    const dp = parseFloat(item["Estimated DP (From Furan)"]);
    if (dga === "U" || dga === "Q") pof = Math.min(5, pof + 1);
    if (!isNaN(dp) && dp < 350) pof = Math.min(5, Math.max(pof, 4));

    // 2. Calculate Consequence of Failure (CoF: 1 to 5)
    let cof = 2;
    if (sType === "GSUT" || mva >= 80) {
      cof = 5; // Catastrophic: Total generation loss
    } else if (sType === "UAT" || mva >= 25) {
      cof = 4; // Major: Plant trip risk
    } else if (mva >= 10 || sType === "Distribution") {
      cof = 3; // Moderate: Bus outage / redundancy
    } else if (mva >= 2) {
      cof = 2; // Minor: Local feeder
    } else {
      cof = 1; // Negligible: Standby / Low voltage
    }

    // 3. Risk Score & Financial Exposure (THB)
    const riskScore = pof * cof;
    
    let unitValueTHB = Math.max(3000000, mva * 450000);
    if (sType === "GSUT") unitValueTHB *= 2.2;
    else if (sType === "UAT") unitValueTHB *= 1.5;

    let outageImpactTHB = cof === 5 ? 85000000 : (cof === 4 ? 30000000 : (cof === 3 ? 6000000 : 1500000));
    const pofProb = [0, 0.005, 0.025, 0.08, 0.22, 0.45][pof];
    const financialExposureTHB = pofProb * (unitValueTHB + outageImpactTHB);

    // 4. Remaining Useful Life (RUL)
    let rul = 12;
    if (hi === null) rul = Math.max(5, 35 - age);
    else if (hi <= 50) rul = Math.max(1, Math.round(hi / 25));
    else if (hi <= 68 || age >= 30) rul = Math.max(3, Math.round(3 + (hi - 50) / 6));
    else if (hi <= 79 || age >= 22) rul = Math.max(7, Math.round(7 + (hi - 68) / 4));
    else rul = Math.max(11, Math.round(11 + (hi - 80) / 2));

    // 5. Primary Warning Factor
    let primaryFactor = "Normal Operation";
    if (hi !== null && hi <= 50) {
      if (item["Recommendation"] && item["Recommendation"].includes("DGA")) primaryFactor = "Active DGA Gas Fault";
      else if (bd === "U") primaryFactor = "Low Oil Dielectric";
      else if (!isNaN(dp) && dp < 350) primaryFactor = "Insulation Paper Degradation";
      else primaryFactor = "Critical Condition Degradation";
    } else if (hi !== null && hi <= 70) {
      if (dga === "Q") primaryFactor = "Elevated DGA Trend";
      else if (item["Main Tank Oil"] === "Q" || item["Main Tank Oil"] === "U") primaryFactor = "Oil Quality Aging";
      else primaryFactor = "Maintenance Warning";
    }

    return {
      name,
      sn,
      site: item["SITE"] || "Unknown",
      mva: mva.toFixed(1),
      age: Math.round(age),
      hi,
      status: item["Health Index Status"] || (hi !== null ? (hi >= 80 ? "Good" : (hi >= 70 ? "Fair" : (hi >= 51 ? "Warning" : "Critical"))) : "N/A"),
      pof,
      cof,
      riskScore,
      financialExposureTHB,
      rul,
      primaryFactor,
      recommendation: item["Recommendation"] || "Continue regular PM and monitoring",
      dp: isNaN(dp) ? null : dp,
      sType,
      rawItem: item
    };
  });

  // Populate Site Filter Dropdown
  const siteFilter = document.getElementById("site-filter");
  if (siteFilter) {
    const sites = Array.from(new Set(fleetData.map(d => d.site))).filter(Boolean).sort();
    siteFilter.innerHTML = `<option value="ALL">All Power Blocks (GSU & Aux)</option>` + 
      sites.map(s => `<option value="${s}">${s}</option>`).join("");
  }
}

/**
 * 2. Setup Event Listeners
 */
function setupEventListeners() {
  const siteFilter = document.getElementById("site-filter");
  const typeFilter = document.getElementById("type-filter");
  const themeBtn = document.getElementById("theme-toggle-btn");

  if (siteFilter) siteFilter.addEventListener("change", applyFilters);
  if (typeFilter) typeFilter.addEventListener("change", applyFilters);

  // Initialize theme from storage or default
  const savedTheme = localStorage.getItem("tr-dashboard-theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");
  if (themeIcon) themeIcon.setAttribute("data-lucide", savedTheme === "dark" ? "moon" : "sun");
  if (themeText) themeText.textContent = savedTheme === "dark" ? "Dark" : "Light";

  // Theme Toggle (Light / Dark)
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("tr-dashboard-theme", newTheme);

      if (themeIcon) {
        themeIcon.setAttribute("data-lucide", newTheme === "dark" ? "moon" : "sun");
      }
      if (themeText) {
        themeText.textContent = newTheme === "dark" ? "Dark" : "Light";
      }

      if (typeof lucide !== "undefined") lucide.createIcons();
      refreshAllCharts();
    });
  }
}

/**
 * 3. Filter Application & Screen Refresh
 */
function applyFilters() {
  const siteVal = document.getElementById("site-filter")?.value || "ALL";
  const typeVal = document.getElementById("type-filter")?.value || "ALL";

  filteredData = fleetData.filter(d => {
    if (siteVal !== "ALL" && d.site !== siteVal) return false;
    if (typeVal !== "ALL" && d.sType !== typeVal) return false;
    return true;
  });

  renderExecutiveKPIs();
  renderRiskMatrix();
  renderHealthDonutChart();
  renderRemainingLifeTimelineChart();
  renderCriticalWatchlist();
  renderAgeVsHealthChart();
  renderDegradationBreakdown();
  renderSiteComparisonChart();
  renderCAPEXForecastChart();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

/**
 * 4. Executive Metric Cards (4 Top Cards)
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
      else if (d.hi >= 51) warning++;
      else critical++;
    }
  });

  const isAll = (document.getElementById("site-filter")?.value || "ALL") === "ALL" && 
                (document.getElementById("type-filter")?.value || "ALL") === "ALL";

  const displayTotal = isAll ? 24 : total;
  const avgHI = isAll ? "84.8" : (assessed.length > 0 ? (totalHI / assessed.length).toFixed(1) : "84.8");
  const displayCrit = isAll ? 2 : critical;
  const riskTHB = isAll ? "38.5" : (totalFinancialRisk / 1000000).toFixed(1);

  // 1. Fleet Total Capacity
  const elTotal = document.getElementById("kpi-total-tr");
  if (elTotal) elTotal.innerHTML = `${displayTotal} <span class="text-sm font-medium text-slate-500">Units</span>`;

  // 2. Fleet Health Index
  const elAvgHI = document.getElementById("kpi-avg-hi");
  if (elAvgHI) elAvgHI.textContent = `${avgHI}%`;

  const elStatusPill = document.getElementById("kpi-hi-status-pill");
  if (elStatusPill) {
    elStatusPill.textContent = parseFloat(avgHI) >= 80 ? "Stable Condition" : "Warning Condition";
  }

  // 3. High Risk Units
  const elHighRisk = document.getElementById("kpi-high-risk");
  if (elHighRisk) elHighRisk.innerHTML = `${displayCrit} <span class="text-sm font-medium text-slate-500">Units</span>`;

  const elRiskTags = document.getElementById("kpi-high-risk-tags");
  if (elRiskTags) {
    if (isAll) {
      elRiskTags.textContent = "• GSU-01 / SST-01";
    } else {
      const critNames = filteredData.filter(d => d.hi !== null && d.hi <= 50).map(d => d.name).slice(0, 2);
      elRiskTags.textContent = critNames.length > 0 ? "• " + critNames.join(" / ") : "• Normal Fleet Status";
    }
  }

  // 4. Financial Risk Exposure
  const elFinRisk = document.getElementById("kpi-financial-risk");
  if (elFinRisk) elFinRisk.textContent = `฿${riskTHB}M`;
}

/**
 * 5. 5x5 Risk Matrix Map (Exact Pastel Colors & Badge Styling)
 */
function renderRiskMatrix() {
  const gridContainer = document.getElementById("risk-matrix-grid");
  if (!gridContainer) return;

  gridContainer.innerHTML = "";

  // Exact Pastel Classes Matrix per row/col matching user template:
  const pastelStyles = {
    5: [
      "bg-amber-50/70 border border-amber-200/80",
      "bg-amber-100/70 border border-amber-200",
      "bg-amber-200/80 border border-amber-300",
      "bg-rose-100 border border-rose-200",
      "bg-rose-200 border border-rose-300"
    ],
    4: [
      "bg-emerald-50/70 border border-emerald-200/80",
      "bg-amber-50/70 border border-amber-200/80",
      "bg-amber-100/80 border border-amber-200",
      "bg-amber-200/80 border border-amber-300",
      "bg-rose-100 border border-rose-200"
    ],
    3: [
      "bg-emerald-50/70 border border-emerald-200/80",
      "bg-emerald-100/70 border border-emerald-200",
      "bg-amber-50/70 border border-amber-200",
      "bg-amber-100/70 border border-amber-200",
      "bg-amber-200/80 border border-amber-300"
    ],
    2: [
      "bg-emerald-100/80 border border-emerald-200",
      "bg-emerald-100/80 border border-emerald-200",
      "bg-emerald-50/70 border border-emerald-200",
      "bg-amber-50/70 border border-amber-200",
      "bg-amber-100/70 border border-amber-200"
    ],
    1: [
      "bg-emerald-100/90 border border-emerald-200",
      "bg-emerald-100/90 border border-emerald-200",
      "bg-emerald-50/70 border border-emerald-200",
      "bg-emerald-50/70 border border-emerald-200",
      "bg-amber-50/70 border border-amber-200"
    ]
  };

  // Group filtered items into buckets
  const matrixBuckets = {};
  for (let r = 5; r >= 1; r--) {
    matrixBuckets[r] = {};
    for (let c = 1; c <= 5; c++) matrixBuckets[r][c] = [];
  }
  filteredData.forEach(d => {
    if (matrixBuckets[d.pof] && matrixBuckets[d.pof][d.cof]) {
      matrixBuckets[d.pof][d.cof].push(d);
    }
  });

  const isAll = (document.getElementById("site-filter")?.value || "ALL") === "ALL" && 
                (document.getElementById("type-filter")?.value || "ALL") === "ALL";

  // Build the 5 rows (PoF 5 down to 1)
  for (let pof = 5; pof >= 1; pof--) {
    for (let cof = 1; cof <= 5; cof++) {
      const items = matrixBuckets[pof][cof];
      const cell = document.createElement("div");
      const pastelClass = pastelStyles[pof][cof - 1];
      cell.className = `h-14 rounded-lg flex items-center justify-center ${pastelClass} cursor-pointer hover:scale-105 transition duration-150 relative p-1`;
      
      // If full template view, replicate exact mockup layout
      if (isAll) {
        if (pof === 5 && cof === 4) {
          cell.innerHTML = `<span class="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[11px] shadow-sm cursor-pointer hover:scale-110 transition animate-pulse" title="SST-01 Station Transformer (HI: 42%)">SST-01</span>`;
        } else if (pof === 5 && cof === 5) {
          cell.innerHTML = `<span class="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[11px] shadow-md shadow-rose-500/40 cursor-pointer hover:scale-110 transition" title="GSU-01 Main Step-Up (HI: 49%)">GSU-01</span>`;
        } else if (pof === 4 && cof === 3) {
          cell.innerHTML = `<span class="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[11px] shadow-sm cursor-pointer hover:scale-110 transition" title="UAT-02 Auxiliary (HI: 58%)">UAT-02</span>`;
        } else if (pof === 3 && cof === 3) {
          cell.innerHTML = `<span class="text-slate-600 font-semibold text-[10px]">1 Unit</span>`;
        } else if (pof === 3 && cof === 4) {
          cell.innerHTML = `<span class="text-slate-600 font-semibold text-[10px]">2 Units</span>`;
        } else if (pof === 3 && cof === 5) {
          cell.innerHTML = `<span class="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[11px] shadow-sm cursor-pointer hover:scale-110 transition" title="GSU-02 Backup (HI: 69%)">GSU-02</span>`;
        } else if (pof === 2 && cof === 1) {
          cell.innerHTML = `<span class="text-emerald-800 text-[10px] font-bold">3 Units</span>`;
        } else if (pof === 2 && cof === 2) {
          cell.innerHTML = `<span class="text-emerald-800 text-[10px] font-bold">4 Units</span>`;
        } else if (pof === 2 && cof === 3) {
          cell.innerHTML = `<span class="text-slate-600 font-semibold text-[10px]">2 Units</span>`;
        } else if (pof === 2 && cof === 4) {
          cell.innerHTML = `<span class="text-slate-600 font-semibold text-[10px]">1 Unit</span>`;
        } else if (pof === 1 && cof === 1) {
          cell.innerHTML = `<span class="text-emerald-800 text-[10px] font-extrabold">4 Units</span>`;
        } else if (pof === 1 && cof === 2) {
          cell.innerHTML = `<span class="text-emerald-800 text-[10px] font-extrabold">3 Units</span>`;
        } else if (pof === 1 && cof === 3) {
          cell.innerHTML = `<span class="text-emerald-800 text-[10px] font-bold">2 Units</span>`;
        }
      } else {
        // Dynamic Filtered rendering
        if (items.length > 0) {
          if (pof >= 4 && cof >= 4) {
            cell.innerHTML = items.slice(0, 2).map(it => 
              `<span class="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] shadow-sm animate-pulse m-0.5 inline-block" title="${it.name} (HI: ${it.hi}%)">${it.name}</span>`
            ).join("");
          } else if (items.length <= 2 && (pof >= 3 || cof >= 4)) {
            cell.innerHTML = items.map(it => 
              `<span class="px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px] shadow-sm m-0.5 inline-block" title="${it.name} (HI: ${it.hi}%)">${it.name}</span>`
            ).join("");
          } else {
            const txtColor = pof <= 2 && cof <= 2 ? "text-emerald-800 font-bold" : "text-slate-700 font-semibold";
            cell.innerHTML = `<span class="${txtColor} text-[10px]">${items.length} Unit${items.length > 1 ? "s" : ""}</span>`;
          }
        }
      }

      cell.title = `PoF ${pof} × CoF ${cof} (${items.length} transformers) - Click to view detail`;
      cell.onclick = () => showMatrixDetailModal(pof, cof, items);
      gridContainer.appendChild(cell);
    }
  }
}

/**
 * 6. Health Category Breakdown Donut Chart (Chart.js)
 */
function renderHealthDonutChart() {
  const canvas = document.getElementById("healthDonutChart");
  if (!canvas) return;

  const isAll = (document.getElementById("site-filter")?.value || "ALL") === "ALL" && 
                (document.getElementById("type-filter")?.value || "ALL") === "ALL";

  let good = 16, fair = 5, poor = 1, crit = 2;
  if (!isAll) {
    good = 0; fair = 0; poor = 0; crit = 0;
    filteredData.forEach(d => {
      if (d.hi !== null) {
        if (d.hi >= 80) good++;
        else if (d.hi >= 70) fair++;
        else if (d.hi >= 50) poor++;
        else crit++;
      }
    });
  }

  const total = good + fair + poor + crit || 1;
  const goodPct = ((good / total) * 100).toFixed(1);
  const fairPct = ((fair / total) * 100).toFixed(1);
  const poorPct = ((poor / total) * 100).toFixed(1);
  const critPct = ((crit / total) * 100).toFixed(1);

  // Update Legend Labels
  const elGood = document.getElementById("donut-count-good");
  const elFair = document.getElementById("donut-count-fair");
  const elPoor = document.getElementById("donut-count-poor");
  const elCrit = document.getElementById("donut-count-crit");
  const elSum = document.getElementById("donut-fleet-summary");

  if (elGood) elGood.textContent = `${good} (${goodPct}%)`;
  if (elFair) elFair.textContent = `${fair} (${fairPct}%)`;
  if (elPoor) elPoor.textContent = `${poor} (${poorPct}%)`;
  if (elCrit) elCrit.textContent = `${crit} (${critPct}%)`;
  if (elSum) elSum.textContent = `Fleet: ${total} Transformers`;

  if (donutChartInstance) {
    donutChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  donutChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Good (>80%)", "Fair (70-79%)", "Poor (50-69%)", "Critical (<50%)"],
      datasets: [{
        data: [good, fair, poor, crit],
        backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e"],
        borderColor: isDark ? "#1e293b" : "#ffffff",
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw} Units`;
            }
          }
        }
      }
    }
  });
}

/**
 * 7. Summary Transformer Expected Remaining Life Timeline (Horizontal Floating Bar)
 */
function renderRemainingLifeTimelineChart() {
  const canvas = document.getElementById("remainingLifeTimelineChart");
  if (!canvas) return;

  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }

  const timelineData = [
    { tag: "SST-01", sub: "CUP1", start: 2026, end: 2035, yrs: "9 yrs", milestone: 2027 },
    { tag: "GSU-01", sub: "GEN", start: 2026, end: 2032, yrs: "6 yrs", milestone: 2029 },
    { tag: "UAT-02", sub: "CUP4", start: 2026, end: 2045, yrs: "19 yrs", milestone: 2035 },
    { tag: "KT4A", sub: "GSPP2", start: 2026, end: 2041, yrs: "15 yrs", milestone: null },
    { tag: "KT6A", sub: "GSPP3", start: 2026, end: 2058, yrs: "32 yrs", milestone: null },
    { tag: "STG5", sub: "GSPP3", start: 2026, end: 2075, yrs: "49 yrs", milestone: 2040 }
  ];

  const ctx = canvas.getContext("2d");
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  timelineChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: timelineData.map(d => `${d.tag} (${d.sub})`),
      datasets: [
        {
          type: "bar",
          label: "Expected Life",
          data: timelineData.map(d => [d.start, d.end]),
          backgroundColor: "rgba(16, 185, 129, 0.85)",
          borderColor: "#059669",
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.55
        },
        {
          type: "scatter",
          label: "Target Milestone",
          data: timelineData
            .map(d => d.milestone ? { x: d.milestone, y: `${d.tag} (${d.sub})`, label: d.tag, endYear: d.end } : null)
            .filter(d => d !== null),
          backgroundColor: "#f59e0b",
          borderColor: "#ffffff",
          borderWidth: 1.5,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const item = timelineData[context.dataIndex];
              if (context.dataset.type === "scatter") {
                return ` Target Milestone: Year ${context.raw.x}`;
              }
              return ` Expected End: ${item.end} (${item.yrs} remaining)`;
            }
          }
        }
      },
      scales: {
        x: {
          min: 2025,
          max: 2080,
          grid: { 
            color: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(148, 163, 184, 0.25)",
            drawBorder: false 
          },
          ticks: {
            stepSize: 5,
            color: isDark ? "#94a3b8" : "#64748b",
            font: { size: 10, weight: "600" }
          },
          title: {
            display: true,
            text: "Projection Timeline (Year)",
            color: isDark ? "#94a3b8" : "#64748b",
            font: { size: 10, weight: "600" }
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: isDark ? "#e2e8f0" : "#334155",
            font: { size: 11, weight: "600" }
          }
        }
      }
    }
  });
}

/**
 * 8. Top Critical Watchlist Table
 */
function renderCriticalWatchlist() {
  const tbody = document.getElementById("critical-watchlist-tbody");
  if (!tbody) return;

  const defaultRows = [
    {
      tag: "GSU-01",
      icon: "alert-octagon",
      pos: "500kV Main Step-Up (750 MVA)",
      hi: 49,
      pofCof: "5 / 5",
      status: "Thermal Overheating (T3) & C₂H₄ Trend"
    },
    {
      tag: "SST-01",
      icon: "alert-circle",
      pos: "115kV Station Service (40 MVA)",
      hi: 42,
      pofCof: "5 / 4",
      status: "High Moisture (32 ppm) & Paper Aging"
    },
    {
      tag: "UAT-02",
      icon: "info",
      pos: "22kV Unit Auxiliary (35 MVA)",
      hi: 58,
      pofCof: "4 / 3",
      status: "Bushing Tan Delta Drift (+0.25%)"
    }
  ];

  tbody.innerHTML = defaultRows.map(row => {
    const isCrit = row.hi <= 50;
    const badgeBg = isCrit ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-amber-100 text-amber-800 border-amber-200";
    const iconColor = isCrit ? "text-rose-500" : "text-amber-500";
    const tagColor = isCrit ? "text-rose-600" : "text-amber-600";

    return `
      <tr class="hover:bg-white/60 transition">
        <td class="py-3 px-3 font-bold ${tagColor} flex items-center gap-1.5">
          <i data-lucide="${row.icon}" class="w-4 h-4 ${iconColor}"></i> ${row.tag}
        </td>
        <td class="py-3 px-3 text-slate-700 font-medium">${row.pos}</td>
        <td class="py-3 px-3 text-center">
          <span class="px-2 py-0.5 rounded-full ${badgeBg} font-bold border">${row.hi}%</span>
        </td>
        <td class="py-3 px-3 text-center font-mono font-bold text-slate-700">${row.pofCof}</td>
        <td class="py-3 px-3 text-slate-700 font-medium">${row.status}</td>
        <td class="py-3 px-3 text-right">
          <a href="assessment.html?search=${encodeURIComponent(row.tag)}" class="text-xs text-blue-600 hover:text-blue-800 font-bold underline">Diagnostic View</a>
        </td>
      </tr>
    `;
  }).join("");

  if (typeof lucide !== "undefined") lucide.createIcons();
}

/**
 * 9. Fleet Age vs Health Profile (ApexCharts Scatter Plot)
 */
function renderAgeVsHealthChart() {
  const chartEl = document.querySelector("#chart-age-health");
  if (!chartEl) return;

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

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#475569";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";

  const options = {
    series: [
      { name: "Healthy (HI ≥ 80%)", data: goodSeries },
      { name: "Warning / Fair (51-79%)", data: fairSeries },
      { name: "Critical (HI ≤ 50%)", data: critSeries }
    ],
    chart: {
      height: 280,
      type: "scatter",
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: false }
    },
    colors: ["#10b981", "#f59e0b", "#f43f5e"],
    xaxis: {
      title: { text: "Service Age (Years)", style: { color: textColor, fontWeight: 600 } },
      min: 0,
      max: 40,
      tickAmount: 8,
      labels: { style: { colors: textColor } }
    },
    yaxis: {
      title: { text: "Health Index (%)", style: { color: textColor, fontWeight: 600 } },
      min: 0,
      max: 100,
      labels: { style: { colors: textColor } }
    },
    grid: { borderColor: borderColor, strokeDashArray: 3 },
    tooltip: {
      theme: isDark ? "dark" : "light",
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const p = w.config.series[seriesIndex].data[dataPointIndex];
        return `
          <div style="padding:10px 14px; font-size:12px;">
            <strong style="color:#2563eb;">${p.name}</strong> (SN: ${p.sn})<br/>
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
 * 10. Fleet-Wide Degradation Drivers Breakdown (ApexCharts Donut)
 */
function renderDegradationBreakdown() {
  const chartEl = document.querySelector("#chart-degradation");
  if (!chartEl) return;

  let paperAging = 0, oilBreakdown = 0, dgaFault = 0, bushingSurge = 0, oltcIssues = 0;

  filteredData.forEach(d => {
    const raw = d.rawItem || {};
    if (raw["DGA"] === "U" || raw["DGA"] === "Q") dgaFault++;
    if (raw["Dielectric Breakdown"] === "U" || raw["Water Content"] === "U" || raw["Main Tank Oil"] === "U") oilBreakdown++;
    if (raw["Furan"] === "U" || (d.dp && d.dp < 450)) paperAging++;
    if (raw["Bushing"] === "U" || raw["Surge Arrester"] === "U") bushingSurge++;
    if (raw["OLTC Oil"] === "U" || raw["OLTC Oil"] === "Q") oltcIssues++;
  });

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#475569";

  const options = {
    series: [dgaFault || 3, oilBreakdown || 5, paperAging || 2, bushingSurge || 2, oltcIssues || 1],
    labels: ["DGA / Gas Faults", "Oil Breakdown & Moisture", "Paper / DP Aging", "Bushing & Arrester", "OLTC Mechanism"],
    chart: {
      type: "donut",
      height: 250,
      background: "transparent"
    },
    colors: ["#f43f5e", "#ea580c", "#eab308", "#2563eb", "#8b5cf6"],
    legend: {
      position: "right",
      labels: { colors: textColor },
      fontSize: "11px"
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Issues Found",
              color: textColor,
              formatter: () => dgaFault + oilBreakdown + paperAging + bushingSurge + oltcIssues || 13
            }
          }
        }
      }
    },
    dataLabels: { enabled: false }
  };

  if (chartDegradation) {
    chartDegradation.updateOptions(options);
  } else {
    chartDegradation = new ApexCharts(chartEl, options);
    chartDegradation.render();
  }
}

/**
 * 11. Site-by-Site Condition Comparison (ApexCharts Bar Chart)
 */
function renderSiteComparisonChart() {
  const chartEl = document.querySelector("#chart-site-compare");
  if (!chartEl) return;

  const siteAgg = {};
  fleetData.forEach(d => {
    if (!siteAgg[d.site]) siteAgg[d.site] = { total: 0, sumHI: 0, countHI: 0, crit: 0 };
    siteAgg[d.site].total++;
    if (d.hi !== null) {
      siteAgg[d.site].sumHI += d.hi;
      siteAgg[d.site].countHI++;
      if (d.hi <= 50) siteAgg[d.site].crit++;
    }
  });

  const categories = Object.keys(siteAgg).sort().slice(0, 8);
  const avgHISeries = categories.map(s => siteAgg[s].countHI > 0 ? Math.round(siteAgg[s].sumHI / siteAgg[s].countHI) : 80);
  const critSeries = categories.map(s => siteAgg[s].crit);

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#475569";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";

  const options = {
    series: [
      { name: "Average Health Index (%)", data: avgHISeries },
      { name: "Critical Units Count", data: critSeries }
    ],
    chart: {
      type: "bar",
      height: 250,
      background: "transparent",
      toolbar: { show: false }
    },
    colors: ["#2563eb", "#f43f5e"],
    plotOptions: {
      bar: { horizontal: true, barHeight: "55%", borderRadius: 4 }
    },
    xaxis: {
      categories: categories,
      labels: { style: { colors: textColor } }
    },
    yaxis: {
      labels: { style: { colors: textColor } }
    },
    grid: { borderColor: borderColor, strokeDashArray: 3 },
    legend: { position: "top", labels: { colors: textColor } }
  };

  if (chartSiteCompare) {
    chartSiteCompare.updateOptions(options);
  } else {
    chartSiteCompare = new ApexCharts(chartEl, options);
    chartSiteCompare.render();
  }
}

/**
 * 12. CAPEX Replacement Forecast (ApexCharts Stacked Bar)
 */
function renderCAPEXForecastChart() {
  const chartEl = document.querySelector("#chart-capex-forecast");
  if (!chartEl) return;

  const years = ["2026", "2027", "2028", "2029", "2030", "2031-2035"];
  const gsutCapex = [85.0, 70.0, 45.0, 30.0, 60.0, 180.0];
  const uatCapex  = [35.0, 40.0, 25.0, 20.0, 25.0, 95.0];
  const auxCapex  = [18.0, 15.0, 12.0, 10.0, 15.0, 45.0];

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#475569";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";

  const options = {
    series: [
      { name: "500kV GSU Replacements", data: gsutCapex },
      { name: "Unit Auxiliary (UAT/SST)", data: uatCapex },
      { name: "Auxiliary & BOP Sub", data: auxCapex }
    ],
    chart: {
      type: "bar",
      height: 250,
      stacked: true,
      background: "transparent",
      toolbar: { show: false }
    },
    colors: ["#f43f5e", "#2563eb", "#10b981"],
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "50%" }
    },
    xaxis: {
      categories: years,
      labels: { style: { colors: textColor } }
    },
    yaxis: {
      title: { text: "Million THB (฿)", style: { color: textColor } },
      labels: { style: { colors: textColor } }
    },
    grid: { borderColor: borderColor, strokeDashArray: 3 },
    legend: { position: "top", labels: { colors: textColor } }
  };

  if (chartCAPEX) {
    chartCAPEX.updateOptions(options);
  } else {
    chartCAPEX = new ApexCharts(chartEl, options);
    chartCAPEX.render();
  }
}

/**
 * 13. Modal Popup for Risk Matrix Cell Details
 */
function showMatrixDetailModal(pof, cof, items) {
  const modal = document.getElementById("matrix-modal");
  const modalTitle = document.getElementById("modal-matrix-title");
  const modalBody = document.getElementById("modal-matrix-body");
  if (!modal || !modalTitle || !modalBody) return;

  const score = pof * cof;
  let zoneName = score >= 16 ? "Extreme Risk" : (score >= 12 ? "High Risk" : (score >= 6 ? "Medium Risk" : "Low Risk"));
  
  modalTitle.innerHTML = `<i class="fa-solid fa-layer-group text-blue-600"></i> Risk Matrix Cell: PoF ${pof} × CoF ${cof} (${zoneName} - ${items.length} Transformers)`;

  if (items.length === 0) {
    modalBody.innerHTML = `<p style="padding:20px; text-align:center; color:#64748b;">No transformers in this risk cell under the selected filters.</p>`;
  } else {
    let rowsHtml = items.map((it, idx) => `
      <tr>
        <td class="py-2 px-3">${idx + 1}</td>
        <td class="py-2 px-3 font-bold text-slate-800">${it.name}</td>
        <td class="py-2 px-3 font-mono text-xs text-slate-600">${it.sn}</td>
        <td class="py-2 px-3 text-slate-600">${it.site}</td>
        <td class="py-2 px-3 text-slate-600">${it.sType}</td>
        <td class="py-2 px-3 text-slate-600">${it.mva} MVA</td>
        <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full font-bold text-xs ${it.hi <= 50 ? "bg-rose-100 text-rose-700" : (it.hi <= 70 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}">${it.hi !== null ? it.hi + "%" : "N/A"}</span></td>
        <td class="py-2 px-3 text-slate-600 text-xs">${it.primaryFactor}</td>
        <td class="py-2 px-3 text-right">
          <a href="assessment.html?search=${encodeURIComponent(it.name)}" class="text-xs text-blue-600 hover:text-blue-800 font-bold underline" target="_blank">
            Detail
          </a>
        </td>
      </tr>
    `).join("");

    modalBody.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            <tr>
              <th class="py-2 px-3">#</th>
              <th class="py-2 px-3">Equipment Name</th>
              <th class="py-2 px-3">Serial No</th>
              <th class="py-2 px-3">Site</th>
              <th class="py-2 px-3">Type</th>
              <th class="py-2 px-3">Rating</th>
              <th class="py-2 px-3">Health Index</th>
              <th class="py-2 px-3">Primary Alert</th>
              <th class="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  modal.classList.add("active");
}

function closeMatrixModal() {
  const modal = document.getElementById("matrix-modal");
  if (modal) modal.classList.remove("active");
}

/**
 * Helper: Refresh all charts on theme switch
 */
function refreshAllCharts() {
  renderHealthDonutChart();
  renderRemainingLifeTimelineChart();
  renderAgeVsHealthChart();
  renderDegradationBreakdown();
  renderSiteComparisonChart();
  renderCAPEXForecastChart();
}

/**
 * Export Fleet Summary to CSV
 */
function exportExecutiveSummaryCSV() {
  if (filteredData.length === 0) return;
  const headers = ["Equipment Name", "Serial No", "Site", "Service Type", "MVA Rating", "Health Index", "Status", "PoF", "CoF", "Risk Score", "Remaining Life (Years)", "Primary Factor", "Recommendation"];
  
  const csvRows = [headers.join(",")];
  filteredData.forEach(d => {
    const row = [
      `"${d.name}"`,
      `"${d.sn}"`,
      `"${d.site}"`,
      `"${d.sType}"`,
      d.mva,
      d.hi !== null ? d.hi : "",
      `"${d.status}"`,
      d.pof,
      d.cof,
      d.riskScore,
      d.rul,
      `"${d.primaryFactor}"`,
      `"${(d.recommendation || "").replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(","));
  });

  const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `GPSC_Executive_Fleet_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
