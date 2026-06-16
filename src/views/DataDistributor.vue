<template>
  <div class="dist-page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Data Distributor</h1>
        <p class="page-desc">Hasil mapping data distributor ke data sell-out. Upload data di halaman <router-link to="/input" class="link-nav">Input Data</router-link>.</p>
      </div>
      <div class="header-actions" v-if="store.distributorReady">
        <label class="btn btn-outline btn-sm" for="import-distributor">
          <svg viewBox="0 0 16 16" fill="currentColor" class="btn-icon"><path d="M8 4v8M4 8l4 4 4-4M3 13h10v1.5H3V13z"/></svg>
          Import
          <input type="file" id="import-distributor" accept=".xlsx,.xls,.csv" hidden @change="onImport" />
        </label>
        <button class="btn btn-outline" @click="downloadTemplate">
          <svg viewBox="0 0 16 16" fill="currentColor" class="btn-icon"><path d="M3 1h8l3 3v10H3V1zm2 1.5v3h6v-3M5 10h6M5 13h6"/></svg>
          Template
        </button>
        <button class="btn btn-outline" @click="exportData">
          <svg viewBox="0 0 16 16" fill="currentColor" class="btn-icon"><path d="M8 4v8M4 8l4-4 4 4M3 13h10v1.5H3V13z"/></svg>
          Export
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-if="!store.distributorReady">
      <div class="empty-icon">📍</div>
      <div class="empty-title">Belum ada data distributor</div>
      <div class="empty-desc">Upload data distributor di halaman Input Data terlebih dahulu, atau import langsung di halaman ini.</div>
      <div class="empty-actions">
        <router-link to="/input" class="btn btn-primary">Ke Input Data →</router-link>
        <label class="btn btn-outline" for="import-empty">
          Import File
          <input type="file" id="import-empty" accept=".xlsx,.xls,.csv" hidden @change="onImport" />
        </label>
      </div>
    </div>

    <template v-else>

      <!-- Scorecards -->
      <div class="scorecard-row">
        <div class="scorecard">
          <div class="sc-label">Total Dealer</div>
          <div class="sc-val">{{ totalDealer.toLocaleString('id-ID') }}</div>
        </div>
        <div class="scorecard">
          <div class="sc-label">Dealer Ada Lokasi</div>
          <div class="sc-val">
            {{ dealerAdaLokasi.toLocaleString('id-ID') }}
            <span class="sc-pct">({{ dealerAdaLokasiPct }}%)</span>
          </div>
        </div>
        <div class="scorecard">
          <div class="sc-label">Dealer Tanpa Lokasi</div>
          <div class="sc-val sc-val--red">
            {{ dealerTanpaLokasi.toLocaleString('id-ID') }}
            <span class="sc-pct">({{ dealerTanpaLokasiPct }}%)</span>
          </div>
        </div>
        <div class="scorecard">
          <div class="sc-label">SO Ter-mapping</div>
          <div class="sc-val">
            {{ store.distributorStats.mapped.toLocaleString('id-ID') }}
            <span class="sc-pct" :class="pctClass">{{ store.distributorStats.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- Alert mapping -->
      <div class="alert alert--success" v-if="store.distributorStats.pct >= 80">
        <span>✓</span>
        <span><strong>{{ store.distributorStats.pct }}%</strong> baris sell-out berhasil di-mapping. Data lokasi sudah lengkap untuk analisa.</span>
      </div>
      <div class="alert alert--warn" v-else-if="store.soBerjalan?.length > 0">
        <span>⚠</span>
        <span>Hanya <strong>{{ store.distributorStats.pct }}%</strong> baris ter-mapping. Periksa konsistensi penulisan nama pelanggan antara data SO dan data distributor.</span>
      </div>
      <div class="alert" v-else>
        <span>ℹ</span>
        <span>Data distributor tersimpan. Mapping akan dijalankan otomatis saat data sell-out di-upload di <router-link to="/input" class="link-nav">Input Data</router-link>.</span>
      </div>

      <!-- Tabel -->
      <section class="section">
        <div class="table-toolbar">
          <div class="toolbar-left">
            <h2 class="table-title">Daftar Distributor</h2>
            <span class="row-count">{{ filteredRows.length.toLocaleString('id-ID') }} entri</span>
          </div>
          <div class="toolbar-right">
            <div class="search-wrap">
              <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 12a5.5 5.5 0 100-11 5.5 5.5 0 000 11zm4.47-.03L14 15l-1 1-3.03-3.03A6.5 6.5 0 116.5 13a6.5 6.5 0 014.47-1.03z"/></svg>
              <input class="search-input" v-model="searchQuery" placeholder="Cari..." />
              <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
            </div>
            <select class="filter-select" v-model="filterProvinsi" @change="filterKabupaten = ''; filterKecamatan = ''">
              <option value="">Semua Provinsi</option>
              <option v-for="p in provinsiOptions" :key="p" :value="p">{{ p }}</option>
            </select>
            <select class="filter-select" v-model="filterKabupaten" :disabled="!filterProvinsi">
              <option value="">Semua Kab/Kota</option>
              <option v-for="k in kabOptions" :key="k" :value="k">{{ k }}</option>
            </select>
            <select class="filter-select" v-model="filterKecamatan" :disabled="!filterKabupaten">
              <option value="">Semua Kecamatan</option>
              <option v-for="k in kecOptions" :key="k" :value="k">{{ k }}</option>
            </select>
            <select class="filter-select" v-model="filterMapped">
              <option value="">Semua Status</option>
              <option value="mapped">✓ Ada Lokasi</option>
              <option value="unmapped">— Tanpa Lokasi</option>
            </select>
            <button v-if="hasActiveFilter" class="btn-clear-filter" @click="clearAllFilters">Reset</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-no">#</th>
                <th class="sortable" @click="sortBy('customerNo')">CUST NO. {{ sortIcon('customerNo') }}</th>
                <th class="sortable" @click="sortBy('customerName')">CUSTOMER NAME {{ sortIcon('customerName') }}</th>
                <th class="sortable" @click="sortBy('alamatTampil')">ALAMAT {{ sortIcon('alamatTampil') }}</th>
                <th class="sortable" @click="sortBy('provinsi')">PROVINSI {{ sortIcon('provinsi') }}</th>
                <th class="sortable" @click="sortBy('kotaKab')">KABUPATEN/KOTA {{ sortIcon('kotaKab') }}</th>
                <th class="sortable" @click="sortBy('kecamatan')">KECAMATAN {{ sortIcon('kecamatan') }}</th>
                <th class="col-status sortable" @click="sortBy('_punyaLokasi')">STATUS {{ sortIcon('_punyaLokasi') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in paginatedRows" :key="idx"
                :class="{ 'row-matched': row._punyaLokasi }">
                <td class="col-no text-muted">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                <td class="font-mono text-sm">{{ row.customerNo || '—' }}</td>
                <td class="font-bold">{{ row.customerName }}</td>
                <td class="text-sm addr-cell" :title="row.alamatTampil">{{ row.alamatTampil || '—' }}</td>
                <td class="text-sm text-muted">{{ row._provinsiClean || '—' }}</td>
                <td class="text-sm">{{ row._kotaKabClean || '—' }}</td>
                <td class="text-sm text-muted">{{ row._kecamatanClean || '—' }}</td>
                <td class="col-status">
                  <span class="badge-mapped" v-if="row._punyaLokasi">✓ Ada</span>
                  <span class="badge-unmapped" v-else>—</span>
                </td>
              </tr>
              <tr v-if="filteredRows.length === 0">
                <td colspan="8" class="empty-row">Tidak ada hasil untuk filter yang dipilih.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="totalPages > 1">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">‹</button>
          <button
            v-for="p in visiblePages" :key="p"
            class="page-btn" :class="{ 'page-btn--active': p === currentPage }"
            @click="currentPage = p"
          >{{ p }}</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">›</button>
          <span class="page-info">Hal {{ currentPage }} / {{ totalPages }}</span>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useSelloutStore } from '@/stores/sellout'
import { readDistributorFile } from '@/utils/fileReader'

const store = useSelloutStore()

const searchQuery    = ref('')
const filterProvinsi = ref('')
const filterKabupaten = ref('')
const filterKecamatan = ref('')
const filterMapped   = ref('')
const currentPage    = ref(1)
const pageSize       = 50

// ── Sort ──────────────────────────────────────────────────────────────────────
const sortKey   = ref('customerName')
const sortOrder  = ref('asc')

function sortBy(key) {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortOrder.value = 'asc' }
}
function sortIcon(key) {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

// ── Matched set (SO mapping) ──────────────────────────────────────────────────
const matchedSet = computed(() => {
  if (!store.soBerjalan?.length) return new Set()
  const s = new Set()
  for (const row of store.soBerjalan) {
    if (row['Provinsi'] || row['Kab/Kota'] || row['Kota']) {
      s.add(String(row['Nama Pelanggan'] ?? '').toUpperCase().trim())
    }
  }
  return s
})

// ── Dealer rows ────────────────────────────────────────────────────────────────
const dealerRows = computed(() => {
  return store.distributorData.map(d => {
    // Alamat tampil — ambil bagian sebelum koma pertama, atau kosong jika placeholder
    let raw = d.alamatGoogle || d.address || ''
    const komaIdx = raw.indexOf(',')
    let alamatTampil = komaIdx > 0 ? raw.slice(0, komaIdx).trim() : raw.trim()
    if (alamatTampil === 'Alamat tidak ditemukan') alamatTampil = ''

    // Hapus prefix "Kabupaten ", "Kota ", "Kecamatan " dari nama lokasi
    function stripPrefix(val) {
      if (!val) return ''
      return val.replace(/^(Kabupaten |Kota |Kecamatan )/i, '').trim()
    }

    // Dealer punya lokasi HANYA jika ada data administratif (provinsi/kab/kec terisi)
    const punyaLokasi = !!(d.provinsi || d.kotaKab || d.kecamatan)

    // Apakah dealer sudah ter-mapping ke SO
    const mapped = matchedSet.value.has(d.customerNameUpper)

    return {
      ...d,
      _mapped: mapped,
      _punyaLokasi: punyaLokasi,
      alamatTampil,
      _provinsiClean: stripPrefix(d.provinsi),
      _kotaKabClean: stripPrefix(d.kotaKab),
      _kecamatanClean: stripPrefix(d.kecamatan),
    }
  })
})

// ── Scorecard ─────────────────────────────────────────────────────────────────
const totalDealer = computed(() => store.distributorData.length)
const dealerAdaLokasi = computed(() => dealerRows.value.filter(r => r._punyaLokasi).length)
const dealerTanpaLokasi = computed(() => dealerRows.value.filter(r => !r._punyaLokasi).length)
const dealerAdaLokasiPct = computed(() => totalDealer.value ? Math.round(dealerAdaLokasi.value / totalDealer.value * 100) : 0)
const dealerTanpaLokasiPct = computed(() => totalDealer.value ? Math.round(dealerTanpaLokasi.value / totalDealer.value * 100) : 0)

// ── Filter options bertingkat ──────────────────────────────────────────────────
const provinsiOptions = computed(() => {
  const s = new Set()
  for (const d of store.distributorData) { if (d.provinsi) s.add(d.provinsi) }
  return [...s].sort()
})
const kabOptions = computed(() => {
  if (!filterProvinsi.value) return []
  const s = new Set()
  for (const d of store.distributorData) {
    if (d.provinsi === filterProvinsi.value && d.kotaKab) s.add(d.kotaKab)
  }
  return [...s].sort()
})
const kecOptions = computed(() => {
  if (!filterKabupaten.value) return []
  const s = new Set()
  for (const d of store.distributorData) {
    if (d.kotaKab === filterKabupaten.value && d.kecamatan) s.add(d.kecamatan)
  }
  return [...s].sort()
})
const hasActiveFilter = computed(() =>
  !!(searchQuery.value || filterProvinsi.value || filterKabupaten.value || filterKecamatan.value || filterMapped.value)
)
function clearAllFilters() {
  searchQuery.value = ''; filterProvinsi.value = ''; filterKabupaten.value = ''
  filterKecamatan.value = ''; filterMapped.value = ''
}

// ── Filtered rows ──────────────────────────────────────────────────────────────
const filteredRows = computed(() => {
  let rows = dealerRows.value
  if (filterProvinsi.value) rows = rows.filter(r => r.provinsi === filterProvinsi.value)
  if (filterKabupaten.value) rows = rows.filter(r => r.kotaKab === filterKabupaten.value)
  if (filterKecamatan.value) rows = rows.filter(r => r.kecamatan === filterKecamatan.value)
  if (filterMapped.value === 'mapped')   rows = rows.filter(r => r._punyaLokasi)
  if (filterMapped.value === 'unmapped') rows = rows.filter(r => !r._punyaLokasi)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(r =>
      r.customerName.toLowerCase().includes(q) ||
      (r.kotaKab || '').toLowerCase().includes(q) ||
      (r.provinsi || '').toLowerCase().includes(q) ||
      (r.customerNo || '').toLowerCase().includes(q) ||
      (r.alamatTampil || '').toLowerCase().includes(q)
    )
  }
  // Sort
  const key = sortKey.value
  const ord = sortOrder.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    // Sort boolean _punyaLokasi: true first (ada lokasi) then false
    if (key === '_punyaLokasi') return ord * ((b._punyaLokasi ? 1 : 0) - (a._punyaLokasi ? 1 : 0))
    const va = a[key] ?? '', vb = b[key] ?? ''
    return va < vb ? -ord : va > vb ? ord : 0
  })
})

// ── Pagination ─────────────────────────────────────────────────────────────────
const totalPages    = computed(() => Math.ceil(filteredRows.value.length / pageSize))
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const total = totalPages.value, cur = currentPage.value
  const pages = [], start = Math.max(1, cur - 2), end = Math.min(total, cur + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// Reset page saat filter berubah
watch([searchQuery, filterProvinsi, filterKabupaten, filterKecamatan, filterMapped], () => {
  currentPage.value = 1
})

const pctClass = computed(() => {
  const p = store.distributorStats.pct
  return p >= 80 ? 'pct-green' : p >= 50 ? 'pct-yellow' : 'pct-red'
})

// ── Import ─────────────────────────────────────────────────────────────────────
async function onImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const rows = await readDistributorFile(file)
    if (!rows.length) { alert('File tidak mengandung data valid.'); return }
    store.setDistributorData(rows)
  } catch(err) {
    alert('Gagal membaca file: ' + err.message)
  }
  e.target.value = ''
}

// ── Template ───────────────────────────────────────────────────────────────────
function downloadTemplate() {
  const template = [
    { 'Customer No.': '100005', 'Customer Name': 'VALENTINE', 'Addres': 'ITC B10 NO.5', 'Alamat Google': '', 'Provinsi': 'JAWA TIMUR', 'Kota/Kabupaten': 'SURABAYA', 'Kecamatan': 'GENTENG' },
    { 'Customer No.': '100009', 'Customer Name': 'MG KOM', 'Addres': 'JL. KH. HASYIM ASI NO 63 BANYUWANGI', 'Alamat Google': 'Jl. Kh. Hasyim Asyari, Genteng Wetan, Banyuwangi', 'Provinsi': 'JAWA TIMUR', 'Kota/Kabupaten': 'BANYUWANGI', 'Kecamatan': 'GENTENG' },
  ]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'template_data_distributor.xlsx')
}

// ── Export ─────────────────────────────────────────────────────────────────────
function exportData() {
  const rows = filteredRows.value.map(r => ({
    'Customer No.':   r.customerNo,
    'Customer Name':  r.customerName,
    'Addres':         r.address,
    'Alamat Google':  r.alamatGoogle || '',
    'Provinsi':       r.provinsi || '',
    'Kota/Kabupaten': r.kotaKab || '',
    'Kecamatan':      r.kecamatan || '',
    'Status':         r._punyaLokasi ? 'Ada Lokasi' : 'Tanpa Lokasi',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Distributor')
  XLSX.writeFile(wb, 'data_distributor_export.xlsx')
}
</script>

<style scoped>
.dist-page { max-width:1100px; margin:0 auto; padding:32px 24px 64px; display:flex; flex-direction:column; gap:20px; }

.page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.page-title  { font-size:24px; font-family:var(--font-mono); color:var(--text-primary); letter-spacing:-0.02em; }
.page-desc   { color:var(--text-secondary); margin-top:4px; font-size:13px; }
.header-actions { display:flex; gap:8px; flex-shrink:0; }
.link-nav { color:var(--accent); text-decoration:underline; }

/* Empty state */
.empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:80px 24px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); text-align:center; }
.empty-icon  { font-size:40px; }
.empty-title { font-size:16px; font-weight:600; color:var(--text-primary); }
.empty-desc  { font-size:13px; color:var(--text-secondary); }
.empty-actions { display:flex; gap:8px; margin-top:4px; }

/* Scorecards */
.scorecard-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.scorecard { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 20px; }
.sc-label { font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; margin-bottom:4px; }
.sc-val   { font-size:20px; font-weight:700; font-family:var(--font-mono); color:var(--text-primary); }
.sc-pct   { font-size:13px; font-weight:600; color:var(--text-muted); }
.sc-val--red .sc-pct { color:#dc2626; }
.pct-green  { color:#16a34a; }
.pct-yellow { color:#ca8a04; }
.pct-red    { color:#dc2626; }

/* Alert */
.alert { display:flex; align-items:flex-start; gap:10px; padding:12px 16px; border-radius:var(--radius-md); font-size:13px; background:rgba(255,255,255,0.04); border:1px solid var(--border); color:var(--text-secondary); }
.alert--success { background:rgba(22,163,74,0.06);  border-color:rgba(22,163,74,0.2);  color:var(--text-primary); }
.alert--warn    { background:rgba(234,179,8,0.06);  border-color:rgba(234,179,8,0.2);  color:var(--text-primary); }

/* Section / Table */
.section { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; display:flex; flex-direction:column; gap:16px; }
.table-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.toolbar-left  { display:flex; align-items:center; gap:10px; }
.toolbar-right { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.table-title   { font-size:14px; font-weight:600; color:var(--text-primary); }
.row-count     { font-size:11px; color:var(--text-muted); font-family:var(--font-mono); background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:99px; }

.search-wrap  { position:relative; }
.search-icon  { position:absolute; left:8px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:var(--text-muted); pointer-events:none; }
.search-input { padding:7px 28px 7px 28px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-input); color:var(--text-primary); font-size:12px; width:200px; transition:border-color var(--transition); }
.search-input:focus { outline:none; border-color:var(--border-active); }
.search-clear { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; line-height:1; padding:0; }
.filter-select { padding:7px 10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-input); color:var(--text-primary); font-size:12px; cursor:pointer; }
.filter-select:disabled { opacity:0.4; cursor:not-allowed; }
.btn-clear-filter { padding:7px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); background:transparent; color:var(--text-muted); font-size:11px; cursor:pointer; }
.btn-clear-filter:hover { color:var(--text-primary); border-color:var(--border-active); }

.table-wrap  { overflow-x:auto; border-radius:var(--radius-sm); border:1px solid var(--border); }
.data-table  { width:100%; border-collapse:collapse; font-size:12px; }

/* Blue sortable header */
.data-table thead { background-color:#2563eb; }
.data-table th {
  background-color:#2563eb; color:#ffffff;
  padding:10px 12px; text-align:left; font-size:10px; font-weight:800;
  text-transform:uppercase; letter-spacing:0.08em;
  border-bottom:3px solid #1e40af; white-space:nowrap;
}
.data-table th.sortable { cursor:pointer; user-select:none; }
.data-table th.sortable:hover { background-color:#1d4ed8; }

.data-table td { padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.04); vertical-align:middle; color:var(--text-primary); }
.data-table tr:last-child td { border-bottom:none; }
.data-table tr.row-matched  { background:rgba(22,163,74,0.04); }
.data-table tr:hover td     { background:rgba(255,255,255,0.03); }

.col-no     { width:44px; color:var(--text-muted); text-align:right; }
.col-status { width:72px; text-align:center; }
.addr-cell  { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.font-mono  { font-family:var(--font-mono); }
.font-bold  { font-weight:600; }
.text-sm    { font-size:11.5px; }
.text-muted { color:var(--text-muted); }

.tag-prov     { font-size:10.5px; padding:2px 7px; background:rgba(37,99,235,0.1); color:#60a5fa; border-radius:99px; white-space:nowrap; }
.badge-mapped   { font-size:12px; color:#16a34a; font-weight:700; }
.badge-unmapped { font-size:12px; color:var(--text-muted); }
.empty-row  { text-align:center; padding:32px; color:var(--text-muted); font-size:13px; }

/* Pagination */
.pagination { display:flex; align-items:center; gap:4px; justify-content:center; padding-top:4px; }
.page-btn   { width:32px; height:32px; border-radius:var(--radius-sm); border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; transition:all var(--transition); display:flex; align-items:center; justify-content:center; }
.page-btn:hover:not(:disabled) { background:rgba(255,255,255,0.06); border-color:var(--border-active); color:var(--text-primary); }
.page-btn--active  { background:var(--accent-dim); border-color:rgba(110,231,183,0.3); color:var(--accent); font-weight:600; }
.page-btn:disabled { opacity:0.3; cursor:not-allowed; }
.page-info  { font-size:11px; color:var(--text-muted); margin-left:8px; }

/* Buttons */
.btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius-sm); font-size:13px; font-weight:500; cursor:pointer; transition:all var(--transition); border:1px solid transparent; text-decoration:none; }
.btn-primary { background:var(--accent); color:#0a0a0a; border-color:var(--accent); }
.btn-primary:hover { filter:brightness(1.1); }
.btn-outline { background:transparent; color:var(--text-secondary); border-color:var(--border); }
.btn-outline:hover { background:rgba(255,255,255,0.06); color:var(--text-primary); }
.btn-sm { padding:6px 14px; font-size:12px; }
.btn-icon { width:13px; height:13px; }
</style>