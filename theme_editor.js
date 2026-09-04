/**
 * ============================================================================
 * GPSC TRANSFORMER ASSET MANAGEMENT - INTERACTIVE THEME EDITOR
 * ============================================================================
 * Provides interactive slide-over drawer and standalone studio controls,
 * color pickers, presets, real-time live preview, and export/import tools.
 */

(function (window) {
  'use strict';

  // Definitions of editable variables grouped by category
  const COLOR_CONFIG = [
    {
      group: 'Brand & Accents',
      items: [
        { key: '--primary', label: 'Primary Brand', desc: 'Active tabs, primary buttons, KPIs' },
        { key: '--primary-hover', label: 'Primary Hover', desc: 'Button and link hover state' },
        { key: '--accent', label: 'Accent Highlight', desc: 'Secondary icons, badges, and glows' }
      ]
    },
    {
      group: 'Surfaces & Backgrounds',
      items: [
        { key: '--bg-primary', label: 'Primary Background', desc: 'Main canvas & header backdrop' },
        { key: '--bg-secondary', label: 'Secondary Surface', desc: 'Sidebar, cards, and modal header' },
        { key: '--bg-card', label: 'Card Surface', desc: 'Content cards & metric containers' },
        { key: '--border-color', label: 'Border & Divider', desc: 'Subtle frame & card outlines' }
      ]
    },
    {
      group: 'Typography',
      items: [
        { key: '--text-primary', label: 'Primary Text', desc: 'Titles, major labels, high contrast' },
        { key: '--text-secondary', label: 'Secondary Text', desc: 'Subheadings, table text, metadata' },
        { key: '--text-muted', label: 'Muted Text', desc: 'Helper notes, timestamps, units' }
      ]
    },
    {
      group: 'Health Status & Diagnostics',
      items: [
        { key: '--color-good', label: 'Healthy (≥ 80%)', desc: 'Normal operation & good status' },
        { key: '--color-fair', label: 'Fair (51 - 79%)', desc: 'Moderate condition, monitor' },
        { key: '--color-poor', label: 'Poor / Warning', desc: 'Accelerated aging alert' },
        { key: '--color-critical', label: 'Critical (≤ 50%)', desc: 'Urgent investigation & action' },
        { key: '--color-monitor', label: 'Special Monitoring', desc: 'Flagged diagnostic parameter' }
      ]
    },
    {
      group: 'SCADA Voltage Network',
      items: [
        { key: '--scada-blue-bus', label: '115 kV Bus', desc: 'High voltage transmission lines' },
        { key: '--scada-yellow-bus', label: '22 kV Bus', desc: 'Medium voltage distribution' },
        { key: '--scada-orange-bus', label: '6.9 kV Bus', desc: 'Generator & auxiliary bus' },
        { key: '--scada-grey-line', label: 'Neutral / Lines', desc: 'Neutral ground & connections' }
      ]
    }
  ];

  class ThemeEditorUI {
    constructor() {
      this.drawerEl = null;
      this.backdropEl = null;
      this.toastEl = null;
      this.isOpen = false;
      this.isStandalone = false;
      this.init();
    }

    init() {
      // Check if we are in the standalone theme_editor.html page
      const studioRoot = document.getElementById('theme-studio-app');
      if (studioRoot) {
        this.isStandalone = true;
        this.renderStandalone(studioRoot);
      } else {
        // Embed the slide-over drawer into document.body
        this.renderDrawer();
      }

      this.createToast();
      this.bindTriggers();
      this.syncUIWithTheme();

      // Listen for theme engine changes from any source
      if (window.ThemeEngine) {
        window.ThemeEngine.onChange(() => {
          this.syncUIWithTheme();
        });
      }
    }

    /* ------------------------------------------------------------------------
       Drawer Markup & Mounting
       ------------------------------------------------------------------------ */
    renderDrawer() {
      // Create backdrop
      this.backdropEl = document.createElement('div');
      this.backdropEl.className = 'theme-drawer-backdrop';
      this.backdropEl.addEventListener('click', () => this.close());
      document.body.appendChild(this.backdropEl);

      // Create drawer
      this.drawerEl = document.createElement('div');
      this.drawerEl.className = 'theme-drawer';
      this.drawerEl.innerHTML = `
        <div class="theme-drawer-header">
          <div class="theme-drawer-title">
            <i class="fa-solid fa-palette"></i>
            <span>Theme Studio</span>
          </div>
          <div class="theme-drawer-actions">
            <button class="theme-btn theme-btn-secondary theme-btn-icon-only" id="td-randomize-btn" title="Generate Harmonious Palette">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
            <button class="theme-close-btn" id="td-close-btn" title="Close Drawer (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div class="theme-drawer-body" id="td-body">
          <!-- Presets Section -->
          <div>
            <div class="theme-section-title">
              <span>Theme Presets</span>
              <span class="badge" id="td-active-preset-badge">Default</span>
            </div>
            <div class="preset-grid" id="td-preset-grid"></div>
          </div>

          <!-- Live Mini-Preview -->
          <div>
            <div class="theme-section-title">
              <span>Interactive Preview</span>
            </div>
            <div class="theme-preview-box" id="td-preview-box">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">TR-115/22kV (GEN-1)</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">Rayong Substation</span>
              </div>
              <div class="preview-badge-row">
                <span class="preview-pill good"><i class="fa-solid fa-shield-halved"></i> HI: 92.4%</span>
                <span class="preview-pill fair">DGA Alert</span>
                <span class="preview-pill critical">Bushing PF</span>
              </div>
              <div class="preview-scada-line">
                <span style="color: var(--scada-blue-bus);">115kV</span>
                <div class="preview-bus" style="background: var(--scada-blue-bus);"></div>
                <span style="color: var(--scada-yellow-bus);">22kV</span>
                <div class="preview-bus" style="background: var(--scada-yellow-bus);"></div>
                <span style="color: var(--scada-orange-bus);">6.9kV</span>
                <div class="preview-bus" style="background: var(--scada-orange-bus);"></div>
              </div>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.2rem;">
                <button class="theme-btn theme-btn-primary" style="flex: 1; font-size: 0.75rem; padding: 0.4rem;">Primary Action</button>
                <button class="theme-btn theme-btn-secondary" style="flex: 1; font-size: 0.75rem; padding: 0.4rem;">Secondary</button>
              </div>
            </div>
          </div>

          <!-- Color Customizer Groups -->
          <div id="td-controls-container"></div>

          <!-- Sliders -->
          <div>
            <div class="theme-section-title">
              <span>Interface Refinements</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.8rem;">
              <div class="theme-slider-group">
                <div class="theme-slider-header">
                  <span>Card Corner Radius</span>
                  <span id="td-val-radius">12px</span>
                </div>
                <input type="range" class="theme-slider" id="td-slider-radius" min="4" max="24" value="12" />
              </div>
              <div class="theme-slider-group">
                <div class="theme-slider-header">
                  <span>Glassmorphism Blur</span>
                  <span id="td-val-blur">12px</span>
                </div>
                <input type="range" class="theme-slider" id="td-slider-blur" min="0" max="24" value="12" />
              </div>
            </div>
          </div>
        </div>

        <div class="theme-drawer-footer">
          <div style="display: flex; gap: 0.4rem;">
            <button class="theme-btn theme-btn-secondary" id="td-copy-css-btn" title="Copy CSS Variables snippet">
              <i class="fa-solid fa-code"></i> CSS
            </button>
            <button class="theme-btn theme-btn-secondary" id="td-export-btn" title="Export theme as JSON">
              <i class="fa-solid fa-download"></i> JSON
            </button>
            <button class="theme-btn theme-btn-secondary" id="td-import-btn" title="Import theme JSON">
              <i class="fa-solid fa-upload"></i>
            </button>
            <input type="file" id="td-file-input" accept=".json" style="display: none;" />
          </div>
          <button class="theme-btn theme-btn-danger" id="td-reset-btn" title="Reset to GPSC Default">
            <i class="fa-solid fa-rotate-left"></i> Reset
          </button>
        </div>
      `;

      document.body.appendChild(this.drawerEl);

      // Render preset cards and color controls
      this.populatePresets('td-preset-grid');
      this.populateColorControls('td-controls-container');
      this.bindDrawerEvents();
    }

    /* ------------------------------------------------------------------------
       Standalone Studio Page (theme_editor.html)
       ------------------------------------------------------------------------ */
    renderStandalone(container) {
      container.innerHTML = `
        <div class="studio-layout">
          <!-- Left: Controls Panel -->
          <div class="studio-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-sliders" style="color: var(--primary);"></i> Theme Customizer
              </h2>
              <div style="display: flex; gap: 0.4rem;">
                <button class="theme-btn theme-btn-secondary" id="td-randomize-btn" title="Generate Harmonious Palette">
                  <i class="fa-solid fa-wand-magic-sparkles"></i> AI Randomize
                </button>
                <button class="theme-btn theme-btn-danger" id="td-reset-btn">
                  <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
              </div>
            </div>

            <!-- Presets -->
            <div style="margin-bottom: 1.5rem;">
              <div class="theme-section-title">
                <span>Select Curated Preset</span>
                <span class="badge" id="td-active-preset-badge">Default</span>
              </div>
              <div class="preset-grid" id="td-preset-grid"></div>
            </div>

            <!-- Color controls -->
            <div id="td-controls-container" style="margin-bottom: 1.5rem;"></div>

            <!-- Sliders -->
            <div style="margin-bottom: 1.5rem;">
              <div class="theme-section-title"><span>Interface Dynamics</span></div>
              <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                <div class="theme-slider-group">
                  <div class="theme-slider-header">
                    <span>Card Corner Radius</span>
                    <span id="td-val-radius">12px</span>
                  </div>
                  <input type="range" class="theme-slider" id="td-slider-radius" min="4" max="24" value="12" />
                </div>
                <div class="theme-slider-group">
                  <div class="theme-slider-header">
                    <span>Glassmorphism Blur</span>
                    <span id="td-val-blur">12px</span>
                  </div>
                  <input type="range" class="theme-slider" id="td-slider-blur" min="0" max="24" value="12" />
                </div>
              </div>
            </div>

            <!-- Export / Import Actions -->
            <div style="display: flex; gap: 0.5rem; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <button class="theme-btn theme-btn-primary" id="td-copy-css-btn">
                <i class="fa-solid fa-copy"></i> Copy CSS Variables
              </button>
              <div style="display: flex; gap: 0.4rem;">
                <button class="theme-btn theme-btn-secondary" id="td-export-btn">
                  <i class="fa-solid fa-download"></i> Export JSON
                </button>
                <button class="theme-btn theme-btn-secondary" id="td-import-btn">
                  <i class="fa-solid fa-upload"></i> Import JSON
                </button>
                <input type="file" id="td-file-input" accept=".json" style="display: none;" />
              </div>
            </div>
          </div>

          <!-- Right: Interactive Preview Sandbox -->
          <div class="studio-preview-pane">
            <!-- Top KPI Cards -->
            <div class="studio-kpi-grid">
              <div class="studio-kpi-card" style="border-top: 3px solid var(--color-good);">
                <div class="studio-kpi-label">Fleet Average Health</div>
                <div class="studio-kpi-value" style="color: var(--color-good);">88.6%</div>
                <div style="font-size: 0.75rem; color: var(--color-good); display: flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-arrow-trend-up"></i> +2.1% this quarter
                </div>
              </div>
              <div class="studio-kpi-card" style="border-top: 3px solid var(--primary);">
                <div class="studio-kpi-label">Monitored Transformers</div>
                <div class="studio-kpi-value">48 <span style="font-size: 1rem; color: var(--text-muted);">Units</span></div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">100% Online Telemetry</div>
              </div>
              <div class="studio-kpi-card" style="border-top: 3px solid var(--color-fair);">
                <div class="studio-kpi-label">Fair Condition Watchlist</div>
                <div class="studio-kpi-value" style="color: var(--color-fair);">5 <span style="font-size: 1rem; color: var(--text-muted);">Units</span></div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Scheduled DGA & Oil Sampling</div>
              </div>
              <div class="studio-kpi-card" style="border-top: 3px solid var(--color-critical);">
                <div class="studio-kpi-label">Critical Immediate Action</div>
                <div class="studio-kpi-value" style="color: var(--color-critical);">1 <span style="font-size: 1rem; color: var(--text-muted);">Unit</span></div>
                <div style="font-size: 0.75rem; color: var(--color-critical);">Rayong T3 Bushing PF Spike</div>
              </div>
            </div>

            <!-- SCADA Single Line Interactive Snippet -->
            <div class="studio-panel">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                  <i class="fa-solid fa-network-wired" style="color: var(--primary); margin-right: 0.4rem;"></i> SCADA Busbar Voltage Diagram
                </h3>
                <div style="display: flex; gap: 0.5rem;">
                  <span class="preview-pill" style="background: rgba(59, 130, 246, 0.2); color: var(--scada-blue-bus); border: 1px solid var(--scada-blue-bus);">115 kV Bus</span>
                  <span class="preview-pill" style="background: rgba(234, 179, 8, 0.2); color: var(--scada-yellow-bus); border: 1px solid var(--scada-yellow-bus);">22 kV Bus</span>
                  <span class="preview-pill" style="background: rgba(249, 115, 22, 0.2); color: var(--scada-orange-bus); border: 1px solid var(--scada-orange-bus);">6.9 kV Bus</span>
                </div>
              </div>

              <!-- Visual Bus Diagram Simulation -->
              <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.2rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--scada-blue-bus); margin-bottom: 4px;">
                    <span>HIGH VOLTAGE FEEDER 115 kV BUS A</span>
                    <span>115.4 kV | 50.02 Hz</span>
                  </div>
                  <div style="height: 8px; border-radius: 4px; background: var(--scada-blue-bus); box-shadow: 0 0 10px var(--scada-blue-bus);"></div>
                </div>

                <div style="display: flex; justify-content: space-around; align-items: center; padding: 0.5rem 0;">
                  <div style="border: 2px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; background: var(--bg-card); text-align: center;">
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">TR-01 (50 MVA)</div>
                    <div style="color: var(--color-good); font-size: 0.75rem; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> HI: 94.2%</div>
                  </div>
                  <div style="border: 2px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; background: var(--bg-card); text-align: center;">
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">TR-02 (25 MVA)</div>
                    <div style="color: var(--color-fair); font-size: 0.75rem; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> HI: 71.8%</div>
                  </div>
                  <div style="border: 2px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; background: var(--bg-card); text-align: center;">
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">TR-03 (35 MVA)</div>
                    <div style="color: var(--color-critical); font-size: 0.75rem; font-weight: 600;"><i class="fa-solid fa-circle-exclamation"></i> HI: 44.5%</div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--scada-yellow-bus); margin-bottom: 4px;">
                    <span>DISTRIBUTION 22 kV BUS B</span>
                    <span>22.1 kV | 49.99 Hz</span>
                  </div>
                  <div style="height: 8px; border-radius: 4px; background: var(--scada-yellow-bus); box-shadow: 0 0 10px var(--scada-yellow-bus);"></div>
                </div>
              </div>
            </div>

            <!-- Sample Data Table Preview -->
            <div class="studio-panel">
              <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1rem 0;">
                <i class="fa-solid fa-table-list" style="color: var(--primary); margin-right: 0.4rem;"></i> Live Data Table & Badge Styling
              </h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted);">
                      <th style="padding: 0.6rem;">Transformer Tag</th>
                      <th style="padding: 0.6rem;">Plant / Site</th>
                      <th style="padding: 0.6rem;">Rating</th>
                      <th style="padding: 0.6rem;">Health Index</th>
                      <th style="padding: 0.6rem;">Status</th>
                      <th style="padding: 0.6rem;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-primary);">
                      <td style="padding: 0.65rem; font-weight: 600;">11-TR-01</td>
                      <td style="padding: 0.65rem; color: var(--text-secondary);">GHECO-One</td>
                      <td style="padding: 0.65rem;">115 / 22 kV</td>
                      <td style="padding: 0.65rem; font-weight: 700; color: var(--color-good);">94.5%</td>
                      <td style="padding: 0.65rem;"><span class="preview-pill good">Healthy</span></td>
                      <td style="padding: 0.65rem;"><button class="theme-btn theme-btn-primary" style="font-size: 0.7rem; padding: 0.3rem 0.6rem;">Inspect</button></td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-primary);">
                      <td style="padding: 0.65rem; font-weight: 600;">22-TR-04</td>
                      <td style="padding: 0.65rem; color: var(--text-secondary);">CUP-3</td>
                      <td style="padding: 0.65rem;">115 / 6.9 kV</td>
                      <td style="padding: 0.65rem; font-weight: 700; color: var(--color-fair);">68.2%</td>
                      <td style="padding: 0.65rem;"><span class="preview-pill fair">Fair</span></td>
                      <td style="padding: 0.65rem;"><button class="theme-btn theme-btn-secondary" style="font-size: 0.7rem; padding: 0.3rem 0.6rem;">Inspect</button></td>
                    </tr>
                    <tr style="color: var(--text-primary);">
                      <td style="padding: 0.65rem; font-weight: 600;">03-TR-09</td>
                      <td style="padding: 0.65rem; color: var(--text-secondary);">Sriracha Power</td>
                      <td style="padding: 0.65rem;">115 / 22 kV</td>
                      <td style="padding: 0.65rem; font-weight: 700; color: var(--color-critical);">41.0%</td>
                      <td style="padding: 0.65rem;"><span class="preview-pill critical">Critical</span></td>
                      <td style="padding: 0.65rem;"><button class="theme-btn theme-btn-danger" style="font-size: 0.7rem; padding: 0.3rem 0.6rem;">Action Required</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Real-Time CSS Code Generation View -->
            <div class="studio-panel">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                  <i class="fa-solid fa-code" style="color: var(--primary); margin-right: 0.4rem;"></i> Live Generated CSS Variables
                </h3>
              </div>
              <div class="studio-code-box">
                <button class="studio-code-copy-btn" id="studio-copy-code-btn"><i class="fa-solid fa-copy"></i> Copy Code</button>
                <pre id="studio-css-pre" style="margin: 0;"></pre>
              </div>
            </div>
          </div>
        </div>
      `;

      this.populatePresets('td-preset-grid');
      this.populateColorControls('td-controls-container');
      this.bindDrawerEvents();

      // Hook up standalone copy code button
      const copyCodeBtn = document.getElementById('studio-copy-code-btn');
      if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
          this.copyCSS();
        });
      }
    }

    /* ------------------------------------------------------------------------
       Preset Grid Population
       ------------------------------------------------------------------------ */
    populatePresets(containerId) {
      const container = document.getElementById(containerId);
      if (!container || !window.ThemeEngine) return;

      const presets = window.ThemeEngine.getPresets();
      const current = window.ThemeEngine.getCurrentTheme();

      container.innerHTML = Object.values(presets).map(p => {
        const isActive = current.presetId === p.id;
        const bgSwatch = p.colors['--bg-primary'] || '#0d2149';
        const primarySwatch = p.colors['--primary'] || '#128edb';
        const accentSwatch = p.colors['--accent'] || '#51b5ff';
        const scadaSwatch = p.colors['--scada-yellow-bus'] || '#eab308';

        return `
          <div class="preset-card ${isActive ? 'active' : ''}" data-preset-id="${p.id}">
            <div class="preset-card-header">
              <span class="preset-name">${p.name}</span>
              <span class="preset-badge">${p.badge}</span>
            </div>
            <div class="preset-swatches">
              <div class="preset-swatch" style="background: ${bgSwatch};"></div>
              <div class="preset-swatch" style="background: ${primarySwatch};"></div>
              <div class="preset-swatch" style="background: ${accentSwatch};"></div>
              <div class="preset-swatch" style="background: ${scadaSwatch};"></div>
            </div>
          </div>
        `;
      }).join('');

      // Add click listeners to preset cards
      container.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', () => {
          const presetId = card.getAttribute('data-preset-id');
          if (window.ThemeEngine) {
            window.ThemeEngine.applyPreset(presetId, true);
            this.showToast(`Applied preset: ${presets[presetId]?.name}`);
          }
        });
      });
    }

    /* ------------------------------------------------------------------------
       Color Controls Population
       ------------------------------------------------------------------------ */
    populateColorControls(containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = COLOR_CONFIG.map(group => {
        const rows = group.items.map(item => {
          return `
            <div class="theme-control-row">
              <div class="theme-control-label">
                <span class="theme-label-name">${item.label}</span>
                <span class="theme-label-desc">${item.desc}</span>
              </div>
              <div class="theme-picker-wrapper">
                <input type="color" class="theme-color-input" data-color-key="${item.key}" id="picker-${item.key.replace('--', '')}">
                <input type="text" class="theme-hex-input" data-hex-key="${item.key}" id="hex-${item.key.replace('--', '')}">
              </div>
            </div>
          `;
        }).join('');

        return `
          <div style="margin-bottom: 1.25rem;">
            <div class="theme-section-title">
              <span>${group.group}</span>
            </div>
            <div class="theme-controls-list">
              ${rows}
            </div>
          </div>
        `;
      }).join('');

      // Bind input events to pickers and hex inputs
      container.querySelectorAll('.theme-color-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const key = e.target.getAttribute('data-color-key');
          const val = e.target.value;
          const hexInput = container.querySelector(`[data-hex-key="${key}"]`);
          if (hexInput) hexInput.value = val.toUpperCase();
          if (window.ThemeEngine) {
            window.ThemeEngine.setCustomColor(key, val, true);
          }
        });
      });

      container.querySelectorAll('.theme-hex-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const key = e.target.getAttribute('data-hex-key');
          let val = e.target.value.trim();
          if (!val.startsWith('#') && (val.length === 6 || val.length === 3)) {
            val = '#' + val;
          }
          if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
            const picker = container.querySelector(`[data-color-key="${key}"]`);
            if (picker) picker.value = val;
            if (window.ThemeEngine) {
              window.ThemeEngine.setCustomColor(key, val, true);
            }
          }
        });
      });
    }

    /* ------------------------------------------------------------------------
       Drawer Event Listeners & Actions
       ------------------------------------------------------------------------ */
    bindDrawerEvents() {
      // Close button
      const closeBtn = document.getElementById('td-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      // Sliders
      const radiusSlider = document.getElementById('td-slider-radius');
      const valRadius = document.getElementById('td-val-radius');
      if (radiusSlider) {
        radiusSlider.addEventListener('input', (e) => {
          const val = `${e.target.value}px`;
          if (valRadius) valRadius.textContent = val;
          if (window.ThemeEngine) window.ThemeEngine.setCustomColor('--card-radius', val, true);
        });
      }

      const blurSlider = document.getElementById('td-slider-blur');
      const valBlur = document.getElementById('td-val-blur');
      if (blurSlider) {
        blurSlider.addEventListener('input', (e) => {
          const val = `${e.target.value}px`;
          if (valBlur) valBlur.textContent = val;
          if (window.ThemeEngine) window.ThemeEngine.setCustomColor('--glass-blur', val, true);
        });
      }

      // Randomize / Harmonious Generator
      const randomBtn = document.getElementById('td-randomize-btn');
      if (randomBtn) {
        randomBtn.addEventListener('click', () => this.generateRandomPalette());
      }

      // Copy CSS
      const copyBtn = document.getElementById('td-copy-css-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyCSS());
      }

      // Export JSON
      const exportBtn = document.getElementById('td-export-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportJSON());
      }

      // Import JSON
      const importBtn = document.getElementById('td-import-btn');
      const fileInput = document.getElementById('td-file-input');
      if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileImport(e));
      }

      // Reset
      const resetBtn = document.getElementById('td-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Reset theme back to default GPSC settings?')) {
            if (window.ThemeEngine) {
              window.ThemeEngine.resetToDefault();
              this.showToast('Theme reset to default!');
            }
          }
        });
      }
    }

    /* ------------------------------------------------------------------------
       Sync UI Pickers with current active theme
       ------------------------------------------------------------------------ */
    syncUIWithTheme() {
      if (!window.ThemeEngine) return;
      const theme = window.ThemeEngine.getCurrentTheme();

      // Update active preset badge
      const badge = document.getElementById('td-active-preset-badge');
      if (badge) {
        badge.textContent = theme.presetId === 'custom' ? 'Customized' : (window.ThemeEngine.getPresets()[theme.presetId]?.name || 'Active');
      }

      // Highlight active preset card
      document.querySelectorAll('.preset-card').forEach(card => {
        const id = card.getAttribute('data-preset-id');
        card.classList.toggle('active', id === theme.presetId);
      });

      // Update all color inputs
      COLOR_CONFIG.forEach(group => {
        group.items.forEach(item => {
          let val = theme.colors[item.key];
          if (!val) {
            // Computed from style
            val = getComputedStyle(document.documentElement).getPropertyValue(item.key).trim();
          }

          // Convert rgba to hex if necessary
          const hex = this.anyColorToHex(val) || '#128edb';

          const picker = document.querySelector(`[data-color-key="${item.key}"]`);
          const hexInput = document.querySelector(`[data-hex-key="${item.key}"]`);

          if (picker) picker.value = hex;
          if (hexInput) hexInput.value = hex.toUpperCase();
        });
      });

      // Update CSS code view if on standalone page
      const cssPre = document.getElementById('studio-css-pre');
      if (cssPre) {
        cssPre.textContent = window.ThemeEngine.generateCSS();
      }
    }

    /* ------------------------------------------------------------------------
       Triggers (Keyboard shortcut Alt+T, Header button)
       ------------------------------------------------------------------------ */
    bindTriggers() {
      // Global shortcut Alt+T or Ctrl+Shift+T
      window.addEventListener('keydown', (e) => {
        if ((e.altKey && (e.key === 't' || e.key === 'T')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 't' || e.key === 'T'))) {
          e.preventDefault();
          this.toggle();
        }
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });

      // Header button hook: wire up any element with class .theme-studio-btn or id theme-studio-btn
      document.querySelectorAll('.theme-studio-btn, #theme-studio-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggle();
        });
      });
    }

    toggle() {
      if (this.isStandalone) return;
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      if (!this.drawerEl) return;
      this.isOpen = true;
      this.drawerEl.classList.add('active');
      if (this.backdropEl) this.backdropEl.classList.add('active');
      this.syncUIWithTheme();
    }

    close() {
      if (!this.drawerEl) return;
      this.isOpen = false;
      this.drawerEl.classList.remove('active');
      if (this.backdropEl) this.backdropEl.classList.remove('active');
    }

    /* ------------------------------------------------------------------------
       Harmonious AI Palette Generator
       ------------------------------------------------------------------------ */
    generateRandomPalette() {
      if (!window.ThemeEngine) return;

      // Generate a pleasant random hue
      const baseHue = Math.floor(Math.random() * 360);
      const isDark = window.ThemeEngine.mode === 'dark';

      const primary = this.hslToHex(baseHue, 80, isDark ? 55 : 45);
      const primaryHover = this.hslToHex(baseHue, 85, isDark ? 65 : 38);
      const accent = this.hslToHex((baseHue + 40) % 360, 90, isDark ? 60 : 50);

      let bgPrimary, bgSecondary, bgCard, borderColor;
      if (isDark) {
        bgPrimary = this.hslToHex(baseHue, 35, 12);
        bgSecondary = this.hslToHex(baseHue, 30, 18);
        bgCard = `rgba(${this.hexToRgb(this.hslToHex(baseHue, 30, 24))}, 0.35)`;
        borderColor = `rgba(255, 255, 255, 0.12)`;
      } else {
        bgPrimary = this.hslToHex(baseHue, 20, 96);
        bgSecondary = this.hslToHex(baseHue, 20, 92);
        bgCard = '#ffffff';
        borderColor = 'rgba(0, 0, 0, 0.1)';
      }

      window.ThemeEngine.setCustomColor('--primary', primary, false);
      window.ThemeEngine.setCustomColor('--primary-hover', primaryHover, false);
      window.ThemeEngine.setCustomColor('--accent', accent, false);
      window.ThemeEngine.setCustomColor('--bg-primary', bgPrimary, false);
      window.ThemeEngine.setCustomColor('--bg-secondary', bgSecondary, false);
      window.ThemeEngine.setCustomColor('--bg-card', bgCard, false);
      window.ThemeEngine.setCustomColor('--border-color', borderColor, true);

      this.showToast('Generated new harmonious palette! ✨');
    }

    /* ------------------------------------------------------------------------
       Copy CSS & Import/Export
       ------------------------------------------------------------------------ */
    copyCSS() {
      if (!window.ThemeEngine) return;
      const css = window.ThemeEngine.generateCSS();
      navigator.clipboard.writeText(css).then(() => {
        this.showToast('CSS variables copied to clipboard! 📋');
      }).catch(() => {
        this.showToast('Failed to copy. Please copy manually.');
      });
    }

    exportJSON() {
      if (!window.ThemeEngine) return;
      const json = window.ThemeEngine.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gpsc-theme-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Theme JSON downloaded! 💾');
    }

    handleFileImport(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = window.ThemeEngine.importJSON(event.target.result);
        if (result.success) {
          this.showToast('Custom theme imported successfully! 🎉');
        } else {
          alert('Import failed: ' + result.error);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    /* ------------------------------------------------------------------------
       Toast System
       ------------------------------------------------------------------------ */
    createToast() {
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'theme-toast';
      this.toastEl.innerHTML = `
        <i class="fa-solid fa-circle-check" style="color: var(--color-good, #10b981);"></i>
        <span id="theme-toast-msg">Theme updated</span>
      `;
      document.body.appendChild(this.toastEl);
    }

    showToast(message) {
      if (!this.toastEl) return;
      const msgEl = document.getElementById('theme-toast-msg');
      if (msgEl) msgEl.textContent = message;
      this.toastEl.classList.add('active');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.toastEl.classList.remove('active');
      }, 3000);
    }

    /* ------------------------------------------------------------------------
       Color Conversion Utilities
       ------------------------------------------------------------------------ */
    anyColorToHex(color) {
      if (!color) return null;
      color = color.trim();
      if (color.startsWith('#')) {
        if (color.length === 4) {
          return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return color.substring(0, 7);
      }
      if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]).toString(16).padStart(2, '0');
          const g = parseInt(matches[1]).toString(16).padStart(2, '0');
          const b = parseInt(matches[2]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }
      return null;
    }

    hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const num = parseInt(hex, 16);
      return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
    }

    hslToHex(h, s, l) {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    }
  }

  // Initialize UI once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ThemeEditor = new ThemeEditorUI();
    });
  } else {
    window.ThemeEditor = new ThemeEditorUI();
  }

})(window);
