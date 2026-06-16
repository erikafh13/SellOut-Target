with open(r'C:\sellout-dashboard\src\views\Dashboard.vue', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 477-496 (1-indexed) = indices 476-495 (0-indexed)
# The file uses `realisasi` as the destructured variable name
new_lines = [
    '    const target = getTargetFinalBrand(brand)\n',
    '    const achievement = target > 0 ? (realisasi / target) * 100 : 0\n',
    '    const hist = brandHistorisCache.value[brand]\n',
    '\n',
    '    return {\n',
    '      label: brand,\n',
    '      target,\n',
    '      realize,\n',
    '      achievement,\n',
    '      avgBulanan: hist?.avgBulanan || 0,\n',
    '      pctHist: 0\n',
    '    }\n',
    '  })\n',
]

lines[476:496] = new_lines

with open(r'C:\sellout-dashboard\src\views\Dashboard.vue', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done. Verifying result:")
with open(r'C:\sellout-dashboard\src\views\Dashboard.vue', 'r', encoding='utf-8') as f:
    check = f.readlines()
for i in range(476, 490):
    print(f"  [{i}] {repr(check[i])}")