// oil_criteria.js

function evaluateOilParameter(parameter, value, fluidType, voltage) {
  if (value === undefined || value === null || value === '-' || value === '') return null;
  const val = parseFloat(value);
  if (isNaN(val) && parameter !== 'CorrosiveSulfur' && parameter !== 'Sludge') return null;

  const isEster = fluidType && fluidType.toLowerCase().includes('ester');
  const vClass = voltage <= 69 ? 1 : (voltage < 230 ? 2 : 3); // 1: <=69, 2: >69-<230, 3: >=230

  // Helper to evaluate Good (<= limit1), Fair (<= limit2), Poor (> limit2)
  const evalLess = (v, l1, l2) => v <= l1 ? 'good' : (v <= l2 ? 'fair' : 'poor');
  // Helper to evaluate Good (>= limit1), Fair (>= limit2), Poor (< limit2)
  const evalGreater = (v, l1, l2) => v >= l1 ? 'good' : (v >= l2 ? 'fair' : 'poor');

  if (!isEster) {
    // Mineral Oil Criteria
    switch(parameter) {
      case 'BDV_1mm':
        if (vClass === 1) return evalGreater(val, 28, 23);
        if (vClass === 2) return evalGreater(val, 33, 28);
        if (vClass === 3) return evalGreater(val, 35, 30);
        break;
      case 'BDV_2mm': // Used if gap is not specified or standard is 2mm
        if (vClass === 1) return evalGreater(val, 45, 40);
        if (vClass === 2) return evalGreater(val, 52, 47);
        if (vClass === 3) return evalGreater(val, 55, 50);
        break;
      case 'PF25':
        return evalLess(val, 0.4, 0.5);
      case 'PF100':
        return evalLess(val, 4.0, 5.0);
      case 'Conductivity':
        return evalLess(val, 4.0, 5.0);
      case 'WaterContent':
        if (vClass === 1) return evalLess(val, 30, 35);
        if (vClass === 2) return evalLess(val, 20, 25);
        if (vClass === 3) return evalLess(val, 15, 20);
        break;
      case 'Color':
        return evalLess(val, 2.0, 2.5);
      case 'IFT':
        if (vClass === 1) return evalGreater(val, 28, 25);
        if (vClass === 2) return evalGreater(val, 33, 30);
        if (vClass === 3) return evalGreater(val, 35, 32);
        break;
      case 'Acidity':
        if (vClass === 1) return evalLess(val, 0.17, 0.20);
        if (vClass === 2) return evalLess(val, 0.12, 0.15);
        if (vClass === 3) return evalLess(val, 0.07, 0.10);
        break;
      case 'CorrosiveSulfur':
        const sVal = String(value).toLowerCase();
        if (sVal.includes('non')) return 'good';
        // Map: 1a=1, 1b=2, 2a=3, 2b=4, 2c=5, 2d=6, 2e=7, 3a=8, 3b=9, 4a=10, 4b=11, 4c=12
        if (val <= 8) return 'good'; // <= 3a
        if (val <= 10) return 'fair'; // <= 4a
        return 'poor'; // > 4a
      case 'Passivator':
        return evalGreater(val, 70, 50);
      case 'Sludge':
        if (typeof value === 'string' && value.toLowerCase().includes('non')) return 'good';
        return evalLess(val, 0.018, 0.02);
      case 'Furan':
        return evalLess(val, 700, 1000);
      case 'DP':
        return evalGreater(val, 700, 450);
      case 'Inhibitor':
        return evalGreater(val, 0.10, 0.08);
    }
  } else {
    // Natural Ester Criteria
    switch(parameter) {
      case 'BDV_1mm':
        if (vClass === 1) return evalGreater(val, 28, 23);
        if (vClass === 2) return evalGreater(val, 33, 28);
        if (vClass === 3) return evalGreater(val, 35, 30);
        break;
      case 'BDV_2mm':
        if (vClass === 1) return evalGreater(val, 45, 40);
        if (vClass === 2) return evalGreater(val, 52, 47);
        if (vClass === 3) return evalGreater(val, 55, 50);
        break;
      case 'PF25':
        return evalLess(val, 2.0, 3.0);
      case 'WaterContent':
        if (vClass === 1) return evalLess(val, 300, 400);
        if (vClass === 2) return evalLess(val, 150, 200);
        if (vClass === 3) return evalLess(val, 100, 150);
        break;
      case 'Color':
        return evalLess(val, 2.0, 2.5);
      case 'Acidity':
        return evalLess(val, 0.2, 0.3);
      case 'CorrosiveSulfur':
        const sv = String(value).toLowerCase();
        if (sv.includes('non')) return 'good';
        if (val <= 8) return 'good'; 
        if (val <= 10) return 'fair';
        return 'poor';
      case 'Sludge':
        if (String(value).toLowerCase().includes('non')) return 'good';
        return evalLess(val, 0.018, 0.02);
    }
  }
  return null; // Return null if criteria not defined
}
