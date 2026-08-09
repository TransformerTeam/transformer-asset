import re

with open('detail.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """  const getBDClass = (n) => n >= 50 ? 'ex-status-good' : (n >= 40 ? 'ex-status-fair' : 'ex-status-poor');
  const getPF25Class = (n) => n <= 0.5 ? 'ex-status-good' : (n <= 1.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getPF100Class = (n) => n <= 0.5 ? 'ex-status-good' : (n <= 2.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getCondClass = (n) => n <= 0.1 ? 'ex-status-good' : (n <= 1.0 ? 'ex-status-fair' : 'ex-status-poor');
  const getWcClass = (n) => n <= 20 ? 'ex-status-good' : (n <= 30 ? 'ex-status-fair' : 'ex-status-poor');
  const getIftClass = (n) => n >= 28 ? 'ex-status-good' : (n >= 22 ? 'ex-status-fair' : 'ex-status-poor');
  const getAcClass = (n) => n <= 0.1 ? 'ex-status-good' : (n <= 0.2 ? 'ex-status-fair' : 'ex-status-poor');"""

new_logic = """  let fluidType = 'Mineral oil';
  let hvVoltage = 115;
  if (typeof TR_DATA !== 'undefined') {
    const rawMeta = TR_DATA.find(x => String(x.SERIAL_NUMBER) === String(item.serial));
    if (rawMeta) {
      if (rawMeta.TYPE_OF_INSULATION) fluidType = rawMeta.TYPE_OF_INSULATION;
      if (rawMeta.HV_RATED) {
         hvVoltage = parseFloat(rawMeta.HV_RATED);
         if (isNaN(hvVoltage)) hvVoltage = 115;
      }
    }
  }

  const getRatingClass = (paramName) => (val) => {
    if (typeof evaluateOilParameter === 'function') {
      const rating = evaluateOilParameter(paramName, val, fluidType, hvVoltage);
      if (!rating) return '';
      return `ex-status-${rating}`;
    }
    return '';
  };

  const getBDClass = getRatingClass('BDV_2mm');
  const getPF25Class = getRatingClass('PF25');
  const getPF100Class = getRatingClass('PF100');
  const getCondClass = getRatingClass('Conductivity');
  const getWcClass = getRatingClass('WaterContent');
  const getIftClass = getRatingClass('IFT');
  const getAcClass = getRatingClass('Acidity');
  const getSludgeClass = getRatingClass('Sludge');
  const getCorrosiveSulfurClass = getRatingClass('CorrosiveSulfur');
  const getFuranClass = getRatingClass('Furan');
  const getDpClass = getRatingClass('DP');
  const getColorClass = getRatingClass('Color');
  const getInhibitorClass = getRatingClass('Inhibitor');
  const getPassivatorClass = getRatingClass('Passivator');"""

text = text.replace(old_logic, new_logic)

old_physical_body = """    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td>${getCell(dbVal, getBDClass)}<td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td>${getCell(wcVal, getWcClass)}<td>ppm</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td>${getCell(pf25Val, getPF25Class, '%')}<td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td>${getCell(pf100Val, getPF100Class, '%')}<td>%</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td>${getCell(iftVal, getIftClass)}<td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td>${getCell(acVal, getAcClass)}<td>mgKOH/g</td></tr>
      <tr><td>Oil Conductivity</td><td>IEC 61620</td>${getCell(condVal, getCondClass)}<td>pS/m</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td><td>${colorVal}</td><td>-</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td><td>${inhibitorVal === '-' ? '-' : parseFloat(inhibitorVal).toFixed(2)}</td><td>%</td></tr>
    `;"""

new_physical_body = """    physicalBody.innerHTML = `
      <tr><td>Dielectric Breakdown</td><td>ASTM D1816 (2 mm)</td>${getCell(dbVal, getBDClass)}<td>kV</td></tr>
      <tr><td>Water Content</td><td>ASTM D1533</td>${getCell(wcVal, getWcClass)}<td>ppm</td></tr>
      <tr><td>Power Factor at 25 °C</td><td>ASTM D924</td>${getCell(pf25Val, getPF25Class, '%')}<td>%</td></tr>
      <tr><td>Power Factor at 100 °C</td><td>ASTM D925</td>${getCell(pf100Val, getPF100Class, '%')}<td>%</td></tr>
      <tr><td>IFT</td><td>ASTM D971</td>${getCell(iftVal, getIftClass)}<td>dynes/cm</td></tr>
      <tr><td>Acidity</td><td>ASTM D974</td>${getCell(acVal, getAcClass)}<td>mgKOH/g</td></tr>
      <tr><td>Oil Conductivity</td><td>IEC 61620</td>${getCell(condVal, getCondClass)}<td>pS/m</td></tr>
      <tr><td>Color Number</td><td>ASTM D1500</td>${getCell(colorVal, getColorClass)}<td>-</td></tr>
      <tr><td>Inhibitor</td><td>IEC 60296</td>${getCell(inhibitorVal, getInhibitorClass)}<td>%</td></tr>
    `;"""

text = text.replace(old_physical_body, new_physical_body)

old_aging_body = """    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td><td>${furanVal}</td><td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td><td>${dpVal}</td><td>-</td></tr>
      <tr><td>Sludge condition</td><td>Visual</td><td class="${sludgeVal.toLowerCase().includes('non') ? 'ex-status-good' : 'ex-status-fair'}">${sludgeVal}</td><td>-</td></tr>
    `;"""

new_aging_body = """    agingBody.innerHTML = `
      <tr><td>Furan [2-FAL]</td><td>ASTM D5837</td>${getCell(furanVal, getFuranClass)}<td>ppb</td></tr>
      <tr><td>Estimated DP [Furan]</td><td>IEEE Guide</td>${getCell(dpVal, getDpClass)}<td>-</td></tr>
      <tr><td>Sludge condition</td><td>Visual</td>${getCellString(sludgeVal, getSludgeClass)}<td>-</td></tr>
    `;"""

text = text.replace(old_aging_body, new_aging_body)

old_sulfur_body = """    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td><td class="${sulfurVal.toLowerCase().includes('non') ? 'ex-status-good' : 'ex-status-poor'}">${sulfurVal}</td><td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td><td>${passivatorVal}</td><td>ppm</td></tr>
    `;"""

new_sulfur_body = """    const reverseSulfurMapForTable = { 1: '1a', 2: '1b', 3: '2a', 4: '2b', 5: '2c', 6: '2d', 7: '2e', 8: '3a', 9: '3b', 10: '4a', 11: '4b', 12: '4c' };
    let formattedSulfur = sulfurVal;
    const sNum = parseFloat(sulfurVal);
    if (!isNaN(sNum) && reverseSulfurMapForTable[Math.round(sNum)]) {
      formattedSulfur = reverseSulfurMapForTable[Math.round(sNum)];
    }

    sulfurBody.innerHTML = `
      <tr><td>Corrosive Sulfur</td><td>DIN 51353</td>${getCellString(formattedSulfur, getCorrosiveSulfurClass)}<td>-</td></tr>
      <tr><td>Passivator [Irgamet 39]</td><td>IEC 60666</td>${getCell(passivatorVal, getPassivatorClass)}<td>ppm</td></tr>
    `;"""

text = text.replace(old_sulfur_body, new_sulfur_body)

with open('detail.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated detail.js')
