<template>
  <div class="input-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Input Data</h1>
        <p class="page-desc">Siapkan data sebelum membuka dashboard.</p>
      </div>
      <button class="btn btn-primary" :disabled="!store.dataReady" @click="$router.push('/dashboard')">
        Buka Dashboard →
      </button>
    </div>

    <!-- STEP 01: SO Berjalan -->
    <section class="section">
      <div class="section-header">
        <div class="step-badge">01</div>
        <div>
          <h2>Data Sell-Out Berjalan <span class="req">*</span></h2>
          <p class="section-desc">
            Data penjualan dari komputer lokal. Kolom yang diperlukan:
            <code>No. Faktur</code> · <code>Tgl Faktur</code> · <code>Nama Pelanggan</code> · 
            <code>SKU</code> · <code>Kategori</code> · <code>Brand</code> · <code>Nama Item</code> · 
            <code>Quantity</code> · <code>Harga Sat</code> · <code>Total</code> · <code>Sales</code> · 
            <code>Gudang</code> · <code>Dept.</code> · <code>Lokasi Toko Pelanggan</code> · <code>Status</code>
          </p>
        </div>
        <div class="section-status" v-if="store.soBerjalan.length">
          <span class="tag tag-green">✓ {{ store.soBerjalan.length.toLocaleString('id-ID') }} baris</span>
          <span class="tag tag-purple" v-if="store.distributorReady && store.distributorStats.mapped > 0">
            📍 {{ store.distributorStats.pct }}% ter-mapping
          </span>
        </div>
      </div>

      <div class="upload-area" :class="{ 'upload-area--done': store.soBerjalan.length }">
        <input type="file" id="file-soberjalan" accept=".xlsx,.xls,.csv" multiple @change="onSoBerjalanChange" hidden />
        <label for="file-soberjalan" class="upload-label">
          <span class="upload-icon">⬆</span>
          <span v-if="!fileSoBerjalanName">Pilih file SO Berjalan (bisa multi-file)</span>
          <span v-else class="file-name">{{ fileSoBerjalanName }}</span>
        </label>
        <div v-if="loadingSo" class="loading-bar"><div class="loading-fill"></div></div>
        <div v-if="errorSoBerjalan" class="error-msg">{{ errorSoBerjalan }}</div>
      </div>

      <div class="mapping-info" v-if="store.soBerjalan.length && store.distributorReady">
        <span class="mapping-icon">✓</span>
        <span>
          Mapping lokasi selesai: <strong>{{ store.distributorStats.mapped.toLocaleString('id-ID') }}</strong> dari 
          <strong>{{ store.distributorStats.soTotal.toLocaleString('id-ID') }}</strong> baris 
          ({{ store.distributorStats.pct }}%) berhasil diisi data lokasi dari Data Distributor.
        </span>
      </div>
      <div class="mapping-info mapping-info--warn" v-else-if="store.soBerjalan.length && !store.distributorReady">
        <span class="mapping-icon">ℹ</span>
        <span>Data lokasi belum tersedia. Upload Data Distributor di bawah untuk mengisi kolom lokasi secara otomatis.</span>
      </div>
    </section>

    <!-- STEP 02: Data Distributor -->
    <section class="section">
      <div class="section-header">
        <div class="step-badge">02</div>
        <div>
          <h2>Data Distributor</h2>
          <p class="section-desc">
            Data alamat distributor/dealer untuk mapping lokasi ke data sell-out. Format kolom:
            <code>Customer No.</code> · <code>Customer Name</code> · <code>Addres</code> · 
            <code>Alamat Google</code> · <code>Provinsi</code> · <code>Kota/Kabupaten</code> · <code>Kecamatan</code>
          </p>
        </div>
        <div class="section-status" v-if="store.distributorReady">
          <span class="tag tag-green">✓ {{ store.distributorStats.total.toLocaleString('id-ID') }} distributor</span>
          <span class="tag tag-purple" v-if="store.distributorStats.pct > 0">
            📍 {{ store.distributorStats.pct }}% mapped
          </span>
        </div>
      </div>

      <div class="upload-area" :class="{ 'upload-area--done': store.distributorReady }">
        <input type="file" id="file-distributor" accept=".xlsx,.xls,.csv" @change="onDistributorChange" hidden />
        <label for="file-distributor" class="upload-label">
          <span class="upload-icon">📍</span>
          <span v-if="!fileDistributorName">Pilih file Data Distributor</span>
          <span v-else class="file-name">{{ fileDistributorName }}</span>
        </label>
        <div v-if="loadingDistributor" class="loading-bar"><div class="loading-fill"></div></div>
        <div v-if="errorDistributor" class="error-msg">{{ errorDistributor }}</div>
      </div>

      <!-- Info setelah distributor di-upload -->
      <div class="dist-result" v-if="store.distributorReady">
        <div class="dist-stat">
          <span class="dist-stat-val">{{ store.distributorStats.total.toLocaleString('id-ID') }}</span>
          <span class="dist-stat-label">Total Distributor</span>
        </div>
        <div class="dist-divider"></div>
        <div class="dist-stat">
          <span class="dist-stat-val" :class="pctClass">{{ store.distributorStats.pct }}%</span>
          <span class="dist-stat-label">SO Ter-mapping</span>
        </div>
        <div class="dist-divider"></div>
        <div class="dist-stat">
          <span class="dist-stat-val">{{ store.distributorStats.mapped.toLocaleString('id-ID') }}</span>
          <span class="dist-stat-label">Baris SO terisi lokasi</span>
        </div>
        <div class="dist-action">
          <router-link to="/distributor" class="btn btn-sm btn-outline">Lihat Detail →</router-link>
        </div>
      </div>

      <div class="template-info" v-if="!store.distributorReady">
        <span>💡 Belum punya file? </span>
        <button class="link-btn" @click="downloadTemplate">Download template Excel</button>
      </div>
    </section>

    <!-- STEP 03: Pilih Bulan Target -->
    <section class="section">
      <div class="section-header">
        <div class="step-badge">03</div>
        <div>
          <h2>Pilih Bulan Target <span class="req">*</span></h2>
          <p class="section-desc">
            Menentukan jendela <strong>3 bulan historis</strong> yang digunakan untuk menghitung distribusi dan target otomatis per brand.
            Target = rata-rata penjualan 3 bulan × 115%.
          </p>
        </div>
        <div class="section-status" v-if="store.targetBulan">
          <span class="tag tag-green">✓ {{ store.targetBulanLabel }}</span>
        </div>
      </div>

      <div class="bulan-grid">
        <div class="form-group" style="max-width:180px">
          <label>Bulan</label>
          <select v-model="selectedBulan">
            <option value="">-- pilih --</option>
            <option v-for="(nama, num) in BULAN_INDONESIA" :key="num" :value="num">{{ nama }}</option>
          </select>
        </div>
        <div class="form-group" style="max-width:120px">
          <label>Tahun</label>
          <input v-model.number="selectedTahun" type="number" min="2020" max="2030" placeholder="2026" />
        </div>
        <div class="form-group align-end">
          <button class="btn btn-primary" :disabled="!selectedBulan || !selectedTahun" @click="saveBulan">Set Bulan</button>
        </div>
      </div>

      <div v-if="store.targetBulan" class="window-info">
        <span class="info-icon">ⓘ</span>
        Data historis 3 bulan: <strong>{{ windowLabel }}</strong>
        <span class="window-count">({{ store.historisFiltered.length.toLocaleString('id-ID') }} transaksi)</span>
      </div>

      <div v-if="store.dataTarget.length" class="target-preview">
        <div class="preview-label">Target otomatis per brand (avg 3 bln × 115%)</div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr><th>Brand</th><th class="num">Avg/Bulan</th><th class="num">Target (×115%)</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in store.dataTarget.slice(0, 10)" :key="d.brand">
                <td>{{ d.brand }}</td>
                <td class="num">{{ formatRupiah(d.avgBulanan) }}</td>
                <td class="num accent">{{ formatRupiah(d.target) }}</td>
              </tr>
              <tr v-if="store.dataTarget.length > 10">
                <td colspan="3" class="more-row">+ {{ store.dataTarget.length - 10 }} brand lainnya</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="cta-wrap" v-if="store.dataReady">
      <div class="cta-ready">
        <span class="cta-icon">◈</span>
        <div>
          <div class="cta-title">Semua data siap!</div>
          <div class="cta-sub">{{ store.brands.length }} brand · Target {{ store.targetBulanLabel }} · {{ store.soBerjalan.length.toLocaleString('id-ID') }} transaksi</div>
        </div>
        <button class="btn btn-primary" @click="$router.push('/dashboard')">Buka Dashboard →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useSelloutStore } from '@/stores/sellout'
import { readFileAsBuffer, parseExcelOrCsv, normalizeSoFormatBaru, readDistributorFile } from '@/utils/fileReader'
import { BULAN_INDONESIA, formatRupiah, get3BulanHistoris } from '@/utils/calculations'

const store = useSelloutStore()

// ── SO Berjalan ──────────────────────────────────────────────────────────────
const fileSoBerjalanName = ref('')
const errorSoBerjalan    = ref('')
const loadingSo          = ref(false)

async function onSoBerjalanChange(e) {
  const files = e.target.files
  if (!files?.length) return
  fileSoBerjalanName.value = files.length === 1 ? files[0].name : `${files.length} file dipilih`
  loadingSo.value       = true
  errorSoBerjalan.value = ''
  try {
    const allRows = []
    for (const file of Array.from(files)) {
      const buffer = await readFileAsBuffer(file)
      const raw    = parseExcelOrCsv(buffer, file.name)
      for (const r of raw) {
        const norm = normalizeSoFormatBaru(r)
        if (norm) allRows.push(norm)
      }
    }
    store.setSoBerjalanWithMapping(allRows)
  } catch (err) {
    errorSoBerjalan.value = `Gagal membaca: ${err.message}`
  } finally {
    loadingSo.value = false
  }
}

// ── Distributor ──────────────────────────────────────────────────────────────
const fileDistributorName = ref('')
const errorDistributor    = ref('')
const loadingDistributor  = ref(false)

async function onDistributorChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileDistributorName.value = file.name
  loadingDistributor.value  = true
  errorDistributor.value    = ''
  try {
    const rows = await readDistributorFile(file)
    if (!rows.length) throw new Error('File tidak mengandung data valid atau format kolom tidak sesuai.')
    store.setDistributorData(rows)
  } catch (err) {
    errorDistributor.value = `Gagal membaca: ${err.message}`
  } finally {
    loadingDistributor.value = false
  }
}

const pctClass = computed(() => {
  const p = store.distributorStats.pct
  return p >= 80 ? 'val-green' : p >= 50 ? 'val-yellow' : 'val-red'
})

function downloadTemplate() {
  const template = [
    { 'Customer No.': '100005', 'Customer Name': 'VALENTINE', 'Addres': 'ITC B10 NO.5', 'Alamat Google': '', 'Provinsi': 'JAWA TIMUR', 'Kota/Kabupaten': 'Kota Surabaya', 'Kecamatan': 'Kecamatan Genteng' },
    { 'Customer No.': '100009', 'Customer Name': 'MG KOM', 'Addres': 'JL. KH. HASYIM ASI NO 63 BANYUWANGI', 'Alamat Google': 'Jl. Kh. Hasyim Asyari, Genteng Wetan, Banyuwangi', 'Provinsi': 'JAWA TIMUR', 'Kota/Kabupaten': 'Kabupaten Banyuwangi', 'Kecamatan': 'Kecamatan Genteng' },
  ]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'template_data_distributor.xlsx')
}

// ── Bulan Target ─────────────────────────────────────────────────────────────
const selectedBulan = ref('')
const selectedTahun = ref(new Date().getFullYear())

function saveBulan() {
  store.setTargetBulan(parseInt(selectedBulan.value), parseInt(selectedTahun.value))
}

const windowLabel = computed(() => {
  if (!store.targetBulan) return ''
  const w = get3BulanHistoris(store.targetBulan, store.targetTahun)
  return `${w[0].bulan} ${w[0].tahun} – ${w[2].bulan} ${w[2].tahun}`
})
</script>

<style scoped>
.input-page { max-width:860px; margin:0 auto; padding:32px 24px 64px; display:flex; flex-direction:column; gap:28px; }
.page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.page-title  { font-size:24px; font-family:var(--font-mono); color:var(--text-primary); letter-spacing:-0.02em; }
.page-desc   { color:var(--text-secondary); margin-top:4px; font-size:13px; }
.section { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; display:flex; flex-direction:column; gap:16px; }
.section-header { display:flex; align-items:flex-start; gap:16px; }
.section-header h2 { font-size:15px; color:var(--text-primary); }
.section-desc  { font-size:12px; color:var(--text-secondary); margin-top:4px; line-height:1.6; }
.req { color:var(--status-red); }
.section-status { margin-left:auto; flex-shrink:0; display:flex; flex-direction:column; gap:4px; align-items:flex-end; }
.step-badge { width:32px; height:32px; border-radius:8px; background:var(--accent-dim); border:1px solid rgba(110,231,183,0.2); color:var(--accent); font-family:var(--font-mono); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

code { font-family:var(--font-mono); font-size:11px; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px; color:var(--accent); }

.upload-area { border:1.5px dashed var(--border); border-radius:var(--radius-md); transition:border-color var(--transition); overflow:hidden; }
.upload-area:hover { border-color:var(--border-active); }
.upload-area--done { border-color:rgba(74,222,128,0.3); border-style:solid; }
.upload-label { display:flex; align-items:center; gap:10px; padding:18px 20px; cursor:pointer; color:var(--text-secondary); font-size:13px; }
.upload-label:hover { color:var(--text-primary); }
.upload-icon { font-size:18px; }
.file-name   { color:var(--text-primary); font-family:var(--font-mono); font-size:12px; }
.error-msg   { padding:8px 20px; font-size:12px; color:var(--status-red); background:var(--status-red-bg); }
.loading-bar { height:2px; background:var(--border); }
.loading-fill { height:100%; background:var(--accent); width:40%; animation:loading 1s ease-in-out infinite alternate; }
@keyframes loading { from{margin-left:0%} to{margin-left:60%} }

.mapping-info { display:flex; align-items:flex-start; gap:8px; padding:10px 14px; border-radius:var(--radius-sm); font-size:12px; background:rgba(22,163,74,0.06); border:1px solid rgba(22,163,74,0.2); color:var(--text-primary); }
.mapping-info--warn { background:rgba(234,179,8,0.06); border-color:rgba(234,179,8,0.2); }
.mapping-icon { font-size:12px; margin-top:1px; flex-shrink:0; }

/* Distributor result stats */
.dist-result { display:flex; align-items:center; gap:0; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; }
.dist-stat { flex:1; padding:12px 16px; display:flex; flex-direction:column; gap:2px; }
.dist-stat-val { font-size:18px; font-weight:700; font-family:var(--font-mono); color:var(--text-primary); }
.dist-stat-label { font-size:11px; color:var(--text-muted); }
.val-green  { color:#16a34a; }
.val-yellow { color:#ca8a04; }
.val-red    { color:#dc2626; }
.dist-divider { width:1px; height:40px; background:var(--border); flex-shrink:0; }
.dist-action { padding:12px 16px; flex-shrink:0; }

.template-info { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); }
.link-btn { background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px; text-decoration:underline; padding:0; }

.tag { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:99px; font-size:11px; font-weight:500; }
.tag-green  { background:rgba(22,163,74,0.1); color:#16a34a; }
.tag-purple { background:rgba(124,58,237,0.1); color:#7c3aed; }

.bulan-grid { display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap; }
.form-group { display:flex; flex-direction:column; flex:1; }
.form-group.align-end { justify-content:flex-end; }
.window-info { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--accent-glow); border:1px solid rgba(110,231,183,0.15); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); }
.info-icon   { color:var(--accent); }
.window-info strong { color:var(--text-primary); }
.window-count { margin-left:4px; color:var(--accent); font-family:var(--font-mono); font-size:11px; }
.target-preview { display:flex; flex-direction:column; gap:8px; }
.preview-label  { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-muted); }
.table-scroll   { overflow-x:auto; border-radius:var(--radius-sm); border:1px solid var(--border); }
table { width:100%; border-collapse:collapse; font-size:12px; }
th { padding:8px 12px; text-align:left; opacity:.5; font-weight:600; border-bottom:1px solid var(--border); white-space:nowrap; }
td { padding:7px 12px; border-bottom:1px solid rgba(255,255,255,.04); }
td.num, th.num { text-align:right; font-family:var(--font-mono); }
td.accent { color:var(--accent); font-weight:600; }
.more-row { text-align:center; opacity:.4; font-size:11px; }
.cta-wrap  { padding:4px 0; }
.cta-ready { display:flex; align-items:center; gap:16px; padding:20px 24px; background:var(--accent-dim); border:1px solid rgba(110,231,183,0.25); border-radius:var(--radius-lg); }
.cta-icon  { font-size:28px; color:var(--accent); }
.cta-title { font-size:15px; font-weight:600; color:var(--text-primary); }
.cta-sub   { font-size:12px; color:var(--text-secondary); margin-top:2px; }
.cta-ready .btn { margin-left:auto; }
.btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius-sm); font-size:13px; font-weight:500; cursor:pointer; transition:all var(--transition); border:1px solid transparent; text-decoration:none; }
.btn:disabled { opacity:.4; cursor:not-allowed; }
.btn-primary { background:var(--accent); color:#0a0a0a; border-color:var(--accent); }
.btn-primary:hover:not(:disabled) { filter:brightness(1.1); }
.btn-outline { background:transparent; color:var(--text-secondary); border-color:var(--border); }
.btn-outline:hover { background:rgba(255,255,255,0.06); color:var(--text-primary); }
.btn-sm { padding:5px 12px; font-size:12px; }
</style>