const fs = require('fs');
let c = fs.readFileSync('C:/sellout-dashboard/src/views/Dashboard.vue', 'utf8');
const lines = c.split('\n');

// 1. Find line numbers for key blocks
let brandDataStart = -1, brandDataEnd = -1;
let btfmStart = -1, btfmEnd = -1;
let gtrStart = -1, gtrEnd = -1;
let katStart = -1, katEnd = -1;
let filteredStart = -1, filteredEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.startsWith('const brandData = computed')) brandDataStart = i;
  if (brandDataStart >= 0 && brandDataEnd < 0 && l === '})') brandDataEnd = i;
  if (l.startsWith('const brandTargetFinalMap = computed')) btfmStart = i;
  if (btfmStart >= 0 && btfmEnd < 0 && i > btfmStart && l === '})') btfmEnd = i;
  if (l.startsWith('function getTargetRatioBrand')) gtrStart = i;
  if (gtrStart >= 0 && gtrEnd < 0 && i > gtrStart && l === '}') gtrEnd = i;
  if (l.startsWith('const kategoriData = computed')) katStart = i;
  if (katStart >= 0 && katEnd < 0 && l === '})') katEnd = i;
  if (l.startsWith('const filtered = computed')) filteredStart = i;
  if (filteredStart >= 0 && filteredEnd < 0 && i > filteredStart && l === '})') filteredEnd = i;
}

console.log('brandData:', brandDataStart + 1, '-', brandDataEnd + 1);
console.log('btfm:', btfmStart + 1, '-', btfmEnd + 1);
console.log('gtr:', gtrStart + 1, '-', gtrEnd + 1);
console.log('kategoriData:', katStart + 1, '-', katEnd + 1);
console.log('filtered:', filteredStart + 1, '-', filteredEnd + 1);

const newBrandData = `// brandData - from store.allBrandSummary (source of truth)
const brandData = computed(() => {
  const data = store.allBrandSummary || []
  return data.map(item => {
    const key = (item.brand || item.Brand || '').toUpperCase()
    return { ...item, label: item.brand || item.Brand, target: brandTargetFinalMap.value[key] || 0 }
  })
})

// brandTargetFinalMap - from store.allBrandSummary
const brandTargetFinalMap = computed(() => {
  const result = {}
  const summary = store.allBrandSummary || []
  for (const item of summary) {
    const key = (item.brand || item.Brand || '').toUpperCase()
    if (!key) continue
    const saved = store.targetBrandInputs?.[key] || {}
    const isAutoMode = (!saved.targetManual || saved.targetManual === 0) && !saved.isForcePending
    result[key] = isAutoMode ? (item.target || 0) : (saved.isAcc ? (saved.targetInputAcc || 0) : 0)
  }
  return result
})

function getTargetRatioBrand(brandLabel) {
  if (!brandLabel) return 0
  const ach = store.getAchievement ? store.getAchievement(brandLabel) : {}
  const totalTargetSO = Object.values(ach).reduce((s, di) => s + (di.target || 0), 0)
  if (totalTargetSO === 0) return 0
  return (brandTargetFinalMap.value[brandLabel.toUpperCase()] || 0) / totalTargetSO
}

const kategoriData = computed(() => {
  const map = {}
  const rawBrands = store.allBrandSummary || []
  const totalAllAvg = rawBrands.reduce((acc, curr) => acc + (curr.avgBulanan || 0), 0)

  rawBrands.forEach(b => {
    const brandKey = b.brand || b.Brand
    const ratio = getTargetRatioBrand(brandKey)
    const ach = store.getAchievement ? store.getAchievement(brandKey) : {}

    Object.values(ach).forEach(di => {
      if (di.kategori) {
        Object.entries(di.kategori).forEach(([kat, ki]) => {
          if (!map[kat]) map[kat] = { label: kat, target: 0, realization: 0, avgBulanan: 0, subCount: 0, brands: new Set() }
          map[kat].target += Math.round(ki.target * ratio)
          map[kat].realisasi += ki.realisasi
          map[kat].brands.add(brandKey)
          const share = di.target > 0 ? (ki.target / di.target) : 0
          map[kat].avgBulanan += (b.avgBulanan * share)
        })
      }
    })
  })

  return Object.values(map).map(k => ({
    ...k, subCount: k.brands.size,
    achievement: k.target > 0 ? k.realisasi / k.target * 100 : 0,
    pctHist: totalAllAvg > 0 ? (k.avgBulanan / totalAllAvg) * 100 : 0
  }))
})

// filtered - applies interactive filter presence check on top of store data
function brandHasFilteredData(brandLabel) {
  const rows = filteredRows.value
  if (rows.length === 0) return false
  return rows.some(r => (r['Brand'] || r['brand'] || '') === brandLabel)
}

function kategoriHasFilteredData(katLabel) {
  return filteredRows.value.some(r => (r['Kategori'] || r['kategori'] || '') === katLabel)
}

const filtered = computed(() => {
  let list = viewMode.value === 'kategori' ? [...kategoriData.value] : [...brandData.value]

  // Interactive filter: check if brand/kategori has matching data in filteredRows
  const hasActiveFilter = filterPeriode.value || filterKategori.value || filterPlatform.value ||
    filterDealerSearch.value || filterDept.value || filterCabang.value ||
    filterGudang.value || filterProvinsi.value || filterKabupaten.value ||
    filterKecamatan.value

  if (hasActiveFilter) {
    if (viewMode.value === 'brand') {
      list = list.filter(s => brandHasFilteredData(s.label))
    } else {
      list = list.filter(s => kategoriHasFilteredData(s.label))
    }
  }

  if (search.value) list = list.filter(s => (s.label || '').toUpperCase().includes(search.value.toUpperCase()))
  if (filterStatus.value) list = list.filter(s => statusMatch(s.achievement, filterStatus.value))

  const key = sortKey.value; const order = sortOrder.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    if (key === 'label') return order * (a.label || '').localeCompare(b.label || '')
    return order * ((a[key] || 0) - (b[key] || 0))
  })
})

const totalFilteredReal = computed(() => filtered.value.reduce((a, s) => a + (s.realisasi || 0), 0))

const totalTarget = computed(() => filtered.value.reduce((a, s) => a + (s.target || 0), 0))
const totalReal = computed(() => filtered.value.reduce((a, s) => a + (s.realisasi || 0), 0))
const totalAch = computed(() => totalTarget.value > 0 ? (totalReal.value / totalTarget.value) * 100 : 0)`;

// Build new lines
const newLines = [];

// Copy lines before brandData
for (let i = 0; i < brandDataStart; i++) {
  newLines.push(lines[i]);
}

// Add new brandData block
newLines.push(...newBrandData.split('\n'));

// Skip old blocks
const skipSet = new Set();
for (const [s, e] of [[brandDataStart, brandDataEnd], [btfmStart, btfmEnd], [gtrStart, gtrEnd], [katStart, katEnd], [filteredStart, filteredEnd]]) {
  if (s >= 0 && e >= 0) for (let i = s; i <= e; i++) skipSet.add(i);
}

for (let i = 0; i < lines.length; i++) {
  if (!skipSet.has(i)) newLines.push(lines[i]);
}

const newC = newLines.join('\n');
fs.writeFileSync('C:/sellout-dashboard/src/views/Dashboard.vue', newC, 'utf8');
console.log('Done. New file size:', newC.length);

// Verify
const si = newC.indexOf('<script setup>');
const scr = newC.substring(si + 14, newC.indexOf('</script>'));
const clean = scr.replace(/^import .*$/gm, '');
try { new Function(clean); console.log('Script compiles OK'); } catch(e) { console.log('Compile Error:', e.message.split('\n')[0]); }