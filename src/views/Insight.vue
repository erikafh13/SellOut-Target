<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Brand & Kategori Insight</h1>
        <p class="page-sub" v-if="store.targetBulan">
          Basis Jendela: {{ window3Label }} · {{ filteredRows.length.toLocaleString('id-ID') }} Transaksi Lolos Filter
        </p>
        <p class="page-sub" v-else>Set bulan target di Input Data terlebih dahulu.</p>
      </div>
    </div>

    <div class="scorecard-grid">
      <div class="card-mini">
        <div class="cm-label">TOTAL REVENUE (REVENUE BASKETS)</div>
        <div class="cm-val">{{ formatRupiah(summaryStats.totalRevenue) }}</div>
        <div class="cm-sub">Total omset di dalam jendela periode</div>
      </div>
      <div class="card-mini">
        <div class="cm-label">RATA-RATA OMSET / BULAN</div>
        <div class="cm-val">{{ formatRupiah(summaryStats.avgRevenue) }}</div>
        <div class="cm-sub">Total dibagi {{ summaryStats.jumlahBulan }} bulan kalender aktif</div>
      </div>
      <div class="card-mini">
        <div class="cm-label">PRODUKTIVITAS ITEM</div>
        <div class="cm-val">
          <span v-if="subPage === 'brand'">{{ summaryStats.uniqueBrands }} Brand</span>
          <span v-else-if="subPage === 'kategori'">{{ summaryStats.uniqueKategori }} Kategori</span>
          <span v-else>{{ summaryStats.uniqueProvinsi }} Provinsi</span>
        </div>
        <div class="cm-sub">Terbaca aktif berkontribusi</div>
      </div>
      <div class="card-mini">
        <div class="cm-label">ESTIMASI TARGET NEXT MONTH (×115%)</div>
        <div class="cm-val">{{ formatRupiah(summaryStats.nextTarget) }}</div>
        <div class="cm-sub">Rata-rata omset bulanan dikali 115%</div>
      </div>
    </div>

    <div class="subtab-bar">
      <button class="subtab" :class="{ active: subPage === 'brand' }" @click="subPage = 'brand'">By Brand</button>
      <button class="subtab" :class="{ active: subPage === 'kategori' }" @click="subPage = 'kategori'">By Kategori</button>
      <button class="subtab" :class="{ active: subPage === 'wilayah' }" @click="subPage = 'wilayah'">By Wilayah</button>
    </div>

    <!-- ==================== CUSTOM FILTER PANEL ==================== -->
    <div class="filter-panel">
      <div class="filter-grid-layout">
        <!-- Pencarian -->
        <div class="f-group">
          <label>Pencarian</label>
          <MultiSelect
            placeholder="Semua Data"
            :options="msSearchOptions"
            :selected="filters.searches"
            @update="val => filters.searches = val"
          />
        </div>

        <!-- Periode -->
        <div class="f-group">
          <label>Periode</label>
          <div class="period-dropdown-wrap" ref="periodWrap">
            <div class="period-trigger" :class="{ open: periodOpen }" @click="periodOpen = !periodOpen">
              <span class="ms-label">
                <template v-if="!selectedPeriod">{{ placeholderPeriod }}</template>
                <template v-else-if="selectedPeriod === 'custom'">Pilih Tanggal</template>
                <template v-else>{{ selectedPeriod }}</template>
              </span>
              <span class="ms-arrow">▾</span>
            </div>
            <div v-if="periodOpen" class="period-dropdown">
              <div class="period-list">
                <div class="period-item" :class="{ selected: selectedPeriod === 'Hari Ini - Pk ' + nowHours }" @click="selectPeriod('Hari Ini - Pk ' + nowHours)">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'Hari Ini - Pk ' + nowHours }"></span>
                  <span class="period-name">Real-time</span>
                  <span class="period-desc">Hari Ini - Pk {{ nowHours }}</span>
                </div>
                <div class="period-item" :class="{ selected: selectedPeriod === 'Kemarin ' + yesterdayStr }" @click="selectPeriod('Kemarin ' + yesterdayStr)">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'Kemarin ' + yesterdayStr }"></span>
                  <span class="period-name">Kemarin</span>
                  <span class="period-desc">{{ yesterdayStr }}</span>
                </div>
                <div class="period-item" :class="{ selected: selectedPeriod === '7 Hari Sebelumnya' }" @click="selectPeriod('7 Hari Sebelumnya')">
                  <span class="period-dot" :class="{ active: selectedPeriod === '7 Hari Sebelumnya' }"></span>
                  <span class="period-name">7 Hari Sebelumnya</span>
                  <span class="period-desc">{{ days7Range }}</span>
                </div>
                <div class="period-item" :class="{ selected: selectedPeriod === '30 Hari Sebelumnya' }" @click="selectPeriod('30 Hari Sebelumnya')">
                  <span class="period-dot" :class="{ active: selectedPeriod === '30 Hari Sebelumnya' }"></span>
                  <span class="period-name">30 Hari Sebelumnya</span>
                  <span class="period-desc">{{ days30Range }}</span>
                </div>
                <div class="period-separator"></div>
                <div class="period-item" :class="{ selected: selectedPeriod === 'Per Hari' }" @click="selectPeriod('Per Hari')">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'Per Hari' }"></span>
                  <span class="period-name">Per Hari</span>
                </div>
                <div class="period-item" :class="{ selected: selectedPeriod === 'Per Minggu' }" @click="selectPeriod('Per Minggu')">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'Per Minggu' }"></span>
                  <span class="period-name">Per Minggu</span>
                </div>
                <div class="period-item" :class="{ selected: selectedPeriod === 'Per Bulan' }" @click="selectPeriod('Per Bulan')">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'Per Bulan' }"></span>
                  <span class="period-name">Per Bulan</span>
                </div>
                <div class="period-item" :class="{ selected: selectedPeriod === 'Berdasarkan Tahun' }" @click="selectPeriod('Berdasarkan Tahun')">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'Berdasarkan Tahun' }"></span>
                  <span class="period-name">Berdasarkan Tahun</span>
                </div>
                <div class="period-separator"></div>
                <div class="period-item" :class="{ selected: selectedPeriod === 'custom' }" @click="selectPeriod('custom')">
                  <span class="period-dot" :class="{ active: selectedPeriod === 'custom' }"></span>
                  <span class="period-name">Pilih Tanggal</span>
                </div>
              </div>
              <div v-if="selectedPeriod === 'custom'" class="period-custom">
                <div class="period-custom-row">
                  <label>Mulai</label>
                  <input type="date" v-model="filters.dateStart" class="date-input" />
                </div>
                <div class="period-custom-row">
                  <label>Akhir</label>
                  <input type="date" v-model="filters.dateEnd" class="date-input" />
                </div>
              </div>
              <div v-if="selectedPeriod" class="period-footer">
                <button class="period-clear-btn" @click="clearPeriod">Hapus</button>
                <button class="period-apply-btn" @click="applyPeriod">Terapkan</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Brand (multi-select, cascading) -->
        <div class="f-group" v-if="subPage !== 'brand'">
          <label>Brand</label>
          <MultiSelect
            placeholder="Semua Brand"
            :options="msBrandOptions"
            :selected="filters.brands"
            @update="val => { filters.brands = val; msOnBrandChange() }"
          />
        </div>

        <!-- Kategori (multi-select, cascading) -->
        <div class="f-group" v-if="subPage !== 'kategori'">
          <label>Kategori</label>
          <MultiSelect
            placeholder="Semua Kategori"
            :options="msKategoriOptions"
            :selected="filters.kategoris"
            @update="val => { filters.kategoris = val; msOnKategoriChange() }"
          />
        </div>

        <!-- Platform -->
        <div class="f-group">
          <label>Platform (Pelanggan Segmen)</label>
          <MultiSelect
            placeholder="Semua Platform"
            :options="optionLists.platform"
            :selected="filters.platforms"
            @update="val => filters.platforms = val"
          />
        </div>

        <!-- Nama Pelanggan / Dealer -->
        <div class="f-group">
          <label>Nama Pelanggan / Dealer</label>
          <MultiSelect
            placeholder="Semua Dealer"
            :options="msDealerOptions"
            :selected="filters.pelanggans"
            @update="val => filters.pelanggans = val"
          />
        </div>

        <!-- Departemen -->
        <div class="f-group">
          <label>Departemen</label>
          <MultiSelect
            placeholder="Semua Dept"
            :options="optionLists.dept"
            :selected="filters.depts"
            @update="val => filters.depts = val"
          />
        </div>

        <!-- Kota / Cabang -->
        <div class="f-group">
          <label>Kota / Cabang</label>
          <MultiSelect
            placeholder="Semua Kota"
            :options="optionLists.cabang"
            :selected="filters.cabangs"
            @update="val => filters.cabangs = val"
          />
        </div>

        <!-- Gudang -->
        <div class="f-group">
          <label>Gudang</label>
          <MultiSelect
            placeholder="Semua Gudang"
            :options="optionLists.gudang"
            :selected="filters.gudangs"
            @update="val => filters.gudangs = val"
          />
        </div>

        <!-- Lokasi Bertingkat (Provinsi / Kab / Kec) - hanya non-wilayah -->
        <template v-if="subPage !== 'wilayah'">
          <div class="f-group">
            <label>Provinsi Toko</label>
            <MultiSelect
              placeholder="Semua Provinsi"
              :options="msProvinsiOptions"
              :selected="filters.provinsis"
              @update="val => { filters.provinsis = val; msOnProvinsiChange() }"
            />
          </div>
          <div class="f-group">
            <label>Kabupaten / Kota</label>
            <MultiSelect
              placeholder="Semua Kab/Kota"
              :options="msKabupatenOptions"
              :selected="filters.kabupatens"
              @update="val => { filters.kabupatens = val; msOnKabupatenChange() }"
            />
          </div>
          <div class="f-group">
            <label>Kecamatan</label>
            <MultiSelect
              placeholder="Semua Kecamatan"
              :options="msKecamatanOptions"
              :selected="filters.kecamatans"
              @update="val => filters.kecamatans = val"
            />
          </div>
        </template>
      </div>

      <!-- Active Filters + Clear -->
      <div class="filter-footer-actions">
        <div class="active-filters-row">
          <button class="btn-clear" @click="resetAllFilters">🔄 Clear Filter</button>
          <div v-if="allActiveFilters.length" class="active-filter-chips">
            <span v-for="chip in allActiveFilters" :key="chip.key" class="chip" @click="removeActiveFilter(chip.key, chip.value)">
              {{ chip.label }} <span class="chip-x">×</span>
            </span>
            <button v-if="allActiveFilters.length > 1" class="chip chip-all" @click="resetAllFilters">Clear All ×</button>
          </div>
        </div>
        <div class="meta-count">Menampilkan: <strong>{{ totalItemsCount }}</strong> item terfilter</div>
      </div>
    </div>

    <div v-if="!store.soBerjalan.length" class="empty">Upload data SO Berjalan di halaman Input Data.</div>
    <div v-else-if="!store.targetBulan" class="empty">Set bulan target di halaman Input Data.</div>

    <!-- ==================== BY BRAND ==================== -->
    <div v-else-if="subPage === 'brand'">
      <div v-if="filteredBrands.length === 0" class="empty">Tidak ada data brand yang cocok dengan kriteria filter.</div>
      <div v-else class="list-section">
        <div class="list-header lv1-header">
          <div class="lh-rank" @click="setSort('brand','rank')"># <i class="si">{{ sortIcon('brand','rank') }}</i></div>
          <div class="lh-name" @click="setSort('brand','name')">BRAND <i class="si">{{ sortIcon('brand','name') }}</i></div>
          <div class="lh-metrics">
            <span @click="setSort('brand','avgBulanan')">RATA-RATA/BLN <i class="si">{{ sortIcon('brand','avgBulanan') }}</i></span>
            <span @click="setSort('brand','total')">TOTAL JENDELA <i class="si">{{ sortIcon('brand','total') }}</i></span>
            <span @click="setSort('brand','bulanAktif')">BULAN AKTIF <i class="si">{{ sortIcon('brand','bulanAktif') }}</i></span>
            <span @click="setSort('brand','totalQty')">QTY TERJUAL <i class="si">{{ sortIcon('brand','totalQty') }}</i></span>
            <span @click="setSort('brand','nextTarget')">TARGET NEXT <i class="si">{{ sortIcon('brand','nextTarget') }}</i></span>
          </div>
          <div class="lh-spark">TREN</div>
          <div class="lh-chev"></div>
        </div>

        <div class="brand-list">
          <div v-for="(b, idx) in sortedBrands" :key="b.name" class="item-card lv1-card" :class="{ expanded: openBrand === b.name }">
            <div class="item-row" @click="toggleBrand(b.name)">
              <div class="rank">#{{ idx + 1 }}</div>
              <div class="item-name-col"><div class="item-name">{{ b.name }}</div></div>
              <div class="item-metrics">
                <div class="metric">
                  <div class="metric-label">RATA-RATA/BLN</div>
                  <div class="metric-val">{{ formatRupiah(b.avgBulanan) }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">TOTAL JENDELA</div>
                  <div class="metric-val">{{ formatRupiah(b.total) }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">BULAN AKTIF</div>
                  <div class="metric-val">{{ b.bulanAktif }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">QTY TERJUAL</div>
                  <div class="metric-val accent">{{ b.totalQty.toLocaleString('id-ID') }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">TARGET NEXT</div>
                  <div class="metric-val blue-val">{{ formatRupiah(Math.round(b.avgBulanan * 1.15)) }}</div>
                </div>
              </div>
              <div class="sparkline-wrap">
                <svg viewBox="0 0 100 28" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">
                  <polyline :points="spark(b.perBulan)" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="chev" :class="{ open: openBrand === b.name }">▾</span>
            </div>

            <div v-if="openBrand === b.name" class="item-detail">
              <div class="chart-section">
                <div class="section-label">TREN HISTORIS JENDELA WAKTU</div>
                <div class="timeseries-chart">
                  <div v-for="m in b.perBulan" :key="m.label" class="ts-col">
                    <div class="ts-label-top">{{ formatRupiah(m.jumlah) }}</div>
                    <div class="ts-track"><div class="ts-fill lv1-fill" :style="{ height: barH(m.jumlah, b.maxBulan) + '%' }"></div></div>
                    <div class="ts-label-bot">{{ m.label }}</div>
                  </div>
                </div>
              </div>
              <div class="hint-box">💡 Rumus Target: Rata-rata omset aktif <strong>{{ formatRupiah(b.avgBulanan) }}</strong> × 115% = <strong class="blue-val">{{ formatRupiah(Math.round(b.avgBulanan * 1.15)) }} / bulan</strong></div>

              <div class="display-filter-bar">
                <span class="df-label">TAMPILKAN:</span>
                <button v-for="tab in brandDetailTabs" :key="tab.key" class="df-tab"
                  :class="{ active: brandDetailView[b.name] === tab.key }"
                  @click.stop="setBrandDetailView(b.name, tab.key)">
                  {{ tab.label }}
                </button>
              </div>

              <div v-if="brandDetailView[b.name]" class="detail-table-wrap">
                <template v-if="brandDetailView[b.name] === 'dealer'">
                  <DetailTable title="💎 TOP DEALER CONTRIBS" :rows="sortedDetailRows(b.topDealer, b.name+'_dealer')"
                    :cols="stdCols" :sort-state="detailSort[b.name+'_dealer']"
                    @sort="col => setDetailSort(b.name+'_dealer', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="brandDetailView[b.name] === 'kategori'">
                  <DetailTable title="📦 PER KATEGORI BARANG" :rows="sortedDetailRows(b.topKategori, b.name+'_kategori')"
                    :cols="stdCols" :sort-state="detailSort[b.name+'_kategori']"
                    @sort="col => setDetailSort(b.name+'_kategori', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="brandDetailView[b.name] === 'sku'">
                  <DetailTable title="🏷️ TOP SKU ITEM" :rows="sortedDetailRows(b.topSku, b.name+'_sku')"
                    :cols="stdCols" :sort-state="detailSort[b.name+'_sku']"
                    @sort="col => setDetailSort(b.name+'_sku', col)" :fmt="formatRupiah" :is-sku="true" />
                </template>
              </div>
              <div v-else class="table-placeholder">Pilih filter tampilan di atas untuk melihat detail data.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== BY KATEGORI ==================== -->
    <div v-else-if="subPage === 'kategori'">
      <div v-if="filteredKategori.length === 0" class="empty">Tidak ada data kategori yang cocok dengan kriteria filter.</div>
      <div v-else class="list-section">
        <div class="list-header lv1-header">
          <div class="lh-rank" @click="setSort('kat','rank')"># <i class="si">{{ sortIcon('kat','rank') }}</i></div>
          <div class="lh-name" @click="setSort('kat','name')">KATEGORI <i class="si">{{ sortIcon('kat','name') }}</i></div>
          <div class="lh-metrics">
            <span @click="setSort('kat','avgBulanan')">RATA-RATA/BLN <i class="si">{{ sortIcon('kat','avgBulanan') }}</i></span>
            <span @click="setSort('kat','total')">TOTAL JENDELA <i class="si">{{ sortIcon('kat','total') }}</i></span>
            <span @click="setSort('kat','bulanAktif')">BULAN AKTIF <i class="si">{{ sortIcon('kat','bulanAktif') }}</i></span>
            <span @click="setSort('kat','totalQty')">QTY TERJUAL <i class="si">{{ sortIcon('kat','totalQty') }}</i></span>
            <span @click="setSort('kat','nextTarget')">TARGET NEXT <i class="si">{{ sortIcon('kat','nextTarget') }}</i></span>
          </div>
          <div class="lh-spark">TREN</div>
          <div class="lh-chev"></div>
        </div>

        <div class="brand-list">
          <div v-for="(k, idx) in sortedKategori" :key="k.name" class="item-card lv1-card" :class="{ expanded: openKat === k.name }">
            <div class="item-row" @click="toggleKat(k.name)">
              <div class="rank">#{{ idx + 1 }}</div>
              <div class="item-name-col"><div class="item-name">{{ k.name }}</div></div>
              <div class="item-metrics">
                <div class="metric"><div class="metric-label">RATA-RATA/BLN</div><div class="metric-val">{{ formatRupiah(k.avgBulanan) }}</div></div>
                <div class="metric"><div class="metric-label">TOTAL JENDELA</div><div class="metric-val">{{ formatRupiah(k.total) }}</div></div>
                <div class="metric"><div class="metric-label">BULAN AKTIF</div><div class="metric-val">{{ k.bulanAktif }}</div></div>
                <div class="metric"><div class="metric-label">QTY TERJUAL</div><div class="metric-val accent">{{ k.totalQty.toLocaleString('id-ID') }}</div></div>
                <div class="metric"><div class="metric-label">TARGET NEXT</div><div class="metric-val blue-val">{{ formatRupiah(Math.round(k.avgBulanan * 1.15)) }}</div></div>
              </div>
              <div class="sparkline-wrap">
                <svg viewBox="0 0 100 28" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">
                  <polyline :points="spark(k.perBulan)" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="chev" :class="{ open: openKat === k.name }">▾</span>
            </div>

            <div v-if="openKat === k.name" class="item-detail">
              <div class="chart-section">
                <div class="section-label">TREN HISTORIS JENDELA WAKTU</div>
                <div class="timeseries-chart">
                  <div v-for="m in k.perBulan" :key="m.label" class="ts-col">
                    <div class="ts-label-top">{{ formatRupiah(m.jumlah) }}</div>
                    <div class="ts-track"><div class="ts-fill lv1-fill" :style="{ height: barH(m.jumlah, k.maxBulan) + '%' }"></div></div>
                    <div class="ts-label-bot">{{ m.label }}</div>
                  </div>
                </div>
              </div>
              <div class="hint-box">💡 Rumus Target: Rata-rata omset aktif <strong>{{ formatRupiah(k.avgBulanan) }}</strong> × 115% = <strong class="blue-val">{{ formatRupiah(Math.round(k.avgBulanan * 1.15)) }} / bulan</strong></div>

              <div class="display-filter-bar">
                <span class="df-label">TAMPILKAN:</span>
                <button v-for="tab in katDetailTabs" :key="tab.key" class="df-tab"
                  :class="{ active: katDetailView[k.name] === tab.key }"
                  @click.stop="setKatDetailView(k.name, tab.key)">
                  {{ tab.label }}
                </button>
              </div>

              <div v-if="katDetailView[k.name]" class="detail-table-wrap">
                <template v-if="katDetailView[k.name] === 'brand'">
                  <DetailTable title="🏷️ TOP BRAND INVOLVED" :rows="sortedDetailRows(k.topBrand, k.name+'_brand')"
                    :cols="stdCols" :sort-state="detailSort[k.name+'_brand']"
                    @sort="col => setDetailSort(k.name+'_brand', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="katDetailView[k.name] === 'dealer'">
                  <DetailTable title="💎 TOP DEALER CONTRIBS" :rows="sortedDetailRows(k.topDealer, k.name+'_dealer')"
                    :cols="stdCols" :sort-state="detailSort[k.name+'_dealer']"
                    @sort="col => setDetailSort(k.name+'_dealer', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="katDetailView[k.name] === 'sku'">
                  <DetailTable title="📦 TOP SKU ITEM" :rows="sortedDetailRows(k.topSku, k.name+'_sku')"
                    :cols="stdCols" :sort-state="detailSort[k.name+'_sku']"
                    @sort="col => setDetailSort(k.name+'_sku', col)" :fmt="formatRupiah" :is-sku="true" />
                </template>
              </div>
              <div v-else class="table-placeholder">Pilih filter tampilan di atas untuk melihat detail data.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== BY WILAYAH ==================== -->
    <div v-else-if="subPage === 'wilayah'">
      <div v-if="filteredWilayah.length === 0" class="empty">Tidak ada data wilayah yang cocok dengan kriteria filter.</div>
      <div v-else class="list-section">
        <!-- LV1: PROVINSI HEADER -->
        <div class="list-header lv1-header">
          <div class="lh-rank" @click="setSort('wil','rank')"># <i class="si">{{ sortIcon('wil','rank') }}</i></div>
          <div class="lh-name" @click="setSort('wil','name')">PROVINSI <i class="si">{{ sortIcon('wil','name') }}</i></div>
          <div class="lh-metrics">
            <span @click="setSort('wil','avgBulanan')">RATA-RATA/BLN <i class="si">{{ sortIcon('wil','avgBulanan') }}</i></span>
            <span @click="setSort('wil','total')">TOTAL OMSET <i class="si">{{ sortIcon('wil','total') }}</i></span>
            <span @click="setSort('wil','kabCount')">KAB/KOTA AKTIF <i class="si">{{ sortIcon('wil','kabCount') }}</i></span>
            <span @click="setSort('wil','totalQty')">QTY TERJUAL <i class="si">{{ sortIcon('wil','totalQty') }}</i></span>
            <span @click="setSort('wil','nextTarget')">TARGET WILAYAH <i class="si">{{ sortIcon('wil','nextTarget') }}</i></span>
          </div>
          <div class="lh-spark">TREN</div>
          <div class="lh-chev"></div>
        </div>

        <div class="brand-list">
          <div v-for="(p, pIdx) in sortedWilayah" :key="p.name" class="item-card lv1-card" :class="{ expanded: openProv === p.name }">
            <div class="item-row" @click="toggleProv(p.name)">
              <div class="rank">#{{ pIdx + 1 }}</div>
              <div class="item-name-col"><div class="item-name">🗺️ PROV. {{ p.name }}</div></div>
              <div class="item-metrics">
                <div class="metric"><div class="metric-label">RATA-RATA/BLN</div><div class="metric-val">{{ formatRupiah(p.avgBulanan) }}</div></div>
                <div class="metric"><div class="metric-label">TOTAL OMSET</div><div class="metric-val">{{ formatRupiah(p.total) }}</div></div>
                <div class="metric"><div class="metric-label">KAB/KOTA AKTIF</div><div class="metric-val">{{ p.kabRows.length }}</div></div>
                <div class="metric"><div class="metric-label">QTY TERJUAL</div><div class="metric-val accent">{{ p.totalQty.toLocaleString('id-ID') }}</div></div>
                <div class="metric"><div class="metric-label">TARGET WILAYAH</div><div class="metric-val blue-val">{{ formatRupiah(Math.round(p.avgBulanan * 1.15)) }}</div></div>
              </div>
              <div class="sparkline-wrap">
                <svg viewBox="0 0 100 28" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">
                  <polyline :points="spark(p.perBulan)" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="chev" :class="{ open: openProv === p.name }">▾</span>
            </div>

            <div v-if="openProv === p.name" class="item-detail">
              <!-- Tren provinsi -->
              <div class="chart-section">
                <div class="section-label">TREN HISTORIS OMSET PROVINSI</div>
                <div class="timeseries-chart">
                  <div v-for="m in p.perBulan" :key="m.label" class="ts-col">
                    <div class="ts-label-top">{{ formatRupiah(m.jumlah) }}</div>
                    <div class="ts-track"><div class="ts-fill lv1-fill" :style="{ height: barH(m.jumlah, p.maxBulan) + '%' }"></div></div>
                    <div class="ts-label-bot">{{ m.label }}</div>
                  </div>
                </div>
              </div>
              <div class="hint-box">💡 Target Wilayah: Rata-rata <strong>{{ formatRupiah(p.avgBulanan) }}</strong> × 115% = <strong class="blue-val">{{ formatRupiah(Math.round(p.avgBulanan * 1.15)) }} / bulan</strong></div>

              <div class="display-filter-bar">
                <span class="df-label">TAMPILKAN:</span>
                <button v-for="tab in wilayahDetailTabs" :key="tab.key" class="df-tab"
                  :class="{ active: wilDetailView[p.name] === tab.key }"
                  @click.stop="setWilDetailView(p.name, tab.key)">
                  {{ tab.label }}
                </button>
              </div>

              <div v-if="wilDetailView[p.name]" class="detail-table-wrap">
                <template v-if="wilDetailView[p.name] === 'dealer'">
                  <DetailTable title="💎 TOP DEALER DI PROVINSI" :rows="sortedDetailRows(p.topDealer, p.name+'_dealer')"
                    :cols="stdCols" :sort-state="detailSort[p.name+'_dealer']"
                    @sort="col => setDetailSort(p.name+'_dealer', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="wilDetailView[p.name] === 'brand'">
                  <DetailTable title="🏷️ TOP BRAND" :rows="sortedDetailRows(p.topBrand, p.name+'_brand')"
                    :cols="stdCols" :sort-state="detailSort[p.name+'_brand']"
                    @sort="col => setDetailSort(p.name+'_brand', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="wilDetailView[p.name] === 'kategori'">
                  <DetailTable title="📦 PER KATEGORI" :rows="sortedDetailRows(p.topKategori, p.name+'_kat')"
                    :cols="stdCols" :sort-state="detailSort[p.name+'_kat']"
                    @sort="col => setDetailSort(p.name+'_kat', col)" :fmt="formatRupiah" />
                </template>
                <template v-else-if="wilDetailView[p.name] === 'sku'">
                  <DetailTable title="📦 TOP SKU" :rows="sortedDetailRows(p.topSku, p.name+'_sku')"
                    :cols="stdCols" :sort-state="detailSort[p.name+'_sku']"
                    @sort="col => setDetailSort(p.name+'_sku', col)" :fmt="formatRupiah" :is-sku="true" />
                </template>
              </div>
              <div v-else class="table-placeholder">Pilih filter tampilan di atas untuk melihat detail data.</div>

              <!-- LV2: KAB/KOTA — langsung tabel, tanpa title section -->
              <div class="nested-section">
                <!-- LV2 HEADER KAB/KOTA -->
                <div class="list-header lv2-header">
                  <div class="lh-rank">#</div>
                  <div class="lh-name">KAB / KOTA</div>
                  <div class="lh-metrics lh-metrics-lv2">
                    <span @click="setKabSort(p.name, 'avgBulanan')">RATA-RATA/BLN <i class="si">{{ kabSortIcon(p.name,'avgBulanan') }}</i></span>
                    <span @click="setKabSort(p.name, 'total')">TOTAL OMSET <i class="si">{{ kabSortIcon(p.name,'total') }}</i></span>
                    <span @click="setKabSort(p.name, 'kecCount')">KEC AKTIF <i class="si">{{ kabSortIcon(p.name,'kecCount') }}</i></span>
                    <span @click="setKabSort(p.name, 'totalQty')">QTY TERJUAL <i class="si">{{ kabSortIcon(p.name,'totalQty') }}</i></span>
                    <span @click="setKabSort(p.name, 'nextTarget')">TARGET <i class="si">{{ kabSortIcon(p.name,'nextTarget') }}</i></span>
                  </div>
                  <div class="lh-spark">TREN</div>
                  <div class="lh-chev"></div>
                </div>

                <div class="brand-list">
                  <div v-for="(kab, kabIdx) in sortedKab(p)" :key="kab.name"
                    class="item-card lv2-card" :class="{ expanded: openKab === p.name+'_'+kab.name }">
                    <div class="item-row lv2-row" @click.stop="toggleKab(p.name+'_'+kab.name)">
                      <div class="rank">#{{ kabIdx + 1 }}</div>
                      <div class="item-name-col"><div class="item-name lv2-name">🏢 {{ kab.name }}</div></div>
                      <div class="item-metrics">
                        <div class="metric"><div class="metric-label">RATA-RATA/BLN</div><div class="metric-val">{{ formatRupiah(kab.avgBulanan) }}</div></div>
                        <div class="metric"><div class="metric-label">TOTAL OMSET</div><div class="metric-val">{{ formatRupiah(kab.total) }}</div></div>
                        <div class="metric"><div class="metric-label">KEC AKTIF</div><div class="metric-val">{{ kab.kecRows.length }}</div></div>
                        <div class="metric"><div class="metric-label">QTY TERJUAL</div><div class="metric-val accent">{{ kab.totalQty.toLocaleString('id-ID') }}</div></div>
                        <div class="metric"><div class="metric-label">TARGET</div><div class="metric-val blue-val">{{ formatRupiah(Math.round(kab.avgBulanan * 1.15)) }}</div></div>
                      </div>
                      <div class="sparkline-wrap">
                        <svg viewBox="0 0 100 28" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">
                          <polyline :points="spark(kab.perBulan)" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                        </svg>
                      </div>
                      <span class="chev" :class="{ open: openKab === p.name+'_'+kab.name }">▾</span>
                    </div>

                    <!-- KAB DETAIL -->
                    <div v-if="openKab === p.name+'_'+kab.name" class="item-detail lv2-detail">
                      <div class="chart-section">
                        <div class="section-label">TREN HISTORIS OMSET KAB/KOTA</div>
                        <div class="timeseries-chart">
                          <div v-for="m in kab.perBulan" :key="m.label" class="ts-col">
                            <div class="ts-label-top">{{ formatRupiah(m.jumlah) }}</div>
                            <div class="ts-track"><div class="ts-fill lv2-fill" :style="{ height: barH(m.jumlah, kab.maxBulan) + '%' }"></div></div>
                            <div class="ts-label-bot">{{ m.label }}</div>
                          </div>
                        </div>
                      </div>
                      <div class="hint-box lv2-hint">💡 Target: <strong>{{ formatRupiah(kab.avgBulanan) }}</strong> × 115% = <strong class="blue-val">{{ formatRupiah(Math.round(kab.avgBulanan * 1.15)) }}</strong></div>

                      <div class="display-filter-bar lv2-filter-bar">
                        <span class="df-label">TAMPILKAN:</span>
                        <button v-for="tab in wilayahDetailTabs" :key="tab.key" class="df-tab df-tab-lv2"
                          :class="{ active: wilDetailView[p.name+'_kab_'+kab.name] === tab.key }"
                          @click.stop="setWilDetailView(p.name+'_kab_'+kab.name, tab.key)">
                          {{ tab.label }}
                        </button>
                      </div>

                      <div v-if="wilDetailView[p.name+'_kab_'+kab.name]" class="detail-table-wrap lv2-table">
                        <template v-if="wilDetailView[p.name+'_kab_'+kab.name] === 'dealer'">
                          <DetailTable title="💎 TOP DEALER" :rows="sortedDetailRows(kab.topDealer, p.name+'_kab_'+kab.name+'_dealer')"
                            :cols="stdCols" :sort-state="detailSort[p.name+'_kab_'+kab.name+'_dealer']"
                            @sort="col => setDetailSort(p.name+'_kab_'+kab.name+'_dealer', col)" :fmt="formatRupiah" level="2" />
                        </template>
                        <template v-else-if="wilDetailView[p.name+'_kab_'+kab.name] === 'brand'">
                          <DetailTable title="🏷️ TOP BRAND" :rows="sortedDetailRows(kab.topBrand, p.name+'_kab_'+kab.name+'_brand')"
                            :cols="stdCols" :sort-state="detailSort[p.name+'_kab_'+kab.name+'_brand']"
                            @sort="col => setDetailSort(p.name+'_kab_'+kab.name+'_brand', col)" :fmt="formatRupiah" level="2" />
                        </template>
                        <template v-else-if="wilDetailView[p.name+'_kab_'+kab.name] === 'kategori'">
                          <DetailTable title="📦 PER KATEGORI" :rows="sortedDetailRows(kab.topKategori, p.name+'_kab_'+kab.name+'_kat')"
                            :cols="stdCols" :sort-state="detailSort[p.name+'_kab_'+kab.name+'_kat']"
                            @sort="col => setDetailSort(p.name+'_kab_'+kab.name+'_kat', col)" :fmt="formatRupiah" level="2" />
                        </template>
                        <template v-else-if="wilDetailView[p.name+'_kab_'+kab.name] === 'sku'">
                          <DetailTable title="📦 TOP SKU" :rows="sortedDetailRows(kab.topSku, p.name+'_kab_'+kab.name+'_sku')"
                            :cols="stdCols" :sort-state="detailSort[p.name+'_kab_'+kab.name+'_sku']"
                            @sort="col => setDetailSort(p.name+'_kab_'+kab.name+'_sku', col)" :fmt="formatRupiah" level="2" :is-sku="true" />
                        </template>
                      </div>
                      <div v-else class="table-placeholder lv2-placeholder">Pilih filter tampilan di atas untuk melihat detail data.</div>

                      <!-- LV3: KECAMATAN -->
                      <div class="nested-section lv3-section">
                        <div class="list-header lv3-header">
                          <div class="lh-rank">#</div>
                          <div class="lh-name">KECAMATAN</div>
                          <div class="lh-metrics lh-metrics-lv3">
                            <span @click="setKecSort(p.name+'_'+kab.name, 'avgBulanan')">RATA-RATA/BLN <i class="si">{{ kecSortIcon(p.name+'_'+kab.name,'avgBulanan') }}</i></span>
                            <span @click="setKecSort(p.name+'_'+kab.name, 'total')">TOTAL OMSET <i class="si">{{ kecSortIcon(p.name+'_'+kab.name,'total') }}</i></span>
                            <span @click="setKecSort(p.name+'_'+kab.name, 'totalQty')">QTY TERJUAL <i class="si">{{ kecSortIcon(p.name+'_'+kab.name,'totalQty') }}</i></span>
                            <span @click="setKecSort(p.name+'_'+kab.name, 'nextTarget')">TARGET <i class="si">{{ kecSortIcon(p.name+'_'+kab.name,'nextTarget') }}</i></span>
                          </div>
                          <div class="lh-spark">TREN</div>
                          <div class="lh-chev"></div>
                        </div>

                        <div class="brand-list">
                          <div v-for="(kec, kecIdx) in sortedKec(p.name+'_'+kab.name, kab.kecRows)" :key="kec.name"
                            class="item-card lv3-card" :class="{ expanded: openKec === p.name+'_'+kab.name+'_'+kec.name }">
                            <div class="item-row lv3-row" @click.stop="toggleKec(p.name+'_'+kab.name+'_'+kec.name)">
                              <div class="rank">#{{ kecIdx + 1 }}</div>
                              <div class="item-name-col"><div class="item-name lv3-name">📍 KEC. {{ kec.name }}</div></div>
                              <div class="item-metrics lh-metrics-lv3">
                                <div class="metric"><div class="metric-label">RATA-RATA/BLN</div><div class="metric-val">{{ formatRupiah(kec.avgBulanan) }}</div></div>
                                <div class="metric"><div class="metric-label">TOTAL OMSET</div><div class="metric-val">{{ formatRupiah(kec.total) }}</div></div>
                                <div class="metric"><div class="metric-label">QTY TERJUAL</div><div class="metric-val accent">{{ kec.totalQty.toLocaleString('id-ID') }}</div></div>
                                <div class="metric"><div class="metric-label">TARGET</div><div class="metric-val blue-val">{{ formatRupiah(Math.round(kec.avgBulanan * 1.15)) }}</div></div>
                              </div>
                              <div class="sparkline-wrap">
                                <svg viewBox="0 0 100 28" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible">
                                  <polyline :points="spark(kec.perBulan)" fill="none" stroke="#93c5fd" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                                </svg>
                              </div>
                              <span class="chev" :class="{ open: openKec === p.name+'_'+kab.name+'_'+kec.name }">▾</span>
                            </div>

                            <!-- KEC DETAIL -->
                            <div v-if="openKec === p.name+'_'+kab.name+'_'+kec.name" class="item-detail lv3-detail">
                              <div class="chart-section">
                                <div class="section-label">TREN HISTORIS OMSET KECAMATAN</div>
                                <div class="timeseries-chart">
                                  <div v-for="m in kec.perBulan" :key="m.label" class="ts-col">
                                    <div class="ts-label-top">{{ formatRupiah(m.jumlah) }}</div>
                                    <div class="ts-track"><div class="ts-fill lv3-fill" :style="{ height: barH(m.jumlah, kec.maxBulan) + '%' }"></div></div>
                                    <div class="ts-label-bot">{{ m.label }}</div>
                                  </div>
                                </div>
                              </div>
                              <div class="hint-box lv3-hint">💡 Target: <strong>{{ formatRupiah(kec.avgBulanan) }}</strong> × 115% = <strong class="blue-val">{{ formatRupiah(Math.round(kec.avgBulanan * 1.15)) }}</strong></div>

                              <div class="display-filter-bar lv3-filter-bar">
                                <span class="df-label">TAMPILKAN:</span>
                                <button v-for="tab in wilayahDetailTabs" :key="tab.key" class="df-tab df-tab-lv3"
                                  :class="{ active: wilDetailView[p.name+'_kab_'+kab.name+'_kec_'+kec.name] === tab.key }"
                                  @click.stop="setWilDetailView(p.name+'_kab_'+kab.name+'_kec_'+kec.name, tab.key)">
                                  {{ tab.label }}
                                </button>
                              </div>

                              <div v-if="wilDetailView[p.name+'_kab_'+kab.name+'_kec_'+kec.name]" class="detail-table-wrap lv3-table">
                                <template v-if="wilDetailView[p.name+'_kab_'+kab.name+'_kec_'+kec.name] === 'dealer'">
                                  <DetailTable title="💎 TOP DEALER" :rows="sortedDetailRows(kec.topDealer, p.name+'_'+kab.name+'_'+kec.name+'_d')"
                                    :cols="stdCols" :sort-state="detailSort[p.name+'_'+kab.name+'_'+kec.name+'_d']"
                                    @sort="col => setDetailSort(p.name+'_'+kab.name+'_'+kec.name+'_d', col)" :fmt="formatRupiah" level="3" />
                                </template>
                                <template v-else-if="wilDetailView[p.name+'_kab_'+kab.name+'_kec_'+kec.name] === 'brand'">
                                  <DetailTable title="🏷️ TOP BRAND" :rows="sortedDetailRows(kec.topBrand, p.name+'_'+kab.name+'_'+kec.name+'_b')"
                                    :cols="stdCols" :sort-state="detailSort[p.name+'_'+kab.name+'_'+kec.name+'_b']"
                                    @sort="col => setDetailSort(p.name+'_'+kab.name+'_'+kec.name+'_b', col)" :fmt="formatRupiah" level="3" />
                                </template>
                                <template v-else-if="wilDetailView[p.name+'_kab_'+kab.name+'_kec_'+kec.name] === 'kategori'">
                                  <DetailTable title="📦 PER KATEGORI" :rows="sortedDetailRows(kec.topKategori, p.name+'_'+kab.name+'_'+kec.name+'_k')"
                                    :cols="stdCols" :sort-state="detailSort[p.name+'_'+kab.name+'_'+kec.name+'_k']"
                                    @sort="col => setDetailSort(p.name+'_'+kab.name+'_'+kec.name+'_k', col)" :fmt="formatRupiah" level="3" />
                                </template>
                                <template v-else-if="wilDetailView[p.name+'_kab_'+kab.name+'_kec_'+kec.name] === 'sku'">
                                  <DetailTable title="📦 TOP SKU" :rows="sortedDetailRows(kec.topSku, p.name+'_'+kab.name+'_'+kec.name+'_s')"
                                    :cols="stdCols" :sort-state="detailSort[p.name+'_'+kab.name+'_'+kec.name+'_s']"
                                    @sort="col => setDetailSort(p.name+'_'+kab.name+'_'+kec.name+'_s', col)" :fmt="formatRupiah" level="3" :is-sku="true" />
                                </template>
                              </div>
                              <div v-else class="table-placeholder lv3-placeholder">Pilih filter tampilan di atas untuk melihat detail data.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { cleanBrand, cleanPelanggan } from '@/utils/brandCleaner'
import { get3BulanHistoris, formatRupiah, mapCity } from '@/utils/calculations'

const DetailTable = {
  props: {
    title: String, rows: Array, cols: Array,
    sortState: Object, fmt: Function,
    level: { type: [String, Number], default: 1 },
    isSku: { type: Boolean, default: false }
  },
  emits: ['sort'],
  computed: {
    headBg() {
      if (this.level == 2) return 'linear-gradient(135deg,#2563eb,#3b82f6)'
      if (this.level == 3) return 'linear-gradient(135deg,#60a5fa,#93c5fd)'
      return 'linear-gradient(135deg,#1d4ed8,#2563eb)'
    },
    headColor() { return this.level == 3 ? '#1e3a8a' : 'rgba(255,255,255,0.92)' }
  },
  methods: {
    si(col) {
      if (!this.sortState || this.sortState.col !== col) return '↕'
      return this.sortState.dir === 'asc' ? '↑' : '↓'
    }
  },
  template: `
    <div class="dt-wrap">
      <div class="dt-title" style="display:none"></div>
      <div class="dt-scroll">
        <table class="dt-table">
          <thead>
            <tr :class="'dt-head-lv' + level">
              <th class="dt-th dt-th-rank">#</th>
              <th v-if="isSku" class="dt-th dt-th-sku">
                <span class="dt-sortable" @click="$emit('sort','kode')">SKU <i class="si">{{ si('kode') }}</i></span>
              </th>
              <th class="dt-th dt-th-name">
                <span class="dt-sortable" @click="$emit('sort','nama')">NAMA <i class="si">{{ si('nama') }}</i></span>
              </th>
              <th v-for="c in cols" :key="c.key" class="dt-th dt-th-num">
                <span class="dt-sortable" @click="$emit('sort', c.key)">{{ c.label }} <i class="si">{{ si(c.key) }}</i></span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="row.kode||row.nama" class="dt-row" :class="{ 'dt-row-alt': idx % 2 === 1 }">
              <td class="dt-td dt-td-rank">{{ idx + 1 }}</td>
              <td v-if="isSku" class="dt-td dt-td-sku">
                <span class="sku-code" :title="row.kode">{{ row.kode }}</span>
              </td>
              <td class="dt-td dt-td-name">
                <div class="dt-name-wrap">
                  <span class="dt-name" :title="row.nama">{{ row.nama }}</span>
                  <div class="dt-bar-wrap"><div class="dt-bar" :style="{ width: row.pct + '%' }"></div></div>
                </div>
              </td>
              <td v-for="c in cols" :key="c.key" class="dt-td dt-td-num">
                <span v-if="c.type==='rupiah'" class="dt-rupiah">{{ fmt(row[c.key]) }}</span>
                <span v-else-if="c.type==='pct'" class="dt-pct">{{ (row[c.key]||0).toFixed(1) }}%</span>
                <span v-else-if="c.type==='qty'" class="dt-qty">{{ (row[c.key]||0).toLocaleString('id-ID') }}</span>
                <span v-else>{{ row[c.key] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
}

// ── Store ─────────────────────────────────────────────────────────────────────
const subPage = ref('brand')

const openBrand = ref(null)
const openKat   = ref(null)
const openProv  = ref(null)
const openKab   = ref(null)
const openKec   = ref(null)

function toggleBrand(n) { openBrand.value = openBrand.value === n ? null : n }
function toggleKat(n)   { openKat.value   = openKat.value   === n ? null : n }
function toggleProv(n)  { openProv.value  = openProv.value  === n ? null : n; openKab.value = null; openKec.value = null }
function toggleKab(k)   { openKab.value   = openKab.value   === k ? null : k; openKec.value = null }
function toggleKec(k)   { openKec.value   = openKec.value   === k ? null : k }

// ── Display filter views ──────────────────────────────────────────────────────
const brandDetailView = ref({})
const katDetailView   = ref({})
const wilDetailView   = ref({})

function setBrandDetailView(n, t) {
  brandDetailView.value = { ...brandDetailView.value, [n]: brandDetailView.value[n] === t ? null : t }
}
function setKatDetailView(n, t) {
  katDetailView.value = { ...katDetailView.value, [n]: katDetailView.value[n] === t ? null : t }
}
function setWilDetailView(n, t) {
  wilDetailView.value = { ...wilDetailView.value, [n]: wilDetailView.value[n] === t ? null : t }
}

const brandDetailTabs = [
  { key: 'dealer',   label: '💎 By Dealer' },
  { key: 'kategori', label: '📦 By Kategori' },
  { key: 'sku',      label: '🏷️ By SKU' }
]
const katDetailTabs = [
  { key: 'brand',  label: '🏷️ By Brand' },
  { key: 'dealer', label: '💎 By Dealer' },
  { key: 'sku',    label: '📦 By SKU' }
]
const wilayahDetailTabs = [
  { key: 'dealer',   label: '💎 By Dealer' },
  { key: 'brand',    label: '🏷️ By Brand' },
  { key: 'kategori', label: '📦 By Kategori' },
  { key: 'sku',      label: '🔑 By SKU' }
]

const store = useSelloutStore()

const stdCols = [
  { key: 'qty',    label: 'QTY',   type: 'qty'    },
  { key: 'pct',    label: '%',     type: 'pct'    },
  { key: 'jumlah', label: 'TOTAL', type: 'rupiah' }
]

// ── Sort: main list ───────────────────────────────────────────────────────────
const listSort = reactive({
  brand: { col: 'avgBulanan', dir: 'desc' },
  kat:   { col: 'avgBulanan', dir: 'desc' },
  wil:   { col: 'avgBulanan', dir: 'desc' }
})
function setSort(sec, col) {
  if (listSort[sec].col === col) listSort[sec].dir = listSort[sec].dir === 'desc' ? 'asc' : 'desc'
  else { listSort[sec].col = col; listSort[sec].dir = 'desc' }
}
function sortIcon(sec, col) {
  if (listSort[sec].col !== col) return '↕'
  return listSort[sec].dir === 'asc' ? '↑' : '↓'
}

// ── Sort: kab/kota per provinsi ───────────────────────────────────────────────
const kabSortState = reactive({})
function setKabSort(provName, col) {
  if (!kabSortState[provName]) kabSortState[provName] = { col: 'total', dir: 'desc' }
  if (kabSortState[provName].col === col) kabSortState[provName].dir = kabSortState[provName].dir === 'desc' ? 'asc' : 'desc'
  else { kabSortState[provName].col = col; kabSortState[provName].dir = 'desc' }
}
function kabSortIcon(provName, col) {
  const s = kabSortState[provName]
  if (!s || s.col !== col) return '↕'
  return s.dir === 'asc' ? '↑' : '↓'
}
function sortedKab(prov) {
  const s = kabSortState[prov.name]
  if (!s) return prov.kabRows
  return [...prov.kabRows].sort((a, b) => {
    const av = s.col === 'nextTarget' ? Math.round(a.avgBulanan*1.15) : s.col === 'kecCount' ? a.kecRows.length : (a[s.col] ?? 0)
    const bv = s.col === 'nextTarget' ? Math.round(b.avgBulanan*1.15) : s.col === 'kecCount' ? b.kecRows.length : (b[s.col] ?? 0)
    if (s.col === 'name') return s.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    return s.dir === 'asc' ? av - bv : bv - av
  })
}

// ── Sort: kecamatan per kab ───────────────────────────────────────────────────
const kecSortState = reactive({})
function setKecSort(key, col) {
  if (!kecSortState[key]) kecSortState[key] = { col: 'total', dir: 'desc' }
  if (kecSortState[key].col === col) kecSortState[key].dir = kecSortState[key].dir === 'desc' ? 'asc' : 'desc'
  else { kecSortState[key].col = col; kecSortState[key].dir = 'desc' }
}
function kecSortIcon(key, col) {
  const s = kecSortState[key]
  if (!s || s.col !== col) return '↕'
  return s.dir === 'asc' ? '↑' : '↓'
}
function sortedKec(key, rows) {
  const s = kecSortState[key]
  if (!s) return rows
  return [...rows].sort((a, b) => {
    const av = s.col === 'nextTarget' ? Math.round(a.avgBulanan*1.15) : (a[s.col] ?? 0)
    const bv = s.col === 'nextTarget' ? Math.round(b.avgBulanan*1.15) : (b[s.col] ?? 0)
    if (s.col === 'name') return s.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    return s.dir === 'asc' ? av - bv : bv - av
  })
}

// ── Sort: detail tables ───────────────────────────────────────────────────────
const detailSort = reactive({})
function setDetailSort(key, col) {
  if (!detailSort[key]) detailSort[key] = { col: null, dir: 'desc' }
  if (detailSort[key].col === col) detailSort[key].dir = detailSort[key].dir === 'desc' ? 'asc' : 'desc'
  else { detailSort[key].col = col; detailSort[key].dir = 'desc' }
}
function sortedDetailRows(rows, key) {
  const s = detailSort[key]
  if (!s || !s.col) return rows
  return [...rows].sort((a, b) => {
    const av = a[s.col] ?? 0, bv = b[s.col] ?? 0
    if (s.col === 'nama') return s.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    return s.dir === 'asc' ? av - bv : bv - av
  })
}
const MultiSelect = {
  props: {
    options: { type: Array, default: () => [] },
    selected: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Pilih...' },
    disabled: { type: Boolean, default: false },
    maxDisplay: { type: Number, default: 10 }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const isOpen = ref(false)
    const searchQ = ref('')
    const wrapRef = ref(null)
    const searchRef = ref(null)

    const filteredAll = computed(() => {
      const all = Array.isArray(props.options) ? props.options : []
      if (!searchQ.value) return all
      return all.filter(o => String(o).toUpperCase().includes(searchQ.value.toUpperCase()))
    })

    const displayOptions = computed(() => filteredAll.value.slice(0, props.maxDisplay))
    const overflowCount = computed(() => Math.max(0, filteredAll.value.length - props.maxDisplay))

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
      if (isOpen.value) { searchQ.value = '' }
    }

    function onClickOutside(e) {
      if (wrapRef.value && !wrapRef.value.contains(e.target)) isOpen.value = false
    }

    onMounted(() => document.addEventListener('mousedown', onClickOutside))
    onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

    return { isOpen, searchQ, wrapRef, searchRef, displayOptions, overflowCount, filteredAll, isSelected, toggleOpt, clearAll, toggle }
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
        <input ref="searchRef" v-model="searchQ" placeholder="Cari..." class="ms-search" @click.stop />
      </div>
      <div class="ms-options">
        <div v-for="opt in displayOptions" :key="opt" class="ms-opt"
          :class="{ selected: isSelected(opt) }" @click.stop="toggleOpt(opt)">
          <span class="ms-check">{{ isSelected(opt) ? '☑' : '☐' }}</span>
          <span class="ms-opt-label">{{ opt }}</span>
        </div>
        <div v-if="overflowCount > 0" class="ms-overflow">
          +{{ overflowCount }} lainnya...
          <span class="ms-overflow-hint">Gunakan pencarian untuk melihat semua</span>
        </div>
        <div v-if="filteredAll.length === 0" class="ms-empty">Tidak ada hasil</div>
      </div>
      <div v-if="selected.length" class="ms-footer" @click.stop>
        <button class="ms-clear-btn" @click="clearAll">Hapus Semua</button>
      </div>
    </div>
  `
}

// ── Filters (multi-select arrays) ────────────────────────────────────────────
const filters = reactive({
  searches: [], pelanggans: [],
  brands: [], kategoris: [],
  platforms: [], depts: [], cabangs: [], gudangs: [],
  provinsis: [], kabupatens: [], kecamatans: [],
  dateStart: '', dateEnd: ''
})

// ── Period filter (Shopee-style) ─────────────────────────────────────────────
const periodOpen = ref(false)
const selectedPeriod = ref('')
const periodWrap = ref(null)

const now = new Date()
const nowHours = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = `${String(yesterday.getDate()).padStart(2,'0')}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${yesterday.getFullYear()}`

function fmtDate(d) { return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}` }
const days7Range = computed(() => {
  const d7 = new Date(now); d7.setDate(d7.getDate() - 7)
  return `${fmtDate(d7)} - ${fmtDate(now)}`
})
const days30Range = computed(() => {
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30)
  return `${fmtDate(d30)} - ${fmtDate(now)}`
})

const placeholderPeriod = computed(() => {
  if (!selectedPeriod.value) return 'Semua'
  return selectedPeriod.value
})

function selectPeriod(p) {
  if (selectedPeriod.value === p) {
    selectedPeriod.value = ''
  } else {
    selectedPeriod.value = p
  }
}

function clearPeriod() {
  selectedPeriod.value = ''
  filters.dateStart = ''
  filters.dateEnd = ''
  periodOpen.value = false
}

function applyPeriod() {
  periodOpen.value = false
}

function isPeriodActive() {
  return !!selectedPeriod.value
}

// Click outside for period dropdown
function onPeriodClickOutside(e) {
  if (periodWrap.value && !periodWrap.value.contains(e.target)) periodOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onPeriodClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onPeriodClickOutside))

// BULAN constant
const BULAN_NAMA = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"]

// ── Multi-select options (max 10 displayed, rest scrollable) ────────────────────
const MAX_DISPLAY = 10

const msBrandOptions = computed(() => {
  const brandSet = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const br = cleanBrand(r['Brand'] || r['BRAND Barang'])
    if (br) brandSet.add(br)
  })
  return [...brandSet].sort()
})

const msKategoriOptions = computed(() => {
  const katSet = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const br = cleanBrand(r['Brand'] || r['BRAND Barang'])
    if (filters.brands.length && !filters.brands.includes(br)) return
    if (r['Kategori']) katSet.add(String(r['Kategori']).trim())
  })
  return [...katSet].sort()
})

const msProvinsiOptions = computed(() => {
  const provSet = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    if (r['Provinsi']) provSet.add(String(r['Provinsi']).trim().toUpperCase())
  })
  return [...provSet].sort()
})

const msKabupatenOptions = computed(() => {
  const kabSet = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const provVal = String(r['Provinsi'] ?? '').trim().toUpperCase()
    if (filters.provinsis.length && !filters.provinsis.includes(provVal)) return
    if (r['Kab/Kota']) kabSet.add(String(r['Kab/Kota']).trim().toUpperCase())
  })
  return [...kabSet].sort()
})

const msKecamatanOptions = computed(() => {
  const kecSet = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const provVal = String(r['Provinsi'] ?? '').trim().toUpperCase()
    const kabVal  = String(r['Kab/Kota'] ?? '').trim().toUpperCase()
    if (filters.provinsis.length && !filters.provinsis.includes(provVal)) return
    if (filters.kabupatens.length && !filters.kabupatens.includes(kabVal)) return
    if (r['Kec']) kecSet.add(String(r['Kec']).trim().toUpperCase())
  })
  return [...kecSet].sort()
})

const msSearchOptions = computed(() => {
  const set = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    if (subPage.value === 'brand') {
      const br = cleanBrand(r['Brand'] || r['BRAND Barang'])
      if (br) set.add(br)
    } else if (subPage.value === 'kategori') {
      const k = String(r['Kategori'] ?? '').trim()
      if (k) set.add(k)
    } else {
      const p = String(r['Provinsi'] ?? '').trim().toUpperCase()
      if (p) set.add(p)
    }
  })
  return [...set].sort()
})

const msDealerOptions = computed(() => {
  const set = new Set()
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const d = cleanPelanggan(r)
    if (d) set.add(d)
  })
  return [...set].sort()
})

const optionLists = computed(() => {
  const rows = store.soBerjalan
  const res = { platform: [], dept: [], cabang: [], gudang: [] }
  const platSet = new Set(), deptSet = new Set(), cabSet = new Set(), gudSet = new Set()
  rows.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const pC = cleanPelanggan(r)
    if (pC) platSet.add(pC)
    if (r['Dept.']) deptSet.add(String(r['Dept.']).trim())
    const cb = mapCity(r['Nama Dept.'] || r['Dept.'] || '')
    if (cb && cb !== 'Others') cabSet.add(cb)
    if (r['Gudang']) gudSet.add(String(r['Gudang']).trim())
  })
  res.platform = [...platSet].sort()
  res.dept = [...deptSet].sort()
  res.cabang = [...cabSet].sort()
  res.gudang = [...gudSet].sort()
  return res
})

// Cascading: when brand changes → reset kategori
function msOnBrandChange() { filters.kategoris = [] }
// Cascading: when kategori changes → reset brand
function msOnKategoriChange() { filters.brands = [] }
// Cascading: when provinsi changes → reset lower
function msOnProvinsiChange() { filters.kabupatens = []; filters.kecamatans = [] }
// Cascading: when kabupaten changes → reset kec
function msOnKabupatenChange() { filters.kecamatans = [] }

function resetAllFilters() {
  filters.brands = []; filters.kategoris = []
  filters.platforms = []; filters.depts = []; filters.cabangs = []; filters.gudangs = []
  filters.provinsis = []; filters.kabupatens = []; filters.kecamatans = []
  filters.searches = []; filters.pelanggans = []
  selectedPeriod.value = ''; filters.dateStart = ''; filters.dateEnd = ''
}

// Active filter chips
const allActiveFilters = computed(() => {
  const chips = []
  if (filters.brands.length)    filters.brands.forEach(v => chips.push({ key: 'brands', label: 'Brand: ' + v, value: v }))
  if (filters.kategoris.length) filters.kategoris.forEach(v => chips.push({ key: 'kategoris', label: 'Kat: ' + v, value: v }))
  if (filters.platforms.length) filters.platforms.forEach(v => chips.push({ key: 'platforms', label: v, value: v }))
  if (filters.depts.length)    filters.depts.forEach(v => chips.push({ key: 'depts', label: 'Dept: ' + v, value: v }))
  if (filters.cabangs.length)   filters.cabangs.forEach(v => chips.push({ key: 'cabangs', label: 'Kota: ' + v, value: v }))
  if (filters.gudangs.length)   filters.gudangs.forEach(v => chips.push({ key: 'gudangs', label: 'Gudang: ' + v, value: v }))
  if (filters.provinsis.length) filters.provinsis.forEach(v => chips.push({ key: 'provinsis', label: 'Prov: ' + v, value: v }))
  if (filters.kabupatens.length) filters.kabupatens.forEach(v => chips.push({ key: 'kabupatens', label: 'Kab: ' + v, value: v }))
  if (filters.kecamatans.length) filters.kecamatans.forEach(v => chips.push({ key: 'kecamatans', label: 'Kec: ' + v, value: v }))
  if (filters.pelanggans.length) filters.pelanggans.forEach(v => chips.push({ key: 'pelanggans', label: 'Dealer: ' + v, value: v }))
  if (filters.searches.length)   filters.searches.forEach(v => chips.push({ key: 'searches', label: 'Src: ' + v, value: v }))
  if (selectedPeriod.value) chips.push({ key: 'period', label: selectedPeriod.value, value: selectedPeriod.value })
  return chips
})

function removeActiveFilter(key, value) {
  if (key === 'period') { selectedPeriod.value = ''; return }
  const arr = filters[key]
  const idx = arr.indexOf(value)
  if (idx !== -1) { arr.splice(idx, 1); filters[key] = [...arr] }
}

watch(subPage, () => {
  resetAllFilters()
  openBrand.value = openKat.value = openProv.value = openKab.value = openKec.value = null
})
const totalItemsCount = computed(() => {
  if (subPage.value === 'brand')    return filteredBrands.value.length
  if (subPage.value === 'kategori') return filteredKategori.value.length
  return filteredWilayah.value.length
})

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
const window3Label = computed(() => {
  if (!window3.value.length) return ''
  const w = window3.value
  return `${w[0].bulan.slice(0,3)} ${String(w[0].tahun).slice(2)} – ${w[2].bulan.slice(0,3)} ${String(w[2].tahun).slice(2)}`
})

function getYearMonth(s) {
  if (!s) return ''
  const t = String(s).trim()
  return t.includes('-') ? t.slice(0,7) : ''
}

const filteredRows = computed(() => {
  if (!store.soBerjalan.length || !store.targetBulan) return []
  return store.soBerjalan.filter(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return false

    // Search filter (multi-select)
    if (filters.searches.length) {
      if (subPage.value === 'brand') {
        const br = cleanBrand(r['Brand'] || r['BRAND Barang']) || ''
        if (!filters.searches.includes(br)) return false
      } else if (subPage.value === 'kategori') {
        const k = String(r['Kategori'] ?? '').trim()
        if (!filters.searches.includes(k)) return false
      } else {
        const p = String(r['Provinsi'] ?? '').trim().toUpperCase()
        if (!filters.searches.includes(p)) return false
      }
    }

    // Periode filter (Shopee-style single select)
    if (selectedPeriod.value) {
      const d = new Date(r['Tgl Faktur'])
      if (!isNaN(d)) {
        const pLabel = selectedPeriod.value
        if (pLabel.startsWith('Hari Ini')) {
          if (d.toDateString() !== now.toDateString()) return false
        } else if (pLabel.startsWith('Kemarin')) {
          if (d.toDateString() !== yesterday.toDateString()) return false
        } else if (pLabel === '7 Hari Sebelumnya') {
          const d7 = new Date(now); d7.setDate(d7.getDate() - 7)
          if (d < d7 || d > now) return false
        } else if (pLabel === '30 Hari Sebelumnya') {
          const d30 = new Date(now); d30.setDate(d30.getDate() - 30)
          if (d < d30 || d > now) return false
        } else if (pLabel === 'custom') {
          if (filters.dateStart && d < new Date(filters.dateStart)) return false
          if (filters.dateEnd && d > new Date(filters.dateEnd + 'T23:59:59')) return false
        }
        // Per Hari / Per Minggu / Per Bulan / Berdasarkan Tahun — no date restriction, just grouping mode
      }
    }

    // Brand filter (multi)
    if (filters.brands.length) {
      const br = cleanBrand(r['Brand']||r['BRAND Barang'])
      if (!br || !filters.brands.includes(br)) return false
    }
    // Kategori filter (multi)
    if (filters.kategoris.length) {
      const kat = String(r['Kategori']).trim()
      if (!filters.kategoris.includes(kat)) return false
    }

    // Lokasi bertingkat (non-wilayah tab)
    if (subPage.value !== 'wilayah') {
      const prov = String(r['Provinsi']??'').trim().toUpperCase()
      const kab  = String(r['Kab/Kota']??'').trim().toUpperCase()
      const kec  = String(r['Kec']??'').trim().toUpperCase()
      if (filters.provinsis.length && !filters.provinsis.includes(prov)) return false
      if (filters.kabupatens.length && !filters.kabupatens.includes(kab)) return false
      if (filters.kecamatans.length && !filters.kecamatans.includes(kec)) return false
    }

    // Gudang (multi)
    if (filters.gudangs.length) {
      const g = String(r['Gudang']).trim()
      if (!filters.gudangs.includes(g)) return false
    }
    // Dept (multi)
    if (filters.depts.length) {
      const d = String(r['Dept.']).trim()
      if (!filters.depts.includes(d)) return false
    }
    // Cabang (multi)
    if (filters.cabangs.length) {
      const cb = mapCity(r['Nama Dept.'] || r['Nama Dept'] || r['Dept.'] || '')
      if (!filters.cabangs.includes(cb)) return false
    }
    // Platform (multi)
    if (filters.platforms.length) {
      const pC  = cleanPelanggan(r)
      const grp = getPlatformGroup(pC)
      if (!filters.platforms.includes(grp)) return false
    }
    // Pelanggan/Dealer filter (multi)
    if (filters.pelanggans.length) {
      const cln = cleanPelanggan(r)
      if (!filters.pelanggans.includes(cln)) return false
    }
    return true
  })
})

const summaryStats = computed(() => {
  const rows = filteredRows.value
  let totalRevenue = 0
  const sB = new Set(), sBrand = new Set(), sKat = new Set(), sProv = new Set()

  rows.forEach(r => {
    totalRevenue += Number(r['Total'] || r['Jumlah'] || 0)
    const ym = getYearMonth(r['Tgl Faktur']); if (ym) sB.add(ym)
    const b = cleanBrand(r['Brand'] || r['BRAND Barang']); if (b) sBrand.add(b)
    if (r['Kategori']) sKat.add(String(r['Kategori']).trim())
    if (r['Provinsi']) sProv.add(String(r['Provinsi']).trim().toUpperCase())
  })

  const jumlahBulan = sB.size || 3
  const avgRevenue  = Math.round(totalRevenue / jumlahBulan)

  // ★ Hitung nextTarget LANGSUNG dari store.soBerjalan + window3Keys
  // identik 100% dengan cara hitung di Target Brand page (watch brandRowsLocal)
  const brandBulanMap = {}
  store.soBerjalan.forEach(r => {
    const ym = getYearMonth(r['Tgl Faktur'])
    if (!ym || !window3Keys.value.has(ym)) return
    const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
    if (!b) return
    if (!brandBulanMap[b]) brandBulanMap[b] = { bulanSet: new Set(), total: 0 }
    brandBulanMap[b].bulanSet.add(ym)
    brandBulanMap[b].total += Number(r['Total'] || r['Jumlah'] || 0)
  })

  let nextTarget = 0
  Object.values(brandBulanMap).forEach(({ bulanSet, total }) => {
    const bulanAktif = bulanSet.size || 3
    nextTarget += Math.round((total / bulanAktif) * 1.15)
  })

  return {
    totalRevenue,
    jumlahBulan,
    avgRevenue,
    nextTarget,
    uniqueBrands:   sBrand.size,
    uniqueKategori: sKat.size,
    uniqueProvinsi: sProv.size
  }
})

// ── Data helpers ──────────────────────────────────────────────────────────────
function mkEntry() { return { perBulanMap:{}, dealerMap:{}, katMap:{}, brandMap:{}, skuMap:{}, totalQty:0 } }
function addRow(e, ym, bN, yr, jml, qty, dealer, kat, brand, skuNo, skuNm) {
  const mi = BULAN_NAMA.indexOf(bN)
  if (!e.perBulanMap[ym]) e.perBulanMap[ym]={ tahun:yr, bulan:bN, jumlah:0, qty:0, label:`${bN.slice(0,3)} ${String(yr).slice(2)}`, sortKey:parseInt(yr)*100+(mi+1) }
  e.perBulanMap[ym].jumlah += jml
  e.perBulanMap[ym].qty    += qty
  e.totalQty += qty
  const add = (map, key) => { if (!map[key]) map[key]={jumlah:0,qty:0}; map[key].jumlah+=jml; map[key].qty+=qty }
  if (dealer) add(e.dealerMap, dealer)
  if (kat)    add(e.katMap,    kat)
  if (brand)  add(e.brandMap,  brand)
  if (skuNo)  { if (!e.skuMap[skuNo]) e.skuMap[skuNo]={nama:skuNm,jumlah:0,qty:0}; e.skuMap[skuNo].jumlah+=jml; e.skuMap[skuNo].qty+=qty }
}
function finalize(e) {
  const pB   = Object.values(e.perBulanMap).sort((a,b)=>a.sortKey-b.sortKey)
  const total = pB.reduce((s,b)=>s+b.jumlah,0)
  const bAkt  = pB.filter(b=>b.jumlah>0).length
  const avgB  = bAkt ? Math.round(total/bAkt) : 0
  const maxB  = Math.max(...pB.map(b=>b.jumlah),1)
  const mkR   = (m) => Object.entries(m).sort((a,b)=>b[1].jumlah-a[1].jumlah).map(([nama,v])=>({nama,jumlah:v.jumlah,qty:v.qty,pct:total?(v.jumlah/total)*100:0}))
  return { perBulan:pB, total, bulanAktif:bAkt, avgBulanan:avgB, maxBulan:maxB, totalQty:e.totalQty,
    topDealer:mkR(e.dealerMap), topKategori:mkR(e.katMap), topBrand:mkR(e.brandMap),
    topSku: Object.entries(e.skuMap).sort((a,b)=>b[1].jumlah-a[1].jumlah).map(([kode,v])=>({kode,nama:v.nama,jumlah:v.jumlah,qty:v.qty,pct:total?(v.jumlah/total)*100:0}))
  }
}

// ── Brand stats ───────────────────────────────────────────────────────────────
const brandStats = computed(() => {
  if (!store.soBerjalan.length || !store.targetBulan) return []
  const map = {}
  for (const r of filteredRows.value) {
    const brand=cleanBrand(r['Brand']||r['BRAND Barang']); if (!brand) continue
    const ym=getYearMonth(r['Tgl Faktur']); if (!ym) continue
    const pts=ym.split('-'), mi=parseInt(pts[1])-1, bN=BULAN_NAMA[mi]||'UNKNOWN', yr=pts[0]
    const jml=Number(r['Total']||r['Jumlah']||0), qty=Number(r['Qty']||r['Kuantitas']||r['Jumlah Barang']||0)
    if (!map[brand]) map[brand]=mkEntry()
    addRow(map[brand],ym,bN,yr,jml,qty,cleanPelanggan(r),String(r['Kategori']??'').trim(),'',String((r['SKU']||r['No. Barang'])??'').trim(),String((r['Nama Item']||r['Nama Barang'])??'').trim())
  }
  return Object.entries(map).map(([name,e])=>({name,...finalize(e)})).sort((a,b)=>b.avgBulanan-a.avgBulanan)
})
const filteredBrands = computed(() => {
  const q = (filters.searches[0] || '').toUpperCase(); if (!q) return brandStats.value
  return brandStats.value.filter(b=>b.name.toUpperCase().includes(q))
})
const sortedBrands = computed(() => {
  const {col,dir}=listSort.brand
  return [...filteredBrands.value].sort((a,b)=>{
    const av=col==='nextTarget'?Math.round(a.avgBulanan*1.15):(a[col]??0)
    const bv=col==='nextTarget'?Math.round(b.avgBulanan*1.15):(b[col]??0)
    if(col==='name') return dir==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name)
    return dir==='asc'?av-bv:bv-av
  })
})

// ── Kategori stats ────────────────────────────────────────────────────────────
const kategoriStats = computed(() => {
  if (!store.soBerjalan.length || !store.targetBulan) return []
  const map = {}
  for (const r of filteredRows.value) {
    const kat=String(r['Kategori']??'').trim()||'(tanpa kategori)'
    const ym=getYearMonth(r['Tgl Faktur']); if (!ym) continue
    const pts=ym.split('-'), mi=parseInt(pts[1])-1, bN=BULAN_NAMA[mi]||'UNKNOWN', yr=pts[0]
    const jml=Number(r['Total']||r['Jumlah']||0), qty=Number(r['Qty']||r['Kuantitas']||r['Jumlah Barang']||0)
    if (!map[kat]) map[kat]=mkEntry()
    addRow(map[kat],ym,bN,yr,jml,qty,cleanPelanggan(r),'',cleanBrand(r['Brand']||r['BRAND Barang'])||'',String((r['SKU']||r['No. Barang'])??'').trim(),String((r['Nama Item']||r['Nama Barang'])??'').trim())
  }
  return Object.entries(map).map(([name,e])=>({name,...finalize(e)})).sort((a,b)=>b.avgBulanan-a.avgBulanan)
})
const filteredKategori = computed(() => {
  const q = (filters.searches[0] || '').toUpperCase(); if (!q) return kategoriStats.value
  return kategoriStats.value.filter(k=>k.name.toUpperCase().includes(q))
})
const sortedKategori = computed(() => {
  const {col,dir}=listSort.kat
  return [...filteredKategori.value].sort((a,b)=>{
    const av=col==='nextTarget'?Math.round(a.avgBulanan*1.15):(a[col]??0)
    const bv=col==='nextTarget'?Math.round(b.avgBulanan*1.15):(b[col]??0)
    if(col==='name') return dir==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name)
    return dir==='asc'?av-bv:bv-av
  })
})

// ── Wilayah stats ─────────────────────────────────────────────────────────────
const wilayahStats = computed(() => {
  if (!store.soBerjalan.length || !store.targetBulan) return []
  const mapG = {}
  for (const r of filteredRows.value) {
    const ym=getYearMonth(r['Tgl Faktur']); if (!ym) continue
    const prov=String(r['Provinsi']??'').trim().toUpperCase()||'(TANPA PROVINSI)'
    const kab=String(r['Kab/Kota']??'').trim().toUpperCase()||'(TANPA KABUPATEN)'
    const kec=String(r['Kec']??'').trim().toUpperCase()||'(TANPA KECAMATAN)'
    const pts=ym.split('-'), mi=parseInt(pts[1])-1, bN=BULAN_NAMA[mi]||'UNKNOWN', yr=pts[0]
    const jml=Number(r['Total']||r['Jumlah']||0), qty=Number(r['Qty']||r['Kuantitas']||r['Jumlah Barang']||0)
    const brand=cleanBrand(r['Brand']||r['BRAND Barang'])||''
    const dealer=cleanPelanggan(r)
    const katR=String(r['Kategori']??'').trim()
    const skuNo=String((r['SKU']||r['No. Barang'])??'').trim()
    const skuNm=String((r['Nama Item']||r['Nama Barang'])??'').trim()
    if (!mapG[prov]) mapG[prov]={...mkEntry(),kabMap:{}}
    addRow(mapG[prov],ym,bN,yr,jml,qty,dealer,katR,brand,skuNo,skuNm)
    if (!mapG[prov].kabMap[kab]) mapG[prov].kabMap[kab]={...mkEntry(),kecMap:{}}
    addRow(mapG[prov].kabMap[kab],ym,bN,yr,jml,qty,dealer,katR,brand,skuNo,skuNm)
    if (!mapG[prov].kabMap[kab].kecMap[kec]) mapG[prov].kabMap[kab].kecMap[kec]=mkEntry()
    addRow(mapG[prov].kabMap[kab].kecMap[kec],ym,bN,yr,jml,qty,dealer,katR,brand,skuNo,skuNm)
  }
  return Object.entries(mapG).map(([provName,provData])=>{
    const base=finalize(provData)
    const kabRows=Object.entries(provData.kabMap).map(([kabName,kabData])=>{
      const kabBase=finalize(kabData)
      const kecRows=Object.entries(kabData.kecMap).map(([kecName,kecData])=>({name:kecName,...finalize(kecData)})).sort((a,b)=>b.total-a.total)
      return {name:kabName,...kabBase,kecRows}
    }).sort((a,b)=>b.total-a.total)
    return {name:provName,...base,kabCount:kabRows.length,kabRows}
  }).sort((a,b)=>b.total-a.total)
})
const filteredWilayah = computed(() => {
  const q = (filters.searches[0] || '').toUpperCase(); if (!q) return wilayahStats.value
  return wilayahStats.value.filter(p=>p.name.includes(q)||p.kabRows.some(kb=>kb.name.includes(q)||kb.kecRows.some(kc=>kc.name.includes(q))))
})
const sortedWilayah = computed(() => {
  const {col,dir}=listSort.wil
  return [...filteredWilayah.value].sort((a,b)=>{
    const av=col==='nextTarget'?Math.round(a.avgBulanan*1.15):col==='kabCount'?a.kabRows.length:(a[col]??0)
    const bv=col==='nextTarget'?Math.round(b.avgBulanan*1.15):col==='kabCount'?b.kabRows.length:(b[col]??0)
    if(col==='name') return dir==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name)
    return dir==='asc'?av-bv:bv-av
  })
})

function barH(v, mx) { return mx ? Math.max(4, (v/mx)*100) : 4 }
function spark(pb) {
  if (!pb||!pb.length) return ''
  const mx=Math.max(...pb.map(b=>b.jumlah),1), w=100/Math.max(pb.length-1,1)
  return pb.map((b,i)=>`${i*w},${28-(b.jumlah/mx)*24-2}`).join(' ')
}
</script>

<style scoped>
/* ── PAGE ── */
.page { padding:24px; display:flex; flex-direction:column; gap:16px; background:#f8fafc; min-height:100vh; }
.page-title { font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.03em; }
.page-sub   { font-size:12px; color:#64748b; margin-top:2px; }

/* ── SCORECARDS ── */
.scorecard-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.card-mini { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:14px; box-shadow:0 1px 2px rgba(0,0,0,.03); }
.cm-label { font-size:9px; font-weight:800; color:#475569; letter-spacing:.06em; text-transform:uppercase; }
.cm-val   { font-size:18px; font-weight:800; margin:4px 0 2px; font-family:monospace; color:#2563eb; }
.cm-sub   { font-size:10px; color:#94a3b8; }

/* ── FILTER ── */
.filter-panel { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:14px; }
.filter-grid-layout { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.f-group { display:flex; flex-direction:column; gap:4px; }
.f-group label { font-size:10px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.03em; }
.f-input  { padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; color:#1e293b; background:#fff; outline:none; }
.f-input:focus { border-color:#2563eb; }
.f-select { padding:5px 8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:#fff; color:#1e293b; height:29px; outline:none; }
.f-select:disabled { background:#f1f5f9; color:#94a3b8; cursor:not-allowed; }

/* Date range */
.date-range-wrap { display:flex; flex-direction:column; gap:4px; }
.date-preset-row { display:flex; gap:4px; flex-wrap:wrap; }
.date-preset-btn {
  padding:3px 8px; border:1px solid #cbd5e1; border-radius:4px;
  background:#fff; font-size:10px; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s;
}
.date-preset-btn:hover { border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; }
.date-preset-btn.active { background:#2563eb; border-color:#2563eb; color:#fff; }
.date-inputs-row { display:flex; align-items:center; gap:6px; }
.date-input { flex:1; font-size:11px; padding:4px 6px; }
.date-sep { color:#94a3b8; font-size:12px; font-weight:600; }

/* MultiSelect */
:deep(.ms-wrap) { position:relative; width:100%; }
:deep(.ms-trigger) {
  display:flex; align-items:center; gap:4px; padding:5px 8px;
  border:1px solid #cbd5e1; border-radius:6px; background:#fff;
  font-size:12px; color:#1e293b; cursor:pointer; min-height:29px;
  box-sizing:border-box; transition:border-color .15s; user-select:none;
}
:deep(.ms-trigger:hover) { border-color:#93c5fd; }
:deep(.ms-trigger.open)  { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.15); }
:deep(.ms-label) { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
:deep(.ms-arrow) { font-size:10px; color:#94a3b8; }
:deep(.ms-count-badge) {
  background:#2563eb; color:#fff; font-size:10px; font-weight:700;
  border-radius:10px; padding:0 5px; min-width:18px; text-align:center;
  line-height:18px; cursor:pointer; flex-shrink:0;
}
:deep(.ms-count-badge:hover) { background:#1d4ed8; }
:deep(.ms-dropdown) {
  position:absolute; top:calc(100% + 4px); left:0; right:0;
  background:#fff; border:1px solid #2563eb; border-radius:8px;
  box-shadow:0 8px 20px rgba(0,0,0,.12); z-index:1000; overflow:hidden;
}
:deep(.ms-search-wrap) { padding:8px; border-bottom:1px solid #e2e8f0; }
:deep(.ms-search) {
  width:100%; padding:5px 8px; border:1px solid #cbd5e1;
  border-radius:5px; font-size:12px; color:#1e293b; box-sizing:border-box; outline:none;
}
:deep(.ms-search:focus) { border-color:#2563eb; }
:deep(.ms-options) { max-height:220px; overflow-y:auto; }
:deep(.ms-opt) {
  display:flex; align-items:center; gap:6px; padding:7px 10px;
  font-size:12px; cursor:pointer; transition:background .1s; color:#1e293b;
}
:deep(.ms-opt:hover) { background:#eff6ff; }
:deep(.ms-opt.selected) { background:#eff6ff; color:#1d4ed8; font-weight:600; }
:deep(.ms-check) { font-size:13px; width:16px; text-align:center; flex-shrink:0; }
:deep(.ms-opt-label) { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
:deep(.ms-more) { padding:6px 10px; font-size:11px; color:#94a3b8; text-align:center; font-style:italic; }
:deep(.ms-empty) { padding:12px; text-align:center; font-size:12px; color:#94a3b8; }
:deep(.ms-footer) { border-top:1px solid #e2e8f0; padding:6px 10px; }
:deep(.ms-clear-btn) { background:none; border:none; font-size:11px; color:#dc2626; cursor:pointer; font-weight:600; }
:deep(.ms-clear-btn:hover) { text-decoration:underline; }
:deep(.ms-overflow) { padding:6px 10px; font-size:11px; color:#94a3b8; text-align:center; font-style:italic; }
:deep(.ms-overflow-hint) { display:block; font-size:10px; color:#cbd5e1; margin-top:2px; }

/* ── Period Dropdown (Shopee-style) ── */
.period-dropdown-wrap { position:relative; }
.period-trigger {
  display:flex; align-items:center; gap:4px; padding:5px 8px;
  border:1px solid #cbd5e1; border-radius:6px; background:#fff;
  font-size:12px; color:#1e293b; cursor:pointer; min-height:29px;
  box-sizing:border-box; transition:border-color .15s; user-select:none;
}
.period-trigger:hover { border-color:#93c5fd; }
.period-trigger.open  { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.15); }
.period-dropdown {
  position:absolute; top:calc(100% + 4px); left:0; right:0;
  background:#fff; border:1px solid #2563eb; border-radius:8px;
  box-shadow:0 8px 20px rgba(0,0,0,.12); z-index:1000; overflow:hidden;
  min-width:300px;
}
.period-list { padding:6px 0; }
.period-item {
  display:flex; align-items:center; gap:10px;
  padding:9px 14px; cursor:pointer; transition:background .1s;
  font-size:12px; color:#1e293b;
}
.period-item:hover { background:#eff6ff; }
.period-item.selected { background:#eff6ff; color:#1d4ed8; font-weight:600; }
.period-dot {
  width:8px; height:8px; border-radius:50%; border:2px solid #cbd5e1;
  flex-shrink:0; transition:all .15s;
}
.period-dot.active { background:#2563eb; border-color:#2563eb; }
.period-name { font-weight:600; min-width:140px; }
.period-desc { font-size:11px; color:#64748b; }
.period-separator { height:1px; background:#e2e8f0; margin:4px 0; }
.period-custom { padding:10px 14px; border-top:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px; }
.period-custom-row { display:flex; align-items:center; gap:8px; }
.period-custom-row label { font-size:11px; font-weight:600; color:#64748b; width:45px; }
.period-custom-row .date-input { flex:1; padding:4px 8px; border:1px solid #cbd5e1; border-radius:5px; font-size:12px; color:#1e293b; }
.period-custom-row .date-input:focus { outline:none; border-color:#2563eb; }
.period-footer {
  border-top:1px solid #e2e8f0; padding:8px 14px;
  display:flex; justify-content:space-between; align-items:center;
}
.period-clear-btn { background:none; border:none; font-size:11px; color:#dc2626; cursor:pointer; font-weight:600; }
.period-apply-btn { background:#2563eb; border:none; color:#fff; font-size:11px; font-weight:700; padding:4px 16px; border-radius:5px; cursor:pointer; }
.period-apply-btn:hover { background:#1d4ed8; }

/* Filter footer */
.filter-footer-actions { display:flex; align-items:center; justify-content:space-between; border-top:1px dashed #e2e8f0; padding-top:10px; flex-wrap:wrap; gap:8px; }
.active-filters-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1; }
.btn-clear { background:#fff; border:1px solid #cbd5e1; color:#475569; padding:5px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; }
.btn-clear:hover { background:#f1f5f9; }
.active-filter-chips { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.chip {
  display:inline-flex; align-items:center; gap:3px;
  background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px;
  padding:2px 8px; font-size:10px; font-weight:600; color:#1d4ed8;
  cursor:pointer; transition:all .15s;
}
.chip:hover { background:#dbeafe; border-color:#2563eb; }
.chip-x { color:#94a3b8; font-size:11px; }
.chip-all { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }
.chip-all:hover { background:#fecaca; border-color:#dc2626; }
.meta-count { font-size:12px; color:#64748b; white-space:nowrap; }
.meta-count strong { color:#2563eb; font-weight:700; }

/* ── SUBTABS ── */
.subtab-bar { display:flex; gap:6px; }
.subtab { padding:6px 20px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; }
.subtab.active { background:#2563eb; border-color:#2563eb; color:#fff; }

.empty { text-align:center; padding:50px; color:#94a3b8; font-size:13px; background:#fff; border:1px dashed #e2e8f0; border-radius:12px; }

/* ── LIST SECTION wrapper ── */
.list-section { border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.05); }

/* ── LIST HEADERS (blue gradient, sortable) ── */
.list-header {
  display: grid;
  grid-template-columns: 2.5rem 1fr auto 110px 1.5rem;
  align-items: center;
  padding: 0;
  user-select: none;
}
/* LV1: darkest blue */
.lv1-header { background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); }
/* LV2: medium blue */
.lv2-header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); }
/* LV3: lighter blue */
.lv3-header { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); }

.lh-rank  { padding:10px 0 10px 16px; font-size:10px; font-weight:800; letter-spacing:.07em; cursor:pointer; }
.lh-name  { padding:10px 8px; font-size:10px; font-weight:800; letter-spacing:.07em; cursor:pointer; }
.lh-chev  { padding:10px 12px 10px 0; width:1.5rem; }
.lh-spark { padding:10px 12px; font-size:10px; font-weight:800; letter-spacing:.05em; width:110px; text-align:center; }

/* column text color by level */
.lv1-header .lh-rank, .lv1-header .lh-name, .lv1-header .lh-spark, .lv1-header .lh-chev { color:rgba(255,255,255,.9); }
.lv2-header .lh-rank, .lv2-header .lh-name, .lv2-header .lh-spark, .lv2-header .lh-chev { color:rgba(255,255,255,.9); }
.lv3-header .lh-rank, .lv3-header .lh-name, .lv3-header .lh-spark, .lv3-header .lh-chev { color:#1e3a8a; }

.lh-metrics { display:flex; }
.lh-metrics span {
  display: flex; align-items: center; justify-content: flex-end; gap:4px;
  padding: 10px 14px; font-size:10px; font-weight:800; letter-spacing:.05em;
  cursor:pointer; white-space:nowrap; min-width:90px;
  transition: background .15s;
}
.lv1-header .lh-metrics span { color:rgba(255,255,255,.85); }
.lv1-header .lh-metrics span:hover { background:rgba(255,255,255,.1); color:#fff; }
.lv2-header .lh-metrics span { color:rgba(255,255,255,.85); }
.lv2-header .lh-metrics span:hover { background:rgba(255,255,255,.1); color:#fff; }
.lv3-header .lh-metrics span { color:#1e3a8a; }
.lv3-header .lh-metrics span:hover { background:rgba(30,58,138,.08); }

.lh-metrics-lv2 { gap:0; }
.lh-metrics-lv3 { gap:0; }

.si { font-style:normal; font-size:9px; opacity:.7; }

/* ── CARDS ── */
.brand-list { display:flex; flex-direction:column; }
.item-card { background:#fff; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0; border-bottom:1px solid #f1f5f9; }
.item-card:last-child { border-bottom:1px solid #e2e8f0; border-radius:0 0 12px 12px; }

/* LV2 card: slightly tinted */
.lv2-card { background:#fafcff; border-left:1px solid #dbeafe; border-right:1px solid #dbeafe; border-bottom:1px solid #eff6ff; }
.lv2-card:last-child { border-bottom:1px solid #dbeafe; border-radius:0 0 8px 8px; }

/* LV3 card: lightest tint */
.lv3-card { background:#f0f7ff; border-left:1px solid #bfdbfe; border-right:1px solid #bfdbfe; border-bottom:1px solid #dbeafe; }
.lv3-card:last-child { border-bottom:1px solid #bfdbfe; border-radius:0 0 6px 6px; }

.item-row {
  display: grid;
  grid-template-columns: 2.5rem 1fr auto 110px 1.5rem;
  align-items: center;
  gap: 0;
  padding: 12px 16px;
  cursor: pointer;
}
.item-row:hover { background:rgba(37,99,235,.03); }
.lv2-row { padding:10px 16px; }
.lv3-row { padding:8px 16px; }

.rank { font-size:11px; color:#cbd5e1; font-weight:700; }
.item-name-col { padding-right:12px; }
.item-name  { font-weight:700; color:#0f172a; font-size:14px; }
.lv2-name   { font-size:13px; color:#1e40af; font-weight:600; }
.lv3-name   { font-size:12px; color:#3b82f6; font-weight:600; }

.item-metrics { display:flex; gap:0; }
.metric { display:flex; flex-direction:column; align-items:flex-end; padding:0 14px; }
.metric-label { font-size:8px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
.metric-val   { font-size:12px; font-weight:600; color:#0f172a; font-family:monospace; white-space:nowrap; }
.metric-val.blue-val  { color:#2563eb; font-weight:700; }
.metric-val.accent    { color:#2563eb; font-weight:700; }

.sparkline-wrap { width:110px; height:24px; }
.chev { color:#94a3b8; font-size:12px; transition:transform .2s; text-align:center; }
.chev.open { transform:rotate(180deg); color:#2563eb; }

/* ── DETAIL PANEL ── */
.item-detail { border-top:2px solid #eff6ff; padding:16px; display:flex; flex-direction:column; gap:12px; background:#f8fafc; }
.lv2-detail  { background:#f0f7ff; border-top:2px solid #dbeafe; }
.lv3-detail  { background:#e8f2ff; border-top:2px solid #bfdbfe; }

.chart-section { background:#fff; border:1px solid #e2e8f0; padding:14px; border-radius:8px; }
.section-label { font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:.05em; margin-bottom:10px; }
.timeseries-chart { display:flex; gap:12px; align-items:flex-end; height:120px; padding-bottom:4px; }
.ts-col { display:flex; flex-direction:column; align-items:center; flex:1; height:100%; }
.ts-label-top { font-size:9px; color:#64748b; margin-bottom:2px; white-space:nowrap; font-weight:700; font-family:monospace; }
.ts-track { flex:1; width:60%; background:#f1f5f9; border-radius:3px 3px 0 0; display:flex; align-items:flex-end; overflow:hidden; }
.ts-fill  { width:100%; border-radius:3px 3px 0 0; opacity:.85; transition:height .2s; }
.lv1-fill { background:#1d4ed8; }
.lv2-fill { background:#3b82f6; }
.lv3-fill { background:#93c5fd; }
.ts-label-bot { font-size:9px; color:#94a3b8; margin-top:4px; font-weight:600; }

.hint-box  { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 12px; font-size:11px; color:#334155; }
.lv2-hint  { background:#dbeafe; border-color:#93c5fd; }
.lv3-hint  { background:#e0eeff; border-color:#bfdbfe; }
.blue-val  { color:#2563eb; font-weight:700; }

/* ── DISPLAY FILTER TABS ── */
.display-filter-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; }
.lv2-filter-bar { background:#f0f7ff; border-color:#dbeafe; }
.lv3-filter-bar { background:#e8f2ff; border-color:#bfdbfe; }
.df-label { font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
.df-tab { padding:4px 14px; border-radius:6px; border:1px solid #cbd5e1; background:#fff; font-size:11px; font-weight:700; color:#475569; cursor:pointer; transition:all .15s; }
.df-tab:hover { border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; }
.df-tab.active { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
.df-tab-lv2.active { background:#2563eb; border-color:#2563eb; }
.df-tab-lv3.active { background:#3b82f6; border-color:#3b82f6; }

/* ── DETAIL TABLE ── */
.detail-table-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
.lv2-table { border-color:#dbeafe; }
.lv3-table { border-color:#bfdbfe; }

:deep(.dt-wrap)   { display:flex; flex-direction:column; }
:deep(.dt-scroll) { overflow-x:auto; width:100%; }
:deep(.dt-table)  { width:100%; border-collapse:collapse; table-layout:auto; }

:deep(.dt-head-lv1 th) { background:linear-gradient(135deg,#1d4ed8,#2563eb) !important; color:rgba(255,255,255,0.92) !important; }
:deep(.dt-head-lv2 th) { background:linear-gradient(135deg,#2563eb,#3b82f6) !important; color:rgba(255,255,255,0.92) !important; }
:deep(.dt-head-lv3 th) { background:linear-gradient(135deg,#60a5fa,#93c5fd) !important; color:#1e3a8a !important; }

:deep(.dt-th) { padding:8px 10px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; white-space:nowrap; text-align:left; }
:deep(.dt-th-rank) { width:36px; text-align:center; padding:8px 6px; }
:deep(.dt-th-sku)  { width:120px; }
:deep(.dt-th-name) { min-width:180px; }
:deep(.dt-th-num)  { text-align:right; min-width:90px; }

:deep(.dt-sortable) { cursor:pointer; display:inline-flex; align-items:center; gap:3px; }
:deep(.dt-sortable:hover) { opacity:.75; }

:deep(.dt-row) { border-bottom:1px solid #f1f5f9; transition:background .1s; }
:deep(.dt-row-alt) { background:#fafcff; }
:deep(.dt-row:hover) { background:#eff6ff !important; }
:deep(.dt-row:last-child) { border-bottom:none; }

:deep(.dt-td) { padding:7px 10px; font-size:11px; vertical-align:middle; }
:deep(.dt-td-rank) { text-align:center; font-size:10px; color:#cbd5e1; font-weight:700; padding:7px 6px; width:36px; }
:deep(.dt-td-sku)  { padding:7px 8px; width:120px; }
:deep(.dt-td-name) { max-width:0; overflow:hidden; }
:deep(.dt-td-num)  { text-align:right; white-space:nowrap; }

:deep(.dt-name-wrap) { display:flex; flex-direction:column; gap:2px; min-width:0; }
:deep(.dt-name) { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#334155; font-weight:500; font-size:11px; }
:deep(.dt-bar-wrap) { height:2px; background:#f1f5f9; border-radius:2px; overflow:hidden; }
:deep(.dt-bar) { height:100%; background:#3b82f6; opacity:.5; border-radius:2px; }

:deep(.dt-rupiah) { font-family:monospace; font-size:11px; font-weight:700; color:#0f172a; white-space:nowrap; }
:deep(.dt-pct)    { font-size:11px; color:#64748b; font-weight:600; }
:deep(.dt-qty)    { font-family:monospace; font-size:11px; color:#2563eb; font-weight:700; }

:deep(.sku-code) {
  font-family:monospace; color:#2563eb; font-size:9px;
  background:#eff6ff; padding:2px 5px; border-radius:3px;
  font-weight:700; border:1px solid #bfdbfe;
  display:inline-block; max-width:110px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle;
}

/* ── TABLE PLACEHOLDER ── */
.table-placeholder { text-align:center; padding:20px; font-size:12px; color:#94a3b8; background:#fff; border:1px dashed #e2e8f0; border-radius:8px; }
.lv2-placeholder { background:#f0f7ff; border-color:#bfdbfe; }
.lv3-placeholder { background:#e8f2ff; border-color:#93c5fd; }

/* ── NESTED SECTION ── */
.nested-section { border-radius:8px; overflow:hidden; border:1px solid #dbeafe; margin-top:4px; }
.lv3-section    { border-color:#bfdbfe; border-radius:6px; margin-top:4px; }

/* ── RESPONSIVE ── */
@media(max-width:1024px) {
  .scorecard-grid { grid-template-columns:repeat(2,1fr); }
  .filter-grid-layout { grid-template-columns:repeat(2,1fr); }
}
@media(max-width:768px) {
  .item-row { grid-template-columns:2rem 1fr 1.5rem; }
  .item-metrics, .sparkline-wrap { display:none; }
  .list-header { display:none; }
  .scorecard-grid { grid-template-columns:1fr; }
  .filter-grid-layout { grid-template-columns:1fr; }
}
</style>