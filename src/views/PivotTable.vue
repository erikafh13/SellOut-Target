<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Pivot Table</h1>
        <p class="page-sub">Analisa data fleksibel — drag dimensi ke baris, kolom, atau nilai</p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" @click="resetConfig">🔄 Reset</button>
        <button class="btn-outline" @click="toggleCompare" :class="{active: compareMode}">
          ⚖ Bandingkan {{ compareMode ? '(aktif)' : '' }}
        </button>
        <button class="btn-primary" @click="exportExcel" :disabled="!pivotRows.length">⬇ Export</button>
      </div>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-if="!store.soBerjalan.length">
      <div class="empty-icon">📊</div>
      <div class="empty-title">Belum ada data</div>
      <div class="empty-desc">Upload data SO Berjalan di halaman Input Data terlebih dahulu.</div>
      <router-link to="/input" class="btn-primary">Ke Input Data →</router-link>
    </div>

    <template v-else>

      <!-- Filter Periode Global -->
      <div class="period-bar">
        <div class="period-group">
          <label class="period-label">PERIODE</label>
          <div class="period-pills">
            <button class="period-pill" :class="{active: periodFilter==='all'}" @click="periodFilter='all'">Semua</button>
            <button class="period-pill" :class="{active: periodFilter==='target'}" @click="periodFilter='target'" :disabled="!store.targetBulan">
              {{ store.targetBulanLabel || 'Bulan Target' }}
            </button>
            <button class="period-pill" :class="{active: periodFilter==='custom'}" @click="periodFilter='custom'">Custom</button>
          </div>
        </div>
        <template v-if="periodFilter==='custom'">
          <div class="period-group">
            <label class="period-label">DARI</label>
            <select v-model="customFrom" class="period-select">
              <option value="">-- pilih --</option>
              <option v-for="p in availablePeriods" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="period-group">
            <label class="period-label">SAMPAI</label>
            <select v-model="customTo" class="period-select">
              <option value="">-- pilih --</option>
              <option v-for="p in availablePeriods" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </template>
        <div class="period-info">
          <span class="row-badge">{{ filteredSource.length.toLocaleString('id-ID') }} baris</span>
        </div>
      </div>

      <!-- Mode Perbandingan -->
      <div class="compare-panel" v-if="compareMode">
        <div class="compare-header">
          <span class="compare-title">⚖ Mode Perbandingan</span>
          <span class="compare-desc">Bandingkan 2 segmen data side-by-side. Filter A dan B independen.</span>
        </div>
        <div class="compare-filters">
          <div class="compare-col">
            <div class="compare-col-label label-a">Segmen A</div>
            <div class="compare-row">
              <div class="cmp-group">
                <label class="filter-label">DIMENSI</label>
                <select v-model="cmpA.dim" class="cmp-select">
                  <option value="">Semua</option>
                  <option v-for="d in COMPARE_DIMS" :key="d.key" :value="d.key">{{ d.label }}</option>
                </select>
              </div>
              <div class="cmp-group" v-if="cmpA.dim">
                <label class="filter-label">NILAI</label>
                <select v-model="cmpA.val" class="cmp-select">
                  <option value="">-- pilih --</option>
                  <option v-for="v in getCompareOptions(cmpA.dim)" :key="v" :value="v">{{ v }}</option>
                </select>
              </div>
              <div class="cmp-group">
                <label class="filter-label">PERIODE</label>
                <select v-model="cmpA.period" class="cmp-select">
                  <option value="">Semua Periode</option>
                  <option v-for="p in availablePeriods" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="compare-vs">VS</div>
          <div class="compare-col">
            <div class="compare-col-label label-b">Segmen B</div>
            <div class="compare-row">
              <div class="cmp-group">
                <label class="filter-label">DIMENSI</label>
                <select v-model="cmpB.dim" class="cmp-select">
                  <option value="">Semua</option>
                  <option v-for="d in COMPARE_DIMS" :key="d.key" :value="d.key">{{ d.label }}</option>
                </select>
              </div>
              <div class="cmp-group" v-if="cmpB.dim">
                <label class="filter-label">NILAI</label>
                <select v-model="cmpB.val" class="cmp-select">
                  <option value="">-- pilih --</option>
                  <option v-for="v in getCompareOptions(cmpB.dim)" :key="v" :value="v">{{ v }}</option>
                </select>
              </div>
              <div class="cmp-group">
                <label class="filter-label">PERIODE</label>
                <select v-model="cmpB.period" class="cmp-select">
                  <option value="">Semua Periode</option>
                  <option v-for="p in availablePeriods" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Builder Panel -->
      <div class="builder">

        <!-- Kiri: Field list -->
        <div class="field-panel">
          <div class="panel-title">📋 Dimensi Tersedia</div>
          <div class="field-search-wrap">
            <input v-model="fieldSearch" class="field-search" placeholder="Cari dimensi..." />
          </div>
          <div class="field-list">
            <div
              v-for="f in filteredFields"
              :key="f.key"
              class="field-chip"
              :class="{ 'field-used': isFieldUsed(f.key) }"
              draggable="true"
              @dragstart="onDragStart($event, f)"
              @click="autoAddField(f)"
              :title="'Klik untuk tambah otomatis, atau drag ke area yang diinginkan'"
            >
              <span class="field-icon">{{ f.icon }}</span>
              <span class="field-name">{{ f.label }}</span>
              <span class="used-dot" v-if="isFieldUsed(f.key)">●</span>
            </div>
          </div>

          <!-- Value (Metrik) -->
          <div class="panel-title" style="margin-top:16px">📐 Metrik / Value</div>
          <div class="field-list">
            <div
              v-for="m in METRICS"
              :key="m.key"
              class="field-chip metric-chip"
              :class="{ 'field-used': isMetricUsed(m.key) }"
              draggable="true"
              @dragstart="onDragStart($event, m, true)"
              @click="autoAddMetric(m)"
              :title="m.desc"
            >
              <span class="field-icon">{{ m.icon }}</span>
              <span class="field-name">{{ m.label }}</span>
              <span class="used-dot" v-if="isMetricUsed(m.key)">●</span>
            </div>
          </div>
        </div>

        <!-- Tengah: Drop zones -->
        <div class="drop-panel">

          <!-- Rows Zone -->
          <div class="drop-zone"
            :class="{ 'dz-hover': dragOver === 'rows' }"
            @dragover.prevent="dragOver='rows'"
            @dragleave="dragOver=null"
            @drop="onDrop($event, 'rows')"
          >
            <div class="dz-label">
              <span class="dz-icon">↕</span> BARIS (Rows)
              <span class="dz-hint">Drag dimensi ke sini</span>
            </div>
            <div class="dz-chips">
              <div v-for="(f, i) in config.rows" :key="f.key" class="dz-chip">
                <span class="field-icon">{{ f.icon }}</span>
                {{ f.label }}
                <button class="chip-remove" @click="removeField('rows', i)">×</button>
              </div>
              <div class="dz-empty" v-if="!config.rows.length">Drag dimensi ke sini</div>
            </div>
          </div>

          <!-- Columns Zone -->
          <div class="drop-zone"
            :class="{ 'dz-hover': dragOver === 'cols' }"
            @dragover.prevent="dragOver='cols'"
            @dragleave="dragOver=null"
            @drop="onDrop($event, 'cols')"
          >
            <div class="dz-label">
              <span class="dz-icon">↔</span> KOLOM (Columns)
              <span class="dz-hint">Drag dimensi ke sini (opsional)</span>
            </div>
            <div class="dz-chips">
              <div v-for="(f, i) in config.cols" :key="f.key" class="dz-chip">
                <span class="field-icon">{{ f.icon }}</span>
                {{ f.label }}
                <button class="chip-remove" @click="removeField('cols', i)">×</button>
              </div>
              <div class="dz-empty" v-if="!config.cols.length">Drag dimensi ke sini (opsional)</div>
            </div>
          </div>

          <!-- Values Zone -->
          <div class="drop-zone drop-zone--values"
            :class="{ 'dz-hover': dragOver === 'values' }"
            @dragover.prevent="dragOver='values'"
            @dragleave="dragOver=null"
            @drop="onDrop($event, 'values')"
          >
            <div class="dz-label">
              <span class="dz-icon">Σ</span> NILAI (Values)
              <span class="dz-hint">Drag metrik ke sini</span>
            </div>
            <div class="dz-chips">
              <div v-for="(m, i) in config.values" :key="m.key+i" class="dz-chip dz-chip--metric">
                <span class="field-icon">{{ m.icon }}</span>
                <select class="agg-select" v-model="m.agg">
                  <option v-for="a in m.aggs" :key="a.key" :value="a.key">{{ a.label }}</option>
                </select>
                {{ m.label }}
                <button class="chip-remove" @click="removeField('values', i)">×</button>
              </div>
              <div class="dz-empty" v-if="!config.values.length">Drag metrik ke sini</div>
            </div>
          </div>

          <!-- Filter Zone -->
          <div class="drop-zone"
            :class="{ 'dz-hover': dragOver === 'filters' }"
            @dragover.prevent="dragOver='filters'"
            @dragleave="dragOver=null"
            @drop="onDrop($event, 'filters')"
          >
            <div class="dz-label">
              <span class="dz-icon">⚙</span> FILTER
              <span class="dz-hint">Drag dimensi ke sini untuk filter</span>
            </div>
            <div class="dz-chips">
              <template v-for="(f, i) in config.filters" :key="f.key">
                <div class="dz-chip dz-chip--filter">
                  <span class="field-icon">{{ f.icon }}</span>
                  {{ f.label }}:
                  <select class="filter-val-select" v-model="f.value">
                    <option value="">Semua</option>
                    <option v-for="v in getFilterOptions(f.key)" :key="v" :value="v">{{ v }}</option>
                  </select>
                  <button class="chip-remove" @click="removeField('filters', i)">×</button>
                </div>
              </template>
              <div class="dz-empty" v-if="!config.filters.length">Drag dimensi ke sini untuk filter nilai</div>
            </div>
          </div>

          <!-- Options -->
          <div class="options-row">
            <div class="opt-group">
              <label class="opt-label">Subtotal</label>
              <label class="toggle">
                <input type="checkbox" v-model="config.showSubtotal" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="opt-group">
              <label class="opt-label">Grand Total</label>
              <label class="toggle">
                <input type="checkbox" v-model="config.showGrandTotal" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="opt-group">
              <label class="opt-label">% dari Total</label>
              <label class="toggle">
                <input type="checkbox" v-model="config.showPct" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="opt-group">
              <label class="opt-label">Sort</label>
              <select v-model="config.sortOrder" class="opt-select">
                <option value="desc">Terbesar ↓</option>
                <option value="asc">Terkecil ↑</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>
            <div class="opt-group">
              <label class="opt-label">Tampilkan</label>
              <select v-model="config.topN" class="opt-select">
                <option :value="0">Semua</option>
                <option :value="10">Top 10</option>
                <option :value="20">Top 20</option>
                <option :value="50">Top 50</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      <!-- Pivot Result -->
      <div class="result-card" v-if="config.rows.length && config.values.length">

        <!-- Compare header -->
        <template v-if="compareMode && (cmpA.val || cmpA.period || cmpB.val || cmpB.period)">
          <div class="compare-result-header">
            <div class="cmp-label label-a">Segmen A{{ cmpA.val ? ': ' + cmpA.val : '' }}{{ cmpA.period ? ' · ' + cmpA.period : '' }}</div>
            <div class="cmp-vs">vs</div>
            <div class="cmp-label label-b">Segmen B{{ cmpB.val ? ': ' + cmpB.val : '' }}{{ cmpB.period ? ' · ' + cmpB.period : '' }}</div>
          </div>
        </template>

        <div class="result-toolbar">
          <span class="result-count">{{ pivotRows.length }} baris hasil</span>
          <div class="result-search-wrap">
            <input v-model="resultSearch" class="result-search" placeholder="Cari di hasil..." />
            <button v-if="resultSearch" @click="resultSearch=''" class="result-search-clear">×</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="pivot-table">
            <thead>
              <tr>
                <!-- Row headers -->
                <th v-for="r in config.rows" :key="r.key" class="th-row">{{ r.label }}</th>
                <!-- Col values (flat mode) -->
                <template v-if="!config.cols.length">
                  <template v-if="!compareMode || (!cmpA.val && !cmpA.period && !cmpB.val && !cmpB.period)">
                    <th v-for="m in config.values" :key="m.key" class="th-val">
                      {{ aggLabel(m) }} {{ m.label }}
                      <span v-if="config.showPct" class="th-pct">(%)</span>
                    </th>
                  </template>
                  <template v-else>
                    <template v-for="m in config.values" :key="m.key">
                      <th class="th-val th-a">A: {{ aggLabel(m) }} {{ m.label }}</th>
                      <th class="th-val th-b">B: {{ aggLabel(m) }} {{ m.label }}</th>
                      <th class="th-val th-diff">Δ Selisih</th>
                      <th class="th-val th-pctdiff">Δ %</th>
                    </template>
                  </template>
                </template>
                <!-- Col pivot headers -->
                <template v-else>
                  <template v-for="col in colValues" :key="col">
                    <th v-for="m in config.values" :key="m.key" class="th-col-val">
                      <div class="th-col-top">{{ col }}</div>
                      <div class="th-col-bot">{{ aggLabel(m) }} {{ m.label }}</div>
                    </th>
                  </template>
                  <th v-if="config.showSubtotal" v-for="m in config.values" :key="'sub'+m.key" class="th-subtotal">
                    Total {{ m.label }}
                  </th>
                </template>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, ri) in displayRows" :key="ri">
                <!-- Data row -->
                <tr class="data-row" :class="{ 'row-even': ri % 2 === 0 }">
                  <td v-for="(r, di) in config.rows" :key="r.key"
                    class="td-dim"
                    :class="{ 'td-indent': di > 0 }"
                    :style="di > 0 ? { paddingLeft: (di * 20 + 12) + 'px' } : {}">
                    {{ row._keys[di] || '—' }}
                  </td>

                  <!-- Flat values (no col pivot) -->
                  <template v-if="!config.cols.length">
                    <template v-if="!compareMode || (!cmpA.val && !cmpA.period && !cmpB.val && !cmpB.period)">
                      <td v-for="m in config.values" :key="m.key" class="td-val">
                        <span class="val-main">{{ formatVal(row[m.key], m) }}</span>
                        <span class="val-pct" v-if="config.showPct && grandTotals[m.key]">
                          {{ pctOfTotal(row[m.key], grandTotals[m.key], m) }}
                        </span>
                      </td>
                    </template>
                    <template v-else>
                      <template v-for="m in config.values" :key="m.key">
                        <td class="td-val td-a">{{ formatVal(row[m.key + '_a'], m) }}</td>
                        <td class="td-val td-b">{{ formatVal(row[m.key + '_b'], m) }}</td>
                        <td class="td-val td-diff" :class="diffClass(row[m.key + '_diff'])">
                          {{ formatDiff(row[m.key + '_diff'], m) }}
                        </td>
                        <td class="td-val td-pctdiff" :class="diffClass(row[m.key + '_pctdiff'])">
                          {{ row[m.key + '_pctdiff'] != null ? row[m.key + '_pctdiff'].toFixed(1) + '%' : '—' }}
                        </td>
                      </template>
                    </template>
                  </template>

                  <!-- Col pivot values -->
                  <template v-else>
                    <template v-for="col in colValues" :key="col">
                      <td v-for="m in config.values" :key="m.key" class="td-val">
                        <span class="val-main">{{ formatVal(row._cols?.[col]?.[m.key], m) }}</span>
                      </td>
                    </template>
                    <td v-if="config.showSubtotal" v-for="m in config.values" :key="'sub'+m.key" class="td-subtotal">
                      {{ formatVal(row[m.key], m) }}
                    </td>
                  </template>
                </tr>
              </template>

              <!-- Grand Total row -->
              <tr class="grand-total-row" v-if="config.showGrandTotal && !compareMode">
                <td :colspan="config.rows.length" class="td-grand-label">GRAND TOTAL</td>
                <template v-if="!config.cols.length">
                  <td v-for="m in config.values" :key="m.key" class="td-grand-val">
                    {{ formatVal(grandTotals[m.key], m) }}
                  </td>
                </template>
                <template v-else>
                  <template v-for="col in colValues" :key="col">
                    <td v-for="m in config.values" :key="m.key" class="td-grand-val">
                      {{ formatVal(colGrandTotals?.[col]?.[m.key], m) }}
                    </td>
                  </template>
                  <td v-if="config.showSubtotal" v-for="m in config.values" :key="'gsub'+m.key" class="td-grand-val">
                    {{ formatVal(grandTotals[m.key], m) }}
                  </td>
                </template>
              </tr>

            </tbody>
          </table>
        </div>

        <div class="result-footer" v-if="pivotRows.length > displayRows.length">
          <span class="footer-info">Menampilkan {{ displayRows.length }} dari {{ pivotRows.length }} baris</span>
          <button class="btn-load-more" @click="loadMore">Tampilkan lebih banyak</button>
        </div>
      </div>

      <!-- Placeholder jika belum ada config -->
      <div class="builder-placeholder" v-else>
        <div class="ph-icon">📊</div>
        <div class="ph-title">Mulai buat pivot table</div>
        <div class="ph-desc">
          Drag atau klik dimensi di sebelah kiri ke area <strong>Baris</strong> dan <strong>Nilai</strong> untuk mulai.<br/>
          Contoh cepat:
        </div>
        <div class="ph-examples">
          <button class="ph-btn" @click="applyPreset('brand_omset')">Brand × Omset</button>
          <button class="ph-btn" @click="applyPreset('dealer_brand')">Dealer × Brand</button>
          <button class="ph-btn" @click="applyPreset('kategori_bulan')">Kategori × Bulan</button>
          <button class="ph-btn" @click="applyPreset('provinsi_dealer')">Provinsi × Dealer</button>
          <button class="ph-btn" @click="applyPreset('bulan_trend')">Trend Bulanan</button>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { cleanBrand } from '@/utils/brandCleaner'
import { cleanPelanggan, parseRupiah, BULAN_INDONESIA } from '@/utils/calculations'
import * as XLSX from 'xlsx'

const store = useSelloutStore()

// ─── DIMENSI YANG TERSEDIA ────────────────────────────────────────────────────
const FIELDS = [
  { key: 'brand',      label: 'Brand',           icon: '🏷', get: r => cleanBrand(r['Brand'] || r['BRAND Barang']) || '' },
  { key: 'kategori',   label: 'Kategori',         icon: '📂', get: r => r['Kategori'] || '' },
  { key: 'dealer',     label: 'Dealer / Pelanggan', icon: '🏪', get: r => cleanPelanggan(r) || r['Nama Pelanggan'] || '' },
  { key: 'bulan',      label: 'Bulan',            icon: '📅', get: r => r['Bulan'] || '' },
  { key: 'tahun',      label: 'Tahun',            icon: '📆', get: r => String(r['Tahun'] || '') },
  { key: 'periode',    label: 'Periode (Bln-Thn)', icon: '🗓', get: r => r['Periode'] || (r['Bulan'] && r['Tahun'] ? `${r['Bulan']} ${r['Tahun']}` : '') },
  { key: 'dept',       label: 'Departemen',       icon: '🏢', get: r => r['Dept.'] || r['Nama Dept.'] || '' },
  { key: 'gudang',     label: 'Gudang',           icon: '🏭', get: r => r['Gudang'] || '' },
  { key: 'sales',      label: 'Sales',            icon: '👤', get: r => r['Sales'] || '' },
  { key: 'provinsi',   label: 'Provinsi',         icon: '🗺', get: r => r['Provinsi'] || '' },
  { key: 'kotaKab',    label: 'Kota/Kabupaten',   icon: '📍', get: r => r['Kab/Kota'] || r['Kota'] || '' },
  { key: 'kecamatan',  label: 'Kecamatan',        icon: '📌', get: r => r['Kec'] || '' },
  { key: 'sku',        label: 'SKU / No. Barang', icon: '🔢', get: r => r['SKU'] || r['No. Barang'] || '' },
  { key: 'namaItem',   label: 'Nama Item',        icon: '📦', get: r => r['Nama Item'] || r['Nama Barang'] || '' },
  { key: 'status',     label: 'Status Aktif',     icon: '✅', get: r => r['Status'] || '' },
  { key: 'platform',   label: 'Platform',         icon: '🛒', get: r => {
    const n = (r['Nama Pelanggan'] || '').toUpperCase()
    if (n.includes('SHOPEE') || n.includes('AIRPAY')) return 'Shopee'
    if (n.includes('TOKOPEDIA') || n.includes('TOKPED')) return 'Tokopedia'
    const f = String(r['No. Faktur'] || '').toUpperCase()
    if (['AO','BO','DO','EO','FO','HO'].some(p => f.startsWith(p))) return 'Website/Retail'
    return 'Offline/Dealer'
  }},
  { key: 'lokasi',     label: 'Lokasi Toko',      icon: '🏬', get: r => r['Lokasi Toko Pelanggan'] || '' },
]

const METRICS = [
  { key: 'omset',   label: 'Omset (Rp)',       icon: '💰', agg: 'sum',   aggs: [{key:'sum',label:'Sum'},{key:'avg',label:'Avg'},{key:'max',label:'Max'},{key:'min',label:'Min'}], desc: 'Total/Rata-rata omset penjualan', isRupiah: true,
    get: r => parseRupiah(r['Total'] || r['Jumlah']) || 0 },
  { key: 'qty',     label: 'Qty',              icon: '📦', agg: 'sum',   aggs: [{key:'sum',label:'Sum'},{key:'avg',label:'Avg'}], desc: 'Jumlah unit terjual',
    get: r => parseFloat(r['Qty'] || r['Quantity'] || 0) || 0 },
  { key: 'trx',     label: 'Transaksi',        icon: '🧾', agg: 'count', aggs: [{key:'count',label:'Count'}], desc: 'Jumlah transaksi (baris)',
    get: r => 1 },
  { key: 'avgTrx',  label: 'Avg / Transaksi',  icon: '📊', agg: 'avgtrx', aggs: [{key:'avgtrx',label:'Avg/Trx'}], desc: 'Omset rata-rata per transaksi', isRupiah: true,
    get: r => parseRupiah(r['Total'] || r['Jumlah']) || 0 },
  { key: 'hargaSat', label: 'Harga Satuan',    icon: '🏷', agg: 'avg',   aggs: [{key:'avg',label:'Avg'},{key:'max',label:'Max'},{key:'min',label:'Min'}], desc: 'Harga satuan item', isRupiah: true,
    get: r => parseRupiah(r['Harga Sat']) || 0 },
]

const COMPARE_DIMS = [
  { key: 'platform', label: 'Platform' },
  { key: 'brand',    label: 'Brand' },
  { key: 'kategori', label: 'Kategori' },
  { key: 'dept',     label: 'Departemen' },
  { key: 'provinsi', label: 'Provinsi' },
]

// ─── STATE ────────────────────────────────────────────────────────────────────
const periodFilter = ref('all')
const customFrom   = ref('')
const customTo     = ref('')
const fieldSearch  = ref('')
const resultSearch = ref('')
const compareMode  = ref(false)
const dragOver     = ref(null)
const dragItem     = ref(null)
const dragIsMetric = ref(false)
const displayLimit = ref(100)

const cmpA = reactive({ dim: '', val: '', period: '' })
const cmpB = reactive({ dim: '', val: '', period: '' })

const config = reactive({
  rows:          [],
  cols:          [],
  values:        [],
  filters:       [],
  showSubtotal:  true,
  showGrandTotal: true,
  showPct:       false,
  sortOrder:     'desc',
  topN:          0,
})

// ─── PERIODE ──────────────────────────────────────────────────────────────────
const availablePeriods = computed(() => {
  const s = new Set()
  for (const r of store.soBerjalan) {
    const p = r['Periode'] || (r['Bulan'] && r['Tahun'] ? `${r['Bulan']} ${r['Tahun']}` : '')
    if (p) s.add(p)
  }
  // Sort by year-month
  return [...s].sort((a, b) => {
    const parseP = p => {
      const parts = p.split(' ')
      const bulanIdx = Object.values(BULAN_INDONESIA).indexOf(parts[0].toUpperCase())
      return (parseInt(parts[1] || '0') * 12) + (bulanIdx >= 0 ? bulanIdx : 0)
    }
    return parseP(a) - parseP(b)
  })
})

const filteredSource = computed(() => {
  let rows = store.soBerjalan
  if (periodFilter.value === 'target' && store.targetBulan) {
    rows = store.soTargetBulan
  } else if (periodFilter.value === 'custom' && (customFrom.value || customTo.value)) {
    const fromIdx = availablePeriods.value.indexOf(customFrom.value)
    const toIdx   = availablePeriods.value.indexOf(customTo.value)
    rows = rows.filter(r => {
      const p = r['Periode'] || (r['Bulan'] && r['Tahun'] ? `${r['Bulan']} ${r['Tahun']}` : '')
      const i = availablePeriods.value.indexOf(p)
      if (fromIdx >= 0 && i < fromIdx) return false
      if (toIdx >= 0 && i > toIdx)   return false
      return true
    })
  }

  // Apply active filters
  for (const f of config.filters) {
    if (!f.value) continue
    const field = FIELDS.find(fi => fi.key === f.key)
    if (!field) continue
    rows = rows.filter(r => field.get(r) === f.value)
  }

  return rows
})

// ─── COMPARE FILTERED ────────────────────────────────────────────────────────
function getCompareRows(cmp) {
  let rows = filteredSource.value
  if (cmp.period) rows = rows.filter(r => {
    const p = r['Periode'] || (r['Bulan'] && r['Tahun'] ? `${r['Bulan']} ${r['Tahun']}` : '')
    return p === cmp.period
  })
  if (cmp.dim && cmp.val) {
    const field = FIELDS.find(f => f.key === cmp.dim)
    if (field) rows = rows.filter(r => field.get(r) === cmp.val)
  }
  return rows
}

// ─── FIELD HELPERS ───────────────────────────────────────────────────────────
const filteredFields = computed(() => {
  if (!fieldSearch.value) return FIELDS
  const q = fieldSearch.value.toLowerCase()
  return FIELDS.filter(f => f.label.toLowerCase().includes(q) || f.key.includes(q))
})

function isFieldUsed(key) {
  return config.rows.some(f => f.key === key) ||
         config.cols.some(f => f.key === key) ||
         config.filters.some(f => f.key === key)
}
function isMetricUsed(key) {
  return config.values.some(m => m.key === key)
}

function getFilterOptions(key) {
  const field = FIELDS.find(f => f.key === key)
  if (!field) return []
  const s = new Set()
  for (const r of filteredSource.value) {
    const v = field.get(r)
    if (v) s.add(v)
  }
  return [...s].sort()
}

function getCompareOptions(dimKey) {
  const field = FIELDS.find(f => f.key === dimKey)
  if (!field) return []
  const s = new Set()
  for (const r of store.soBerjalan) {
    const v = field.get(r)
    if (v) s.add(v)
  }
  return [...s].sort()
}

// ─── DRAG & DROP ─────────────────────────────────────────────────────────────
function onDragStart(e, item, isMetric = false) {
  dragItem.value    = item
  dragIsMetric.value = isMetric
  e.dataTransfer.effectAllowed = 'copy'
}

function onDrop(e, zone) {
  e.preventDefault()
  dragOver.value = null
  if (!dragItem.value) return

  if (zone === 'values') {
    if (!dragIsMetric.value) return
    if (!config.values.some(m => m.key === dragItem.value.key)) {
      config.values.push({ ...dragItem.value, agg: dragItem.value.agg })
    }
  } else {
    if (dragIsMetric.value) return
    const target = zone === 'rows' ? config.rows : zone === 'cols' ? config.cols : config.filters
    if (!target.some(f => f.key === dragItem.value.key)) {
      if (zone === 'filters') {
        target.push({ ...dragItem.value, value: '' })
      } else {
        target.push({ ...dragItem.value })
      }
    }
  }
  dragItem.value = null
}

function removeField(zone, idx) {
  const map = { rows: config.rows, cols: config.cols, values: config.values, filters: config.filters }
  map[zone].splice(idx, 1)
}

function autoAddField(f) {
  if (!config.rows.some(r => r.key === f.key)) {
    config.rows.push({ ...f })
  }
}
function autoAddMetric(m) {
  if (!config.values.some(v => v.key === m.key)) {
    config.values.push({ ...m, agg: m.agg })
  }
}

// ─── PIVOT COMPUTATION ────────────────────────────────────────────────────────

function getRowKey(row) {
  return config.rows.map(r => {
    const field = FIELDS.find(f => f.key === r.key)
    return field ? field.get(row) : ''
  })
}

function getColKey(row) {
  return config.cols.map(c => {
    const field = FIELDS.find(f => f.key === c.key)
    return field ? field.get(row) : ''
  }).join(' | ')
}

function aggregate(vals, agg, allVals) {
  if (!vals.length) return 0
  switch (agg) {
    case 'sum':    return vals.reduce((a, b) => a + b, 0)
    case 'avg':    return vals.reduce((a, b) => a + b, 0) / vals.length
    case 'count':  return vals.length
    case 'max':    return Math.max(...vals)
    case 'min':    return Math.min(...vals)
    case 'avgtrx': {
      const total = vals.reduce((a, b) => a + b, 0)
      const cnt   = allVals ? allVals.length : vals.length
      return cnt > 0 ? total / cnt : 0
    }
    default: return vals.reduce((a, b) => a + b, 0)
  }
}

const colValues = computed(() => {
  if (!config.cols.length) return []
  const s = new Set()
  for (const r of filteredSource.value) s.add(getColKey(r))
  return [...s].sort()
})

const pivotRows = computed(() => {
  if (!config.rows.length || !config.values.length) return []

  const isCompare = compareMode.value && (cmpA.val || cmpA.period || cmpB.val || cmpB.period)
  const srcA = isCompare ? getCompareRows(cmpA) : filteredSource.value
  const srcB = isCompare ? getCompareRows(cmpB) : null

  // Group rows
  function buildMap(src) {
    const map = new Map()
    for (const row of src) {
      const keys   = getRowKey(row)
      const rowKey = keys.join('\u0000')
      if (!map.has(rowKey)) map.set(rowKey, { _keys: keys, _raw: [] })
      map.get(rowKey)._raw.push(row)
    }
    return map
  }

  const mapA = buildMap(srcA)
  const mapB = srcB ? buildMap(srcB) : null

  const allKeys = new Set([...mapA.keys(), ...(mapB ? mapB.keys() : [])])
  let rows = [...allKeys].map(rowKey => {
    const entA   = mapA.get(rowKey)
    const entB   = mapB ? mapB.get(rowKey) : null
    const keys   = entA ? entA._keys : mapB.get(rowKey)._keys
    const result = { _keys: keys }

    for (const m of config.values) {
      const metric = METRICS.find(mm => mm.key === m.key)
      if (!metric) continue

      if (!isCompare) {
        // Normal mode
        if (config.cols.length) {
          // Col pivot
          result._cols = result._cols || {}
          const colMap = {}
          for (const r of (entA?._raw || [])) {
            const ck = getColKey(r)
            if (!colMap[ck]) colMap[ck] = []
            colMap[ck].push(metric.get(r))
          }
          result._cols = result._cols || {}
          for (const [ck, vals] of Object.entries(colMap)) {
            if (!result._cols[ck]) result._cols[ck] = {}
            result._cols[ck][m.key] = aggregate(vals, m.agg, entA?._raw)
          }
          // subtotal
          const allVals = (entA?._raw || []).map(r => metric.get(r))
          result[m.key] = aggregate(allVals, m.agg, entA?._raw)
        } else {
          const vals = (entA?._raw || []).map(r => metric.get(r))
          result[m.key] = aggregate(vals, m.agg, entA?._raw)
        }
      } else {
        // Compare mode
        const valsA = (entA?._raw || []).map(r => metric.get(r))
        const valsB = (entB?._raw || []).map(r => metric.get(r))
        const aggA  = aggregate(valsA, m.agg, entA?._raw)
        const aggB  = aggregate(valsB, m.agg, entB?._raw)
        const diff  = aggA - aggB
        const pctD  = aggB !== 0 ? (diff / Math.abs(aggB)) * 100 : null
        result[m.key + '_a']       = aggA
        result[m.key + '_b']       = aggB
        result[m.key + '_diff']    = diff
        result[m.key + '_pctdiff'] = pctD
        result[m.key]              = aggA
      }
    }
    return result
  })

  // Sort
  const primaryMetric = config.values[0]
  if (config.sortOrder === 'alpha') {
    rows.sort((a, b) => (a._keys[0] || '').localeCompare(b._keys[0] || ''))
  } else {
    const key = primaryMetric?.key
    const mul = config.sortOrder === 'asc' ? 1 : -1
    rows.sort((a, b) => mul * ((a[key] || 0) - (b[key] || 0)))
  }

  // TopN
  if (config.topN > 0) rows = rows.slice(0, config.topN)

  return rows
})

const displayRows = computed(() => {
  let rows = pivotRows.value
  if (resultSearch.value) {
    const q = resultSearch.value.toLowerCase()
    rows = rows.filter(r => r._keys.some(k => String(k).toLowerCase().includes(q)))
  }
  return rows.slice(0, displayLimit.value)
})

function loadMore() { displayLimit.value += 100 }

const grandTotals = computed(() => {
  const totals = {}
  for (const m of config.values) {
    const vals = pivotRows.value.map(r => r[m.key] || 0)
    totals[m.key] = aggregate(vals, m.agg === 'count' ? 'sum' : m.agg, pivotRows.value)
  }
  return totals
})

const colGrandTotals = computed(() => {
  if (!config.cols.length) return {}
  const result = {}
  for (const col of colValues.value) {
    result[col] = {}
    for (const m of config.values) {
      const vals = pivotRows.value.map(r => r._cols?.[col]?.[m.key] || 0)
      result[col][m.key] = aggregate(vals, m.agg === 'count' ? 'sum' : m.agg)
    }
  }
  return result
})

// ─── FORMAT ───────────────────────────────────────────────────────────────────
function formatVal(val, m) {
  if (val == null || val === undefined) return '—'
  const metric = METRICS.find(mm => mm.key === m.key)
  if (!metric) return val
  if (m.agg === 'count') return Math.round(val).toLocaleString('id-ID')
  if (metric.isRupiah) {
    if (Math.abs(val) >= 1e9) return 'Rp ' + (val/1e9).toFixed(2) + 'M'
    if (Math.abs(val) >= 1e6) return 'Rp ' + (val/1e6).toFixed(1) + 'jt'
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }
  if (m.key === 'qty') return Math.round(val).toLocaleString('id-ID')
  return typeof val === 'number' ? val.toFixed(1) : val
}

function formatDiff(val, m) {
  if (val == null) return '—'
  const metric = METRICS.find(mm => mm.key === m.key)
  const prefix = val > 0 ? '+' : ''
  if (metric?.isRupiah) {
    if (Math.abs(val) >= 1e9) return prefix + 'Rp ' + (val/1e9).toFixed(2) + 'M'
    if (Math.abs(val) >= 1e6) return prefix + 'Rp ' + (val/1e6).toFixed(1) + 'jt'
    return prefix + 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }
  return prefix + Math.round(val).toLocaleString('id-ID')
}

function pctOfTotal(val, total, m) {
  if (!total || !val) return ''
  return ` (${((val/total)*100).toFixed(1)}%)`
}

function aggLabel(m) {
  const aggs = { sum: 'Σ', avg: 'Avg', count: '#', max: 'Max', min: 'Min', avgtrx: 'Avg/Trx' }
  return aggs[m.agg] || m.agg
}

function diffClass(val) {
  if (!val) return ''
  return val > 0 ? 'positive' : val < 0 ? 'negative' : ''
}

// ─── PRESETS ─────────────────────────────────────────────────────────────────
function applyPreset(name) {
  resetConfig()
  const getF = key => ({ ...FIELDS.find(f => f.key === key) })
  const getM = key => ({ ...METRICS.find(m => m.key === key) })

  const presets = {
    brand_omset:    () => { config.rows.push(getF('brand'));    config.values.push(getM('omset'), getM('qty'), getM('trx')) },
    dealer_brand:   () => { config.rows.push(getF('dealer'), getF('brand')); config.values.push(getM('omset')) },
    kategori_bulan: () => { config.rows.push(getF('kategori')); config.cols.push(getF('bulan')); config.values.push(getM('omset')) },
    provinsi_dealer:() => { config.rows.push(getF('provinsi'), getF('dealer')); config.values.push(getM('omset'), getM('trx')) },
    bulan_trend:    () => { config.rows.push(getF('periode')); config.values.push(getM('omset'), getM('qty'), getM('trx')); config.sortOrder = 'alpha' },
  }
  presets[name]?.()
}

function resetConfig() {
  config.rows.splice(0)
  config.cols.splice(0)
  config.values.splice(0)
  config.filters.splice(0)
  config.showSubtotal  = true
  config.showGrandTotal = true
  config.showPct       = false
  config.sortOrder     = 'desc'
  config.topN          = 0
  displayLimit.value   = 100
}

function toggleCompare() {
  compareMode.value = !compareMode.value
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportExcel() {
  const headers = [
    ...config.rows.map(r => r.label),
    ...config.values.map(m => `${aggLabel(m)} ${m.label}`),
  ]
  const dataRows = pivotRows.value.map(row => {
    const obj = {}
    config.rows.forEach((r, i)   => { obj[r.label] = row._keys[i] })
    config.values.forEach(m => { obj[`${aggLabel(m)} ${m.label}`] = row[m.key] })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(dataRows, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pivot')
  XLSX.writeFile(wb, `pivot_${Date.now()}.xlsx`)
}

watch(() => config.rows.length + config.cols.length + config.values.length, () => {
  displayLimit.value = 100
})
</script>

<style scoped>
.page { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 1600px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-title  { font-size: 22px; font-weight: 800; color: #0f172a; }
.page-sub    { font-size: 12px; color: #64748b; margin-top: 2px; }
.header-actions { display: flex; gap: 8px; }
.btn-primary { padding: 9px 18px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.btn-outline  { padding: 8px 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; transition: all .15s; }
.btn-outline:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.btn-outline.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; text-align: center; }
.empty-icon  { font-size: 40px; }
.empty-title { font-size: 16px; font-weight: 700; color: #0f172a; }
.empty-desc  { font-size: 13px; color: #64748b; }

/* Period bar */
.period-bar { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; flex-wrap: wrap; }
.period-group { display: flex; align-items: center; gap: 8px; }
.period-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; white-space: nowrap; }
.period-pills { display: flex; background: #f1f5f9; border-radius: 8px; padding: 2px; gap: 2px; }
.period-pill  { padding: 5px 14px; border: none; background: transparent; font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 6px; transition: all .15s; }
.period-pill.active { background: #fff; color: #2563eb; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.period-pill:disabled { opacity: .4; cursor: not-allowed; }
.period-select { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; background: #fff; outline: none; }
.row-badge { font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 3px 10px; border-radius: 99px; font-family: monospace; }

/* Compare panel */
.compare-panel { background: #fff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 16px; }
.compare-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.compare-title  { font-size: 13px; font-weight: 800; color: #1d4ed8; }
.compare-desc   { font-size: 12px; color: #64748b; }
.compare-filters { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.compare-col    { flex: 1; min-width: 280px; }
.compare-col-label { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 99px; margin-bottom: 8px; display: inline-block; }
.label-a { background: #dbeafe; color: #1d4ed8; }
.label-b { background: #dcfce7; color: #166534; }
.compare-row    { display: flex; gap: 8px; flex-wrap: wrap; }
.compare-vs     { font-size: 16px; font-weight: 800; color: #94a3b8; align-self: center; padding: 0 4px; }
.cmp-group      { display: flex; flex-direction: column; gap: 3px; }
.cmp-select     { padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; background: #fff; outline: none; min-width: 120px; }
.filter-label   { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }

/* Builder */
.builder { display: grid; grid-template-columns: 220px 1fr; gap: 16px; align-items: start; }

/* Field panel */
.field-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; position: sticky; top: 16px; }
.panel-title  { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }
.field-search-wrap { margin-bottom: 8px; }
.field-search { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; }
.field-search:focus { border-color: #93c5fd; }
.field-list { display: flex; flex-direction: column; gap: 3px; }
.field-chip { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; background: #f8fafc; border: 1px solid #f1f5f9; font-size: 11px; font-weight: 500; color: #334155; cursor: grab; transition: all .12s; user-select: none; }
.field-chip:hover { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.field-chip.field-used { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.metric-chip { background: #fdf4ff; border-color: #e9d5ff; color: #6b21a8; }
.metric-chip:hover { background: #ede9fe; border-color: #c4b5fd; }
.metric-chip.field-used { background: #fdf4ff; border-color: #a855f7; color: #6b21a8; }
.field-icon { font-size: 12px; flex-shrink: 0; }
.field-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.used-dot   { color: #16a34a; font-size: 8px; }

/* Drop zones */
.drop-panel { display: flex; flex-direction: column; gap: 10px; }
.drop-zone  { background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 10px; padding: 12px; transition: all .15s; }
.drop-zone.dz-hover  { border-color: #2563eb; background: #eff6ff; }
.drop-zone--values   { border-color: #e9d5ff; background: #fdf4ff; }
.drop-zone--values.dz-hover { border-color: #a855f7; background: #faf5ff; }
.dz-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }
.dz-icon  { font-size: 13px; }
.dz-hint  { font-size: 9px; font-weight: 400; color: #cbd5e1; text-transform: none; letter-spacing: 0; }
.dz-chips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; align-items: center; }
.dz-empty { font-size: 11px; color: #cbd5e1; font-style: italic; }
.dz-chip  { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px 4px 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; font-size: 11px; font-weight: 600; color: #1d4ed8; }
.dz-chip--metric { background: #faf5ff; border-color: #d8b4fe; color: #7c3aed; }
.dz-chip--filter { background: #fefce8; border-color: #fde68a; color: #92400e; }
.chip-remove { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; line-height: 1; padding: 0 0 0 2px; }
.chip-remove:hover { color: #dc2626; }
.agg-select      { padding: 1px 4px; border: 1px solid #c4b5fd; border-radius: 4px; font-size: 10px; background: #faf5ff; color: #6b21a8; cursor: pointer; outline: none; }
.filter-val-select { padding: 1px 4px; border: 1px solid #fde68a; border-radius: 4px; font-size: 10px; background: #fefce8; color: #92400e; cursor: pointer; outline: none; max-width: 120px; }

/* Options */
.options-row { display: flex; align-items: center; gap: 16px; padding: 10px 12px; background: #f8fafc; border-radius: 8px; flex-wrap: wrap; }
.opt-group   { display: flex; align-items: center; gap: 6px; }
.opt-label   { font-size: 11px; font-weight: 600; color: #64748b; white-space: nowrap; }
.opt-select  { padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; background: #fff; cursor: pointer; outline: none; }

/* Toggle switch */
.toggle { position: relative; display: inline-block; width: 32px; height: 18px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #e2e8f0; border-radius: 99px; transition: .2s; }
.toggle-slider:before { content: ''; position: absolute; width: 12px; height: 12px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; }
.toggle input:checked + .toggle-slider { background: #2563eb; }
.toggle input:checked + .toggle-slider:before { transform: translateX(14px); }

/* Result card */
.result-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.compare-result-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.cmp-label   { font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 99px; }
.cmp-vs      { font-size: 14px; font-weight: 800; color: #94a3b8; }
.result-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
.result-count   { font-size: 11px; color: #94a3b8; font-family: monospace; }
.result-search-wrap { position: relative; }
.result-search  { padding: 5px 24px 5px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; outline: none; width: 200px; }
.result-search:focus { border-color: #93c5fd; }
.result-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 14px; color: #94a3b8; cursor: pointer; }

/* Pivot table */
.table-wrap { overflow-x: auto; }
.pivot-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.pivot-table thead { background: #2563eb; position: sticky; top: 0; z-index: 2; }
.pivot-table th { padding: 10px 12px; text-align: left; color: #fff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; border-bottom: 2px solid #1e40af; white-space: nowrap; }
.th-val, .th-col-val, .th-subtotal { text-align: right; }
.th-col-top { font-size: 11px; font-weight: 700; }
.th-col-bot { font-size: 9px; opacity: .7; }
.th-a  { background: #1d4ed8 !important; }
.th-b  { background: #166534 !important; }
.th-diff { background: #1e40af !important; }
.th-pctdiff { background: #1e40af !important; }

.pivot-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.data-row.row-even td { background: #fafbfc; }
.data-row:hover td { background: #f0f7ff; }
.td-dim    { font-weight: 600; color: #0f172a; white-space: nowrap; }
.td-indent { color: #475569; font-weight: 500; }
.td-val    { text-align: right; font-family: monospace; font-size: 12px; color: #334155; }
.td-subtotal { text-align: right; font-family: monospace; font-weight: 700; color: #1d4ed8; background: #eff6ff !important; }
.td-a  { background: #eff6ff !important; }
.td-b  { background: #f0fdf4 !important; }
.td-diff { font-weight: 700; }
.td-diff.positive  { color: #16a34a; }
.td-diff.negative  { color: #dc2626; }
.td-pctdiff { font-weight: 700; }
.td-pctdiff.positive { color: #16a34a; }
.td-pctdiff.negative { color: #dc2626; }
.val-main { }
.val-pct  { font-size: 10px; color: #94a3b8; margin-left: 3px; }
.grand-total-row td { background: #1e3a5f !important; color: #fff !important; font-weight: 800; padding: 10px 12px; }
.td-grand-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
.td-grand-val   { text-align: right; font-family: monospace; }

/* Result footer */
.result-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-top: 1px solid #f1f5f9; }
.footer-info   { font-size: 11px; color: #94a3b8; }
.btn-load-more { padding: 5px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 11px; font-weight: 600; color: #2563eb; cursor: pointer; }
.btn-load-more:hover { background: #dbeafe; }

/* Builder placeholder */
.builder-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 14px; text-align: center; }
.ph-icon  { font-size: 40px; }
.ph-title { font-size: 16px; font-weight: 700; color: #0f172a; }
.ph-desc  { font-size: 13px; color: #64748b; line-height: 1.6; }
.ph-examples { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.ph-btn { padding: 7px 16px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; font-size: 12px; font-weight: 600; color: #475569; cursor: pointer; transition: all .15s; }
.ph-btn:hover { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
</style>