/**
 * Transformer Health Index Assessment Data
 * Parsed from HealthIndexSum.csv
 * 
 * Column Mapping:
 *   A = Acceptable, Q = Questionable, U = Unacceptable, N/A = Not Applicable
 */

const HEALTH_INDEX_DATA = [
  {
    no: 1, name: "16120-TR-001", serial: "4803321", site: "CUP-1",
    ratedPower: 6, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 937, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "Q", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "Q"
    },
    passivator: "N/A", furan: "A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Repair oil leak and hot oil purify, Add passivator. Plan for oil regeneration/Change Oil: Concern oil conductivity is unacceptable limit, Suspect corrosive (3b)"
  },
  {
    no: 2, name: "16120-TR-003", serial: "4902687", site: "CUP-1",
    ratedPower: 6, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 1003, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "Q"
    },
    passivator: "N/A", furan: "A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Add passivator, Plan for oil regeneration/Change Oil: Concern oil conductivity is unacceptable limit, Suspect corrosive (3b)."
  },
  {
    no: 3, name: "16120-TR-004", serial: "5001769", site: "CUP-1",
    ratedPower: 6, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 1003, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "Q",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "U", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "Q"
    },
    passivator: "N/A", furan: "A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2021", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration/Change Oil: Concern IFT is unacceptable limit and conductivity is questionable limit, Suspect corrosive (3b), Add passivator. Plan for drying transformer (insulation paper degradation)."
  },
  {
    no: 4, name: "16120-TR-006", serial: "5101711", site: "CUP-1",
    ratedPower: 6, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 72, healthStatus: "Monitor",
    estimatedDP: 1003, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "Q", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "Q",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "Q", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration/Change Oil: Concern conductivity is unacceptable limit and IFT is questionable limit. Plan for drying transformer (insulation paper degradation)."
  },
  {
    no: 5, name: "10060-TR-101", serial: "5201090", site: "CUP-1",
    ratedPower: 6, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 80, healthStatus: "Monitor",
    estimatedDP: 1031, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "U",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "20-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Follow power factor test period shutdown and DFR test."
  },
  {
    no: 6, name: "10060-TR-102", serial: "5201091", site: "CUP-1",
    ratedPower: 6, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1152, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "20-Jan-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: ""
  },
  {
    no: 7, name: "14100-TR-001 (GTG11)", serial: "4810106", site: "CUP-1",
    ratedPower: 55, hvRate: 115, lvRate: 10.5, ratedVoltage: "115/10.5",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Healthy",
    estimatedDP: 970, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "Q", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern oil conductivity and IFT are questionable limit."
  },
  {
    no: 8, name: "14100-TR-002 (GTG12)", serial: "4811735", site: "CUP-1",
    ratedPower: 55, hvRate: 115, lvRate: 10.5, ratedVoltage: "115/10.5",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Monitor",
    estimatedDP: 859, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "U", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "Q", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Repair hot spot: HV cable terminator phase A and B (Max. 52 °C), Plan for oil regeneration: Concern IFT are questionable limit, Add passivator."
  },
  {
    no: 9, name: "14100-TR-005 (GTG13)", serial: "PP0174B01", site: "CUP-1",
    ratedPower: 55, hvRate: 115, lvRate: 10.5, ratedVoltage: "115/10.5",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 862, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern oil conductivity is unacceptable limit."
  },
  {
    no: 10, name: "14100-TR-006 (GTG14)", serial: "PP0225B01", site: "CUP-1",
    ratedPower: 55, hvRate: 115, lvRate: 10.5, ratedVoltage: "115/10.5",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 917, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "Q", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern IFT is unacceptable limit and conductivity is questionable limit."
  },
  {
    no: 11, name: "10060-TR-001 (GTG15)", serial: "5110021", site: "CUP-1",
    ratedPower: 55, hvRate: 118, lvRate: 11, ratedVoltage: "118/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 945, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "U", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern IFT is unacceptable limit."
  },
  {
    no: 12, name: "10060-TR-002 (GTG16)", serial: "5110022", site: "CUP-1",
    ratedPower: 55, hvRate: 118, lvRate: 11, ratedVoltage: "118/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 806, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "U", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2026", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern IFT is unacceptable limit."
  },
  {
    no: 13, name: "14100-TR-003", serial: "PP0084B01", site: "CUP-1",
    ratedPower: 40, hvRate: 115, lvRate: 22, ratedVoltage: "115/22",
    serviceType: "Distribution", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 917, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "Q"
    },
    passivator: "Q", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "19-Jan-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern oil conductivity is unacceptable limit, Suspect corrosive (3b), Add passivator."
  },
  {
    no: 14, name: "14100-TR-004", serial: "PP0102B01", site: "CUP-1",
    ratedPower: 40, hvRate: 115, lvRate: 22, ratedVoltage: "115/22",
    serviceType: "Distribution", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1003, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "19-Jan-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Routine 3Y PM Program."
  },
  {
    no: 15, name: "16120-TR-002A", serial: "4803168", site: "CUP-1",
    ratedPower: 2.66, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 87, healthStatus: "Monitor",
    estimatedDP: null, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "Q", insulationResistance: "Q", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "N/A", ift: "A", acidity: "N/A",
      color: "A", inhibitor: "A", corrosiveSulfur: "N/A"
    },
    passivator: "N/A", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "19-Jan-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil top-up and N2 fill up for Positive Pressure, Follow to confirm test: Insulation resistance."
  },
  {
    no: 16, name: "16120-TR-002B", serial: "4803167", site: "CUP-1",
    ratedPower: 2.66, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 76, healthStatus: "Monitor",
    estimatedDP: null, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "Q", insulationResistance: "Q", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "U", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "N/A", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "Q"
    },
    passivator: "Q", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "20-Jan-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Plan for oil top-up and N2 fill up for Positive Pressure, Plan for oil regeneration: Concern oil conductivity is questionable limit, Re-test Insulation resistance and short circuit test."
  },
  {
    no: 17, name: "16120-TR-005A", serial: "5001766", site: "CUP-1",
    ratedPower: 1.6, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 82, healthStatus: "Monitor",
    estimatedDP: 1066, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "Q"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "U", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "20-Jan-26", lastPM: "2021", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern IFT is unacceptable limit and conductivity is questionable limit., Re-test 1 and 3 Phase Short Circuit."
  },
  {
    no: 18, name: "16120-TR-005B", serial: "5001700", site: "CUP-1",
    ratedPower: 1.6, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 87, healthStatus: "Monitor",
    estimatedDP: 930, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "U",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "U", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Replacement new oil and hot oil purify in the next shutdown."
  },
  {
    no: 19, name: "10060-TR-201", serial: "5200523", site: "CUP-1",
    ratedPower: 1.6, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 80, healthStatus: "Monitor",
    estimatedDP: 1047, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "Q", insulationResistance: "Q", insulationPowerFactor: "U",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil top up, Re-test the Insulaion resistance and power factor (If not pass, require to change new oil.)"
  },
  {
    no: 20, name: "10060-TR-202", serial: "5200524", site: "CUP-1",
    ratedPower: 1.6, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 80, healthStatus: "Monitor",
    estimatedDP: null, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "U", coreToGround: "U"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "Plan for oil top up, Re-test 1 and 3 Phase short circuit impedance."
  },
  {
    no: 21, name: "24201-TR-011", serial: "4912022", site: "CUP-2",
    ratedPower: 8.8, hvRate: 11, lvRate: 7, ratedVoltage: "11/7",
    serviceType: "UAT", serviceAge: "-", healthIndex: 82, healthStatus: "Monitor",
    estimatedDP: 1066, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "U", conductivity: "U", ift: "Q", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Mar-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Hot oil purify, Concern PF 100 °C, Condutivity are unacceaptable limit, IFT is questionable limit."
  },
  {
    no: 22, name: "24201-TR-012", serial: "4912023", site: "CUP-2",
    ratedPower: 8.8, hvRate: 11, lvRate: 7, ratedVoltage: "11/7",
    serviceType: "UAT", serviceAge: "-", healthIndex: 84, healthStatus: "Monitor",
    estimatedDP: 1089, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "U", conductivity: "U", ift: "Q", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Mar-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Hot oil purify, Concern PF 100 °C, Condutivity are unacceaptable limit, IFT is questionable limit."
  },
  {
    no: 23, name: "23901-TR-011 (GTG21)", serial: "4912019", site: "CUP-2",
    ratedPower: 55, hvRate: 117, lvRate: 11, ratedVoltage: "117/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 900, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "U", acidity: "A",
      color: "Q", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "Q", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration, Concern IFT, Condutivity are unacceaptable limit, Color is questionable limit."
  },
  {
    no: 24, name: "23902-TR-012 (GTG22)", serial: "4912020", site: "CUP-2",
    ratedPower: 55, hvRate: 117, lvRate: 11, ratedVoltage: "117/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 980, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "U", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration; there is a concern that the IFT is below the acceptable limit."
  },
  {
    no: 25, name: "23911-TR-010 (STG21)", serial: "4912021", site: "CUP-2",
    ratedPower: 54, hvRate: 117, lvRate: 11, ratedVoltage: "117/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Monitor",
    estimatedDP: 884, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "Q", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration; there is a concern that the IFT is decrease closely the acceptable limit."
  },
  {
    no: 26, name: "24201-TR-111", serial: "5000574", site: "CUP-2",
    ratedPower: 2, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 76, healthStatus: "Monitor",
    estimatedDP: 1003, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "Q", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "U", coreToGround: "Q"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "Q", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration; there is a concern that the IFT Conductivity are qeustionable limit. Re-test Insulation resistance and short circuit test."
  },
  {
    no: 27, name: "24201-TR-112", serial: "5000575", site: "CUP-2",
    ratedPower: 2, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 76, healthStatus: "Monitor",
    estimatedDP: 1066, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "U", coreToGround: "Q"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "A", acidity: "A",
      color: "Q", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration; there is a concern that the Conductivity and Color are qeustionable limit. Re-test short circuit test."
  },
  {
    no: 28, name: "24201-TR-121", serial: "5000576", site: "CUP-2",
    ratedPower: 2, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 81, healthStatus: "Monitor",
    estimatedDP: 1047, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "Q"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "A", acidity: "A",
      color: "Q", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration; there is a concern that the Conductivity and Color are qeustionable limit. Re-test short circuit test."
  },
  {
    no: 29, name: "24201-TR-122", serial: "5000577", site: "CUP-2",
    ratedPower: 2, hvRate: 6.9, lvRate: 0.4, ratedVoltage: "6.9/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 76, healthStatus: "Monitor",
    estimatedDP: 1066, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "U", coreToGround: "U"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration; there is a concern that the Conductivity is qeustionable limit. Re-test short circuit test."
  },
  {
    no: 30, name: "36120-TR-103 (STG31)", serial: "5110023", site: "CUP-3",
    ratedPower: 21, hvRate: 118, lvRate: 11, ratedVoltage: "118/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Healthy",
    estimatedDP: 1152, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2025", nextPM: "#REF!",
    recommendation: "Routine 3Y PM Program."
  },
  {
    no: 31, name: "34101-TR-001", serial: "PP0158B01", site: "CUP-3",
    ratedPower: 40, hvRate: 115, lvRate: 22, ratedVoltage: "115/22",
    serviceType: "Distribution", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1089, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Mar-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Routine 3Y PM Program."
  },
  {
    no: 32, name: "34101-TR-002", serial: "PP0181B01", site: "CUP-3",
    ratedPower: 40, hvRate: 115, lvRate: 22, ratedVoltage: "115/22",
    serviceType: "Distribution", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1089, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Mar-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Routine 3Y PM Program."
  },
  {
    no: 33, name: "36120-TR-201", serial: "5102852", site: "CUP-3",
    ratedPower: 10, hvRate: 22, lvRate: 6.9, ratedVoltage: "22/6.9",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 91, healthStatus: "Monitor",
    estimatedDP: 1031, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "3Y PM program overdue, Plan for oil reganeration; there is a concern that the Conductivity is qeustionable limit."
  },
  {
    no: 34, name: "36120-TR-202", serial: "5103176", site: "CUP-3",
    ratedPower: 10, hvRate: 22, lvRate: 6.9, ratedVoltage: "22/6.9",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 86, healthStatus: "Monitor",
    estimatedDP: 1089, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "Q",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "3Y PM program overdue. Re-test 1 phase short circuit."
  },
  {
    no: 35, name: "36120-TR-301", serial: "5103168", site: "CUP-3",
    ratedPower: 2, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 86, healthStatus: "Monitor",
    estimatedDP: 1089, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "Q", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "3Y PM program overdue, Re-test 1 phase short circuit."
  },
  {
    no: 36, name: "36120-TR-302", serial: "5103169", site: "CUP-3",
    ratedPower: 2, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 72, healthStatus: "Monitor",
    estimatedDP: 1089, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "U", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "Q", conductivity: "Q", ift: "U", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "3Y PM program overdue, Re-test 1 phase short circuit, Plan for oil regeneration (PF 100C, Conductivity, IFT)."
  },
  {
    no: 37, name: "36120-TR-303", serial: "5103170", site: "CUP-3",
    ratedPower: 2, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 76, healthStatus: "Monitor",
    estimatedDP: 1016, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "Q",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "U",
      shortCircuit1P: "U", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "Q", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "Q",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "3Y PM program overdue, Re-test short circuit, Power factor, Plan for oil regeneration (Conductivity, Sludge)."
  },
  {
    no: 38, name: "36120-TR-304", serial: "5103171", site: "CUP-3",
    ratedPower: 2, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 76, healthStatus: "Monitor",
    estimatedDP: 1152, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "Q",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "U", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "Q",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Mar-26", lastPM: "2022", nextPM: "#REF!",
    recommendation: "3Y PM program overdue, Re-test short circuit, Power factor, Plan for hot oil purify (Sludge)."
  },
  {
    no: 39, name: "41BAT01 (GTG41)", serial: "6110201", site: "CUP-4",
    ratedPower: 91, hvRate: 115, lvRate: 11, ratedVoltage: "115/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Healthy",
    estimatedDP: 1066, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "Q", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Mar-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Routine 6Y PM Program (Overhaul OLTC)."
  },
  {
    no: 40, name: "41BAT02", serial: "6110202", site: "CUP-4",
    ratedPower: 52, hvRate: 115, lvRate: 22, ratedVoltage: "115/22",
    serviceType: "Distribution", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1066, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Mar-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Routine 6Y PM Program (Overhaul OLTC)."
  },
  {
    no: 41, name: "41BBT20GT001", serial: "6110203", site: "CUP-4",
    ratedPower: 10, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "UAT", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 1031, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Apr-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern oil conductivity is unacceptable limit."
  },
  {
    no: 42, name: "41BFT20GT001", serial: "6110204", site: "CUP-4",
    ratedPower: 2.8, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 87, healthStatus: "Monitor",
    estimatedDP: 1289, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "Q", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "N/A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "U", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "A", dielectricBreakdown: "A", waterContent: "A" },
    dateToAssess: "1-Apr-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern oil conductivity and IFT are questionable limit."
  },
  {
    no: 43, name: "41BFT80GT001", serial: "6110245", site: "CUP-4",
    ratedPower: 1, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: null, healthStatus: "",
    estimatedDP: 1117, estimatedLife: "",
    visualInspection: "",
    activePart: {
      overall: "", insulationResistance: "", insulationPowerFactor: "",
      excitingCurrent: "", ratioPolarity: "", windingResistance: "",
      shortCircuit1P: "", shortCircuit3P: "", coreToGround: ""
    },
    bushing: "", surgeArrester: "",
    dynamicResistance: "", fra: "",
    moisturePaper: "",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Update PM data. Plan for oil regeneration: Concern oil conductivity is unacceptable limit."
  },
  {
    no: 44, name: "41BBT10", serial: "6410137", site: "GEN",
    ratedPower: 6, hvRate: 11, lvRate: 6.6, ratedVoltage: "11/6.6",
    serviceType: "UAT", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1152, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "N/A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "N/A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2021", nextPM: "#REF!",
    recommendation: "3Y PM Program overdue."
  },
  {
    no: 45, name: "42BBT10", serial: "6410130", site: "GEN",
    ratedPower: 6, hvRate: 11, lvRate: 6.6, ratedVoltage: "11/6.6",
    serviceType: "UAT", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1152, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "N/A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "N/A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2021", nextPM: "#REF!",
    recommendation: "3Y PM Program overdue."
  },
  {
    no: 46, name: "61BBT10", serial: "6410131", site: "GEN",
    ratedPower: 6, hvRate: 11, lvRate: 6.6, ratedVoltage: "11/6.6",
    serviceType: "UAT", serviceAge: "-", healthIndex: 100, healthStatus: "Healthy",
    estimatedDP: 1152, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "N/A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "N/A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2021", nextPM: "#REF!",
    recommendation: "3Y PM Program overdue."
  },
  {
    no: 48, name: "GT2B GSUT", serial: "4710348", site: "GEN",
    ratedPower: 50, hvRate: 123, lvRate: 11, ratedVoltage: "123/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Monitor",
    estimatedDP: 905, estimatedLife: "",
    visualInspection: "Q",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "A",
    moisturePaper: "A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "Q", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "Q", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Replacement buchholz relay (oil leak), Add passivator and budget plan for oil regeneration (IFT questinable limit)."
  },
  {
    no: 49, name: "GT2C GSUT", serial: "4710349", site: "GEN",
    ratedPower: 50, hvRate: 123, lvRate: 11, ratedVoltage: "123/11",
    serviceType: "GSUT", serviceAge: "-", healthIndex: 96, healthStatus: "Monitor",
    estimatedDP: 930, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "A", surgeArrester: "A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "A", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "A", ift: "Q", acidity: "A",
      color: "A", inhibitor: "A", corrosiveSulfur: "A"
    },
    passivator: "Q", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2023", nextPM: "#REF!",
    recommendation: "Add passivator and budget plan for oil regeneration (IFT questinable limit)."
  },
  {
    no: 57, name: "GT2B Bleeding", serial: "383204884", site: "GEN",
    ratedPower: 4.5, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 1774, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "Q", conductivity: "U", ift: "Q", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "A"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2024", nextPM: "#REF!",
    recommendation: "Plan for oil regeneration: Concern oil conductivity is unacceptable limit, PF 100C and IFT are questionable limit."
  },
  {
    no: 58, name: "GT2C Bleeding", serial: "383204886", site: "GEN",
    ratedPower: 4.5, hvRate: 11, lvRate: 6.9, ratedVoltage: "11/6.9",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 92, healthStatus: "Monitor",
    estimatedDP: 1774, estimatedLife: "",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "A", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "Q", dga: "A", waterContent: "A", dielectricBreakdown: "A",
      pf25: "A", pf100: "A", conductivity: "U", ift: "A", acidity: "A",
      color: "A", inhibitor: "N/A", corrosiveSulfur: "Q"
    },
    passivator: "N/A", furan: "A", sludge: "A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2021", nextPM: "#REF!",
    recommendation: "3Y PM program overdue, Plan for oil regeneration: Concern oil conductivity is unacceptable limit, Corrosive sulfur is suspect corrosive (3b)."
  },
  {
    no: 75, name: "21-90-ED-XT-TR1", serial: "14231662_2", site: "GEN",
    ratedPower: 1.6, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 90, healthStatus: "Healthy",
    estimatedDP: null, estimatedLife: "-",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "N/A", dga: "N/A", waterContent: "N/A", dielectricBreakdown: "N/A",
      pf25: "N/A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "N/A",
      color: "N/A", inhibitor: "N/A", corrosiveSulfur: "N/A"
    },
    passivator: "N/A", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2019", nextPM: "#REF!",
    recommendation: "3Y PM program overdue."
  },
  {
    no: 76, name: "21-90-ED-XT-TR2", serial: "14231662_3", site: "GEN",
    ratedPower: 1.6, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 90, healthStatus: "Healthy",
    estimatedDP: null, estimatedLife: "-",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "N/A", dga: "N/A", waterContent: "N/A", dielectricBreakdown: "N/A",
      pf25: "N/A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "N/A",
      color: "N/A", inhibitor: "N/A", corrosiveSulfur: "N/A"
    },
    passivator: "N/A", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2019", nextPM: "#REF!",
    recommendation: "3Y PM program overdue."
  },
  {
    no: 77, name: "21-90-ED-XT-TR3", serial: "14231662_1", site: "GEN",
    ratedPower: 1.6, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 95, healthStatus: "Healthy",
    estimatedDP: null, estimatedLife: "-",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "N/A", dga: "N/A", waterContent: "N/A", dielectricBreakdown: "N/A",
      pf25: "N/A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "N/A",
      color: "N/A", inhibitor: "N/A", corrosiveSulfur: "N/A"
    },
    passivator: "N/A", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2019", nextPM: "#REF!",
    recommendation: "3Y PM program overdue."
  },
  {
    no: 78, name: "21-90-ED-XT-TR4", serial: "14231662_4", site: "GEN",
    ratedPower: 1.6, hvRate: 6.6, lvRate: 0.4, ratedVoltage: "6.6/0.4",
    serviceType: "Auxiliary", serviceAge: "-", healthIndex: 90, healthStatus: "Healthy",
    estimatedDP: null, estimatedLife: "-",
    visualInspection: "A",
    activePart: {
      overall: "A", insulationResistance: "A", insulationPowerFactor: "A",
      excitingCurrent: "A", ratioPolarity: "A", windingResistance: "A",
      shortCircuit1P: "A", shortCircuit3P: "Q", coreToGround: "N/A"
    },
    bushing: "N/A", surgeArrester: "N/A",
    dynamicResistance: "N/A", fra: "N/A",
    moisturePaper: "N/A",
    mainTankOil: {
      overall: "N/A", dga: "N/A", waterContent: "N/A", dielectricBreakdown: "N/A",
      pf25: "N/A", pf100: "N/A", conductivity: "N/A", ift: "N/A", acidity: "N/A",
      color: "N/A", inhibitor: "N/A", corrosiveSulfur: "N/A"
    },
    passivator: "N/A", furan: "N/A", sludge: "N/A",
    oltcOil: { dga: "N/A", dielectricBreakdown: "N/A", waterContent: "N/A" },
    dateToAssess: "1-Apr-26", lastPM: "2019", nextPM: "#REF!",
    recommendation: "3Y PM program overdue."
  }
];
