const fs = require('fs');

const newScript = `<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { mapCity } from '@/utils/calculations'

const store = useSelloutStore()

// ─── FILTER STATE ─────────────────────────────────────────────────────────────
const viewMode          = ref('brand')
const search            = ref('')
const filterPeriode     = ref('')
const filterKategori    = ref('')
const filterPlatform    = ref('')
const filterDealerSearch = ref('')
const filterDept        = ref('')
const filterCabang      = ref('')
const filterGudang      = ref('')
const filterProvinsi    = ref('')
const filterKabupaten   = ref('')
const filterKecamatan   = ref('')
const filterStatus      = ref('')

watch(filterProvinsi,  () => { filterKabupaten.value = ''; filterKecamatan.value = '' })
watch(filterKabupaten, () => { filterKecamatan.value = '' })

// ─── SORT & ACCORDION ────────────────────────────────────────────────────────
const sortKey   = ref('target')
const sortOrder = ref('desc')
const expanded  = reactive({})
const expL1     = reactive({})
const expL2     = reactive({})
const breakModeL1 = reactive({})

function toggleLevel0(label) {
  const was = !!expanded[label]
  Object.keys(expanded).forEach(k => delete expanded[k])
  if (!was) expanded[label] = true
}

function toggleLevel1(brand, key1) {
  const k = brand + '|' + key1
  const was = !!expL1[k]
  Object.keys(expL1).forEach(kk => delete expL1[kk])
  if (!was) expL1[k] = true
}

function toggleLevel2(brand, key1, key2) {
  const k = brand + '|' + key1 + '|' + key2
  const was = !!expL2[k]
  Object.keys(expL2).forEach(kk => delete expL2[kk])
  if (!was) expL2[k] = true
}

function getAvailableBreakdowns(depth, brandLabel) {
  if (depth === 0) return ['Kategori', 'Dealer']
  return ['Dealer']
}

function setBreakL1(label, mode) {
  breakModeL1[label] = mode
  Object.keys(expL1).forEach(k => delete expL1[k])
  Object.keys(expL2).forEach(k => delete expL2[k])
}

function sortBy(key) {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortOrder.value = 'desc' }
}
function sortIcon(key) {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

// ─── SO ROWS ─────────────────────────────────────────────────────────────────
const soRows = computed(() => store.soBerjalan || [])

const periodeList    = computed(() => [...new Set(soRows.value.map(r => r['Periode'] || r['periode']).filter(Boolean))].sort())
const kategoriList   = computed(() => [...new Set(soRows.value.map(r => r['Kategori']).filter(Boolean))].sort())
const platformList   = computed(() => [...new Set(soRows.value.map(r => r['Platform'] || r['Segmen Pelanggan'] || r['platform']).filter(Boolean))].sort())
const deptList       = computed(() => [...new Set(soRows.value.map(r => r['Dept.']).filter(Boolean))].sort())
const gudangList     = computed(() => [...new Set(soRows.value.map(r => r['Gudang'] || r['gudang']).filter(Boolean))].sort())
const provinsiList   = computed(() => [...new Set(soRows.value.map(r => r['Provinsi'] || r['provinsi']).filter(Boolean))].sort())

const cabangList = computed(() => {
  const cities = new Set()
  soRows.value.forEach(r => {
    const kota = mapCity(r['Nama Dept.'] || r['Dept.'] || '')
    if (kota && kota !== 'Others') cities.add(kota)
  })
  return [...cities].sort()
})

const kabupatenList = computed(() => {
  if (!filterProvinsi.value) return []
  return [...new Set(
    soRows.value
      .filter(r => (r['Provinsi'] || r['provinsi']) === filterProvinsi.value)
      .map(r => r['Kabupaten'] || r['Kota'])
      .filter(Boolean)
  )].sort()
})

const kecamatanList = computed(() => {
  if (!filterKabupaten.value) return []
  return [...new Set(
    soRows.value
      .filter(r => (r['Kabupaten'] || r['Kota']) === filterKabupaten.value)
      .map(r => r['Kecamatan'])
      .filter(Boolean)
  )].sort()
})

// ─── FILTERED ROWS (applies all 10 filters to raw store data) ────────────────
const filteredRows = computed(() => {
  let rows = soRows.value
  if (filterPeriode.value)     rows = rows.filter(r => (r['Periode'] || r['periode']) === filterPeriode.value)
  if (filterKategori.value)    rows = rows.filter(r => (r['Kategori'] || r['kategori']) === filterKategori.value)
  if (filterPlatform.value)    rows = rows.filter(r => (r['Platform'] || r['Segmen Pelanggan'] || r['platform']) === filterPlatform.value)
  if (filterDept.value)        rows = rows.filter(r => (r['Dept.'] || r['Nama Dept.'] || r['Departemen']) === filterDept.value)
  if (filterCabang.value)      rows = rows.filter(r => mapCity(r['Nama Dept.'] || r['Dept.'] || '') === filterCabang.value)
  if (filterGudang.value)      rows = rows.filter(r => (r['Gudang'] || r['gudang']) === filterGudang.value)
  if (filterProvinsi.value)    rows = rows.filter(r => (r['Provinsi'] || r['provinsi']) === filterProvinsi.value)
  if (filterKabupaten.value)   rows = rows.filter(r => (r['Kabupaten'] || r['Kota'] || r['kabupaten']) === filterKabupaten.value)
  if (filterKecamatan.value)   rows = rows.filter(r => (r['Kecamatan'] || r['kecamatan']) === filterKecamatan.value)
  if (filterDealerSearch.value) rows = rows.filter(r => (r['Dealer'] || r['Nama Dealer'] || r['Nama Pelanggan'] || '').toUpperCase().includes(filterDealerSearch.value.toUpperCase()))
  return rows
})

// ─── BRAND DATA (source of truth = store.allBrandSummary) ───────────────────
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

const brandData = computed(() => {
  const data = store.allBrandSummary || []
  return data.map(item => {
    const key = (item.brand || item.Brand || '').toUpperCase()
    return { ...item, label: item.brand || item.Brand, target: brandTargetFinalMap.value[key] || 0 }
  })
})

function getTargetRatioBrand(brandLabel) {
  if (!brandLabel) return 0
  const ach = store.getAchievement ? store.getAchievement(brandLabel) : {}
  const totalTargetSO = Object.values(ach).reduce((s, di) => s + (di.target || 0), 0)
  if (totalTargetSO === 0) return 0
  return (brandTargetFinalMap.value[brandLabel.toUpperCase()] || 0) / totalTargetSO
}

// ─── KATEGORI DATA ───────────────────────────────────────────────────────────
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

// ─── FILTERED (interactive filter via filteredRows presence check) ───────────
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

// ─── TOTALS ──────────────────────────────────────────────────────────────────
const totalTarget = computed(() => filtered.value.reduce((a, s) => a + (s.target || 0), 0))
const totalReal   = computed(() => filtered.value.reduce((a, s) => a + (s.realisasi || 0), 0))
const totalAch    = computed(() => totalTarget.value > 0 ? (totalReal.value / totalTarget.value) * 100 : 0)

// ─── BREAKDOWN HELPERS ───────────────────────────────────────────────────────
function sortedItems(obj) {
  return Object.entries(obj ?? {}).sort((a, b) => (b[1].target || 0) - (a[1].target || 0))
}

function statusMatch(ach, status) {
  if (!status) return true
  if (status === 'angkau') return ach >= 100
  if (status === 'hampir') return ach >= 80 && ach < 100
  if (status === 'kurang') return ach < 80
  return true
}

function getBreakDataL1(s) {
  const brandLabel = s.label
  const mode = breakModeL1[brandLabel] || 'Kategori'
  const ach = store.getAchievement ? store.getAchievement(brandLabel) : {}

  if (mode === 'Kategori') {
    const map = {}
    Object.entries(ach).forEach(([dealer, di]) => {
      if (!di.kategori) return
      const totalSO = di.target || 0
      const ratio = s.target > 0 ? (totalSO / s.target) : 0
      Object.entries(di.kategori).forEach(([kat, ki]) => {
        if (!map[kat]) map[kat] = { target: 0, realization: 0 }
        map[kat].target += Math.round(ki.target * ratio)
        map[kat].realisasi += ki.realisasi || 0
      })
    })
    Object.values(map).forEach(m => { m.achievement = m.target > 0 ? m.realisasi / m.target * 100 : 0 })
    return map
  } else {
    const rows = filteredRows.value.filter(r => (r['Brand'] || r['brand'] || '') === brandLabel)
    const map = {}
    rows.forEach(r => {
      const dealer = r['Dealer'] || r['Nama Dealer'] || r['Nama Pelanggan'] || '(unknown)'
      if (!map[dealer]) map[dealer] = { target: 0, realization: 0 }
      const target = parseFloat(r['Target SO'] || r['Target'] || 0)
      const real   = parseFloat(r['Realisasi'] || 0)
      map[dealer].target    += Math.round(target)
      map[dealer].realisasi += real
    })
    Object.values(map).forEach(m => { m.achievement = m.target > 0 ? m.realisasi / m.target * 100 : 0 })
    return map
  }
}

function getBreakDataL2(brandLabel, key1) {
  const mode = breakModeL1[brandLabel] || 'Kategori'
  const ach = store.getAchievement ? store.getAchievement(brandLabel) : {}

  if (mode === 'Kategori') {
    const map = {}
    Object.entries(ach).forEach(([dealer, di]) => {
      if (!di.kategori || !di.kategori[key1]) return
      const ki = di.kategori[key1]
      const katTarget = ki.target || 0
      const katReal   = ki.realisasi || 0
      if (!map[dealer]) map[dealer] = { target: 0, realization: 0, sku: {} }
      map[dealer].target    += katTarget
      map[dealer].realisasi += katReal
      if (ki.sku) Object.entries(ki.sku).forEach(([skuNo, si]) => {
        if (!map[dealer].sku[skuNo]) {
          map[dealer].sku[skuNo] = { ...si, target: 0, realization: 0 }
        }
        const pctSku = ki.target > 0 ? (si.target / ki.target) : 0
        map[dealer].sku[skuNo].target    += Math.round(katTarget * pctSku)
        map[dealer].sku[skuNo].realisasi += si.realisasi || 0
      })
    })
    Object.values(map).forEach(m => {
      m.achievement = m.target > 0 ? m.realisasi / m.target * 100 : 0
      if (m.sku) Object.values(m.sku).forEach(si => {
        si.achievement = si.target > 0 ? si.realisasi / si.target * 100 : 0
      })
    })
    return map
  } else {
    const rows = filteredRows.value.filter(r =>
      (r['Brand'] || r['brand'] || '') === brandLabel &&
      ((r['Dealer'] || r['Nama Dealer'] || r['Nama Pelanggan']) === key1)
    )
    const map = {}
    rows.forEach(r => {
      const kat = r['Kategori'] || r['kategori'] || '(unknown)'
      if (!map[kat]) map[kat] = { target: 0, realization: 0 }
      map[kat].target    += Math.round(parseFloat(r['Target SO'] || r['Target'] || 0))
      map[kat].realisasi += parseFloat(r['Realisasi'] || 0)
    })
    Object.values(map).forEach(m => { m.achievement = m.target > 0 ? m.realisasi / m.target * 100 : 0 })
    return map
  }
}

// ─── DISPLAY HELPERS ─────────────────────────────────────────────────────────
function achColor(p) { return p >= 100 ? '#16a34a' : p >= 80 ? '#d97706' : '#dc2626' }
function achTag(p)   { return p >= 100 ? 'tag-green' : p >= 80 ? 'tag-yellow' : 'tag-red' }
function achLabel(p) { return p >= 100 ? 'Capai' : p >= 80 ? 'Hampir' : 'Kurang' }
function fmt(n)      { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') }

async function exportExcel() {
  const { exportToExcel } = await import('@/utils/fileReader')
  const rows = filtered.value.map((s, i) => ({
    '#': i + 1,
    'Nama': s.label,
    'Target': Math.round(s.target),
    'Realisasi': Math.round(s.realisasi || 0),
    'Achievement %': ((s.achievement || 0)).toFixed(1) + '%'
  }))
  exportToExcel(rows, 'brand_summary.xlsx')
}
</script>`

// Read current Dashboard.vue
let c = fs.readFileSync('C:/sellout-dashboard/src/views/Dashboard.vue', 'utf8')
const lines = c.split('\n')

// Find the LAST </template> in the file (not any nested ones)
let lastTemplateClose = -1
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].trim() === '</template>') { lastTemplateClose = i; break }
}
console.log('last </template> at line:', lastTemplateClose + 1)

// Find first <style
let styleStart = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('<style')) { styleStart = i; break }
}
console.log('<style at line:', styleStart + 1)

// Build: lines 0..lastTemplateClose (template + </template>)
//        + newScript lines
//        + lines from styleStart onwards

const scriptLines = newScript.split('\n')
const styleLines = lines.slice(styleStart)

const resultLines = [
  ...lines.slice(0, lastTemplateClose + 1),  // 0..lastTemplateClose inclusive
  ...scriptLines,
  ...styleLines
]

const newC = resultLines.join('\n')
fs.writeFileSync('C:/sellout-dashboard/src/views/Dashboard.vue', newC, 'utf8')
console.log('Done. New file:', newC.length, 'chars,', resultLines.length, 'lines')

// Verify
const tplCount = (newC.match(/<template>/g)||[]).length
const scrStart = newC.indexOf('<script setup>')
const scrEnd   = newC.indexOf('</script>', scrStart)
const scr      = newC.substring(scrStart + 14, scrEnd)
console.log('Template:', tplCount, 'Script start:', scrStart >= 0, 'Script end:', scrEnd >= 0)
console.log('Script length:', scr.length, 'lines:', scr.split('\n').length)

// Compile check
const clean = scr.replace(/^import .+ from .+$/gm, '')
try { new Function(clean); console.log('Script compiles OK') }
catch(e) { console.log('Compile Error:', e.message.split('\n').slice(0,3).join(' | ')) }