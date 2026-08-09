const fs = require('fs');
const csvText = fs.readFileSync('HealthIndexSum.csv', 'utf-8');
const headerMarker = 'No.,Equipment Name';
const markerIndex = csvText.indexOf(headerMarker);
if (markerIndex === -1) {
  console.log('Marker not found');
  process.exit();
}
const cleanCsv = csvText.substring(markerIndex);
const rows = [];
let row = [''];
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
    row.push('');
  } else if ((c === '\r' || c === '\n') && !inQuotes) {
    if (c === '\r' && next === '\n') {
      i++;
    }
    if (row.some(val => val.trim().length > 0)) {
      rows.push(row);
    }
    row = [''];
  } else {
    row[row.length - 1] += c;
  }
}
if (row.some(val => val.trim().length > 0)) {
  rows.push(row);
}
console.log('Parsed rows:', rows.length);
if (rows.length < 2) process.exit();
const rawHeaders = rows[0];
const headers = rawHeaders.map(h => h.replace(/\r?\n/g, ' ').trim());
console.log('Headers:', headers.length);
const records = [];
for (let i = 1; i < rows.length; i++) {
  const lineValues = rows[i];
  if (lineValues.length === 1 && lineValues[0] === '') continue;
  const record = {};
  headers.forEach((header, idx) => {
    let val = lineValues[idx] !== undefined ? lineValues[idx].trim() : '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1).trim();
    }
    record[header] = val;
  });
  records.push(record);
}
console.log('Parsed records:', records.length);
console.log('First record Equipment Name:', records[0]['Equipment Name']);
