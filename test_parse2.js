const fs = require('fs');
const csvText = fs.readFileSync('HealthIndexSum.csv', 'utf-8');
const markerIndex = csvText.indexOf('No.,Equipment Name');
const cleanCsv = csvText.substring(markerIndex);
let rows=[], row=[''], inQuotes=false;
for(let i=0; i<cleanCsv.length; i++){
  let c=cleanCsv[i], next=cleanCsv[i+1];
  if(c==='"') { if(inQuotes && next==='"'){ row[row.length-1]+='"'; i++; } else inQuotes=!inQuotes; }
  else if(c===',' && !inQuotes) row.push('');
  else if((c==='\r' || c==='\n') && !inQuotes) {
    if(c==='\r' && next==='\n') i++;
    if(row.some(v=>v.trim().length>0)) rows.push(row);
    row=[''];
  } else row[row.length-1]+=c;
}
if(row.some(v=>v.trim().length>0)) rows.push(row);
const headers = rows[0].map(h=>h.replace(/\r?\n/g, ' ').trim());
const records = [];
for(let i=1; i<rows.length; i++){
  let l=rows[i]; if(l.length===1 && l[0]==='') continue;
  let r={};
  headers.forEach((h,idx)=>{
    let v=l[idx]!==undefined?l[idx].trim():'';
    if(v.startsWith('"')&&v.endsWith('"')) v=v.substring(1,v.length-1).trim();
    r[h]=v;
  });
  records.push(r);
}
let allSites = new Set(records.map(r => r.SITE));
console.log('Sites:', Array.from(allSites).join(', '));
