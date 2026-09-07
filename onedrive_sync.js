/**
 * GPSC Transformer Asset Management - Enterprise OneDrive / SharePoint Sync Engine
 * Handles Two-Way Synchronization between Web Applications and Corporate Microsoft 365
 */

(function (window) {
  'use strict';

  const STORAGE_CONFIG_KEY = 'GPSC_ONEDRIVE_SYNC_CONFIG';
  const FORM_GATEWAY = {
    endpoint: "https://forms.cloud.microsoft/formapi/api/c6445630-e602-4993-a605-7e41f70338e8/users/f244955f-9e46-408c-8d9a-8f160c8806d0/forms('MFZExgLmk0mmBX5B9wM46F-VRPJGnoxAjZqPFgyIBtBUOVVMNkhPU0hQVDQ1MzNZOTcxU0Y2WEFJTC4u')/responses",
    corsProxy: "https://cors.eu.org/",
    questionIds: [
      "rc840ba0799a94ccfa5c70b993bdfe90f", // plan_json
      "rb151399b92ed45c690bedd70b5d79842", // plan_json_2
      "r96042bb6bb3c4c398d01e41e9f3f746e", // plan_json_3
      "r3605fdd383ce4c3492184a0114dc0382", // plan_json_4
      "ra9c2f2d9e3524b5cb07733bc00a7ef63", // plan_json_5
      "rdd8b17c7d2184035b14567ab3bd5874c", // plan_json_6
      "r950173ea58d049b6bce63df468ace553", // plan_json_7
      "r73a274ca77194c23baf74f113511da64", // plan_json_8
      "rca97ebc4420346a1bdf5169320d086b5", // plan_json_9
      "r777e6e486ede4fdeb13a52ab381127e5"  // plan_json_10
    ]
  };

  function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  const DEFAULT_CONFIG = {
    mode: 'auto', // 'auto', 'github', 'lan', 'standalone'
    githubToken: '',
    githubRepo: 'TransformerTeam/transformer-asset',
    githubBranch: 'main',
    githubPath: 'plan_data.json',
    webhookUrl: '',
    autoSync: true,
    lastSyncTime: new Date().toISOString(),
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
    // Top Priority: If running on local server or company LAN, ALWAYS use LAN for instant direct sync
    if (isLanServer()) return 'lan';
    if (config.mode === 'standalone') return 'standalone';
    return 'github'; // Default for GitHub Pages & web
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
        showToast('Saved & Synced with LAN Host', 'success');
        return { success: true, mode: 'lan' };
      } else if (mode === 'github') {
        const token = (config.githubToken || '').trim();
        if (!token) {
          setSyncState('error', 'Missing GitHub Token');
          openSettingsModal();
          showToast('กรุณาใส่ GitHub Token เพื่อบันทึกข้อมูลส่วนกลางบน GitHub Pages', 'warning');
          return { success: false, needToken: true };
        }

        const repo = (config.githubRepo || 'TransformerTeam/transformer-asset').trim();
        const path = (config.githubPath || 'plan_data.json').trim();
        const branch = (config.githubBranch || 'main').trim();

        // 1. Get latest file SHA
        const getUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&_t=${Date.now()}`;
        const getRes = await fetch(getUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (!getRes.ok) {
          if (getRes.status === 401 || getRes.status === 403) {
            throw new Error('GitHub Token ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง Repository');
          }
          throw new Error('GitHub API Error: HTTP ' + getRes.status);
        }
        const fileMeta = await getRes.json();
        const latestSha = fileMeta.sha;

        // 2. Commit updated JSON to GitHub
        const jsonStr = JSON.stringify({ tasks: tasks, timestamp: new Date().toISOString() }, null, 2);
        const putUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'sync: update plan_data.json from web dashboard [skip ci]',
            content: utf8ToBase64(jsonStr),
            sha: latestSha,
            branch: branch
          })
        });

        if (!putRes.ok) {
          const errData = await putRes.json().catch(() => ({}));
          throw new Error(errData.message || ('GitHub Commit failed: HTTP ' + putRes.status));
        }

        config.lastSyncTime = new Date().toISOString();
        saveConfig();
        setSyncState('synced');
        showToast('Saved & Committed to GitHub repository successfully!', 'success');
        return { success: true, mode: 'github' };
      }
    } catch (err) {
      console.warn('Sync push error:', err);
      setSyncState('error', err.message);
      showToast(err.message.includes('Token') ? err.message : 'Sync failed, saved locally in browser', 'warning');
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
        let data = null;
        try {
          const res = await fetch('plan_data.json?t=' + Date.now());
          if (res.ok) data = await res.json();
        } catch (e) {}

        if (!data && config.webhookUrl) {
          try {
            const res = await fetch(config.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'GET_PLAN', timestamp: new Date().toISOString() })
            });
            if (res.ok) data = await res.json();
          } catch (e) {}
        }

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
  async function testConnection(customToken = null) {
    const token = customToken !== null ? customToken : (config.githubToken || '').trim();
    if (token) {
      try {
        const repo = (config.githubRepo || 'TransformerTeam/transformer-asset').trim();
        const path = (config.githubPath || 'plan_data.json').trim();
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?_t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (res.ok) {
          return { success: true, message: `เชื่อมต่อสำเร็จ! เข้าถึง ${repo}/${path} ได้เรียบร้อย (มีสิทธิ์เขียน)` };
        } else if (res.status === 401) {
          return { success: false, message: 'Token ไม่ถูกต้อง หรือหมดอายุ (HTTP 401 Unauthorized)' };
        } else if (res.status === 403) {
          return { success: false, message: 'Token ไม่มีสิทธิ์เข้าถึง repo (ต้องติ๊กถูกที่ช่อง repo)' };
        } else {
          return { success: false, message: 'GitHub API Error: HTTP ' + res.status };
        }
      } catch (err) {
        return { success: false, message: 'การเชื่อมต่อล้มเหลว: ' + err.message };
      }
    }

    if (isLanServer()) {
      try {
        const res = await fetch('/api/plan?test=1');
        return { success: res.ok, message: 'LAN Server endpoint active on port ' + (window.location.port || '8888') };
      } catch (e) {
        return { success: false, message: 'LAN Server not reachable' };
      }
    }

    return { success: false, message: 'กรุณากรอก GitHub Personal Access Token' };
  }

  function setSyncState(state, err = null) {
    syncState = state;
    updateBadgeUI(err);
  }

  // --- UI: INJECT STATUS BADGE ---
  function injectBadgeUI() {
    let badge = document.getElementById('onedrive-sync-badge') || document.getElementById('btn-header-onedrive') || document.getElementById('btn-onedrive-sync');
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'onedrive-sync-badge';
      badge.type = 'button';
      badge.className = 'onedrive-badge-btn';
      badge.onclick = openSettingsModal;

      const headerRight = document.querySelector('.header-right') ||
                          document.querySelector('.top-bar-right') ||
                          document.querySelector('.header-actions') ||
                          document.querySelector('header .flex.items-center.gap-2') ||
                          document.querySelector('header .flex.items-center.gap-3');

      if (headerRight) {
        headerRight.prepend(badge);
      } else {
        badge.style.position = 'fixed';
        badge.style.bottom = '16px';
        badge.style.right = '16px';
        badge.style.zIndex = '9999';
        document.body.appendChild(badge);
      }
    } else {
      badge.onclick = openSettingsModal;
    }

    injectStyles();
    updateBadgeUI();
  }

  function updateBadgeUI(errMsg = null) {
    const badge = document.getElementById('onedrive-sync-badge') || document.getElementById('btn-header-onedrive') || document.getElementById('btn-onedrive-sync');
    if (!badge) return;

    const mode = getActiveMode();
    let timeStr = '';
    if (config.lastSyncTime) {
      const d = new Date(config.lastSyncTime);
      timeStr = ` (${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')})`;
    }

    const isTabBtn = badge.classList.contains('header-tab-btn');
    if (isTabBtn) {
      if (syncState === 'syncing') {
        badge.innerHTML = `<i class="fa-solid fa-rotate animate-spin text-sky-400"></i> Syncing`;
        badge.title = 'กำลังซิงค์ข้อมูลกับ GitHub Repository...';
      } else if (mode === 'lan') {
        badge.innerHTML = `<i class="fa-solid fa-network-wired text-indigo-400"></i> LAN Host`;
        badge.title = 'เชื่อมต่อกับเครื่อง Host ในเครือข่ายบริษัท (Port 8888)';
      } else if (config.githubToken) {
        badge.innerHTML = `<i class="fa-brands fa-github text-emerald-400"></i> GitHub Sync`;
        badge.title = 'เชื่อมต่อกับ GitHub Repository สำเร็จ (บันทึกข้อมูลกลางอัตโนมัติ)';
      } else {
        badge.innerHTML = `<i class="fa-brands fa-github text-amber-400"></i> ตั้งค่า Token`;
        badge.title = 'คลิกเพื่อใส่ GitHub Token สำหรับบันทึกข้อมูลส่วนกลาง';
      }
      return;
    }

    if (syncState === 'syncing') {
      badge.innerHTML = `<i class="fa-solid fa-rotate animate-spin text-sky-400"></i> <span>GitHub: Syncing...</span>`;
      badge.className = 'onedrive-badge-btn sync-active';
      badge.title = 'กำลัง Commit ข้อมูลลง GitHub Repository...';
    } else if (syncState === 'error') {
      badge.innerHTML = `<i class="fa-brands fa-github text-rose-400"></i> <span>GitHub: Offline</span>`;
      badge.className = 'onedrive-badge-btn sync-error';
      badge.title = errMsg || 'การเชื่อมต่อมีปัญหา คลิกเพื่อตรวจสอบ';
    } else if (mode === 'lan') {
      badge.innerHTML = `<i class="fa-solid fa-network-wired text-indigo-400"></i> <span>LAN Host: Active${timeStr}</span>`;
      badge.className = 'onedrive-badge-btn sync-lan';
      badge.title = 'Syncing with host PC & OneDrive folder over LAN.';
    } else if (config.githubToken) {
      badge.innerHTML = `<i class="fa-brands fa-github text-emerald-400"></i> <span>GitHub: Synced${timeStr}</span>`;
      badge.className = 'onedrive-badge-btn sync-online';
      badge.title = 'เชื่อมต่อกับ GitHub Repository สำเร็จ (ข้อมูลกลางอัปเดตอัตโนมัติ)';
    } else {
      badge.innerHTML = `<i class="fa-brands fa-github text-amber-400"></i> <span>GitHub: ใส่ Token</span>`;
      badge.className = 'onedrive-badge-btn sync-local';
      badge.title = 'คลิกเพื่อใส่ GitHub Personal Access Token สำหรับบันทึกข้อมูลกลาง';
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
    const hasToken = !!(config.githubToken && config.githubToken.trim());

    modal.innerHTML = `
      <div class="onedrive-modal-card">
        <div class="onedrive-modal-header">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-slate-800 text-white rounded-xl border border-slate-700">
              <i class="fa-brands fa-github text-2xl"></i>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
                GitHub Pages Cloud Sync
                <span class="text-xs px-2 py-0.5 rounded-full font-normal ${hasToken ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
                  ${hasToken ? 'Connected' : 'Need Token'}
                </span>
              </h3>
              <p class="text-xs text-slate-400">บันทึกข้อมูล Task ลง GitHub ส่วนกลางอัตโนมัติ เพื่อให้ทุกคนเห็นงานตรงกัน</p>
            </div>
          </div>
          <button type="button" class="text-slate-400 hover:text-white p-1 rounded-lg" onclick="OneDriveSync.closeSettingsModal()">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="onedrive-modal-body space-y-4">
          <!-- Status Banner -->
          <div class="p-3.5 rounded-xl border ${hasToken ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-amber-950/30 border-amber-500/30 text-amber-200'} text-xs flex justify-between items-center">
            <div>
              <span class="font-semibold">สถานะการซิงค์ล่าสุด:</span> ${lastSyncFormatted}
              <div class="text-[11px] opacity-80 mt-0.5">เป้าหมาย: <code class="bg-black/30 px-1 py-0.5 rounded">${config.githubRepo || 'TransformerTeam/transformer-asset'}</code></div>
            </div>
            <button type="button" class="btn-sm-action" onclick="OneDriveSync.syncNow(this)">
              <i class="fa-solid fa-rotate mr-1"></i> Sync Now
            </button>
          </div>

          <!-- Token Input Section -->
          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <i class="fa-solid fa-key text-amber-400"></i> GitHub Personal Access Token (PAT)
              </label>
              <a href="https://github.com/settings/tokens/new?description=GPSC-Transformer-Dashboard-Sync&scopes=repo" target="_blank" class="text-xs text-sky-400 hover:underline flex items-center gap-1">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> สร้าง Token ใน 1 นาที
              </a>
            </div>
            <div class="flex gap-2">
              <input type="password" id="gh-token-input" class="od-input font-mono" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value="${config.githubToken || ''}">
              <button type="button" class="btn-secondary" onclick="OneDriveSync.handleTest(this)">
                <i class="fa-solid fa-plug"></i> Test
              </button>
            </div>
            <div id="od-test-result" class="text-xs mt-1.5 hidden"></div>
          </div>

          <!-- 3-Step Token Guide -->
          <div class="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300">
            <div class="font-bold text-sky-400 flex items-center gap-2">
              <i class="fa-solid fa-circle-question"></i> วิธีสร้าง GitHub Token (ทำเพียงครั้งเดียว):
            </div>
            <ol class="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
              <li>คลิกที่ลิงก์ <a href="https://github.com/settings/tokens/new?description=GPSC-Transformer-Dashboard-Sync&scopes=repo" target="_blank" class="text-sky-400 underline font-semibold">สร้าง Token บน GitHub</a> (ระบบจะเปิดแท็บใหม่ให้พร้อมตั้งค่า)</li>
              <li>ตรงหัวข้อ <strong>Expiration</strong> แนะนำเลือก <code>No expiration</code> (หรือ 90 days)</li>
              <li>ตรวจสอบว่ามีเครื่องหมายติ๊กถูกที่ช่อง <code class="bg-slate-800 text-emerald-300 px-1 rounded font-bold">repo</code> (Full control of private/public repositories)</li>
              <li>เลื่อนลงล่างสุด กดปุ่มสีเขียว <strong>Generate token</strong></li>
              <li>คัดลอกรหัสที่ขึ้นต้นด้วย <code class="bg-slate-800 text-amber-300 px-1 rounded">ghp_...</code> มาวางในช่องด้านบน แล้วกด <strong>Test</strong> จากนั้นกด <strong>บันทึกการตั้งค่า</strong></li>
            </ol>
          </div>

          <!-- LAN Host Alternative Notice -->
          <div class="p-2.5 bg-slate-800/40 border border-slate-700/50 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
            <i class="fa-solid fa-network-wired text-indigo-400 text-sm"></i>
            <span>หรือหากรันผ่านเครื่องในบริษัท (Port 8888) ระบบจะบันทึกตรงเข้าเครื่องและ OneDrive ให้อัตโนมัติ</span>
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
    openSettingsModal();
  }

  async function handleTest(btn) {
    const tokenInput = document.getElementById('gh-token-input');
    const token = tokenInput ? tokenInput.value.trim() : '';
    const resBox = document.getElementById('od-test-result');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Testing`;
    resBox.classList.remove('hidden', 'text-emerald-400', 'text-rose-400');

    const result = await testConnection(token);
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
    const tokenInput = document.getElementById('gh-token-input');
    if (tokenInput) {
      config.githubToken = tokenInput.value.trim();
    }
    saveConfig();
    closeSettingsModal();
    showToast('บันทึกการตั้งค่า GitHub Sync เรียบร้อย!', 'success');

    // Trigger initial pull
    pullPlanData();
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
