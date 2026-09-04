/**
 * ============================================================================
 * GPSC TRANSFORMER ASSET MANAGEMENT - THEME ENGINE
 * ============================================================================
 * Provides centralized theme management, CSS variable manipulation,
 * preset definitions, import/export, and persistence across all application pages.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_CUSTOM = 'tr-custom-theme';
  const STORAGE_KEY_MODE = 'tr-dashboard-theme'; // 'dark' | 'light'

  // Curated Preset Definitions
  const THEME_PRESETS = {
    'gpsc-navy': {
      id: 'gpsc-navy',
      name: 'GPSC Classic Navy',
      mode: 'dark',
      badge: 'Default Dark',
      colors: {
        '--bg-primary': '#0d2149',
        '--bg-secondary': '#1a3b70',
        '--bg-tertiary': '#2e62b5',
        '--bg-card': 'rgba(46, 98, 181, 0.18)',
        '--border-color': 'rgba(203, 230, 249, 0.15)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#cbe6f9',
        '--text-muted': '#8eb4e0',
        '--primary': '#128edb',
        '--primary-hover': '#269cf0',
        '--primary-glow': 'rgba(18, 142, 219, 0.4)',
        '--accent': '#51b5ff',
        '--color-good': '#10b981',
        '--color-fair': '#eab308',
        '--color-poor': '#f97316',
        '--color-critical': '#ef4444',
        '--color-monitor': '#3b82f6',
        '--scada-blue-bus': '#3b82f6',
        '--scada-yellow-bus': '#eab308',
        '--scada-orange-bus': '#f97316',
        '--scada-grey-line': '#64748b',
        '--glass-blur': '12px',
        '--card-radius': '12px'
      }
    },

    'slate-light': {
      id: 'slate-light',
      name: 'Slate Modern',
      mode: 'light',
      badge: 'Clean Light',
      colors: {
        '--bg-primary': '#f8fafc',
        '--bg-secondary': '#edf2f7',
        '--bg-tertiary': '#e2e8f0',
        '--bg-card': 'rgba(255, 255, 255, 0.95)',
        '--border-color': 'rgba(0, 0, 0, 0.1)',
        '--text-primary': '#0f172a',
        '--text-secondary': '#475569',
        '--text-muted': '#94a3b8',
        '--primary': '#4f46e5',
        '--primary-hover': '#4338ca',
        '--primary-glow': 'rgba(79, 70, 229, 0.25)',
        '--accent': '#0284c7',
        '--color-good': '#059669',
        '--color-fair': '#d97706',
        '--color-poor': '#ea580c',
        '--color-critical': '#dc2626',
        '--color-monitor': '#2563eb',
        '--scada-blue-bus': '#2563eb',
        '--scada-yellow-bus': '#ca8a04',
        '--scada-orange-bus': '#ea580c',
        '--scada-grey-line': '#94a3b8',
        '--glass-blur': '8px',
        '--card-radius': '12px'
      }
    },

    'cyber-scada': {
      id: 'cyber-scada',
      name: 'Cyber SCADA Neon',
      mode: 'dark',
      badge: 'High Contrast',
      colors: {
        '--bg-primary': '#050914',
        '--bg-secondary': '#0b1329',
        '--bg-tertiary': '#111e3f',
        '--bg-card': 'rgba(11, 25, 59, 0.45)',
        '--border-color': 'rgba(0, 255, 204, 0.25)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#6ee7b7',
        '--text-muted': '#5eead4',
        '--primary': '#00f5d4',
        '--primary-hover': '#00bbf9',
        '--primary-glow': 'rgba(0, 245, 212, 0.45)',
        '--accent': '#7b2cbf',
        '--color-good': '#00f5d4',
        '--color-fair': '#fee440',
        '--color-poor': '#f77f00',
        '--color-critical': '#ff0054',
        '--color-monitor': '#00bbf9',
        '--scada-blue-bus': '#00bbf9',
        '--scada-yellow-bus': '#fee440',
        '--scada-orange-bus': '#ff0054',
        '--scada-grey-line': '#4a5568',
        '--glass-blur': '16px',
        '--card-radius': '8px'
      }
    },

    'industrial-slate': {
      id: 'industrial-slate',
      name: 'Industrial Control Room',
      mode: 'dark',
      badge: 'Utility Spec',
      colors: {
        '--bg-primary': '#111827',
        '--bg-secondary': '#1f2937',
        '--bg-tertiary': '#374151',
        '--bg-card': 'rgba(31, 41, 55, 0.65)',
        '--border-color': 'rgba(156, 163, 175, 0.2)',
        '--text-primary': '#f9fafb',
        '--text-secondary': '#d1d5db',
        '--text-muted': '#9ca3af',
        '--primary': '#38bdf8',
        '--primary-hover': '#0ea5e9',
        '--primary-glow': 'rgba(56, 189, 248, 0.35)',
        '--accent': '#f59e0b',
        '--color-good': '#10b981',
        '--color-fair': '#f59e0b',
        '--color-poor': '#f97316',
        '--color-critical': '#ef4444',
        '--color-monitor': '#60a5fa',
        '--scada-blue-bus': '#38bdf8',
        '--scada-yellow-bus': '#f59e0b',
        '--scada-orange-bus': '#f97316',
        '--scada-grey-line': '#6b7280',
        '--glass-blur': '10px',
        '--card-radius': '10px'
      }
    },

    'midnight-oled': {
      id: 'midnight-oled',
      name: 'Midnight OLED',
      mode: 'dark',
      badge: 'Pitch Black',
      colors: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#0a0a0a',
        '--bg-tertiary': '#171717',
        '--bg-card': 'rgba(23, 23, 23, 0.6)',
        '--border-color': 'rgba(255, 255, 255, 0.15)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#a3a3a3',
        '--text-muted': '#737373',
        '--primary': '#3b82f6',
        '--primary-hover': '#60a5fa',
        '--primary-glow': 'rgba(59, 130, 246, 0.5)',
        '--accent': '#8b5cf6',
        '--color-good': '#22c55e',
        '--color-fair': '#eab308',
        '--color-poor': '#f97316',
        '--color-critical': '#ef4444',
        '--color-monitor': '#3b82f6',
        '--scada-blue-bus': '#60a5fa',
        '--scada-yellow-bus': '#facc15',
        '--scada-orange-bus': '#fb923c',
        '--scada-grey-line': '#525252',
        '--glass-blur': '14px',
        '--card-radius': '14px'
      }
    },

    'emerald-eco': {
      id: 'emerald-eco',
      name: 'Emerald Eco-Grid',
      mode: 'dark',
      badge: 'Renewables',
      colors: {
        '--bg-primary': '#06201a',
        '--bg-secondary': '#0b352b',
        '--bg-tertiary': '#134e40',
        '--bg-card': 'rgba(19, 78, 64, 0.35)',
        '--border-color': 'rgba(52, 211, 153, 0.2)',
        '--text-primary': '#f0fdf4',
        '--text-secondary': '#a7f3d0',
        '--text-muted': '#6ee7b7',
        '--primary': '#10b981',
        '--primary-hover': '#059669',
        '--primary-glow': 'rgba(16, 185, 129, 0.4)',
        '--accent': '#06b6d4',
        '--color-good': '#10b981',
        '--color-fair': '#fbbf24',
        '--color-poor': '#fb923c',
        '--color-critical': '#f43f5e',
        '--color-monitor': '#2dd4bf',
        '--scada-blue-bus': '#2dd4bf',
        '--scada-yellow-bus': '#fde047',
        '--scada-orange-bus': '#fb923c',
        '--scada-grey-line': '#4b5563',
        '--glass-blur': '12px',
        '--card-radius': '12px'
      }
    },

    'sunset-amber': {
      id: 'sunset-amber',
      name: 'Sunset Thermography',
      mode: 'dark',
      badge: 'Thermal',
      colors: {
        '--bg-primary': '#1c1018',
        '--bg-secondary': '#2d1624',
        '--bg-tertiary': '#48203a',
        '--bg-card': 'rgba(72, 32, 58, 0.35)',
        '--border-color': 'rgba(251, 146, 60, 0.25)',
        '--text-primary': '#fff1f2',
        '--text-secondary': '#fed7aa',
        '--text-muted': '#fdba74',
        '--primary': '#f97316',
        '--primary-hover': '#fb923c',
        '--primary-glow': 'rgba(249, 115, 22, 0.45)',
        '--accent': '#e11d48',
        '--color-good': '#34d399',
        '--color-fair': '#fbbf24',
        '--color-poor': '#f97316',
        '--color-critical': '#ef4444',
        '--color-monitor': '#fb7185',
        '--scada-blue-bus': '#fb7185',
        '--scada-yellow-bus': '#fde047',
        '--scada-orange-bus': '#f97316',
        '--scada-grey-line': '#78716c',
        '--glass-blur': '12px',
        '--card-radius': '12px'
      }
    },

    'nordic-frost': {
      id: 'nordic-frost',
      name: 'Nordic Frost',
      mode: 'light',
      badge: 'Arctic Crisp',
      colors: {
        '--bg-primary': '#f0f4f8',
        '--bg-secondary': '#e1e8f0',
        '--bg-tertiary': '#cfdbe8',
        '--bg-card': 'rgba(255, 255, 255, 0.92)',
        '--border-color': 'rgba(148, 163, 184, 0.3)',
        '--text-primary': '#1e293b',
        '--text-secondary': '#475569',
        '--text-muted': '#64748b',
        '--primary': '#0284c7',
        '--primary-hover': '#0369a1',
        '--primary-glow': 'rgba(2, 132, 199, 0.25)',
        '--accent': '#0891b2',
        '--color-good': '#0d9488',
        '--color-fair': '#d97706',
        '--color-poor': '#ea580c',
        '--color-critical': '#e11d48',
        '--color-monitor': '#0284c7',
        '--scada-blue-bus': '#0284c7',
        '--scada-yellow-bus': '#d97706',
        '--scada-orange-bus': '#ea580c',
        '--scada-grey-line': '#94a3b8',
        '--glass-blur': '10px',
        '--card-radius': '10px'
      }
    }
  };

  const listeners = [];

  class ThemeEngineClass {
    constructor() {
      this.currentPresetId = 'gpsc-navy';
      this.customColors = {};
      this.mode = 'dark';
      this.init();
    }

    init() {
      // Check saved custom theme
      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM);
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          if (parsed && parsed.colors) {
            this.currentPresetId = parsed.presetId || 'custom';
            this.customColors = parsed.colors;
            this.applyToDOM(this.customColors);
            return;
          }
        } catch (e) {
          console.warn('[ThemeEngine] Failed to parse custom theme, falling back.', e);
        }
      }

      // Default fallback to GPSC Classic Navy
      this.applyPreset('gpsc-navy', false);
    }

    applyToDOM(colors) {
      const root = document.documentElement;
      
      const isReportPage = window.location.pathname.includes('_report') || 
                           window.location.pathname.includes('criteria_table') ||
                           window.location.pathname.includes('detail.html');
      
      if (isReportPage) {
        root.setAttribute('data-theme', 'light');
        return;
      }

      // Ensure dark base attribute on dashboard & main workspace
      root.setAttribute('data-theme', 'dark');

      // Apply CSS properties to root element inline style
      Object.entries(colors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Synchronize glowing helpers if primary changed
      if (colors['--primary'] && !colors['--primary-glow']) {
        const glow = this.hexToRgba(colors['--primary'], 0.35);
        if (glow) root.style.setProperty('--primary-glow', glow);
      }

      // Notify subscribers
      this.notifyListeners({
        colors: { ...colors },
        presetId: this.currentPresetId
      });
    }

    applyPreset(presetId, save = true) {
      const preset = THEME_PRESETS[presetId];
      if (!preset) return false;

      this.currentPresetId = presetId;
      this.customColors = { ...preset.colors };

      this.applyToDOM(this.customColors);

      if (save) {
        this.saveCurrentTheme();
      }
      return true;
    }

    setCustomColor(property, value, autoSave = true) {
      this.customColors[property] = value;
      this.currentPresetId = 'custom';
      
      // Real-time DOM update
      document.documentElement.style.setProperty(property, value);

      // Auto-compute glow if primary color
      if (property === '--primary') {
        const glow = this.hexToRgba(value, 0.4);
        if (glow) {
          this.customColors['--primary-glow'] = glow;
          document.documentElement.style.setProperty('--primary-glow', glow);
        }
      }

      if (autoSave) {
        this.saveCurrentTheme();
      }

      this.notifyListeners({
        colors: { ...this.customColors },
        presetId: 'custom'
      });
    }

    toggleMode() {
      // Deprecated: binary dark/light mode toggle removed per user request
    }

    setMode() {
      // Deprecated: binary dark/light mode toggle removed per user request
    }

    saveCurrentTheme() {
      const payload = {
        presetId: this.currentPresetId,
        colors: this.customColors,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(payload));
    }

    resetToDefault() {
      localStorage.removeItem(STORAGE_KEY_CUSTOM);
      localStorage.removeItem(STORAGE_KEY_MODE);
      const root = document.documentElement;
      Object.keys(THEME_PRESETS['gpsc-navy'].colors).forEach(prop => {
        root.style.removeProperty(prop);
      });
      this.applyPreset('gpsc-navy', false);
    }

    getPresets() {
      return THEME_PRESETS;
    }

    getCurrentTheme() {
      return {
        presetId: this.currentPresetId,
        mode: this.mode,
        colors: { ...this.customColors }
      };
    }

    exportJSON() {
      return JSON.stringify({
        version: '1.0',
        name: this.currentPresetId === 'custom' ? 'Custom Theme' : (THEME_PRESETS[this.currentPresetId]?.name || 'Custom Theme'),
        mode: this.mode,
        colors: this.customColors
      }, null, 2);
    }

    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || !parsed.colors) {
          throw new Error('Invalid theme format. Missing colors object.');
        }
        this.currentPresetId = 'custom';
        this.customColors = { ...parsed.colors };
        this.applyToDOM(this.customColors);
        this.saveCurrentTheme();
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    generateCSS() {
      const selector = ':root';
      const lines = Object.entries(this.customColors).map(([prop, val]) => `  ${prop}: ${val};`);
      return `/* GPSC Transformer Dashboard Custom Theme */\n${selector} {\n${lines.join('\n')}\n}`;
    }

    hexToRgba(hex, alpha = 1) {
      if (!hex || typeof hex !== 'string') return null;
      let clean = hex.replace('#', '').trim();
      if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
      }
      if (clean.length !== 6) return null;
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    onChange(cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
      }
    }

    notifyListeners(data) {
      listeners.forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }

  // Initialize singleton immediately so styles apply before render
  window.ThemeEngine = new ThemeEngineClass();

})(window);
