import re

with open('oil_report.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Update Table Headers
text = text.replace('<th style="width: 32%; text-align: left;">Item Test</th>', '<th style="width: 25%; text-align: left;">Item Test</th>')
text = text.replace('<th style="width: 14%;">Standards</th>', '<th style="width: 11%;">Standards</th>')
text = text.replace('<th style="width: 10%;">Unit</th>', '<th style="width: 10%;">Criteria</th>\n            <th style="width: 10%;">Unit</th>')

# Update colspans for section headers
text = text.replace('<td colspan="7"', '<td colspan="8"')

# Update rows. For each row, we find `<td class="unit-col">XXX</td>` and insert `<td class="crit-col" id="crit-YYY">-</td>` before it.
# Wait, some units are same. But the order is fixed.
# Let's match each block. We can use regex to find each `<td class="std-col">...</td>\n            <td class="unit-col">...</td>` and insert the crit-col in between.
# Wait, it's easier to find `<td class="unit-col">` and replace. But we need to assign unique IDs.
# The IDs we need: crit-bd, crit-wc, crit-pf25, crit-pf100, crit-ift, crit-ac, crit-cond, crit-color, crit-inhib, crit-furan, crit-dp, crit-sludge, crit-sulfur, crit-passivator.
# Let's just find the corresponding `id="res-XXX-curr"` to know which row it is.

def replacer(match):
    # match.group(0) is the entire row from `<tr>` to `</tr>`
    row_text = match.group(0)
    # Extract the res-XXX-curr ID to determine prefix
    m = re.search(r'id="res-([a-z0-9]+)-curr"', row_text)
    if m:
        prefix = m.group(1)
        # Find the unit-col
        unit_match = re.search(r'<td class="unit-col">.*?</td>', row_text)
        if unit_match:
            new_unit_col = f'<td class="crit-col" id="crit-{prefix}">-</td>\n            ' + unit_match.group(0)
            row_text = row_text.replace(unit_match.group(0), new_unit_col, 1)
    return row_text

# Apply replacer to every <tr> inside the tbody of the table
# The table is identified by `<table class="report-table tbl-results">`
# Let's just run it on all rows that have a unit-col and a res-XXX-curr.
text = re.sub(r'<tr>[\s\S]*?</tr>', replacer, text)

with open('oil_report.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated oil_report.html with python script.')
