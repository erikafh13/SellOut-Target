<template>
  <div class="prep-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Data <span class="accent">Preparation</span></h1>
        <p class="page-desc">
          Gabungkan SO Historis + SO Berjalan, filter berdasarkan target brand &amp; jendela 12 bulan,
          lalu hasilkan data final yang siap dipakai Dashboard &amp; Insight.
          Jika data target berubah → ulangi Generate.
        </p>
      </div>
    </div>

    <div class="warn-banner" v-if="showResetWarn">
      <span>⚠ Data berubah — data final lama sudah tidak valid. Generate ulang sebelum membuka dashboard.</span>
      <button @click="showResetWarn = false">✕</button>
    </div>

    <section class="section" :class="{ done: store.soHistoris.length }">
      <div class="section-header">
        <div class="step-badge" :class="{ done: store.soHistoris.length }">
          {{ store.soHistoris.length ? '✓' : '01' }}
        </div>
        <div class="flex-1">
          <h2 class="section-title">Data SO Historis <span class="req">*</span></h2>
          <p class="section-desc">Excel/CSV penjualan historis (Jan 2024 – bulan lalu). Bisa upload beberapa file sekaligus.</p>
        </div>
        <div v-if="store.soHistoris.length" class="section-status">
          <span class="tag tag-green">✓ {{ store.soHistoris.length.toLocaleString('id-ID') }} baris</span>
        </div>
      </div>

      <div class="upload-area" :class="{ 'upload-done': store.soHistoris.length }">
        <input type="file" id="fileHistoris" accept=".xlsx,.xls,.csv" multiple hidden @change="onHistorisChange" />
        <label for="fileHistoris" class="upload-label">
          <span class="upload-icon">⬆</span>
          <span v-if="!fileHistorisName">Pilih 1 atau beberapa file Excel/CSV (Ctrl+klik untuk multi-pilih)</span>
          <span v-else class="file-name">{{ fileHistorisName }}</span>
        </label>
        <div v-if="loadingHistoris" class="loading-bar"><div class="loading-fill"></div></div>
        <div v-if="errorHistoris" class="error-inline">{{ errorHistoris }}</div>
      </div>

      <div class="format-hint">
        Format Lama: kolom <code>Nama Dept.</code>, <code>Keterangan Barang</code>, <code>Kuantitas</code> + kolom <code>Bulan</code>/<code>Tahun</code><br/>
        Format Baru: kolom <code>No. Faktur</code>, <code>Tgl Faktur</code>, <code>SKU</code>, <code>Brand</code>, <code>Kategori</code>, <code>Nama Item</code>, <code>Quantity</code>, <code>Harga Sat</code>, <code>Total</code>
      </div>

      <div v-if="store.soHistoris.length" class="chips-row">
        <span class="chip-label">Brand terdeteksi:</span>
        <span class="chip" v-for="b in brandsHistoris" :key="b">{{ b }}</span>
      </div>
    </section>

    <section class="section" :class="{ done: store.soBerjalan.length }">
      <div class="section-header">
        <div class="step-badge" :class="{ done: store.soBerjalan.length }">
          {{ store.soBerjalan.length ? '✓' : '02' }}
        </div>
        <div class="flex-1">
          <h2 class="section-title">Data SO Berjalan <span class="req">*</span></h2>
          <p class="section-desc">Data penjualan bulan berjalan (bulan target). Upload manual atau dari Google Drive.</p>
        </div>
        <div v-if="store.soBerjalan.length" class="section-status">
          <span class="tag tag-green">✓ {{ store.soBerjalan.length.toLocaleString('id-ID') }} baris</span>
        </div>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: soMethod === 'drive' }" @click="soMethod = 'drive'">☁ Google Drive</button>
        <button class="tab" :class="{ active: soMethod === 'local' }" @click="soMethod = 'local'">⬆ Upload Lokal</button>
      </div>

      <template v-if="soMethod === 'drive'">
        <DrivePanel />
      </template>

      <template v-else>
        <div class="upload-area" :class="{ 'upload-done': store.soBerjalan.length }">
          <input type="file" id="fileBerjalan" accept=".xlsx,.xls,.csv" multiple hidden @change="onBerjalanChange" />
          <label for="fileBerjalan" class="upload-label">
            <span class="upload-icon">⬆</span>
            <span v-if="!fileBerjalanName">Pilih file SO Berjalan (.xlsx/.csv)</span>
            <span v-else class="file-name">{{ fileBerjalanName }}</span>
          </label>
          <div v-if="errorBerjalan" class="error-inline">{{ errorBerjalan }}</div>
        </div>
        <div class="format-hint">Format kolom sama dengan SO Historis Baru. Bulan &amp; Tahun di-generate otomatis dari Tgl Faktur.</div>
      </template>
    </section>

    <section class="section" :class="{ done: store.dataTarget.length }">
      <div class="section-header">
        <div class="step-badge" :class="{ done: store.dataTarget.length }">
          {{ store.dataTarget.length ? '✓' : '03' }}
        </div>
        <div class="flex-1">
          <h2 class="section-title">Data Target Brand <span class="req">*</span></h2>
          <p class="section-desc">Target penjualan per brand (dalam Rupiah). Menentukan brand mana saja yang dianalisis.</p>
        </div>
        <div v-if="store.dataTarget.length" class="section-status">
          <span class="tag tag-green">✓ {{ store.dataTarget.length }} brand</span>
        </div>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: targetMethod === 'file' }" @click="targetMethod = 'file'">Upload File</button>
        <button class="tab" :class="{ active: targetMethod === 'manual' }" @click="targetMethod = 'manual'">Input Manual</button>
      </div>

      <template v-if="targetMethod === 'file'">
        <div class="upload-area" :class="{ 'upload-done': store.dataTarget.length }">
          <input type="file" id="fileTarget" accept=".xlsx,.xls,.csv" hidden @change="onTargetChange" />
          <label for="fileTarget" class="upload-label">
            <span class="upload-icon">⬆</span>
            <span v-if="!fileTargetName">Pilih file Target (.xlsx/.csv)</span>
            <span v-else class="file-name">{{ fileTargetName }}</span>
          </label>
          <div v-if="errorTarget" class="error-inline">{{ errorTarget }}</div>
        </div>
        <div class="format-hint">Format kolom: <code>brand</code> &nbsp;|&nbsp; <code>Target</code> &nbsp;·&nbsp; Contoh: Logitech | 4000000000</div>
      </template>

      <template v-else>
        <div class="manual-rows">
          <div v-for="(row, i) in manualTargetRows" :key="i" class="manual-row">
            <div class="form-group">
              <label>Brand</label>
              <input v-model="row.brand" placeholder="e.g. Logitech" />
            </div>
            <div class="form-group">
              <label>Target (Rp)</label>
              <input v-model="row.targetStr" type="number" placeholder="e.g. 4000000000" />
            </div>
            <button class="btn-remove" @click="manualTargetRows.splice(i, 1)">✕</button>
          </div>
          <div style="display:flex; gap:8px; margin-top:4px">
            <button class="btn btn-ghost" @click="manualTargetRows.push({ brand: '', targetStr: '' })">+ Tambah Brand</button>
            <button class="btn btn-primary" @click="saveManualTarget">Simpan Target</button>
          </div>
        </div>
      </template>

      <div v-if="store.dataTarget.length" class="chips-row">
        <span class="chip" v-for="d in store.dataTarget" :key="d.brand">
          {{ d.brand }} · Rp {{ (d.target / 1e6).toFixed(0) }}jt
        </span>
      </div>
    </section>

    <section class="section" :class="{ done: store.targetBulan }">
      <div class="section-header">
        <div class="step-badge" :class="{ done: store.targetBulan }">
          {{ store.targetBulan ? '✓' : '04' }}
        </div>
        <div class="flex-1">
          <h2 class="section-title">Bulan Target <span class="req">*</span></h2>
          <p class="section-desc">Pilih bulan dan tahun target. Menentukan jendela 12 bulan historis untuk distribusi.</p>
        </div>
        <div v-if="store.targetBulan" class="section-status">
          <span class="tag tag-green">✓ {{ store.targetBulanLabel }}</span>
        </div>
      </div>

      <div class="bulan-row">
        <div class="form-group">
          <label>Bulan</label>
          <select v-model="selectedBulan">
            <option value="">-- pilih --</option>
            <option v-for="(nama, num) in BULAN_INDONESIA" :key="num" :value="num">{{ nama }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tahun</label>
          <input v-model.number="selectedTahun" type="number" min="2020" max="2030" placeholder="2025" style="width:100px" />
        </div>
        <div class="form-group" style="justify-content:flex-end">
          <button class="btn btn-primary" :disabled="!selectedBulan || !selectedTahun" @click="saveBulan">Set Bulan</button>
        </div>
      </div>

      <div v-if="store.targetBulan" class="window-info">
        <span class="info-icon">ⓘ</span>
        Jendela 12 bulan historis: <strong>{{ windowLabel }}</strong>
        <span class="window-count">({{ store.historisFiltered.length.toLocaleString('id-ID') }} transaksi digabung)</span>
      </div>
    </section>

    <section class="section" :class="{ done: store.finalHistorisReady }" v-if="allInputReady">
      <div class="section-header">
        <div class="step-badge" :class="{ done: store.finalHistorisReady }">
          {{ store.finalHistorisReady ? '✓' : '05' }}
        </div>
        <div class="flex-1">
          <h2 class="section-title">Generate Data Final</h2>
          <p class="section-desc">Gabungkan, filter, dan simpan data final ke store. Download CSV jika diperlukan sebagai backup.</p>
        </div>
        <div v-if="store.finalHistorisReady" class="section-status">
          <span class="tag tag-green">✓ Siap</span>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-val">{{ (store.soHistoris.length + store.soBerjalan.length).toLocaleString('id-ID') }}</div>
          <div class="summary-lbl">Total baris SO</div>
        </div>
        <div class="summary-card">
          <div class="summary-val">{{ store.dataTarget.length }}</div>
          <div class="summary-lbl">Brand target</div>
        </div>
        <div class="summary-card" :class="{ 'summary-card--accent': store.finalHistorisReady }">
          <div class="summary-val">{{ store.finalHistorisReady ? store.soHistoris.length.toLocaleString('id-ID') : '?' }}</div>
          <div class="summary-lbl">Historis terfilter</div>
        </div>
        <div class="summary-card" :class="{ 'summary-card--accent': store.finalHistorisReady }">
          <div class="summary-val">{{ store.finalHistorisReady ? store.soBerjalan.length.toLocaleString('id-ID') : '?' }}</div>
          <div class="summary-lbl">Berjalan terfilter</div>
        </div>
      </div>

      <div v-if="generating" class="prep-progress">
        <div class="status-msg">
          <div class="loading-dot"></div>
          {{ genMsg }}
        </div>
        <div class="loading-bar" style="margin-top:8px">
          <div class="loading-fill-pct" :style="{ width: genPct + '%' }"></div>
        </div>
      </div>

      <div class="action-row">
        <button class="btn btn-primary" :disabled="generating" @click="runGenerate">
          {{ store.finalHistorisReady ? '↻ Generate Ulang' : '⚡ Generate Data Final' }}
        </button>
        <template v-if="store.finalHistorisReady">
          <button class="btn btn-ghost" @click="downloadHistorisCSV">⬇ SO Historis (.csv)</button>
          <button class="btn btn-ghost" @click="downloadBerjalanCSV">⬇ SO Berjalan (.csv)</button>
        </template>
      </div>

      <div v-if="genError" class="error-inline">{{ genError }}</div>
    </section>

    <div class="cta-wrap" v-if="store.dataReady">
      <div class="cta-ready">
        <span class="cta-icon">◈</span>
        <div>
          <div class="cta-title">Data Final Siap!</div>
          <div class="cta-sub">
            {{ store.brands.length }} brand ·
            {{ store.targetBulanLabel }} ·
            {{ store.soHistoris.length.toLocaleString('id-ID') }} historis +
            {{ store.soBerjalan.length.toLocaleString('id-ID') }} berjalan
          </div>
        </div>
        <button class="btn btn-primary" @click="$router.push('/dashboard')">Buka Dashboard →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { readSoHistoris, readTarget } from '@/utils/fileReader'
import { normalizeSoBerjalan } from '@/utils/gdrive'
import { BULAN_INDONESIA, get12BulanHistoris, filterHistoris, formatRupiah } from '@/utils/calculations'
import DrivePanel from '@/components/DrivePanel.vue'

const store = useSelloutStore()

// ── Step 01: SO Historis ───────────────────────────────────────────────────
const fileHistorisName = ref('')
const loadingHistoris  = ref(false)
const errorHistoris    = ref('')

// REVISI: Mengakomodasi pembacaan data key baru 'Brand' atau fallback ke 'BRAND Barang'
const brandsHistoris   = computed(() =>
  [...new Set(store.soHistoris.map(r => r['Brand'] || r['BRAND Barang']).filter(Boolean))]
)

async function onHistorisChange(e) {
  const files = e.target.files
  if (!files?.length) return
  fileHistorisName.value = files.length === 1
    ? files[0].name
    : `${files.length} file dipilih`
  loadingHistoris.value = true
  errorHistoris.value   = ''
  try {
    const rows = await readSoHistoris(files)
    store.setSoHistoris(rows)
  } catch (err) {
    errorHistoris.value = `Gagal membaca: ${err.message}`
  } finally {
    loadingHistoris.value = false
  }
}

// ── Step 02: SO Berjalan ───────────────────────────────────────────────────
const soMethod       = ref('drive')
const fileBerjalanName = ref('')
const errorBerjalan  = ref('')

async function onBerjalanChange(e) {
  const files = Array.from(e.target.files)
  if (!files.length) return
  fileBerjalanName.value = files.length === 1 ? files[0].name : `${files.length} file dipilih`
  errorBerjalan.value = ''
  try {
    const { readFileAsBuffer, parseExcelOrCsv } = await import('@/utils/fileReader')
    const allRows = []
    for (const file of files) {
      const buffer = await readFileAsBuffer(file)
      const raw    = parseExcelOrCsv(buffer, file.name)
      raw.map(r => normalizeSoBerjalan(r)).filter(Boolean).forEach(r => allRows.push(r))
    }
    store.setSoBerjalan(allRows)
  } catch (err) {
    errorBerjalan.value = `Gagal membaca: ${err.message}`
  }
}

// ── Step 03: Data Target ───────────────────────────────────────────────────
const targetMethod     = ref('file')
const fileTargetName   = ref('')
const errorTarget      = ref('')
const manualTargetRows = ref([{ brand: '', targetStr: '' }])

// watch perubahan target → invalidate final
watch(() => store.dataTarget, () => {
  if (store.finalHistorisReady) showResetWarn.value = true
}, { deep: true })

async function onTargetChange(e) {
  const file = e.target.files[0]
  if (!file) return
  fileTargetName.value = file.name
  errorTarget.value    = ''
  try {
    const rows = await readTarget(file)
    store.setDataTarget(rows)
  } catch (err) {
    errorTarget.value = `Gagal membaca: ${err.message}`
  }
}

function saveManualTarget() {
  const rows = manualTargetRows.value
    .filter(r => r.brand && parseFloat(r.targetStr) > 0)
    .map(r => ({ brand: r.brand.trim(), target: parseFloat(r.targetStr) }))
  if (!rows.length) return
  store.setDataTarget(rows)
}

// ── Step 04: Bulan Target ──────────────────────────────────────────────────
const selectedBulan = ref('')
const selectedTahun = ref(new Date().getFullYear())

function saveBulan() {
  store.setTargetBulan(parseInt(selectedBulan.value), parseInt(selectedTahun.value))
}

const windowLabel = computed(() => {
  if (!store.targetBulan) return ''
  const w = get12BulanHistoris(store.targetBulan, store.targetTahun)
  return `${w[0].bulan} ${w[0].tahun} – ${w[11].bulan} ${w[11].tahun}`
})

// ── Step 05: Generate ──────────────────────────────────────────────────────
const generating     = ref(false)
const genMsg         = ref('')
const genPct         = ref(0)
const genError       = ref('')
const showResetWarn  = ref(false)

const allInputReady = computed(() =>
  store.soHistoris.length > 0 &&
  store.soBerjalan.length > 0 &&
  store.dataTarget.length > 0 &&
  store.targetBulan > 0
)

// watch input changes → invalidate
watch([() => store.soHistoris.length, () => store.soBerjalan.length, () => store.targetBulan], () => {
  if (store.finalHistorisReady) showResetWarn.value = true
})

async function runGenerate() {
  generating.value = true
  genError.value   = ''
  genMsg.value     = 'Menggabungkan data SO...'
  genPct.value     = 10
  await tick()

  try {
    const brands = new Set(store.dataTarget.map(d => d.brand.toUpperCase()))

    genMsg.value = 'Memfilter 12 bulan historis...'
    genPct.value = 35
    await tick()

    // Gabung historis + berjalan → filter 12 bulan → filter brand
    const allSO = [...store.soHistoris, ...store.soBerjalan]
    let filteredHistoris = filterHistoris(allSO, store.targetBulan, store.targetTahun)
    
    // REVISI: Mengubah pencocokan brand menggunakan properti 'Brand' atau 'BRAND Barang'
    filteredHistoris = filteredHistoris.filter(r =>
      brands.has(String(r['Brand'] || r['BRAND Barang'] || '').toUpperCase())
    )

    genMsg.value = 'Memfilter SO berjalan...'
    genPct.value = 70
    await tick()

    // REVISI: Mengubah pencocokan brand menggunakan properti 'Brand' atau 'BRAND Barang'
    const filteredBerjalan = store.soBerjalan.filter(r =>
      brands.has(String(r['Brand'] || r['BRAND Barang'] || '').toUpperCase())
    )

    genMsg.value = 'Menyimpan ke store...'
    genPct.value = 90
    await tick()

    store.setFinalReady(filteredHistoris, filteredBerjalan)
    showResetWarn.value = false
    genPct.value = 100
  } catch (err) {
    genError.value = `Gagal generate: ${err.message}`
  } finally {
    generating.value = false
  }
}

function tick() { return new Promise(r => setTimeout(r, 0)) }

function rowsToCSV(rows) {
  if (!rows.length) return ''
  const keys  = Object.keys(rows[0])
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(keys.map(k => {
      const v = row[k] == null ? '' : String(row[k])
      return (v.includes(',') || v.includes('"') || v.includes('\n'))
        ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','))
  }
  return '\uFEFF' + lines.join('\n')
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

function downloadHistorisCSV() {
  const label = `${BULAN_INDONESIA[store.targetBulan]}_${store.targetTahun}`
  triggerDownload(rowsToCSV(store.soHistoris), `SO_Historis_Filtered_${label}.csv`)
}
function downloadBerjalanCSV() {
  const label = `${BULAN_INDONESIA[store.targetBulan]}_${store.targetTahun}`
  triggerDownload(rowsToCSV(store.soBerjalan), `SO_Berjalan_Final_${label}.csv`)
}
</script>

<style scoped>
.prep-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ──────────────────────────────────────────────────────── */
.page-header { margin-bottom: 4px; }
.page-title {
  font-size: 22px;
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
  color: var(--text-primary);
}
.accent { color: var(--accent); }
.page-desc { font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.6; }

/* ── Warn banner ─────────────────────────────────────────────────── */
.warn-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(251,191,36,0.06);
  border: 1px solid rgba(251,191,36,0.25);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: #fbbf24;
}
.warn-banner button {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #fbbf24;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}

/* ── Section card ────────────────────────────────────────────────── */
.section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color var(--transition);
}
.section.done { border-color: rgba(110,231,183,0.2); }

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.flex-1 { flex: 1; min-width: 0; }
.section-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.section-desc { font-size: 11px; color: var(--text-secondary); margin-top: 3px; line-height: 1.5; }
.req { color: var(--status-red); }
.section-status { flex-shrink: 0; }

.step-badge {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: var(--accent-dim);
  border: 1px solid rgba(110,231,183,0.15);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition);
}
.step-badge.done {
  background: rgba(74,222,128,0.12);
  border-color: rgba(74,222,128,0.3);
  color: #4ade80;
}

/* ── Upload ──────────────────────────────────────────────────────── */
.upload-area {
  border: 1.5px dashed var(--border-active);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition), background var(--transition);
  cursor: pointer;
}
.upload-area:hover { border-color: var(--accent); background: var(--accent-glow); }
.upload-area.upload-done { border-style: solid; border-color: rgba(74,222,128,0.3); }

.upload-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12px;
  transition: color var(--transition);
}
.upload-area:hover .upload-label { color: var(--text-primary); }
.upload-icon { font-size: 16px; color: var(--accent); flex-shrink: 0; }
.file-name { color: var(--accent); font-family: var(--font-mono); font-size: 11px; }
.error-inline { padding: 8px 20px; font-size: 11px; color: var(--status-red); background: var(--status-red-bg); }

.loading-bar { height: 2px; background: var(--border); }
.loading-fill { height: 100%; background: var(--accent); width: 40%; animation: slide 1s ease-in-out infinite alternate; }
@keyframes slide { from { margin-left:0 } to { margin-left:60% } }

/* ── Tabs ────────────────────────────────────────────────────────── */
.tabs { display: flex; gap: 6px; }
.tab {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-active);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}
.tab.active {
  background: var(--accent-dim);
  border-color: rgba(110,231,183,0.3);
  color: var(--accent);
}
.tab:hover:not(.active) { border-color: var(--accent); color: var(--text-primary); }

/* ── Format hint ─────────────────────────────────────────────────── */
.format-hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.7;
}
.format-hint code {
  background: var(--bg-hover);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 10px;
}

/* ── Brand chips ─────────────────────────────────────────────────── */
.chips-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.chip-label { font-size: 11px; color: var(--text-muted); }
.chip {
  padding: 3px 10px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* ── Manual target ───────────────────────────────────────────────── */
.manual-rows { display: flex; flex-direction: column; gap: 8px; }
.manual-row { display: flex; gap: 10px; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.form-group label { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; }
.btn-remove {
  width: 30px; height: 32px;
  border: 1px solid var(--border-active);
  background: transparent;
  color: var(--status-red);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
  transition: all var(--transition);
}
.btn-remove:hover { background: var(--status-red-bg); border-color: var(--status-red); }

/* ── Bulan row ───────────────────────────────────────────────────── */
.bulan-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }

/* ── Window info ─────────────────────────────────────────────────── */
.window-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-glow);
  border: 1px solid rgba(110,231,183,0.12);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
}
.info-icon { color: var(--accent); }
.window-info strong { color: var(--text-primary); }
.window-count { color: var(--accent); font-family: var(--font-mono); font-size: 11px; }

/* ── Summary grid ────────────────────────────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.summary-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  transition: border-color var(--transition);
}
.summary-card--accent { border-color: rgba(110,231,183,0.25); }
.summary-val {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.summary-card--accent .summary-val { color: var(--accent); }
.summary-lbl { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }

/* ── Generate progress ───────────────────────────────────────────── */
.prep-progress { display: flex; flex-direction: column; gap: 4px; }
.status-msg {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);
}
.loading-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); animation: pulse 1.2s ease infinite; flex-shrink: 0;
}
@keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.3 } }
.loading-fill-pct { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.3s ease; }

/* ── Action row ──────────────────────────────────────────────────── */
.action-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

/* ── CTA ─────────────────────────────────────────────────────────── */
.cta-wrap { padding: 4px 0; }
.cta-ready {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--accent-dim);
  border: 1px solid rgba(110,231,183,0.25);
  border-radius: var(--radius-lg);
}
.cta-icon { font-size: 28px; color: var(--accent); }
.cta-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.cta-sub   { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.cta-ready .btn { margin-left: auto; }
</style>