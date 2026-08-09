const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('oil_report.html', 'utf8');

// Mock ApexCharts
const apexMock = `
  window.ApexCharts = class ApexCharts {
    constructor(container, options) {
      this.container = container;
      this.options = options;
    }
    render() {
      // console.log('Render called for', this.container.id);
    }
    destroy() {}
  };
`;

// Extract all scripts from HTML to run them
const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost:8888/" });
const window = dom.window;

// Setup globals
window.ApexCharts = class ApexCharts {
    constructor(container, options) {
      this.container = container;
      this.options = options;
    }
    render() {}
    destroy() {}
};

try {
  // Grab the scripts
  const scripts = [...dom.window.document.querySelectorAll('script')]
    .map(s => s.textContent)
    .filter(s => s.trim().length > 0);
  
  // Run scripts
  scripts.forEach(code => {
    window.eval(code);
  });

  // Now simulate validItems
  const csvText = fs.readFileSync('TestData/MTOilData.csv', 'utf8');
  // Simple parse for test
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(s => s.replace(/^\uFEFF/, '').trim());
  
  const records = [];
  for(let i=1; i<lines.length; i++) {
    if(!lines[i].trim()) continue;
    const row = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx].trim() : '';
    });
    records.push(obj);
  }

  // Find records for one serial
  const serial = '1410148'; // randomly picked one
  const valid = records.filter(r => r.Serial_No === serial);
  
  console.log('Running renderTrendChart with', valid.length, 'items');
  window.renderTrendChart(valid);
  console.log('Success! No errors thrown.');

} catch(err) {
  console.error("ERROR CAUGHT:", err);
}
