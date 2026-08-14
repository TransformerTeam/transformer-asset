var EVALUATION_CRITERIA_DATA = [
  {
    "row": 701,
    "category": "General Parts (Weight Score 5%)",
    "item": "Visual Inspection",
    "criteria": "-",
    "standard": "GPSC Criteria",
    "recommendation": "Score: 5/5 (Normal)"
  },
  {
    "row": 702,
    "category": "General Parts (Weight Score 5%)",
    "item": "Grounding Resistance",
    "criteria": "< 1 Ω",
    "standard": "GPSC Criteria",
    "recommendation": "Score: 5/5 (Normal)"
  },
  {
    "row": 703,
    "category": "General Parts (Weight Score 5%)",
    "item": "Contact Resistance",
    "criteria": "≤ 10 µΩ",
    "standard": "GPSC Criteria",
    "recommendation": "Score: 5/5 (Normal)"
  },
  {
    "row": 704,
    "category": "General Parts (Weight Score 5%)",
    "item": "Neutral Ground Inspection",
    "criteria": "Rated voltage 6.9-15 kV IR≥1 GΩ, Rated voltage 22-33 kV IR≥5 GΩ",
    "standard": "IEC 60076-25:2023",
    "recommendation": "Score: 5/5 (Normal)"
  },
  {
    "row": 9,
    "category": "Magnetic Core",
    "item": "Core-Ground Insulation Resistance",
    "criteria": "Insulation Resistance > 100 MΩ",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 10,
    "category": "Magnetic Core",
    "item": "Clamp-Ground Insulation Resistance",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 11,
    "category": "Magnetic Core",
    "item": "Core-Clamp Insulation Resistance",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 13,
    "category": "High Voltage Winding",
    "item": "Exciting Current",
    "criteria": "Three-phase pattern: Outer phases equal within 5% (H-L-H pattern). Comparison with FAT: Error ≤ 5% (Good), 5-10% (Fair), > 30% (Critical)",
    "standard": "IEEE C57.152-2013 / CIGRE TB 761",
    "recommendation": "Investigate turn short / core damage if abnormal"
  },
  {
    "row": 14,
    "category": "High Voltage Winding",
    "item": "Single Phase Leakage Impedance",
    "criteria": "Impedance measured shall\ncompare within 3% with another phase",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 15,
    "category": "High Voltage Winding",
    "item": "3 Phase Short Circuit Impedance",
    "criteria": "Three phase equivalent test result should be within 3% of nameplate values",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 16,
    "category": "High Voltage Winding",
    "item": "Turn Ratio",
    "criteria": "± 0.5% error from Calculated Ratio",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 17,
    "category": "High Voltage Winding",
    "item": "DC Winding Resistance",
    "criteria": "%Max. Error from Previous Test (≤5%)",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 18,
    "category": "High Voltage Winding",
    "item": "",
    "criteria": "%Max. Error between Phase (≤2%)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 19,
    "category": "High Voltage Winding",
    "item": "Insulation Power Factor and Capacitance",
    "criteria": "% Max. PF at 20 oC (≤ 1.0%)",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 20,
    "category": "High Voltage Winding",
    "item": "",
    "criteria": "% Max. Capacitance (≤ 5.0%)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 21,
    "category": "High Voltage Winding",
    "item": "Insulation Resistance and PI",
    "criteria": "PI > 1.25",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 23,
    "category": "Low Voltage Winding",
    "item": "DC Winding Resistance",
    "criteria": "%Max. Error from Previous Test (≤5%)",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 24,
    "category": "Low Voltage Winding",
    "item": "",
    "criteria": "%Max. Error between Phase (≤5%)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 25,
    "category": "Low Voltage Winding",
    "item": "Insulation Power Factor and Capacitance",
    "criteria": "% Max. PF at 20 oC (≤ 1.0%)",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 26,
    "category": "Low Voltage Winding",
    "item": "",
    "criteria": "% Max. Capacitance (≤ 5.0%)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 27,
    "category": "Low Voltage Winding",
    "item": "Insulation Resistance and PI",
    "criteria": "PI > 1.25",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 29,
    "category": "Tertiary Winding",
    "item": "DC Winding Resistance",
    "criteria": "%Max. Error from Previous Test (≤5%)",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 30,
    "category": "Tertiary Winding",
    "item": "",
    "criteria": "%Max. Error between Phase (≤2%)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 31,
    "category": "Tertiary Winding",
    "item": "Insulation Power Factor and Capacitance",
    "criteria": "% Max. PF at 20 oC (≤ 1.0%)",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 32,
    "category": "Tertiary Winding",
    "item": "",
    "criteria": "% Max. Capacitance (≤ 5.0%)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 33,
    "category": "Tertiary Winding",
    "item": "Insulation Resistance and PI",
    "criteria": "PI > 1.25",
    "standard": "IEEE C57.152-2013",
    "recommendation": ""
  },
  {
    "row": 35,
    "category": "Insulating Oil in Main Tank",
    "item": "Dissolve Gas Analysis (DGA)",
    "criteria": "",
    "standard": "IEEE C57.104-2019",
    "recommendation": "Abnormal"
  },
  {
    "row": 36,
    "category": "Insulating Oil in Main Tank",
    "item": "Dielectrc Breakdown Voltage (kV)",
    "criteria": "ASTM D1816 gap 2 mm",
    "standard": "IEEE C57.106-2015",
    "recommendation": ""
  },
  {
    "row": 37,
    "category": "Insulating Oil in Main Tank",
    "item": "% Max PF at 25 oC",
    "criteria": "ASTM D924",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 38,
    "category": "Insulating Oil in Main Tank",
    "item": "% Max PF at 100 oC",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 39,
    "category": "Insulating Oil in Main Tank",
    "item": "Conductivity (pS/m)",
    "criteria": "-",
    "standard": "IEC 61620",
    "recommendation": ""
  },
  {
    "row": 40,
    "category": "Insulating Oil in Main Tank",
    "item": "Water Content (ppm)",
    "criteria": "ASTM D1533",
    "standard": "IEEE C57.106-2015",
    "recommendation": ""
  },
  {
    "row": 41,
    "category": "Insulating Oil in Main Tank",
    "item": "Color",
    "criteria": "ASTM D1500",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 42,
    "category": "Insulating Oil in Main Tank",
    "item": "Interfatial Tension (IFT) (dynes/cm)",
    "criteria": "ASTM D971",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 43,
    "category": "Insulating Oil in Main Tank",
    "item": "Acidity (Neutralization number) (mgKOH/g)",
    "criteria": "ASTM D974",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 44,
    "category": "Insulating Oil in Main Tank",
    "item": "Aging Product (IFT/Acidity)",
    "criteria": "-",
    "standard": "CIGRE 413",
    "recommendation": ""
  },
  {
    "row": 45,
    "category": "Insulating Oil in Main Tank",
    "item": "Sludge (%original wight)",
    "criteria": "-",
    "standard": "IEC 60296",
    "recommendation": ""
  },
  {
    "row": 46,
    "category": "Insulating Oil in Main Tank",
    "item": "Inhibitor (%)",
    "criteria": "-",
    "standard": "IEC 60422",
    "recommendation": ""
  },
  {
    "row": 47,
    "category": "Insulating Oil in Main Tank",
    "item": "Corrosive Sulfur",
    "criteria": "ASTM D1275",
    "standard": "IEEE C57.106-2015",
    "recommendation": "10"
  },
  {
    "row": 48,
    "category": "Insulating Oil in Main Tank",
    "item": "Passivator (Irgamet 39) (ppm)",
    "criteria": "IEC 60666",
    "standard": "-",
    "recommendation": ""
  },
  {
    "row": 49,
    "category": "Insulating Oil in Main Tank",
    "item": "Furan (2-FAL) (ppb)",
    "criteria": "ASTM D5837",
    "standard": "IEEE C57.106-2015",
    "recommendation": ""
  },
  {
    "row": 50,
    "category": "Insulating Oil in Main Tank",
    "item": "Estimated DP",
    "criteria": "Chengdong",
    "standard": "CIGRE 323",
    "recommendation": ""
  },
  {
    "row": 51,
    "category": "Insulating Oil in Main Tank",
    "item": "Moisture in Paper [Cal.]",
    "criteria": "SDMayer",
    "standard": "-",
    "recommendation": ""
  },
  {
    "row": 53,
    "category": "Insulating Oil in OLTC",
    "item": "Dielectrc Breakdown",
    "criteria": "IEC 60156",
    "standard": "IEC 60422",
    "recommendation": ""
  },
  {
    "row": 54,
    "category": "Insulating Oil in OLTC",
    "item": "Water Content",
    "criteria": "ASTM D1533",
    "standard": "IEEE C57.106-2015",
    "recommendation": ""
  },
  {
    "row": 55,
    "category": "Insulating Oil in OLTC",
    "item": "DGA Result",
    "criteria": "",
    "standard": "IEEE C57.104-2019",
    "recommendation": "Abnormal"
  },
  {
    "row": 57,
    "category": "Surge Arrester",
    "item": "Leakage Current (Increment from Initial %)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 58,
    "category": "Surge Arrester",
    "item": "Watt Loss  (Increment from Initial %)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 59,
    "category": "Surge Arrester",
    "item": "Insulation Resistance (Remaining from Initial %)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 60,
    "category": "Surge Arrester",
    "item": "Bushing",
    "criteria": "Type:",
    "standard": "Brand:",
    "recommendation": ""
  },
  {
    "row": 61,
    "category": "Surge Arrester",
    "item": "HV % PF @ 20 oC (C1) (Error from Nameplate)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 62,
    "category": "Surge Arrester",
    "item": "HV % Capacitance (C1) (Error from Nameplate)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 63,
    "category": "Surge Arrester",
    "item": "LV % PF @ 20 oC (C1) (Error from Nameplate)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 64,
    "category": "Surge Arrester",
    "item": "LV % Capacitance (C1) (Error from Nameplate)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 66,
    "category": "OLTC",
    "item": "Transition Resistance (%)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 67,
    "category": "OLTC",
    "item": "Contact Wear (mm/100,000 Operations)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 68,
    "category": "OLTC",
    "item": "Visual Inspection",
    "criteria": "",
    "standard": "",
    "recommendation": "Abnormal"
  },
  {
    "row": 69,
    "category": "OLTC",
    "item": "Grounding Measurement and Test",
    "criteria": "",
    "standard": "",
    "recommendation": "Abnormal"
  },
  {
    "row": 70,
    "category": "OLTC",
    "item": "Neutral Ground Resistor",
    "criteria": "",
    "standard": "",
    "recommendation": "Abnormal"
  },
  {
    "row": 71,
    "category": "OLTC",
    "item": "Cooling System Inspection",
    "criteria": "",
    "standard": "",
    "recommendation": "Abnormal"
  },
  {
    "row": 74,
    "category": "General Health Index",
    "item": "Criteria",
    "criteria": "Comissioning Value",
    "standard": "",
    "recommendation": "Standard Recommendation"
  },
  {
    "row": 76,
    "category": "General Health Index",
    "item": "Age of Transformer (Year)",
    "criteria": "Estimated service age 40 Year",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 77,
    "category": "General Health Index",
    "item": "Number of Through Fault",
    "criteria": "-",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 78,
    "category": "General Health Index",
    "item": "Maintenance History",
    "criteria": "Preventive maintenance every 3 Year",
    "standard": "",
    "recommendation": "On Schedule"
  },
  {
    "row": 79,
    "category": "General Health Index",
    "item": "Load History (%)",
    "criteria": "Peak Load",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 82,
    "category": "Summary",
    "item": "Summary of Probability of Failure (Condition Health + General Health)",
    "criteria": "",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 85,
    "category": "Impact Index",
    "item": "Criteria",
    "criteria": "Comissioning Value",
    "standard": "",
    "recommendation": "Standard Recommendation"
  },
  {
    "row": 87,
    "category": "Impact Index",
    "item": "Financial losses (MTHB/Day)",
    "criteria": "มูลค่าความเสียหายจากการขายไฟฟ้าให้ลูกค้าไม่ได้ (ลบ./วัน)",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 88,
    "category": "Impact Index",
    "item": "Equipment damage cost (MTHB)",
    "criteria": "มูลค่าความเสียหายของหม้อแปลงไฟฟ้า",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 89,
    "category": "Impact Index",
    "item": "N-1 Criteria",
    "criteria": "แหล่งพลังงานไฟฟ้ามีกำลังสำรองหรือมีเครือข่ายที่เพียงพอกับความต้องการใช้ไฟฟ้าและสามารถจ่ายไฟได้แม้ว่าอุปกรณ์ตัวใดตัวหนึ่งหรือส่วนใดส่วนหนึ่งของระบบเกิดชำรุดเสียหายจนไม่สามารถใช้งานได้",
    "standard": "",
    "recommendation": "Yes"
  },
  {
    "row": 90,
    "category": "Impact Index",
    "item": "Feeder Importance",
    "criteria": "ความสำคัญของหม้อแปลงไฟฟ้า แบ่งตามความสำคัญและการใช้งาน",
    "standard": "",
    "recommendation": "Auxiliary"
  },
  {
    "row": 91,
    "category": "Impact Index",
    "item": "Recovery Time (Week)",
    "criteria": "เวลาในการนำหม้อแปลงไฟฟ้ากลับเข้าระบบ",
    "standard": "",
    "recommendation": ""
  },
  {
    "row": 92,
    "category": "Impact Index",
    "item": "Network Stability",
    "criteria": "สเถียรภาพของระบบส่งจ่ายกำลังไฟฟ้า",
    "standard": "",
    "recommendation": "ไม่กระทบกับสเถียรภาพของระบบส่งจ่ายกำลังไฟฟ้า"
  },
  {
    "row": 93,
    "category": "Impact Index",
    "item": "Customer impact",
    "criteria": "ผลกระทบกับระบบไฟฟ้าของลูกค้า",
    "standard": "",
    "recommendation": "ไม่กระทบกับลูกค้า"
  },
  {
    "row": 94,
    "category": "Impact Index",
    "item": "Image and Media Relations",
    "criteria": "ภาพลักษณ์และสื่อโซเชียล",
    "standard": "",
    "recommendation": "ไม่กระทบกับภาพลักษณ์บริษัท"
  },
  {
    "row": 95,
    "category": "Impact Index",
    "item": "Enviroment",
    "criteria": "ผลกระทบด้านสิ่งแวดล้อมขณะหม้อแปลงผิดปกติ",
    "standard": "",
    "recommendation": "ไม่เกิดผลกระทบด้านสิ่งแวดล้อม (ไม่มีควันดำปกคลุมพื้นที่ ไม่มีน้ำมันหกรั่วไหล)"
  },
  {
    "row": 96,
    "category": "Impact Index",
    "item": "Safety",
    "criteria": "ผลกระทบด้านความปลอดภัยขณะหม้อแปลงผิดปกติ",
    "standard": "",
    "recommendation": "ไม่เกิดอันตรายต่อบุคคลและทรัพย์สิน (มีระบบป้องกันที่ดี อยู่ในพื้นที่ปิด มีระบบดับเพลิงครบ)"
  }
];
if (typeof window !== 'undefined') { window.EVALUATION_CRITERIA_DATA = EVALUATION_CRITERIA_DATA; }
