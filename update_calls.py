import re

with open('oil_report.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Update populateRow signature and logic
old_populate_row = """      const populateRow = (rowIdPrefix, valCurr, valPrev1, valPrev2, valPrev3, checkFn, decimals = 2, isPct = false, customFormatter = null) => {
        const valColCurr = document.getElementById(`res-${rowIdPrefix}-curr`);"""

new_populate_row = """      const populateRow = (rowIdPrefix, paramName, valCurr, valPrev1, valPrev2, valPrev3, decimals = 2, isPct = false, customFormatter = null) => {
        const critCol = document.getElementById(`crit-${rowIdPrefix}`);
        if (critCol && paramName) {
          critCol.textContent = getCriteriaString(paramName, fluidType, hvVoltage);
        }
        const checkFn = paramName ? checkParam(paramName) : null;

        const valColCurr = document.getElementById(`res-${rowIdPrefix}-curr`);"""

text = text.replace(old_populate_row, new_populate_row)

# Update populateRow calls
# old: populateRow('bd', curr.BD, prev1.BD, prev2.BD, prev3.BD, checkParam('BDV_2mm'), 1);
# new: populateRow('bd', 'BDV_2mm', curr.BD, prev1.BD, prev2.BD, prev3.BD, 1);
def replacer_call(match):
    # match groups: 1=prefix, 2=curr, 3=prev1, 4=prev2, 5=prev3, 6=param, 7=rest
    return f"populateRow('{match.group(1)}', '{match.group(6)}', {match.group(2)}, {match.group(3)}, {match.group(4)}, {match.group(5)}{match.group(7)}"

text = re.sub(
    r"populateRow\('([^']+)', ([^,]+), ([^,]+), ([^,]+), ([^,]+), checkParam\('([^']+)'\)(.*?)\);",
    replacer_call,
    text
)

# Also update DP
old_dp = """      document.getElementById('res-dp-p3').textContent = '-';
      const dpRating = checkParam('DP')(estDP);"""
new_dp = """      document.getElementById('res-dp-p3').textContent = '-';
      const critDpCol = document.getElementById('crit-dp');
      if (critDpCol) critDpCol.textContent = getCriteriaString('DP', fluidType, hvVoltage);
      const dpRating = checkParam('DP')(estDP);"""

text = text.replace(old_dp, new_dp)

with open('oil_report.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated populateRow in oil_report.html')
