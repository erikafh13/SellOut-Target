<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard by Brand/Kategori</h1>
        <p class="page-sub">Target {{ store.targetBulanLabel }} · Urutan Dinamis sesuai Flowchart</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn-viz" :class="{active: showViz}" @click="showViz = !showViz">
          <span class="btn-icon">📊</span> Visualisasi
        </button>
        <button class="btn-primary" @click="exportExcel">⬇ Export</button>
      </div>
    </div>

    <div class="scorecard-row" v-if="brandData.length">
      <div class="scorecard">
        <div class="sc-label">Total Target</div>
        <div class="sc-val">{{ fmt(totalTarget) }}</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">Total Realisasi</div>
        <div class="sc-val" :style="{color:achColor(totalAch)}">{{ fmt(totalReal) }}</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">Achievement</div>
        <div class="sc-val bold" :style="{color:achColor(totalAch)}">{{ (totalAch || 0).toFixed(1) }}%</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">{{ viewMode === 'brand' ? 'Brand Aktif' : 'Kategori Aktif' }}</div>
        <div class="sc-val">{{ filtered.length }}</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">≥ Target</div>
        <div class="sc-val" style="color:#16a34a">{{ filtered.filter(s=>s.achievement>=100).length }}</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">&lt; Target</div>
        <div class="sc-val" style="color:#dc2626">{{ filtered.filter(s=>s.achievement<100).length }}</div>
      </div>
    </div>

    <transition name="viz-slide">
      <div v-if="showViz" class="viz-panel">
        <div class="viz-toolbar">
          <div class="viz-tabs">
            <button class="viz-tab" :class="{active: activeChart==='bar'}"    @click="activeChart='bar'">📊 Bar Achievement</button>
            <button class="viz-tab" :class="{active: activeChart==='pie'}"    @click="activeChart='pie'">🥧 Pie Kontribusi</button>
            <button class="viz-tab" :class="{active: activeChart==='pareto'}" @click="activeChart='pareto'">📈 Pareto</button>
          </div>
          <div class="viz-controls">
            <span class="viz-ctrl-label">Tampilkan:</span>
            <select v-model="vizLimit" class="viz-select">
              <option :value="5">Top 5</option>
              <option :value="10">Top 10</option>
              <option :value="20">Top 20</option>
              <option :value="9999">Semua</option>
            </select>
            <select v-model="vizOrder" class="viz-select">
              <option value="desc">Tertinggi ↓</option>
              <option value="asc">Terendah ↑</option>
              <option value="ach-desc">Ach Tertinggi ↓</option>
              <option value="ach-asc">Ach Terendah ↑</option>
            </select>
            <select v-model="vizMetric" class="viz-select">
              <option value="realisasi">Realisasi</option>
              <option value="target">Target</option>
              <option value="achievement">Achievement %</option>
            </select>
          </div>
        </div>

        <div class="viz-chart-area">
          <div v-if="activeChart==='bar'" class="chart-wrap">
            <div class="chart-title">Achievement per {{ viewMode === 'brand' ? 'Brand' : 'Kategori' }}</div>
            <div class="bar-chart-container">
              <div class="bar-chart-grid">
                <div v-for="pct in [0,25,50,75,100,125]" :key="pct" class="grid-line" :style="{left: Math.min(pct,125)/125*100+'%'}">
                  <span class="grid-label">{{ pct }}%</span>
                </div>
                <div class="grid-target-line" :style="{left:'80%'}"></div>
              </div>
              <div class="bar-chart-rows">
                <div v-for="item in vizData" :key="item.label" class="bar-row">
                  <div class="bar-label-col">
                    <span class="bar-label-text" :title="item.label">{{ item.label }}</span>
                  </div>
                  <div class="bar-col">
                    <div class="bar-bg">
                      <div class="bar-inner"
                        :style="{width: Math.min(item.achievement,125)/125*100+'%', background: achColor(item.achievement)}"
                        :title="item.achievement.toFixed(1)+'%'">
                      </div>
                      <span class="bar-val-inside" v-if="item.achievement > 15">{{ item.achievement.toFixed(1) }}%</span>
                    </div>
                    <span class="bar-val-outside" v-if="item.achievement <= 15" :style="{color:achColor(item.achievement)}">{{ item.achievement.toFixed(1) }}%</span>
                  </div>
                  <div class="bar-meta-col">
                    <span class="bar-meta">{{ fmtShort(item.realisasi) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeChart==='pie'" class="chart-wrap">
            <div class="chart-title">Kontribusi {{ vizMetric === 'realisasi' ? 'Realisasi' : 'Target' }} per {{ viewMode === 'brand' ? 'Brand' : 'Kategori' }}</div>
            <div class="pie-container">
              <svg :viewBox="`0 0 ${pieSize} ${pieSize}`" :width="pieSize" :height="pieSize" class="pie-svg">
                <g :transform="`translate(${pieSize/2},${pieSize/2})`">
                  <path
                    v-for="(slice, i) in pieSlices" :key="i"
                    :d="slice.d"
                    :fill="slice.color"
                    :opacity="hoveredPie === i ? 1 : 0.85"
                    stroke="white" stroke-width="2"
                    @mouseenter="hoveredPie = i"
                    @mouseleave="hoveredPie = null"
                    style="cursor:pointer;transition:opacity 0.2s"
                  />
                  <circle cx="0" cy="0" :r="pieR*0.55" fill="white"/>
                  <text x="0" y="-10" text-anchor="middle" font-size="13" font-weight="800" fill="#0f172a">
                    {{ filtered.length }} item
                  </text>
                  <text x="0" y="10" text-anchor="middle" font-size="10" fill="#64748b">
                    {{ viewMode === 'brand' ? 'Brand' : 'Kategori' }}
                  </text>
                </g>
              </svg>
              <div class="pie-legend">
                <div v-for="(slice, i) in pieSlices" :key="i" class="legend-row"
                  @mouseenter="hoveredPie = i" @mouseleave="hoveredPie = null"
                  :style="{opacity: hoveredPie === null || hoveredPie === i ? 1 : 0.4, cursor:'pointer'}">
                  <div class="legend-dot" :style="{background: slice.color}"></div>
                  <div class="legend-info">
                    <div class="legend-name">{{ slice.label }}</div>
                    <div class="legend-val">{{ fmtShort(slice.value) }} · <strong>{{ slice.pct.toFixed(1) }}%</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeChart==='pareto'" class="chart-wrap">
            <div class="chart-title">Analisis Pareto Realisasi</div>
            <div class="pareto-container">
              <svg :viewBox="`0 0 ${paretoW} ${paretoH}`" :width="paretoW" :height="paretoH" class="pareto-svg" overflow="visible">
                <g :transform="`translate(${paretoMargin.l},${paretoMargin.t})`">
                  <line v-for="g in [0,25,50,75,100]" :key="g"
                    x1="0" :y1="paretoInnerH * (1 - g/100)"
                    :x2="paretoInnerW" :y2="paretoInnerH * (1 - g/100)"
                    stroke="#f1f5f9" stroke-width="1"/>
                  <text v-for="g in [0,25,50,75,100]" :key="'gl'+g"
                    x="-8" :y="paretoInnerH*(1-g/100)+4" text-anchor="end" font-size="10" fill="#94a3b8">{{ g }}%</text>
                  <rect v-for="(item, i) in paretoData" :key="i"
                    :x="paretoBarX(i)" :y="paretoBarY(item.realisasi)"
                    :width="paretoBarW" :height="paretoInnerH - paretoBarY(item.realisasi)"
                    :fill="achColor(item.achievement)" opacity="0.85" rx="2"
                  />
                  <polyline
                    :points="paretoLinePoints"
                    fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round"
                  />
                  <circle v-for="(item, i) in paretoData" :key="'c'+i"
                    :cx="paretoBarX(i) + paretoBarW/2" :cy="paretoLineY(item.cumPct)"
                    r="3" fill="#2563eb"
                  />
                  <text v-for="(item, i) in paretoData" :key="'xl'+i"
                    :x="paretoBarX(i) + paretoBarW/2" :y="paretoInnerH + 14"
                    text-anchor="middle" font-size="9" fill="#64748b"
                    :transform="`rotate(-35, ${paretoBarX(i) + paretoBarW/2}, ${paretoInnerH+14})`">
                    {{ item.label.length > 10 ? item.label.slice(0,10)+'…' : item.label }}
                  </text>
                  <g v-for="g in [0,25,50,75,100]" :key="'ra'+g">
                    <text :x="paretoInnerW + 8" :y="paretoInnerH*(1-g/100)+4" text-anchor="start" font-size="10" fill="#2563eb">{{ g }}%</text>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="filter-panel">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">PENCARIAN</label>
          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input v-model="search" :placeholder="'Cari ' + viewMode + '...'" class="filter-input search-input" />
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label">KATEGORI</label>
          <MultiSelect placeholder="Semua Kategori" :options="kategoriList" :selected="filterKategori" @update="val => filterKategori = val" />
        </div>

        <div class="filter-group">
          <label class="filter-label">PLATFORM (PELANGGAN SEGMEN)</label>
          <MultiSelect placeholder="Semua Platform" :options="['Shopee','Tokopedia','Website/Retail','Offline/Dealer']" :selected="filterPlatform" @update="val => filterPlatform = val" />
        </div>

        <div class="filter-group">
          <label class="filter-label">NAMA PELANGGAN / DEALER</label>
          <input v-model="filterDealerSearch" placeholder="Cari dealer..." class="filter-input" />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">DEPARTEMEN (KODE)</label>
          <MultiSelect placeholder="Semua Dept" :options="deptList" :selected="filterDept" @update="val => filterDept = val" />
        </div>

        <div class="filter-group">
          <label class="filter-label">KOTA / CABANG</label>
          <MultiSelect placeholder="Semua Kota" :options="cabangList" :selected="filterCabang" @update="val => filterCabang = val" />
        </div>

        <div class="filter-group">
          <label class="filter-label">GUDANG</label>
          <MultiSelect placeholder="Semua Gudang" :options="gudangList" :selected="filterGudang" @update="val => filterGudang = val" />
        </div>

        <div class="filter-group">
          <label class="filter-label">PROVINSI TOKO</label>
          <MultiSelect placeholder="Semua Provinsi" :options="provinsiList" :selected="filterProvinsi" @update="val => { filterProvinsi = val; filterKabupaten = []; filterKecamatan = [] }" />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">KABUPATEN / KOTA</label>
          <MultiSelect placeholder="Semua Kab/Kota" :options="kabupatenList" :selected="filterKabupaten" @update="val => { filterKabupaten = val; filterKecamatan = [] }" :disabled="!filterProvinsi.length" />
        </div>

        <div class="filter-group">
          <label class="filter-label">KECAMATAN</label>
          <MultiSelect placeholder="Semua Kecamatan" :options="kecamatanList" :selected="filterKecamatan" @update="val => filterKecamatan = val" :disabled="!filterKabupaten.length" />
        </div>

        <div class="filter-group">
          <label class="filter-label">PERIODE (TANGGAL)</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="date" v-model="dateStartFilter" class="filter-date-input" title="Mulai" />
            <span style="color:#94a3b8;font-size:11px">–</span>
            <input type="date" v-model="dateEndFilter" class="filter-date-input" title="Akhir" />
          </div>
        </div>

        <div class="filter-group" style="grid-column:span 2">
          <label class="filter-label">STATUS</label>
          <div style="display:flex;gap:8px;align-items:flex-end">
            <select v-model="filterStatus" class="filter-select">
              <option value="">Semua Status</option>
              <option value="capai">Capai (≥100%)</option>
              <option value="hampir">Hampir (≥80%)</option>
              <option value="kurang">Kurang (&lt;80%)</option>
            </select>
            <div class="mode-toggle-group">
              <button class="mode-toggle-btn" :class="{active:viewMode==='brand'}" @click="viewMode='brand'">By Brand</button>
              <button class="mode-toggle-btn" :class="{active:viewMode==='kategori'}" @click="viewMode='kategori'">By Kategori</button>
            </div>
            <div class="filter-meta">{{ filtered.length }} item</div>
          </div>
        </div>
      </div>

      <div class="filter-chips-row">
        <div class="active-chips">
          <span v-for="chip in allActiveChips" :key="chip.key + chip.value" class="chip" @click="removeChip(chip.key, chip.value)">
            {{ chip.label }} <span class="chip-x">×</span>
          </span>
          <button v-if="allActiveChips.length > 1" class="chip chip-all" @click="clearAllFilters">Clear All ×</button>
        </div>
      </div>
    </div>

    <div v-if="!store.soBerjalan.length" class="empty">Upload data SO Berjalan terlebih dahulu.</div>

    <div v-else class="table-card">
      <table>
        <colgroup>
          <col style="width:40px"><col><col style="width:80px"><col style="width:140px"><col style="width:140px"><col style="width:110px"><col style="width:100px"><col style="width:48px">
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th class="sortable" @click="sortBy('label')">{{ viewMode.toUpperCase() }} {{ sortIcon('label') }}</th>
            <th class="num sortable" @click="sortBy('pctHist')">% HIST {{ sortIcon('pctHist') }}</th>
            <th class="num sortable" @click="sortBy('target')">TARGET {{ sortIcon('target') }}</th>
            <th class="num sortable" @click="sortBy('realisasi')">REALISASI {{ sortIcon('realisasi') }}</th>
            <th class="num sortable" @click="sortBy('achievement')">ACH {{ sortIcon('achievement') }}</th>
            <th class="sortable" @click="sortBy('achievement')">STATUS {{ sortIcon('achievement') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(s, idx) in filtered" :key="s.label">
            <tr class="row-brand" @click="toggleLevel0(s.label)">
              <td class="rank">{{ idx+1 }}</td>
              <td>
                <div class="name-with-actions">
                  <div class="name-main">{{ s.label }}</div>
                  <div v-if="expanded[s.label]" class="inline-breakdown-btns" @click.stop>
                    <span class="break-label">Breakdown:</span>
                    <button class="mini-btn" :class="{active: breakModeL1[s.label] === btn1}"
                      v-for="btn1 in getAvailableBreakdowns()" :key="btn1" @click="setBreakL1(s.label, btn1)">
                      By {{ btn1 }}
                    </button>
                  </div>
                </div>
                <div class="name-sub" v-if="viewMode==='brand'">avg {{ fmt(s.avgBulanan) }}/bln</div>
                <div class="name-sub" v-else>{{ s.subCount }} brand</div>
              </td>
              <td class="num muted fw5">{{ totalReal > 0 ? (s.realisasi / totalReal * 100).toFixed(1) + '%' : '—' }}</td>
              <td class="num">{{ fmt(s.target) }}</td>
              <td class="num fw6">{{ fmt(s.realisasi) }}</td>
              <td class="num fw7" :style="{color:achColor(s.achievement)}">{{ (s.achievement || 0).toFixed(1) }}%</td>
              <td><span :class="['tag',achTag(s.achievement)]">{{ achLabel(s.achievement) }}</span></td>
              <td class="chevron-td"><span class="chev" :class="{open: !!expanded[s.label]}">▾</span></td>
            </tr>
            <tr class="row-bar"><td colspan="8" style="padding:0"><div class="bar-wrap"><div class="bar-fill" :style="{width:Math.min(s.achievement,100)+'%',background:achColor(s.achievement)}"></div></div></td></tr>

            <template v-if="expanded[s.label]">
              <tr>
                <td colspan="8" class="no-padding">
                  <div class="breakdown-scroll-area">
                    <table class="table-inner">
                      <colgroup><col style="width:50px"><col><col style="width:100px"><col style="width:160px"><col style="width:160px"><col style="width:120px"><col style="width:130px"><col style="width:48px"></colgroup>
                      <tbody>
                        <template v-for="[key1, d1] in sortedItems(getBreakL1(s))" :key="key1">
                          <tr class="row-dealer" @click="toggleLevel1(s.label, key1)">
                            <td></td>
                            <td class="indent1">
                              <div class="name-with-actions">
                                <span class="chev-sm" :class="{open: !!expL1[s.label + '|' + key1]}">▾</span>
                                <span class="sub-name">{{ key1 }}</span>
                              </div>
                            </td>
                            <td class="num muted fw5">{{ s.realisasi > 0 ? (d1.realisasi / s.realisasi * 100).toFixed(1) + '%' : '—' }}</td>
                            <td class="num">{{ fmt(d1.target) }}</td>
                            <td class="num">{{ fmt(d1.realisasi) }}</td>
                            <td class="num" :style="{color:achColor(d1.achievement)}">{{ (d1.achievement || 0).toFixed(1) }}%</td>
                            <td><span :class="['tag',achTag(d1.achievement)]">{{ achLabel(d1.achievement) }}</span></td>
                            <td></td>
                          </tr>
                          <template v-if="expL1[s.label + '|' + key1]">
                            <template v-for="[key2, d2] in sortedItems(getBreakL2(s, key1, d1))" :key="key2">
                              <tr class="row-kat" @click="toggleLevel2(s.label, key1, key2)">
                                <td></td>
                                <td class="indent2">
                                  <span class="chev-sm" :class="{open: !!expL2[s.label+'|'+key1+'|'+key2]}">▾</span>
                                  {{ key2 || '(tanpa nama)' }}
                                </td>
                                <td class="num muted fw5">{{ d1.realisasi > 0 ? (d2.realisasi / d1.realisasi * 100).toFixed(1) + '%' : '—' }}</td>
                                <td class="num">{{ fmt(d2.target) }}</td>
                                <td class="num">{{ fmt(d2.realisasi) }}</td>
                                <td class="num" :style="{color:achColor(d2.achievement)}">{{ (d2.achievement || 0).toFixed(1) }}%</td>
                                  <td><span :class="['tag',achTag(d2.achievement)]">{{ achLabel(d2.achievement) }}</span></td>
                                <td></td>
                              </tr>
                              <template v-if="expL2[s.label+'|'+key1+'|'+key2]">
                                <tr v-for="[skuNo, si] in sortedItems(d2.sku||{})" :key="skuNo" class="row-sku">
                                  <td></td>
                                  <td class="indent3">
                                    <span class="sku-code">{{ skuNo }}</span>
                                    <span class="sku-name">{{ si.namaItem || si.namaBarang || si['Nama Barang'] || '' }}</span>
                                  </td>
                                  <td class="num muted fw5">{{ d2.realisasi > 0 ? (si.realisasi / d2.realisasi * 100).toFixed(1) + '%' : '—' }}</td>
                                  <td class="num">{{ fmt(si.target) }}</td>
                                  <td class="num">{{ fmt(si.realisasi) }}</td>
                                  <td class="num" :style="{color:achColor(si.achievement)}">{{ (si.achievement || 0).toFixed(1) }}%</td>
                                  <td><span :class="['tag',achTag(si.achievement)]">{{ achLabel(si.achievement) }}</span></td>
                                  <td></td>
                                </tr>
                              </template>
                            </template>
                          </template>
                        </template>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { get3BulanHistoris } from '@/utils/calculations'
import { cleanBrand, cleanPelanggan, getPlatformGroup } from '@/utils/brandCleaner'

const store = useSelloutStore()

const BULAN_NAMA = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI",
  "JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"]
const BULAN_TO_MM = {
  'JANUARI':'01','FEBRUARI':'02','MARET':'03','APRIL':'04',
  'MEI':'05','JUNI':'06','JULI':'07','AGUSTUS':'08',
  'SEPTEMBER':'09','OKTOBER':'10','NOVEMBER':'11','DESEMBER':'12'
}

const window3 = computed(() => {
  if (!store.targetBulan) return []
  return get3BulanHistoris(store.targetBulan, store.targetTahun)
})
const window3Keys = computed(() => {
  const keys = new Set()
  window3.value.forEach(w => {
    const bIdx = BULAN_NAMA.indexOf(String(w.bulan).toUpperCase())
    if (bIdx !== -1) keys.add(`${w.tahun}-${String(bIdx + 1).padStart(2, '0')}`)
  })
  return keys
})

function getYearMonth(s) {
  if (!s) return ''
  const t = String(s).trim()
  return t.includes('-') ? t.slice(0, 7) : ''
}
function getYearMonthFromRow(r) {
  const ym = getYearMonth(r['Tgl Faktur'] || r['tgl_faktur'] || r['Tanggal'])
  if (ym) return ym
  const bulan = String(r['Bulan'] ?? '').toUpperCase().trim()
  const tahun = String(r['Tahun'] ?? '').trim()
  const mm = BULAN_TO_MM[bulan]
  return (mm && tahun) ? `${tahun}-${mm}` : ''
}

// VIZ STATE
const showViz = ref(false)
const activeChart = ref('bar')
const vizLimit = ref(10)
const vizOrder = ref('desc')
const vizMetric = ref('realisasi')
const hoveredPie = ref(null)

// FILTER STATE
const viewMode = ref('brand')
const search = ref('')
const filterKategori = ref([])
const filterPlatform = ref([])
const filterDealerSearch = ref('')
const filterDept = ref([])
const filterCabang = ref([])
const filterGudang = ref([])
const filterProvinsi = ref([])
const filterKabupaten = ref([])
const filterKecamatan = ref([])
const filterStatus = ref('')
const dateStartFilter = ref('')
const dateEndFilter = ref('')

watch(filterProvinsi, () => { filterKabupaten.value = []; filterKecamatan.value = [] })
watch(filterKabupaten, () => { filterKecamatan.value = [] })

// MULTI-SELECT COMPONENT (NATIVE SCROLL & SEARCH)
const MultiSelect = {
  props: {
    options: { type: Array, default: () => [] },
    selected: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Pilih...' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const isOpen = ref(false)
    const searchQ = ref('')
    const wrapRef = ref(null)

    // Opsi langsung difilter berdasarkan ketikan pencarian (tanpa dipotong limit data)
    const filteredAll = computed(() => {
      const all = Array.isArray(props.options) ? props.options : []
      if (!searchQ.value) return all
      return all.filter(o => String(o).toUpperCase().includes(searchQ.value.toUpperCase()))
    })

    function isSelected(opt) { return props.selected.includes(opt) }
    function toggleOpt(opt) {
      const cur = [...props.selected]
      const idx = cur.indexOf(opt)
      if (idx === -1) cur.push(opt)
      else cur.splice(idx, 1)
      emit('update', cur)
    }
    function clearAll() { emit('update', []) }
    function toggle() {
      if (props.disabled) return
      isOpen.value = !isOpen.value
      if (isOpen.value) searchQ.value = ''
    }
    function onClickOutside(e) {
      if (wrapRef.value && !wrapRef.value.contains(e.target)) isOpen.value = false
    }

    onMounted(() => document.addEventListener('mousedown', onClickOutside))
    onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

    return { isOpen, searchQ, wrapRef, filteredAll, isSelected, toggleOpt, clearAll, toggle }
  },
  template: `
    <div class="ms-wrap" ref="wrapRef">
      <div class="ms-trigger" :class="{ open: isOpen, disabled }" @click="toggle" :title="selected.length ? selected.join(', ') : placeholder">
        <span class="ms-label">
          <template v-if="selected.length === 0">{{ placeholder }}</template>
          <template v-else-if="selected.length === 1">{{ selected[0] }}</template>
          <template v-else>{{ selected.length }} dipilih</template>
        </span>
        <span class="ms-arrow">▾</span>
        <span v-if="selected.length" class="ms-count-badge" @click.stop="clearAll">{{ selected.length }} ×</span>
      </div>
      <div v-if="isOpen" class="ms-dropdown">
        <div class="ms-search-wrap">
          <input v-model="searchQ" placeholder="Cari..." class="ms-search" @click.stop />
        </div>
        <div class="ms-options">
          <div v-for="opt in filteredAll" :key="opt" class="ms-opt"
            :class="{ selected: isSelected(opt) }" @click.stop="toggleOpt(opt)">
            <span class="ms-check">{{ isSelected(opt) ? '☑' : '☐' }}</span>
            <span class="ms-opt-label">{{ opt }}</span>
          </div>
          <div v-if="filteredAll.length === 0" class="ms-empty">Tidak ada hasil</div>
        </div>
        <div v-if="selected.length" class="ms-footer" @click.stop>
          <button class="ms-clear-btn" @click="clearAll">Hapus Semua</button>
        </div>
      </div>
    </div>
  `
}

// SORT & ACCORDION
const sortKey = ref('target')
const sortOrder = ref('desc')
const expanded = reactive({})
const expL1 = reactive({})
const expL2 = reactive({})
const breakModeL1 = reactive({})

function toggleLevel0(label) {
  const was = !!expanded[label]
  Object.keys(expanded).forEach(k => delete expanded[k])
  Object.keys(expL1).forEach(k => delete expL1[k])
  Object.keys(expL2).forEach(k => delete expL2[k])
  if (!was) { expanded[label] = true; if (!breakModeL1[label]) breakModeL1[label] = 'Kategori' }
}
function toggleLevel1(brand, key1) {
  const k = brand + '|' + key1; const was = !!expL1[k]
  Object.keys(expL1).forEach(kk => delete expL1[kk])
  Object.keys(expL2).forEach(kk => delete expL2[kk])
  if (!was) expL1[k] = true
}
function toggleLevel2(brand, key1, key2) {
  const k = brand + '|' + key1 + '|' + key2; const was = !!expL2[k]
  Object.keys(expL2).forEach(kk => delete expL2[kk])
  if (!was) expL2[k] = true
}
function getAvailableBreakdowns() { return ['Kategori', 'Dealer'] }
function setBreakL1(label, mode) {
  breakModeL1[label] = mode
  Object.keys(expL1).forEach(k => delete expL1[k])
  Object.keys(expL2).forEach(k => delete expL2[k])
}
function sortBy(key) {
  if (sortKey.value === key) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortOrder.value = 'desc' }
}
function sortIcon(key) { if (sortKey.value !== key) return '↕'; return sortOrder.value === 'asc' ? '↑' : '↓' }

// CHIPS
const filtersMap = computed(() => ({
  filterKategori, filterPlatform, filterDept, filterCabang,
  filterGudang, filterProvinsi, filterKabupaten, filterKecamatan
}))
const allActiveChips = computed(() => {
  const chips = []
  const push = (key, label, vals) => vals.forEach(v => chips.push({ key, label, value: v }))
  push('filterKategori', 'Kat:', filterKategori.value)
  push('filterPlatform', 'Plat:', filterPlatform.value)
  push('filterDept', 'Dept:', filterDept.value)
  push('filterCabang', 'Kota:', filterCabang.value)
  push('filterGudang', 'Gudang:', filterGudang.value)
  push('filterProvinsi', 'Prov:', filterProvinsi.value)
  push('filterKabupaten', 'Kab:', filterKabupaten.value)
  push('filterKecamatan', 'Kec:', filterKecamatan.value)
  if (dateStartFilter.value) chips.push({ key: 'dateStart', label: 'Mulai: ' + dateStartFilter.value, value: dateStartFilter.value })
  if (dateEndFilter.value) chips.push({ key: 'dateEnd', label: 'Akhir: ' + dateEndFilter.value, value: dateEndFilter.value })
  return chips
})
function removeChip(key, val) {
  if (key === 'dateStart') { dateStartFilter.value = ''; return }
  if (key === 'dateEnd') { dateEndFilter.value = ''; return }
  const arr = filtersMap.value[key]
  if (!arr) return
  const idx = arr.indexOf(val)
  if (idx !== -1) { arr.splice(idx, 1); filtersMap.value[key] = [...arr] }
}
function clearAllFilters() {
  filterKategori.value = []; filterPlatform.value = []
  filterDept.value = []; filterCabang.value = []
  filterGudang.value = []; filterProvinsi.value = []
  filterKabupaten.value = []; filterKecamatan.value = []
  dateStartFilter.value = ''; dateEndFilter.value = ''
}

// BASE ROWS
const soRows = computed(() => store.soTargetBulan || store.soBerjalan || [])
const allSoRows = computed(() => store.soBerjalan || [])

// HISTORIS CACHE — avgBulanan dari data window3 (allSoRows)
const brandHistorisCache = computed(() => {
  const map = {}
  allSoRows.value.forEach(r => {
    const ym = getYearMonthFromRow(r)
    if (!ym || !window3Keys.value.has(ym)) return
    const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
    if (!b) return
    if (!map[b]) map[b] = { total: 0, bulanSet: new Set() }
    const jml = parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
    map[b].total += jml
    map[b].bulanSet.add(ym)
  })
  const result = {}
  Object.entries(map).forEach(([brand, v]) => {
    const bulanAktif = v.bulanSet.size || 3
    result[brand] = {
      avgBulanan: Math.round(v.total / bulanAktif),
      targetHistoris: Math.round((v.total / bulanAktif) * 1.15)
    }
  })
  return result
})

// TARGET FINAL PER BRAND dari store.targetBrandInputs
function getTargetFinalBrand(brandName) {
  const key = brandName.toUpperCase()
  const saved = store.targetBrandInputs?.[key] || {}
  const isAuto = (!saved.targetManual || saved.targetManual === 0) && !saved.isForcePending
  const hist = brandHistorisCache.value[brandName]
  const targetHistoris = hist?.targetHistoris || 0
  if (isAuto) return targetHistoris
  if (saved.isAcc && saved.targetInputAcc > 0) return saved.targetInputAcc
  if (saved.targetManual > 0) return Math.round((targetHistoris + saved.targetManual) / 2)
  return 0
}

// ================= LOGIKA FILTER BERTINGKAT (CASCADE DYNAMIC FILTER) =================

// 1. PROVINSI (Selalu memuat semua opsi unik wilayah awal)
const provinsiList = computed(() => [...new Set(allSoRows.value.map(r => r['Provinsi'] || r['provinsi']).filter(Boolean))].sort())

// 2. KABUPATEN (Memotong opsi berdasarkan Provinsi terpilih)
const kabupatenList = computed(() => {
  let rows = allSoRows.value
  if (filterProvinsi.value.length) {
    rows = rows.filter(r => filterProvinsi.value.includes(r['Provinsi'] || r['provinsi'] || ''))
  }
  return [...new Set(rows.map(r => r['Kabupaten'] || r['Kota'] || r['Kab/Kota']).filter(Boolean))].sort()
})

// 3. KECAMATAN (Memotong opsi berdasarkan Provinsi & Kabupaten terpilih)
const kecamatanList = computed(() => {
  let rows = allSoRows.value
  if (filterProvinsi.value.length) {
    rows = rows.filter(r => filterProvinsi.value.includes(r['Provinsi'] || r['provinsi'] || ''))
  }
  if (filterKabupaten.value.length) {
    rows = rows.filter(r => filterKabupaten.value.includes(r['Kabupaten'] || r['Kota'] || r['Kab/Kota'] || ''))
  }
  return [...new Set(rows.map(r => r['Kecamatan'] || r['Kec']).filter(Boolean))].sort()
})

// 4. ROWS INDUK UNTUK DROPDOWN LAINNYA (Ikut terpotong otomatis jika area regional dipilih)
const regionalFilteredRows = computed(() => {
  let rows = allSoRows.value
  if (filterProvinsi.value.length) rows = rows.filter(r => filterProvinsi.value.includes(r['Provinsi'] || r['provinsi'] || ''))
  if (filterKabupaten.value.length) rows = rows.filter(r => filterKabupaten.value.includes(r['Kabupaten'] || r['Kota'] || r['Kab/Kota'] || ''))
  if (filterKecamatan.value.length) rows = rows.filter(r => filterKecamatan.value.includes(r['Kecamatan'] || r['Kec'] || ''))
  return rows
})

// Dropdown dinamis menyesuaikan data regional terpilih di atas
const kategoriList = computed(() => [...new Set(regionalFilteredRows.value.map(r => r['Kategori']).filter(Boolean))].sort())
const deptList = computed(() => [...new Set(regionalFilteredRows.value.map(r => r['Dept.'] || r['Nama Dept.']).filter(Boolean))].sort())
const gudangList = computed(() => [...new Set(regionalFilteredRows.value.map(r => r['Gudang'] || r['gudang']).filter(Boolean))].sort())
const cabangList = computed(() => {
  const s = new Set()
  regionalFilteredRows.value.forEach(r => {
    const v = r['Nama Dept.'] || r['Dept.'] || r['Cabang'] || r['cabang'] || ''
    if (v) s.add(v)
  })
  return [...s].sort()
})

// ======================================================================================

// FILTERED SO ROWS (Untuk render tabel utama)
const filteredRows = computed(() => {
  let rows = soRows.value
  if (filterKategori.value.length) rows = rows.filter(r => filterKategori.value.includes(r['Kategori'] || ''))
  if (filterPlatform.value.length) rows = rows.filter(r => filterPlatform.value.includes(getPlatformGroup(cleanPelanggan(r))))
  if (filterDealerSearch.value) rows = rows.filter(r => (r['Nama Pelanggan'] || r['Dealer'] || r['Nama Dealer'] || '').toUpperCase().includes(filterDealerSearch.value.toUpperCase()))
  if (filterDept.value.length) rows = rows.filter(r => filterDept.value.includes(r['Dept.'] || r['Nama Dept.'] || ''))
  if (filterCabang.value.length) rows = rows.filter(r => filterCabang.value.includes(r['Nama Dept.'] || r['Dept.'] || ''))
  if (filterGudang.value.length) rows = rows.filter(r => filterGudang.value.includes(r['Gudang'] || r['gudang'] || ''))
  if (filterProvinsi.value.length) rows = rows.filter(r => filterProvinsi.value.includes(r['Provinsi'] || r['provinsi'] || ''))
  if (filterKabupaten.value.length) rows = rows.filter(r => filterKabupaten.value.includes(r['Kabupaten'] || r['Kota'] || ''))
  if (filterKecamatan.value.length) rows = rows.filter(r => filterKecamatan.value.includes(r['Kecamatan'] || ''))
  if (dateStartFilter.value) rows = rows.filter(r => new Date(r['Tgl Faktur']) >= new Date(dateStartFilter.value))
  if (dateEndFilter.value) rows = rows.filter(r => new Date(r['Tgl Faktur']) <= new Date(dateEndFilter.value + 'T23:59:59'))
  return rows
})

// BRAND DATA
const brandData = computed(() => {
  const realMap = {}
  filteredRows.value.forEach(r => {
    const b = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand']
    if (!b) return
    realMap[b] = (realMap[b] || 0) + (parseFloat(r['Total'] || r['Jumlah'] || 0) || 0)
  })
  const histMap = brandHistorisCache.value
  const allBrands = new Set([...Object.keys(realMap), ...Object.keys(histMap)])
  return [...allBrands].map(brand => {
    const realisasi = realMap[brand] || 0
    const h = histMap[brand]
    const target = getTargetFinalBrand(brand)
    const achievement = target > 0 ? (realisasi / target) * 100 : 0
    return { label: brand, target, realisasi, achievement, avgBulanan: h?.avgBulanan || 0, pctHist: 0 }
  })
})

// KATEGORI DATA
const kategoriData = computed(() => {
  try {
    const katReal = {}
    filteredRows.value.forEach(r => {
      const kat = r['Kategori'] || r['kategori']
      if (!kat) return
      const jml = parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
      if (!katReal[kat]) katReal[kat] = { realisasi: 0, brands: new Set() }
      katReal[kat].realisasi += jml
      const b = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand']
      if (b) katReal[kat].brands.add(b)
    })
    return Object.entries(katReal).map(([kat, v]) => {
      const katTarget = brandData.value
        .filter(b => b.label && v.brands.has(b.label))
        .reduce((s, b) => s + (b.target || 0), 0)
      return {
        label: kat,
        target: katTarget,
        realisasi: v.realisasi,
        achievement: katTarget > 0 ? v.realisasi / katTarget * 100 : 0,
        subCount: v.brands.size,
        pctHist: 0
      }
    })
  } catch (e) {
    console.error('kategoriData error:', e)
    return []
  }
})

// FILTERED (sorted)
const filtered = computed(() => {
  try {
    let list = viewMode.value === 'kategori' ? [...kategoriData.value] : [...brandData.value]
    if (search.value) list = list.filter(s => (s.label || '').toUpperCase().includes(search.value.toUpperCase()))
    if (filterStatus.value) list = list.filter(s => statusMatch(s.achievement, filterStatus.value))
    const key = sortKey.value; const order = sortOrder.value === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      if (key === 'label') return order * (a.label || '').localeCompare(b.label || '')
      return order * ((a[key] || 0) - (b[key] || 0))
    })
  } catch (e) {
    console.error('filtered error:', e)
    return []
  }
})

// TOTALS
const totalTarget = computed(() => filtered.value.filter(s => s.realisasi > 0).reduce((a, s) => a + (s.target || 0), 0))
const totalReal = computed(() => filtered.value.reduce((a, s) => a + (s.realisasi || 0), 0))
const totalAch = computed(() => totalTarget.value > 0 ? totalReal.value / totalTarget.value * 100 : 0)

// BREAKDOWN L1
function getBreakL1(s) {
  const brand = s.label
  const mode = breakModeL1[brand] || 'Kategori'
  const result = {}
  if (mode === 'Kategori') {
    filteredRows.value.forEach(r => {
      const b = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand']
      if (b !== brand) return
      const kat = r['Kategori'] || r['kategori'] || '(tanpa kategori)'
      if (!result[kat]) result[kat] = { realisasi: 0, sku: {} }
      result[kat].realisasi += parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
    })
  } else {
    filteredRows.value.forEach(r => {
      const b = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand']
      if (b !== brand) return
      const dealer = r['Nama Pelanggan'] || r['Dealer'] || r['Nama Dealer'] || '(unknown)'
      if (!result[dealer]) result[dealer] = { realisasi: 0, sku: {} }
      result[dealer].realisasi += parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
    })
  }
  Object.entries(result).forEach(([, v]) => {
    const pct = s.realisasi > 0 ? v.realisasi / s.realisasi : 0
    v.target = Math.round(s.target * pct)
    v.achievement = v.target > 0 ? v.realisasi / v.target * 100 : 0
  })
  return result
}

// BREAKDOWN L2
function getBreakL2(s, key1, d1) {
  const brand = s.label
  const mode = breakModeL1[brand] || 'Kategori'
  const result = {}
  if (mode === 'Kategori') {
    filteredRows.value.forEach(r => {
      const b = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand']
      if (b !== brand) return
      if ((r['Kategori'] || r['kategori'] || '') !== key1) return
      const dealer = r['Nama Pelanggan'] || r['Dealer'] || r['Nama Dealer'] || '(unknown)'
      if (!result[dealer]) result[dealer] = { realisasi: 0, sku: {} }
      result[dealer].realisasi += parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
      const skuNo = r['Kode Barang'] || r['SKU'] || r['Kode'] || '—'
      const namaB = r['Nama Barang'] || r['Nama Item'] || r['namaBarang'] || ''
      if (!result[dealer].sku[skuNo]) result[dealer].sku[skuNo] = { realisasi: 0, namaBarang: namaB, namaItem: namaB }
      result[dealer].sku[skuNo].realisasi += parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
    })
  } else {
    filteredRows.value.forEach(r => {
      const b = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand']
      if (b !== brand) return
      if ((r['Nama Pelanggan'] || r['Dealer'] || r['Nama Dealer'] || '') !== key1) return
      const kat = r['Kategori'] || r['kategori'] || '(tanpa kategori)'
      if (!result[kat]) result[kat] = { realisasi: 0, sku: {} }
      result[kat].realisasi += parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
      const skuNo = r['Kode Barang'] || r['SKU'] || r['Kode'] || '—'
      const namaB = r['Nama Barang'] || r['Nama Item'] || r['namaBarang'] || ''
      if (!result[kat].sku[skuNo]) result[kat].sku[skuNo] = { realisasi: 0, namaBarang: namaB, namaItem: namaB }
      result[kat].sku[skuNo].realisasi += parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
    })
  }
  Object.values(result).forEach(v => {
    const pct = d1.realisasi > 0 ? v.realisasi / d1.realisasi : 0
    v.target = Math.round(d1.target * pct)
    v.achievement = v.target > 0 ? v.realisasi / v.target * 100 : 0
    Object.values(v.sku).forEach(si => {
      const pctSku = v.realisasi > 0 ? si.realisasi / v.realisasi : 0
      si.target = Math.round(v.target * pctSku)
      si.achievement = si.target > 0 ? si.realisasi / si.target * 100 : 0
    })
  })
  return result
}

// VIZ DATA
const vizData = computed(() => {
  let list = [...filtered.value]
  if (vizOrder.value === 'desc') list.sort((a,b) => b.realisasi - a.realisasi)
  else if (vizOrder.value === 'asc') list.sort((a,b) => a.realisasi - b.realisasi)
  else if (vizOrder.value === 'ach-desc') list.sort((a,b) => b.achievement - a.achievement)
  else if (vizOrder.value === 'ach-asc') list.sort((a,b) => a.achievement - b.achievement)
  if (vizLimit.value < 9999) list = list.slice(0, vizLimit.value)
  return list
})

// PIE CHART
const PIE_COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2',
  '#be185d','#854d0e','#166534','#1e40af','#92400e','#1d4ed8',
  '#15803d','#b45309','#b91c1c','#6d28d9','#0e7490','#9d174d']
const pieSize = 260
const pieR = 110
const pieSlices = computed(() => {
  const items = [...vizData.value]
  const metric = vizMetric.value
  const total = items.reduce((s, i) => s + (i[metric] || 0), 0)
  if (!total) return []
  let startAngle = -Math.PI / 2
  return items.map((item, idx) => {
    const val = item[metric] || 0
    const pct = val / total * 100
    const angle = (val / total) * 2 * Math.PI
    const endAngle = startAngle + angle
    const x1 = Math.cos(startAngle) * pieR, y1 = Math.sin(startAngle) * pieR
    const x2 = Math.cos(endAngle) * pieR, y2 = Math.sin(endAngle) * pieR
    const large = angle > Math.PI ? 1 : 0
    const d = `M 0 0 L ${x1} ${y1} A ${pieR} ${pieR} 0 ${large} 1 ${x2} ${y2} Z`
    startAngle = endAngle
    return { d, color: PIE_COLORS[idx % PIE_COLORS.length], label: item.label, value: val, pct }
  })
})

// PARETO CHART
const paretoMargin = { t: 20, r: 50, b: 60, l: 55 }
const paretoW = 820, paretoH = 320
const paretoInnerW = computed(() => paretoW - paretoMargin.l - paretoMargin.r)
const paretoInnerH = computed(() => paretoH - paretoMargin.t - paretoMargin.b)
const paretoData = computed(() => {
  const items = [...vizData.value].sort((a,b) => b.realisasi - a.realisasi)
  const total = items.reduce((s,i) => s + (i.realisasi||0), 0)
  let cum = 0
  return items.map(item => {
    cum += item.realisasi || 0
    return { ...item, cumPct: total > 0 ? cum / total * 100 : 0 }
  })
})
const paretoBarW = computed(() => {
  const n = paretoData.value.length || 1
  return Math.max(10, paretoInnerW.value / n - 4)
})
function paretoBarX(i) {
  const n = paretoData.value.length || 1
  const bw = paretoInnerW.value / n
  return i * bw + (bw - paretoBarW.value) / 2
}
function paretoBarY(val) {
  const maxVal = Math.max(...paretoData.value.map(d => d.realisasi), 1)
  return paretoInnerH.value * (1 - val / maxVal)
}
function paretoLineY(pct) { return paretoInnerH.value * (1 - pct / 100) }
const paretoLinePoints = computed(() =>
  paretoData.value.map((item, i) => `${paretoBarX(i) + paretoBarW.value / 2},${paretoLineY(item.cumPct)}`).join(' ')
)

// HELPERS
function sortedItems(obj) { return Object.entries(obj ?? {}).sort((a, b) => (b[1].realisasi || 0) - (a[1].realisasi || 0)) }
function statusMatch(p, f) {
  if (f === 'capai') return p >= 100
  if (f === 'hampir') return p >= 80 && p < 100
  if (f === 'kurang') return p < 80
  return true
}
function achColor(p) { return p >= 100 ? '#16a34a' : p >= 80 ? '#d97706' : '#dc2626' }
function achTag(p) { return p >= 100 ? 'tag-green' : p >= 80 ? 'tag-yellow' : 'tag-red' }
function achLabel(p) { return p >= 100 ? 'Capai' : p >= 80 ? 'Hampir' : 'Kurang' }
function fmt(n) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') }
function fmtShort(n) {
  if (!n) return 'Rp 0'
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(1) + 'M'
  if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(1) + 'jt'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

async function exportExcel() {
  const { exportToExcel } = await import('@/utils/fileReader')
  const rows = filtered.value.map((s, i) => ({
    '#': i + 1,
    'Nama': s.label,
    'Target': Math.round(s.target),
    'Realisasi': Math.round(s.realisasi || 0),
    'Achievement %': (s.achievement || 0).toFixed(1) + '%'
  }))
  exportToExcel(rows, 'brand_summary.xlsx')
}
</script>

<style scoped>
thead { background-color: #2563eb !important; }
th { background-color: #2563eb !important; color: #ffffff !important; padding: 14px 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 3px solid #1e40af !important; white-space: nowrap; }
th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { background-color: #1d4ed8 !important; }

.page { padding: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 1600px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 22px; font-weight: 800; color: #0f172a; }
.page-sub { font-size: 12px; color: #64748b; }
.btn-primary { padding: 9px 18px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.btn-primary:hover { background: #1d4ed8; }

.btn-viz { padding: 9px 18px; background: #fff; color: #475569; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.btn-viz:hover { border-color: #2563eb; color: #2563eb; }
.btn-viz.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; }
.btn-icon { font-size: 14px; }

.viz-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(37,99,235,0.07); }
.viz-slide-enter-active, .viz-slide-leave-active { transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); max-height: 700px; opacity: 1; }
.viz-slide-enter-from, .viz-slide-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
.viz-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.viz-tabs { display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; gap: 3px; }
.viz-tab { padding: 7px 16px; border: none; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; border-radius: 8px; color: #64748b; transition: all 0.2s; white-space: nowrap; }
.viz-tab.active { background: #fff; color: #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,.06); }
.viz-tab:hover:not(.active) { color: #475569; }
.viz-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.viz-ctrl-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.viz-select { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; background: #fff; cursor: pointer; outline: none; }
.viz-select:focus { border-color: #93c5fd; }
.viz-chart-area { min-height: 200px; }
.chart-wrap { display: flex; flex-direction: column; gap: 16px; }
.chart-title { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.02em; }

.bar-chart-container { position: relative; }
.bar-chart-grid { position: absolute; top: 0; left: 180px; right: 80px; bottom: 0; pointer-events: none; }
.grid-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #f1f5f9; display: flex; flex-direction: column; }
.grid-label { font-size: 9px; color: #cbd5e1; font-weight: 600; position: absolute; bottom: -16px; transform: translateX(-50%); }
.grid-target-line { position: absolute; top: 0; bottom: 0; width: 1.5px; background: #fcd34d; opacity: 0.6; }
.bar-chart-rows { display: flex; flex-direction: column; gap: 6px; padding-bottom: 24px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-label-col { width: 172px; flex-shrink: 0; }
.bar-label-text { font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; text-align: right; }
.bar-col { flex: 1; display: flex; align-items: center; gap: 6px; position: relative; }
.bar-bg { flex: 1; height: 26px; background: #f1f5f9; border-radius: 6px; position: relative; overflow: visible; }
.bar-inner { height: 100%; border-radius: 6px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); position: relative; }
.bar-val-inside { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 800; color: #fff; }
.bar-val-outside { font-size: 10px; font-weight: 800; min-width: 36px; }
.bar-meta-col { width: 72px; flex-shrink: 0; }
.bar-meta { font-size: 10px; font-weight: 600; color: #94a3b8; }

.pie-container { display: flex; align-items: flex-start; gap: 32px; }
.pie-svg { flex-shrink: 0; }
.pie-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.legend-row { display: flex; align-items: center; gap: 10px; transition: opacity 0.2s; padding: 4px 0; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.legend-info { min-width: 0; }
.legend-name { font-size: 11px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.legend-val { font-size: 11px; color: #64748b; }

.pareto-container { overflow-x: auto; }
.pareto-svg { min-width: 600px; }

/* FILTER PANEL */
.filter-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.filter-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
.filter-input, .filter-select { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; outline: none; width: 100%; box-sizing: border-box; background: #fff; }
.filter-input:focus, .filter-select:focus { border-color: #93c5fd; }
.filter-select:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 12px; pointer-events: none; }
.search-input { padding-left: 28px !important; }
.filter-meta { font-size: 11px; color: #94a3b8; font-weight: 700; white-space: nowrap; align-self: flex-end; margin-bottom: 8px; }
.filter-date-input { padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 7px; font-size: 11px; background: #fff; color: #334155; width: 130px; }
.filter-date-input:focus { border-color: #93c5fd; outline: none; }
.filter-chips-row { border-top: 1px dashed #e2e8f0; padding-top: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.active-chips { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 3px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 2px 8px; font-size: 10px; font-weight: 600; color: #1d4ed8; cursor: pointer; transition: all .15s; }
.chip:hover { background: #dbeafe; border-color: #2563eb; }
.chip-x { color: #94a3b8; font-size: 11px; }
.chip-all { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
.chip-all:hover { background: #fecaca; border-color: #dc2626; }

:deep(.ms-wrap) { position: relative; width: 100%; }
:deep(.ms-trigger) { display: flex; align-items: center; gap: 4px; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 12px; color: #1e293b; cursor: pointer; min-height: 34px; box-sizing: border-box; transition: border-color .15s; user-select: none; }
:deep(.ms-trigger:hover) { border-color: #93c5fd; }
:deep(.ms-trigger.open) { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.15); }
:deep(.ms-label) { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:deep(.ms-arrow) { font-size: 10px; color: #94a3b8; }
:deep(.ms-count-badge) { background: #2563eb; color: #fff; font-size: 10px; font-weight: 700; border-radius: 10px; padding: 0 5px; min-width: 18px; text-align: center; line-height: 18px; cursor: pointer; flex-shrink: 0; }
:deep(.ms-count-badge:hover) { background: #1d4ed8; }
:deep(.ms-dropdown) { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #2563eb; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,.12); z-index: 1000; overflow: hidden; }
:deep(.ms-search-wrap) { padding: 8px; border-bottom: 1px solid #e2e8f0; }
:deep(.ms-search) { width: 100%; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 12px; color: #1e293b; box-sizing: border-box; outline: none; }
:deep(.ms-search:focus) { border-color: #2563eb; }

/* FIX AREA SCROLL NATIVE DI SINI */
:deep(.ms-options) { 
  max-height: 200px;   /* Tinggi maksimal box dibatasi setara ~5 baris data item */
  overflow-y: auto;    /* MENYALAKAN SCROLLBAR BAWAAN: Sisa data akan diakses lewat scroll native */
  padding: 4px 0;
}

:deep(.ms-opt) { display: flex; align-items: center; gap: 6px; padding: 7px 10px; font-size: 12px; cursor: pointer; transition: background .1s; color: #1e293b; }
:deep(.ms-opt:hover) { background: #eff6ff; }
:deep(.ms-opt.selected) { background: #eff6ff; color: #1d4ed8; font-weight: 600; }
:deep(.ms-check) { font-size: 13px; width: 16px; text-align: center; flex-shrink: 0; }
:deep(.ms-opt-label) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:deep(.ms-overflow) { display: none; } /* Hapus modifikasi penanda +... lainnya sebelumnya */
:deep(.ms-empty) { padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; }
:deep(.ms-footer) { border-top: 1px solid #e2e8f0; padding: 6px 10px; }
:deep(.ms-clear-btn) { background: none; border: none; font-size: 11px; color: #dc2626; cursor: pointer; font-weight: 600; }
:deep(.ms-clear-btn:hover) { text-decoration: underline; }

/* Custom design scrollbar biar cantik di dropdown */
:deep(.ms-options::-webkit-scrollbar) { width: 5px; }
:deep(.ms-options::-webkit-scrollbar-track) { background: #f1f5f9; }
:deep(.ms-options::-webkit-scrollbar-thumb) { background: #cbd5e1; border-radius: 4px; }
:deep(.ms-options::-webkit-scrollbar-thumb:hover) { background: #94a3b8; }

.mode-toggle-group { display: flex; align-items: center; background: #f1f5f9; padding: 3px; border-radius: 10px; gap: 3px; }
.mode-toggle-btn { padding: 6px 14px; border: none; background: transparent; font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 8px; transition: all 0.2s; color: #64748b; }
.mode-toggle-btn.active { background: #fff; color: #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

.name-with-actions { display: flex; align-items: center; gap: 10px; }
.inline-breakdown-btns { display: flex; align-items: center; gap: 6px; background: #eff6ff; padding: 2px 8px; border-radius: 20px; border: 1px solid #dbeafe; }
.break-label { font-size: 9px; font-weight: 800; color: #3b82f6; text-transform: uppercase; }
.mini-btn { padding: 3px 10px; border-radius: 15px; border: none; background: #fff; color: #64748b; font-size: 9px; font-weight: 700; cursor: pointer; }
.mini-btn.active { background: #2563eb; color: #fff; }

.breakdown-scroll-area { max-height: 440px; overflow-y: auto; background: #fdfdfd; border-bottom: 1px solid #e2e8f0; }
.table-inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
.no-padding { padding: 0 !important; }

.scorecard-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.scorecard { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.sc-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.05em; }
.sc-val { font-size: 20px; font-weight: 800; color: #0f172a; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
.num { text-align: right; font-family: 'JetBrains Mono', monospace; }
.muted { color: #94a3b8; } .fw5 { font-weight: 500; } .fw6 { font-weight: 600; } .fw7 { font-weight: 700; }
.row-brand { cursor: pointer; transition: background 0.2s; } .row-brand:hover { background: #f8fafc; }
.name-main { font-weight: 800; color: #0f172a; font-size: 13px; } .name-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.bar-wrap { height: 3px; background: #f1f5f9; } .bar-fill { height: 100%; transition: width 0.4s; }
.indent1 { padding-left: 24px !important; } .indent2 { padding-left: 48px !important; }
.indent3 { padding-left: 68px !important; display: flex; align-items: center; gap: 8px; }
.chev, .chev-sm { color: #94a3b8; font-size: 12px; transition: transform 0.2s; display: inline-block; }
.open { transform: rotate(180deg); color: #2563eb !important; }
.tag { padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 800; display: inline-flex; text-transform: uppercase; }
.tag-green { background: #dcfce7; color: #16a34a; } .tag-yellow { background: #fef9c3; color: #d97706; } .tag-red { background: #fee2e2; color: #dc2626; }
.sku-code { font-size: 9px; background: #eff6ff; padding: 2px 6px; border-radius: 6px; color: #2563eb; font-weight: 800; border: 1px solid #dbeafe; }
.sku-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px; font-size: 11px; color: #475569; }
.empty { text-align: center; padding: 60px; color: #94a3b8; font-size: 14px; }
.rank { color: #94a3b8; font-size: 11px; font-weight: 700; }
.chevron-td { text-align: center; }
.row-dealer { cursor: pointer; } .row-dealer:hover { background: #f8fafc; }
.row-kat { cursor: pointer; } .row-kat:hover { background: #f8fafc; }
.row-sku td { background: #fafafa; font-size: 11px; }
.sub-name { font-weight: 600; color: #1e293b; }
</style>
