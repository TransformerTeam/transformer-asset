/**
 * AM-HV Comprehensive Real-Time Synchronizer
 * GPSC Transformer Asset Management System
 * 
 * Synchronizes all 17 AM-HV online diagnostic & equipment endpoints:
 *  1. Transformer Information (print_trspec.php) -> TRinfo2.csv -> data.js
 *  2. In service Bushing (print_bushing.php) -> BushingInfo.csv
 *  3. In Service OLTC (print_oltc_stock.php) -> OLTCData.csv
 *  4. In Service Surge Arrester (SA.php) -> SurgeInfo.csv
 *  5. Visual (print_visual.php) -> VisualData.csv
 *  6. Main Tank Oil (print_oil_main_tank.php) -> MTOilData.csv & MainTankOilData.csv
 *  7. OLTC Oil (print_oil_oltc.php) -> OLTCOilData.csv
 *  8. 1 Phase Short Circuit (print_short_circuit_single_phase_impedance.php) -> SingleShortData.csv
 *  9. 3 Phase Short Circuit (print_short_circuit_three_phase_impedance.php) -> ThreeShortData.csv
 * 10. Exciting Current (print_excitation.php) -> ExcitingData.csv
 * 11. Winding Resistance (print_winding_resistance.php) -> WindingData.csv
 * 12. Turn Ratio (print_turn_ratio.php) -> RatioData.csv
 * 13. Insulation Power Factor (print_insulation_pf_winding.php) -> WindingPFData.csv
 * 14. Bushing Power Factor (print_insulation_pf_bushing.php) -> BushingPFData.csv
 * 15. Insulation Resistance & PI (print_PI.php) -> IRandPIData.csv -> pi_data.js
 * 16. Surge Power Factor (print_insulation_pf_surge_arrester.php) -> SurgePFData.csv
 * 17. Factory test (print_factory_test.php) -> FactoryData.csv
 * 
 * Post-sync pipeline:
 *  - Auto-recomputes fleet Health Indices via evaluate_all_health_index.py
 *  - Refreshes HealthIndexSum.csv, health_data.js, data.js, and pi_data.js
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname);
const TEST_DATA_DIR = path.join(BASE_DIR, 'TestData');
const PROFILE_DIR = path.join(BASE_DIR, '.amhv_profile');
const LOG_FILE = path.join(BASE_DIR, 'sync_history.log');
const EDGE_EXE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ENDPOINTS = [
  { key: 'trspec', name: 'Transformer Information', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_trspec.php', file: 'TRinfo2.csv' },
  { key: 'bushing', name: 'In service Bushing', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_bushing.php', file: 'BushingInfo.csv' },
  { key: 'oltc_stock', name: 'In Service OLTC', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_oltc_stock.php', file: 'OLTCData.csv' },
  { key: 'sa_stock', name: 'In Service Surge Arrester', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/SA.php', file: 'SurgeInfo.csv' },
  { key: 'visual', name: 'Visual Inspection', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_visual.php', file: 'VisualData.csv' },
  { key: 'mtoil', name: 'Main Tank Oil (DGA & Property)', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_oil_main_tank.php', file: 'MTOilData.csv' },
  { key: 'oltcoil', name: 'OLTC Oil', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_oil_oltc.php', file: 'OLTCOilData.csv' },
  { key: 'singleshort', name: '1 Phase Short Circuit', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_short_circuit_single_phase_impedance.php', file: 'SingleShortData.csv' },
  { key: 'threeshort', name: '3 Phase Short Circuit', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_short_circuit_three_phase_impedance.php', file: 'ThreeShortData.csv' },
  { key: 'excitation', name: 'Exciting Current', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_excitation.php', file: 'ExcitingData.csv' },
  { key: 'winding_res', name: 'Winding Resistance', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_winding_resistance.php', file: 'WindingData.csv' },
  { key: 'turn_ratio', name: 'Turn Ratio', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_turn_ratio.php', file: 'RatioData.csv' },
  { key: 'insulation_pf', name: 'Insulation Power Factor', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_insulation_pf_winding.php', file: 'WindingPFData.csv' },
  { key: 'bushing_pf', name: 'Bushing Power Factor', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_insulation_pf_bushing.php', file: 'BushingPFData.csv' },
  { key: 'pi', name: 'Insulation Resistance & PI', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_PI.php', file: 'IRandPIData.csv' },
  { key: 'surge_pf', name: 'Surge Power Factor', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_insulation_pf_surge_arrester.php', file: 'SurgePFData.csv' },
  { key: 'factory', name: 'Factory test', url: 'https://amhv-glowgroup.msappproxy.net/AM-HV/Export/print_factory_test.php', file: 'FactoryData.csv' }
];

function log(msg, level = 'INFO') {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (e) {
    // Ignore file write error if locked
  }
}

function launchInteractiveLogin() {
  console.log('='.repeat(70));
  console.log(' [AM-HV Real-Time Sync Setup] One-Time Interactive Login');
  console.log('='.repeat(70));
  console.log(`Opening Microsoft Edge with profile: ${PROFILE_DIR}`);
  console.log(`Target URL: ${ENDPOINTS[0].url}\n`);
  console.log('Please log in with your GPSC / Glow Microsoft 365 credentials.');
  console.log('Once you have completed login and MFA, close the browser window.\n');

  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const p = spawn(EDGE_EXE, [
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    ENDPOINTS[0].url
  ], { stdio: 'inherit' });

  p.on('close', () => {
    log('User finished interactive Microsoft SSO login session.', 'INFO');
    console.log('\n[SUCCESS] Authentication session saved! Automated sync is ready to run.');
    process.exit(0);
  });
}

async function runFullSync() {
  log('Starting Comprehensive AM-HV Real-Time Sync (All 17 Endpoints)...', 'INFO');

  if (!fs.existsSync(PROFILE_DIR)) {
    log('Authentication profile .amhv_profile not found. Please run login_amhv.bat first.', 'WARNING');
    return false;
  }

  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // 1. Launch Edge headless with remote debugging port
  const edge = spawn(EDGE_EXE, [
    '--headless',
    '--remote-debugging-port=9222',
    `--user-data-dir=${PROFILE_DIR}`,
    '--disable-gpu',
    'about:blank'
  ]);

  // Wait for Edge to open listening port
  await new Promise(r => setTimeout(r, 1500));

  let pageTarget;
  try {
    const listJson = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:9222/json/list', (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.on('error', reject);
    });
    pageTarget = listJson.find(p => p.type === 'page');
  } catch (err) {
    log(`Failed to connect to headless Edge process: ${err.message}`, 'ERROR');
    edge.kill();
    return false;
  }

  if (!pageTarget) {
    log('No debuggable page target found in Edge session.', 'ERROR');
    edge.kill();
    return false;
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    const handler = (event) => {
      const m = JSON.parse(event.data);
      if (m.id === id) {
        ws.removeEventListener('message', handler);
        resolve(m.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  const overallStartTime = Date.now();
  let successCount = 0;

  for (let i = 0; i < ENDPOINTS.length; i++) {
    const ep = ENDPOINTS[i];
    const stepStart = Date.now();

    try {
      await send('Page.navigate', { url: ep.url });
      // Allow dynamic rendering to settle
      await new Promise(r => setTimeout(r, 2200));

      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const bodyText = document.body ? document.body.innerText.trim().toLowerCase() : '';
          if (bodyText.includes('sign in to your account') || bodyText.includes('login.microsoftonline.com')) {
            return { error: 'LOGIN_REQUIRED' };
          }

          const tables = Array.from(document.querySelectorAll('table'));
          if (tables.length === 0) {
            const raw = document.body ? document.body.innerText.trim() : '';
            return { type: 'plain', content: raw, rowCount: raw.split('\\n').length };
          }

          const largest = tables.reduce((max, t) => t.rows.length > max.rows.length ? t : max, tables[0]);
          const lines = [];
          for (let r = 0; r < largest.rows.length; r++) {
            const cells = largest.rows[r].cells;
            const row = [];
            for (let c = 0; c < cells.length; c++) {
              let cellText = cells[c].innerText || '';
              cellText = cellText.replace(/[\\r\\n]+/g, ' ').trim();
              if (cellText.includes(',') || cellText.includes('"') || cellText.includes(';')) {
                cellText = '"' + cellText.replace(/"/g, '""') + '"';
              }
              row.push(cellText);
            }
            lines.push(row.join(','));
          }
          return { type: 'table', rowCount: largest.rows.length, content: lines.join('\\r\\n') };
        })()`,
        returnByValue: true
      });

      const extracted = res.result?.value;
      if (!extracted) {
        log(`[${i+1}/17] ${ep.name}: No data captured.`, 'WARNING');
        continue;
      }

      if (extracted.error === 'LOGIN_REQUIRED') {
        log(`[${i+1}/17] ${ep.name}: Session expired. Microsoft SSO login required. Run login_amhv.bat.`, 'WARNING');
        edge.kill();
        return false;
      }

      const csvContent = extracted.content || '';
      if (!csvContent || extracted.rowCount < 2) {
        log(`[${i+1}/17] ${ep.name}: Insufficient data (${extracted.rowCount || 0} rows). Skipped file update.`, 'WARNING');
        continue;
      }

      const targetPath = path.join(TEST_DATA_DIR, ep.file);
      const backupPath = targetPath + '.bak';

      if (fs.existsSync(targetPath)) {
        try { fs.copyFileSync(targetPath, backupPath); } catch (e) {}
      }

      // Write with UTF-8 BOM
      fs.writeFileSync(targetPath, '\ufeff' + csvContent, 'utf8');

      // Duplicate MainTankOilData.csv if MTOilData
      if (ep.file === 'MTOilData.csv') {
        const dupPath = path.join(TEST_DATA_DIR, 'MainTankOilData.csv');
        fs.writeFileSync(dupPath, '\ufeff' + csvContent, 'utf8');
      }

      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
      log(`[${i+1}/17] [${elapsed}s] Updated ${ep.file} (${extracted.rowCount} rows) <- ${ep.name}`, 'INFO');
      successCount++;
    } catch (epErr) {
      log(`[${i+1}/17] Error syncing ${ep.name}: ${epErr.message}`, 'ERROR');
    }
  }

  // Gracefully terminate headless Edge
  edge.kill();

  const totalTime = ((Date.now() - overallStartTime) / 1000).toFixed(1);
  log(`Synced ${successCount}/17 AM-HV endpoints successfully in ${totalTime}s.`, 'SUCCESS');

  // 2. Refresh downstream JavaScript data files
  try {
    log('Generating data.js and pi_data.js...', 'INFO');
    execSync('py convert_data_js.py', { cwd: BASE_DIR });
    execSync('py convert_pi_data_js.py', { cwd: BASE_DIR });
  } catch (jsErr) {
    log(`Notice during JS generation: ${jsErr.message}`, 'WARNING');
  }

  // 3. Re-evaluate fleet Health Indices and update health_data.js
  try {
    log('Recomputing fleet Health Indices across all 253 transformers...', 'INFO');
    execSync('py evaluate_all_health_index.py', { cwd: BASE_DIR });
    log('Health Index recomputation complete. HealthIndexSum.csv and health_data.js synchronized.', 'SUCCESS');
  } catch (evalErr) {
    log(`Error recomputing health indices: ${evalErr.message}`, 'ERROR');
  }

  return true;
}

if (process.argv.includes('--login')) {
  launchInteractiveLogin();
} else if (process.argv.includes('--sync')) {
  runFullSync().then(ok => {
    process.exit(ok ? 0 : 1);
  });
} else {
  console.log('Usage:');
  console.log('  node sync_amhv_all.js --login   # Run once to sign in via Microsoft SSO');
  console.log('  node sync_amhv_all.js --sync    # Run anytime to sync all 17 endpoints in background');
}
