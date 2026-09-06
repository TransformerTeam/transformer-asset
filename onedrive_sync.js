/**
 * GPSC Transformer Asset Management - Enterprise OneDrive / SharePoint Sync Engine
 * Handles Two-Way Synchronization between Web Applications and Corporate Microsoft 365
 */

(function (window) {
  'use strict';

  const STORAGE_CONFIG_KEY = 'GPSC_ONEDRIVE_SYNC_CONFIG';
  const DEFAULT_CONFIG = {
    mode: 'auto', // 'auto', 'cloud', 'lan', 'standalone'
    webhookUrl: '',
    autoSync: true,
    lastSyncTime: null,
    syncIntervalSec: 60
  };

  let config = Object.assign({}, DEFAULT_CONFIG);
  try {
    const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (saved) config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
  } catch (e) {}

  let syncState = 'idle'; // 'idle', 'syncing', 'synced', 'error'
  let listeners = [];
  let syncTimer = null;

  function isLanServer() {
    const port = window.location.port;
    const host = window.location.hostname;
    return (port === '8888' || port === '3000' || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.'));
  }

  function getActiveMode() {
    if (config.mode === 'cloud' && config.webhookUrl) return 'cloud';
    if (config.mode === 'lan') return 'lan';
    if (config.mode === 'standalone') return 'standalone';
    // Auto detection
    if (config.webhookUrl) return 'cloud';
    if (isLanServer()) return 'lan';
    return 'standalone';
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {}
    updateBadgeUI();
  }

  function notifyListeners(eventType, data) {
    listeners.forEach(fn => {
      try { fn(eventType, data); } catch (err) { console.error('OneDriveSync listener error:', err); }
    });
  }

  // --- API: PUSH PLAN DATA ---
  async function pushPlanData(tasks) {
    const mode = getActiveMode();
    if (mode === 'standalone') return { success: true, mode: 'standalone' };

    setSyncState('syncing');
    try {
      if (mode === 'lan') {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: tasks, timestamp: new Date().toISOString() })
        });
        if (!res.ok) throw new Error('LAN Server responded with HTTP ' + res.status);
        config.lastSyncTime = new Date().toISOString();
        saveConfig();
        setSyncState('synced');
        showToast('Saved & Synced with LAN OneDrive folder', 'success');
        return { success: true, mode: 'lan' };
      } else if (mode === 'cloud') {
        const res = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SAVE_PLAN', tasks: tasks, timestamp: new Date().toISOString() })
        });
        if (!res.ok) throw new Error('Power Automate Webhook error: ' + res.status);
        config.lastSyncTime = new Date().toISOString();
        saveConfig();
        setSyncState('synced');
        showToast('Saved & Synced with Corporate OneDrive (M365)', 'success');
        return { success: true, mode: 'cloud' };
      }
    } catch (err) {
      console.warn('OneDriveSync push error:', err);
      setSyncState('error', err.message);
      showToast('Sync failed, saved locally in browser', 'warning');
      return { success: false, error: err.message };
    }
  }

  // --- API: PULL PLAN DATA ---
  async function pullPlanData() {
    const mode = getActiveMode();
    if (mode === 'standalone') return null;

    setSyncState('syncing');
    try {
      if (mode === 'lan') {
        const res = await fetch('/api/plan?t=' + Date.now());
        if (!res.ok) throw new Error('LAN HTTP ' + res.status);
        const data = await res.json();
        if (data && Array.isArray(data.tasks)) {
          config.lastSyncTime = new Date().toISOString();
          saveConfig();
          setSyncState('synced');
          notifyListeners('PLAN_UPDATED', data.tasks);
          return data.tasks;
        }
      } else if (mode === 'cloud') {
        const res = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_PLAN', timestamp: new Date().toISOString() })
        });
        if (!res.ok) throw new Error('Cloud HTTP ' + res.status);
        const data = await res.json();
        if (data && Array.isArray(data.tasks)) {
          config.lastSyncTime = new Date().toISOString();
          saveConfig();
          setSyncState('synced');
          notifyListeners('PLAN_UPDATED', data.tasks);
          return data.tasks;
        }
      }
    } catch (err) {
      console.warn('OneDriveSync pull error:', err);
      setSyncState('error', err.message);
      return null;
    }
    setSyncState('idle');
    return null;
  }

  // --- API: TEST CONNECTION ---
  async function testConnection(customUrl = null) {
    const url = customUrl !== null ? customUrl : config.webhookUrl;
    if (!url) {
      if (isLanServer()) {
        try {
          const res = await fetch('/api/plan?test=1');
          return { success: res.ok, message: 'LAN Server endpoint active on port ' + (window.location.port || '8888') };
        } catch (e) {
          return { success: false, message: 'LAN Server not reachable' };
        }
      }
      return { success: false, message: 'Webhook URL is not configured' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PING', timestamp: new Date().toISOString() })
      });
      return { success: res.ok, status: res.status, message: res.ok ? 'Connection Successful! Power Automate responded.' : 'HTTP ' + res.status };
    } catch (err) {
      return { success: false, message: 'Connection failed: ' + err.message };
    }
  }

  function setSyncState(state, err = null) {
    syncState = state;
    updateBadgeUI(err);
  }

  // --- UI: INJECT STATUS BADGE ---
  function injectBadgeUI() {
    let badge = document.getElementById('onedrive-sync-badge') || document.getElementById('btn-onedrive-sync');
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'onedrive-sync-badge';
      badge.type = 'button';
      badge.className = 'onedrive-badge-btn';
      badge.onclick = openSettingsModal;

      // Look for best insertion container (topbar, header-right, actions)
      const headerRight = document.querySelector('.header-right') ||
                          document.querySelector('.top-bar-right') ||
                          document.querySelector('.header-actions') ||
                          document.querySelector('header .flex.items-center.gap-2') ||
                          document.querySelector('header .flex.items-center.gap-3');

      if (headerRight) {
        headerRight.prepend(badge);
      } else {
        // Floating fixed badge at bottom right
        badge.style.position = 'fixed';
        badge.style.bottom = '16px';
        badge.style.right = '16px';
        badge.style.zIndex = '9999';
        document.body.appendChild(badge);
      }
    } else {
      badge.id = 'onedrive-sync-badge';
      badge.onclick = openSettingsModal;
    }

    injectStyles();
    updateBadgeUI();
  }

  function updateBadgeUI(errMsg = null) {
    const badge = document.getElementById('onedrive-sync-badge');
    if (!badge) return;

    const mode = getActiveMode();
    let timeStr = '';
    if (config.lastSyncTime) {
      const d = new Date(config.lastSyncTime);
      timeStr = ` (${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')})`;
    }

    if (syncState === 'syncing') {
      badge.innerHTML = `<i class="fa-solid fa-cloud-arrow-up animate-spin text-sky-400"></i> <span>OneDrive: Syncing...</span>`;
      badge.className = 'onedrive-badge-btn sync-active';
      badge.title = 'Synchronizing with OneDrive...';
    } else if (syncState === 'error') {
      badge.innerHTML = `<i class="fa-solid fa-cloud-slash text-rose-400"></i> <span>OneDrive: Offline</span>`;
      badge.className = 'onedrive-badge-btn sync-error';
      badge.title = errMsg || 'OneDrive connection error. Click to configure.';
    } else if (mode === 'cloud') {
      badge.innerHTML = `<i class="fa-solid fa-cloud text-emerald-400"></i> <span>OneDrive: Synced${timeStr}</span>`;
      badge.className = 'onedrive-badge-btn sync-online';
      badge.title = 'Connected to Corporate OneDrive via Power Automate. Click for settings.';
    } else if (mode === 'lan') {
      badge.innerHTML = `<i class="fa-solid fa-network-wired text-indigo-400"></i> <span>LAN Host: Active${timeStr}</span>`;
      badge.className = 'onedrive-badge-btn sync-lan';
      badge.title = 'Syncing with host PC OneDrive folder over LAN. Click for settings.';
    } else {
      badge.innerHTML = `<i class="fa-solid fa-laptop text-amber-400"></i> <span>OneDrive: Local</span>`;
      badge.className = 'onedrive-badge-btn sync-local';
      badge.title = 'Working locally in browser storage. Click to connect Corporate OneDrive.';
    }
  }

  // --- UI: SETTINGS MODAL ---
  function openSettingsModal() {
    let modal = document.getElementById('onedrive-settings-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'onedrive-settings-modal';
      modal.className = 'onedrive-modal-backdrop';
      document.body.appendChild(modal);
    }

    const mode = getActiveMode();
    const lastSyncFormatted = config.lastSyncTime ? new Date(config.lastSyncTime).toLocaleString('th-TH') : 'ยังไม่มีการซิงค์';

    modal.innerHTML = `
      <div class="onedrive-modal-card">
        <div class="onedrive-modal-header">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <i class="fa-brands fa-microsoft text-xl"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                OneDrive / SharePoint Enterprise Sync
                <span class="text-xs px-2 py-0.5 rounded-full font-normal ${mode === 'cloud' ? 'bg-emerald-500/20 text-emerald-300' : (mode === 'lan' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300')}">
                  ${mode === 'cloud' ? 'Cloud Webhook' : (mode === 'lan' ? 'LAN Host' : 'Local Standalone')}
                </span>
              </h3>
              <p class="text-xs text-slate-400">เชื่อมต่อและซิงค์ข้อมูลส่วนกลางกับ Microsoft 365 ขององค์กร</p>
            </div>
          </div>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg" onclick="OneDriveSync.closeSettingsModal()">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="onedrive-modal-body space-y-4">
          <!-- Status Banner -->
          <div class="p-3.5 rounded-xl border ${mode === 'cloud' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : (mode === 'lan' ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200' : 'bg-slate-800/80 border-slate-700 text-slate-300')} text-xs flex justify-between items-center">
            <div>
              <span class="font-semibold">สถานะการซิงค์ล่าสุด:</span> ${lastSyncFormatted}
            </div>
            <button type="button" class="btn-sm-action" onclick="OneDriveSync.syncNow(this)">
              <i class="fa-solid fa-rotate mr-1"></i> Sync Now
            </button>
          </div>

          <!-- Mode Selector -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">รูปแบบการเชื่อมต่อ (Sync Mode)</label>
            <div class="grid grid-cols-3 gap-2">
              <label class="mode-card ${config.mode === 'auto' ? 'active' : ''}">
                <input type="radio" name="od-mode" value="auto" ${config.mode === 'auto' ? 'checked' : ''} onchange="OneDriveSync.setMode('auto')">
                <span class="font-semibold text-xs">Auto Detect</span>
                <span class="text-[10px] text-slate-400">อัตโนมัติ</span>
              </label>
              <label class="mode-card ${config.mode === 'cloud' ? 'active' : ''}">
                <input type="radio" name="od-mode" value="cloud" ${config.mode === 'cloud' ? 'checked' : ''} onchange="OneDriveSync.setMode('cloud')">
                <span class="font-semibold text-xs">Cloud Flow</span>
                <span class="text-[10px] text-slate-400">M365 Webhook</span>
              </label>
              <label class="mode-card ${config.mode === 'lan' ? 'active' : ''}">
                <input type="radio" name="od-mode" value="lan" ${config.mode === 'lan' ? 'checked' : ''} onchange="OneDriveSync.setMode('lan')">
                <span class="font-semibold text-xs">LAN Host</span>
                <span class="text-[10px] text-slate-400">PC Port 8888</span>
              </label>
            </div>
          </div>

          <!-- Webhook URL Input -->
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-xs font-semibold text-slate-300">Power Automate HTTP Webhook URL</label>
              <button type="button" class="text-xs text-sky-400 hover:underline flex items-center gap-1" onclick="OneDriveSync.toggleGuide()">
                <i class="fa-solid fa-circle-question"></i> วิธีรับ URL ใน 3 นาที
              </button>
            </div>
            <div class="flex gap-2">
              <input type="url" id="od-webhook-url" class="od-input" placeholder="https://prod-XX.southeastasia.logic.azure.com:443/workflows/..." value="${config.webhookUrl || ''}">
              <button type="button" class="btn-secondary" onclick="OneDriveSync.handleTest(this)">
                <i class="fa-solid fa-plug"></i> Test
              </button>
            </div>
            <div id="od-test-result" class="text-xs mt-1.5 hidden"></div>
          </div>

          <!-- 3-Minute Setup Guide (Collapsible) -->
          <div id="od-guide-box" class="hidden p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300">
            <div class="font-bold text-sky-400 flex items-center gap-2">
              <i class="fa-solid fa-bolt"></i> วิธีตั้งค่า Power Automate Flow เชื่อมกับ OneDrive (ไม่ต้องขอสิทธิ์ IT):
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>เปิดเว็บ <a href="https://make.powerautomate.com" target="_blank" class="text-sky-400 underline">make.powerautomate.com</a> ด้วยบัญชี Microsoft องค์กร (@gpscgroup.com)</li>
              <li>กด <strong>Create</strong> &rarr; เลือก <strong>Instant cloud flow</strong> &rarr; เลือก Trigger เป็น <strong>"When an HTTP request is received"</strong></li>
              <li>เพิ่ม Action <strong>"Update a row" (Excel Online - OneDrive)</strong> หรือ <strong>"Get file content"</strong> ชี้ไปยังไฟล์ <code class="bg-slate-800 px-1 rounded text-amber-300">GPSC_Transformer_Asset_Master.xlsx</code> ใน OneDrive ของทีม</li>
              <li>เพิ่ม Action <strong>"Response"</strong> (Status 200) แล้วกด <strong>Save</strong></li>
              <li>คัดลอก <strong>"HTTP POST URL"</strong> ที่ Flow สร้างให้ มาวางในช่องด้านบนนี้ แล้วกด Save</li>
            </ol>
          </div>

          <!-- Master Excel Downloader -->
          <div class="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-file-excel text-emerald-400 text-lg"></i>
              <div>
                <div class="text-xs font-semibold text-slate-200">ไฟล์ Master Dataset (Excel .xlsx)</div>
                <div class="text-[11px] text-slate-400">ดาวน์โหลดเพื่อนำไปวางใน OneDrive / Teams กลางของทีม</div>
              </div>
            </div>
            <a href="GPSC_Transformer_Asset_Master.xlsx" download class="btn-sm-secondary">
              <i class="fa-solid fa-download mr-1"></i> ดาวน์โหลด Excel
            </a>
          </div>
        </div>

        <div class="onedrive-modal-footer">
          <button type="button" class="btn-cancel" onclick="OneDriveSync.closeSettingsModal()">ยกเลิก</button>
          <button type="button" class="btn-primary" onclick="OneDriveSync.saveSettingsFromModal()">
            <i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('onedrive-settings-modal');
    if (modal) modal.classList.remove('open');
  }

  function setMode(m) {
    config.mode = m;
    openSettingsModal(); // re-render modal with active selection
  }

  async function handleTest(btn) {
    const url = document.getElementById('od-webhook-url').value.trim();
    const resBox = document.getElementById('od-test-result');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Testing`;
    resBox.classList.remove('hidden', 'text-emerald-400', 'text-rose-400');

    const result = await testConnection(url);
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-plug"></i> Test`;
    resBox.classList.remove('hidden');

    if (result.success) {
      resBox.className = 'text-xs mt-1.5 text-emerald-400 font-semibold';
      resBox.innerHTML = `✓ ${result.message}`;
    } else {
      resBox.className = 'text-xs mt-1.5 text-rose-400';
      resBox.innerHTML = `✗ ${result.message}`;
    }
  }

  function toggleGuide() {
    const box = document.getElementById('od-guide-box');
    if (box) box.classList.toggle('hidden');
  }

  function saveSettingsFromModal() {
    const urlInput = document.getElementById('od-webhook-url');
    if (urlInput) config.webhookUrl = urlInput.value.trim();
    saveConfig();
    closeSettingsModal();
    showToast('OneDrive settings saved!', 'success');

    // Trigger initial pull if configured
    if (config.webhookUrl || getActiveMode() === 'lan') {
      pullPlanData();
    }
  }

  async function syncNow(btn = null) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-rotate animate-spin mr-1"></i> Syncing...`;
    }
    const data = await pullPlanData();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-rotate mr-1"></i> Sync Now`;
    }
    if (data) {
      showToast('Synced latest data from OneDrive!', 'success');
    } else {
      showToast('Synced complete (already up to date)', 'info');
    }
    if (document.getElementById('onedrive-settings-modal')?.classList.contains('open')) {
      openSettingsModal(); // Refresh modal view
    }
  }

  // --- UI: TOAST NOTIFICATION ---
  function showToast(msg, type = 'info') {
    let container = document.getElementById('onedrive-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'onedrive-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `onedrive-toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check text-emerald-400' :
                 type === 'warning' ? 'fa-triangle-exclamation text-amber-400' : 'fa-circle-info text-sky-400';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- CSS INJECTION ---
  function injectStyles() {
    if (document.getElementById('onedrive-sync-styles')) return;
    const style = document.createElement('style');
    style.id = 'onedrive-sync-styles';
    style.textContent = `
      .onedrive-badge-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(15, 23, 42, 0.6);
        color: #e2e8f0;
        backdrop-filter: blur(8px);
      }
      .onedrive-badge-btn:hover {
        transform: translateY(-1px);
        border-color: rgba(56, 189, 248, 0.4);
        background: rgba(30, 41, 59, 0.8);
      }
      .onedrive-badge-btn.sync-online {
        border-color: rgba(16, 185, 129, 0.35);
        background: rgba(6, 78, 59, 0.25);
        color: #a7f3d0;
      }
      .onedrive-badge-btn.sync-lan {
        border-color: rgba(99, 102, 241, 0.35);
        background: rgba(49, 46, 129, 0.25);
        color: #c7d2fe;
      }
      .onedrive-badge-btn.sync-local {
        border-color: rgba(245, 158, 11, 0.3);
        background: rgba(120, 53, 15, 0.2);
        color: #fde68a;
      }
      .onedrive-badge-btn.sync-error {
        border-color: rgba(244, 63, 94, 0.4);
        background: rgba(136, 19, 55, 0.25);
        color: #fecdd3;
      }
      .onedrive-badge-btn.sync-active {
        border-color: rgba(56, 189, 248, 0.5);
        background: rgba(12, 74, 110, 0.3);
        color: #bae6fd;
      }

      /* Modal */
      .onedrive-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(10, 15, 26, 0.75);
        backdrop-filter: blur(6px);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .onedrive-modal-backdrop.open { display: flex; }
      .onedrive-modal-card {
        background: #111827;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        width: 100%;
        max-width: 540px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        overflow: hidden;
        animation: odModalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes odModalPop {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .onedrive-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .onedrive-modal-body {
        padding: 20px;
        max-height: 70vh;
        overflow-y: auto;
      }
      .onedrive-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(15, 23, 42, 0.5);
      }
      .mode-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 10px 8px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(30, 41, 59, 0.4);
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: center;
      }
      .mode-card:hover { background: rgba(30, 41, 59, 0.8); border-color: rgba(56, 189, 248, 0.4); }
      .mode-card.active {
        background: rgba(14, 165, 233, 0.15);
        border-color: #38bdf8;
        color: #38bdf8;
      }
      .mode-card input { display: none; }
      .od-input {
        flex: 1;
        background: #1f2937;
        border: 1px solid #374151;
        color: #ffffff;
        font-size: 12px;
        padding: 8px 12px;
        border-radius: 10px;
        outline: none;
        transition: border-color 0.15s ease;
      }
      .od-input:focus { border-color: #38bdf8; }
      .btn-sm-action {
        background: #2563eb;
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 8px;
        transition: all 0.15s ease;
        cursor: pointer;
      }
      .btn-sm-action:hover { background: #1d4ed8; }
      .btn-secondary {
        background: #374151;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-secondary:hover { background: #4b5563; }
      .btn-sm-secondary {
        background: #1e293b;
        border: 1px solid #334155;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        text-decoration: none;
      }
      .btn-sm-secondary:hover { background: #334155; color: #ffffff; }
      .btn-primary {
        background: #4f46e5;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 18px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-primary:hover { background: #4338ca; }
      .btn-cancel {
        background: transparent;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-cancel:hover { color: #ffffff; background: rgba(255, 255, 255, 0.05); }

      /* Toasts */
      #onedrive-toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .onedrive-toast {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        color: #ffffff;
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.25s ease;
        pointer-events: auto;
      }
      .onedrive-toast.show { opacity: 1; transform: translateY(0); }
      .onedrive-toast.success { border-color: rgba(16, 185, 129, 0.4); background: #064e3b; }
      .onedrive-toast.warning { border-color: rgba(245, 158, 11, 0.4); background: #78350f; }
    `;
    document.head.appendChild(style);
  }

  // --- AUTO INIT ---
  function init(options = {}) {
    if (options.onDataUpdated && typeof options.onDataUpdated === 'function') {
      listeners.push(options.onDataUpdated);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectBadgeUI);
    } else {
      injectBadgeUI();
    }

    // Auto pull on load if connected
    if (getActiveMode() !== 'standalone') {
      setTimeout(() => pullPlanData(), 800);
    }

    // Recurring sync interval if enabled
    if (config.autoSync && config.syncIntervalSec > 0) {
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(() => {
        if (getActiveMode() !== 'standalone') {
          pullPlanData();
        }
      }, config.syncIntervalSec * 1000);
    }
  }

  // Public API
  window.OneDriveSync = {
    init: init,
    pushPlanData: pushPlanData,
    pullPlanData: pullPlanData,
    testConnection: testConnection,
    openSettingsModal: openSettingsModal,
    closeSettingsModal: closeSettingsModal,
    saveSettingsFromModal: saveSettingsFromModal,
    setMode: setMode,
    handleTest: handleTest,
    toggleGuide: toggleGuide,
    syncNow: syncNow,
    showToast: showToast,
    getConfig: () => Object.assign({}, config),
    getActiveMode: getActiveMode
  };

  // Auto initialize when script tag loaded
  init();

})(window);
