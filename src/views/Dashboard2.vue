<template>
  <div class="page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard by Dealer</h1>
        <p class="page-sub">Target {{ store.targetBulanLabel }} · Kontrol urutan dengan mengeklik judul kolom</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn-viz" :class="{active: showViz}" @click="showViz = !showViz">
          <span class="btn-icon">📊</span> Visualisasi
        </button>
        <button class="btn-primary" @click="exportExcel">⬇ Export</button>
      </div>
    </div>

    <div class="scorecard-row" v-if="dealerData.length">
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
        <div class="sc-val bold" :style="{color:achColor(totalAch)}">{{ totalAch.toFixed(2) }}%</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">Dealer Aktif</div>
        <div class="sc-val">{{ dealerData.length }}</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">≥ Target</div>
        <div class="sc-val" style="color:#16a34a">{{ dealerData.filter(d=>d.achievement>=100).length }}</div>
      </div>
      <div class="scorecard">
        <div class="sc-label">&lt; Target</div>
        <div class="sc-val" style="color:#dc2626">{{ dealerData.filter(d=>d.achievement<100).length }}</div>
      </div>
    </div>

    <transition name="viz-slide">
      <div v-if="showViz" class="viz-panel">

        <div class="viz-toolbar">
          <div class="viz-tabs">
            <button class="viz-tab" :class="{active: activeChart==='bar'}"      @click="activeChart='bar'">📊 Bar Ach</button>
            <button class="viz-tab" :class="{active: activeChart==='bubble'}"   @click="activeChart='bubble'">🔵 Bubble</button>
            <button class="viz-tab" :class="{active: activeChart==='scatter'}"  @click="activeChart='scatter'">🎯 Kuadran</button>
            <button class="viz-tab" :class="{active: activeChart==='treemap'}"  @click="activeChart='treemap'">🗂️ Treemap</button>
            <button class="viz-tab" :class="{active: activeChart==='waterfall'}" @click="activeChart='waterfall'">📉 Waterfall</button>
            <button class="viz-tab" :class="{active: activeChart==='pie'}"      @click="activeChart='pie'">🥧 Pie</button>
            <button class="viz-tab" :class="{active: activeChart==='pareto'}"   @click="activeChart='pareto'">📈 Pareto</button>
          </div>
          <div class="viz-controls">
            <span class="viz-ctrl-label">Top:</span>
            <select v-model="vizLimit" class="viz-select">
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="9999">Semua</option>
            </select>
            <select v-model="vizOrder" class="viz-select">
              <option value="desc">Realisasi ↓</option>
              <option value="asc">Realisasi ↑</option>
              <option value="ach-desc">Ach ↓</option>
              <option value="ach-asc">Ach ↑</option>
              <option value="target-desc">Target ↓</option>
            </select>
          </div>
        </div>

        <div class="viz-chart-area">
          <div v-if="activeChart==='bar'" class="chart-wrap">
            <div class="chart-title">Achievement per Dealer <span class="chart-sub">— garis merah = 100% target</span></div>
            <div class="bar-chart-container">
              <div class="bar-chart-grid">
                <div v-for="pct in [0,25,50,75,100,125]" :key="pct"
                  class="grid-line" :style="{left: Math.min(pct,125)/125*100+'%'}">
                  <span class="grid-label">{{ pct }}%</span>
                </div>
                <div class="target-line" style="left:80%"></div>
              </div>
              <div class="bar-chart-rows">
                <div v-for="item in vizData" :key="item.dealer" class="bar-row">
                  <div class="bar-label-col">
                    <span class="bar-label-text" :title="item.dealer">{{ item.dealer }}</span>
                  </div>
                  <div class="bar-col">
                    <div class="bar-bg">
                      <div class="bar-inner"
                        :style="{width: Math.min(item.achievement,125)/125*100+'%', background: achColor(item.achievement)}">
                      </div>
                      <span class="bar-val-inside" v-if="item.achievement > 15">{{ item.achievement.toFixed(1) }}%</span>
                    </div>
                    <span class="bar-val-outside" v-if="item.achievement <= 15" :style="{color:achColor(item.achievement)}">{{ item.achievement.toFixed(1) }}%</span>
                  </div>
                  <div class="bar-meta-col">
                    <span class="bar-meta">{{ fmtShort(item.realize) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeChart==='bubble'" class="chart-wrap">
            <div class="chart-title">Bubble Chart — Target vs Realisasi <span class="chart-sub">— ukuran = jumlah brand · di atas garis diagonal = capai target</span></div>
            <div class="bubble-container">
              <svg :viewBox="`0 0 ${bubbleW} ${bubbleH}`" width="100%" class="bubble-svg" overflow="visible">
                <defs>
                  <marker id="bArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M2 1L8 5L2 9" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>
                  </marker>
                </defs>
                <g :transform="`translate(${bubbleMargin.l},${bubbleMargin.t})`">
                  <line v-for="g in bubbleGridY" :key="'gy'+g" x1="0" :y1="bubbleScaleY(g)" :x2="bubbleInnerW" :y2="bubbleScaleY(g)" stroke="#f1f5f9" stroke-width="1"/>
                  <line v-for="g in bubbleGridX" :key="'gx'+g" :x1="bubbleScaleX(g)" y1="0" :x2="bubbleScaleX(g)" :y2="bubbleInnerH" stroke="#f1f5f9" stroke-width="1"/>
                  <line :x1="bubbleScaleX(0)" :y1="bubbleScaleY(0)" :x2="bubbleScaleX(bubbleMaxVal)" :y2="bubbleScaleY(bubbleMaxVal)" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>
                  <text :x="bubbleScaleX(bubbleMaxVal)-4" :y="bubbleScaleY(bubbleMaxVal)-6" font-size="10" fill="#94a3b8" text-anchor="end">target = realisasi</text>
                  <text v-for="g in bubbleGridX" :key="'xl'+g" :x="bubbleScaleX(g)" :y="bubbleInnerH+16" text-anchor="middle" font-size="10" fill="#94a3b8">{{ fmtShort(g) }}</text>
                  <text v-for="g in bubbleGridY" :key="'yl'+g" x="-8" :y="bubbleScaleY(g)+4" text-anchor="end" font-size="10" fill="#94a3b8">{{ fmtShort(g) }}</text>
                  <text :x="bubbleInnerW/2" :y="bubbleInnerH+32" text-anchor="middle" font-size="11" fill="#64748b" font-weight="600">Target</text>
                  <text x="-32" :y="bubbleInnerH/2" text-anchor="middle" font-size="11" fill="#64748b" font-weight="600" :transform="`rotate(-90,-32,${bubbleInnerH/2})`">Realisasi</text>
                  <g v-for="item in vizData" :key="item.dealer" style="cursor:pointer" @mouseenter="bubbleHover=item.dealer" @mouseleave="bubbleHover=null">
                    <circle :cx="bubbleScaleX(item.target)" :cy="bubbleScaleY(item.realize)" :r="bubbleR(item.itemCount)" :fill="achColor(item.achievement)" :opacity="bubbleHover && bubbleHover !== item.dealer ? 0.25 : 0.75" stroke="white" stroke-width="1.5"/>
                    <text :x="bubbleScaleX(item.target)" :y="bubbleScaleY(item.realize) - bubbleR(item.itemCount) - 4" text-anchor="middle" font-size="9" fill="#334155" font-weight="600" :opacity="bubbleHover === item.dealer || vizData.length <= 10 ? 1 : 0">
                      {{ item.dealer.length > 14 ? item.dealer.slice(0,14)+'…' : item.dealer }}
                    </text>
                  </g>
                </g>
              </svg>
              <div class="bubble-legend">
                <div class="bubble-legend-item" v-for="item in vizData.slice(0,15)" :key="item.dealer" @mouseenter="bubbleHover=item.dealer" @mouseleave="bubbleHover=null" :style="{opacity: bubbleHover && bubbleHover!==item.dealer ? 0.35 : 1}">
                  <div class="bubble-dot" :style="{background:achColor(item.achievement)}"></div>
                  <div>
                    <div class="bubble-name">{{ item.dealer }}</div>
                    <div class="bubble-stat">T: {{ fmtShort(item.target) }} · R: {{ fmtShort(item.realize) }} · <strong :style="{color:achColor(item.achievement)}">{{ item.achievement.toFixed(1) }}%</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeChart==='scatter'" class="chart-wrap">
            <div class="chart-title">Matriks Prioritas Dealer <span class="chart-sub">— X = kontribusi realisasi · Y = achievement %</span></div>
            <div class="scatter-container">
              <svg :viewBox="`0 0 ${scatterW} ${scatterH}`" width="100%" class="scatter-svg" overflow="visible">
                <g :transform="`translate(${scatterMargin.l},${scatterMargin.t})`">
                  <rect x="0" :y="0" :width="scatterInnerW/2" :height="scatterInnerH/2" fill="#dcfce7" opacity="0.35"/>
                  <rect :x="scatterInnerW/2" :y="0" :width="scatterInnerW/2" :height="scatterInnerH/2" fill="#fef9c3" opacity="0.35"/>
                  <rect x="0" :y="scatterInnerH/2" :width="scatterInnerW/2" :height="scatterInnerH/2" fill="#fee2e2" opacity="0.35"/>
                  <rect :x="scatterInnerW/2" :y="scatterInnerH/2" :width="scatterInnerW/2" :height="scatterInnerH/2" fill="#eff6ff" opacity="0.35"/>
                  <text x="8" y="18" font-size="11" font-weight="800" fill="#16a34a" opacity="0.7">⭐ STAR</text>
                  <text x="8" y="30" font-size="9" fill="#16a34a" opacity="0.6">Kontribusi besar · Capai</text>
                  <text :x="scatterInnerW/2+8" y="18" font-size="11" font-weight="800" fill="#d97706" opacity="0.7">⚡ QUICK WIN</text>
                  <text :x="scatterInnerW/2+8" y="30" font-size="9" fill="#d97706" opacity="0.6">Kontribusi kecil · Capai</text>
                  <text x="8" :y="scatterInnerH/2+18" font-size="11" font-weight="800" fill="#dc2626" opacity="0.7">🚨 PRIORITAS</text>
                  <text x="8" :y="scatterInnerH/2+30" font-size="9" fill="#dc2626" opacity="0.6">Kontribusi besar · Kurang</text>
                  <text :x="scatterInnerW/2+8" :y="scatterInnerH/2+18" font-size="11" font-weight="800" fill="#2563eb" opacity="0.7">💤 LOW PRIO</text>
                  <text :x="scatterInnerW/2+8" :y="scatterInnerH/2+30" font-size="9" fill="#2563eb" opacity="0.6">Kontribusi kecil · Kurang</text>
                  <line :x1="scatterInnerW/2" y1="0" :x2="scatterInnerW/2" :y2="scatterInnerH" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3"/>
                  <line x1="0" :y1="scatterInnerH/2" :x2="scatterInnerW" :y2="scatterInnerH/2" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3"/>
                  <text v-for="g in [0,25,50,75,100]" :key="'sy'+g" x="-8" :y="scatterScaleY(g)+4" text-anchor="end" font-size="10" fill="#94a3b8">{{ g }}%</text>
                  <g v-for="item in scatterData" :key="item.dealer" style="cursor:pointer" @mouseenter="scatterHover=item.dealer" @mouseleave="scatterHover=null">
                    <circle :cx="scatterScaleX(item.pctContrib)" :cy="scatterScaleY(item.achievement)" r="7" :fill="achColor(item.achievement)" :opacity="scatterHover && scatterHover!==item.dealer ? 0.2 : 0.85" stroke="white" stroke-width="1.5"/>
                    <text :x="scatterScaleX(item.pctContrib)" :y="scatterScaleY(item.achievement)-10" text-anchor="middle" font-size="9" fill="#1e293b" :opacity="scatterHover===item.dealer || vizData.length<=8 ? 1 : 0">
                      {{ item.dealer.length>14 ? item.dealer.slice(0,14)+'…' : item.dealer }}
                    </text>
                  </g>
                  <text :x="scatterInnerW/2" :y="scatterInnerH+28" text-anchor="middle" font-size="11" fill="#64748b" font-weight="600">% Kontribusi Realisasi</text>
                  <text x="-36" :y="scatterInnerH/2" text-anchor="middle" font-size="11" fill="#64748b" font-weight="600" :transform="`rotate(-90,-36,${scatterInnerH/2})`">Achievement %</text>
                </g>
              </svg>
              <div class="scatter-lists">
                <div v-for="q in quadrantSummary" :key="q.label" class="quadrant-card" :style="{borderColor: q.color}">
                  <div class="quadrant-title" :style="{color: q.color}">{{ q.icon }} {{ q.label }}</div>
                  <div class="quadrant-count">{{ q.items.length }} dealer</div>
                  <div class="quadrant-names">
                    <span v-for="d in q.items.slice(0,5)" :key="d.dealer" class="quadrant-chip" :style="{background:q.bg, color:q.color}">{{ d.dealer }}</span>
                    <span v-if="q.items.length > 5" class="quadrant-more">+{{ q.items.length-5 }} lagi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeChart==='treemap'" class="chart-wrap">
            <div class="chart-title">Treemap Kontribusi Dealer <span class="chart-sub">— ukuran = realisasi · warna = achievement</span></div>
            <div class="treemap-container">
              <svg :viewBox="`0 0 ${treemapW} ${treemapH}`" width="100%" class="treemap-svg">
                <g v-for="node in treemapNodes" :key="node.dealer" style="cursor:pointer" @mouseenter="treemapHover=node.dealer" @mouseleave="treemapHover=null">
                  <rect :x="node.x+1" :y="node.y+1" :width="Math.max(node.w-2,0)" :height="Math.max(node.h-2,0)" :fill="achColor(node.achievement)" :opacity="treemapHover && treemapHover!==node.dealer ? 0.45 : 0.82" rx="4"/>
                  <text v-if="node.w > 50 && node.h > 24" :x="node.x + node.w/2" :y="node.y + node.h/2 - (node.h>40?8:0)" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="white">
                    {{ node.dealer.length > node.w/7 ? node.dealer.slice(0,Math.floor(node.w/7))+'…' : node.dealer }}
                  </text>
                  <text v-if="node.w > 50 && node.h > 40" :x="node.x + node.w/2" :y="node.y + node.h/2 + 10" text-anchor="middle" dominant-baseline="central" font-size="9" fill="rgba(255,255,255,0.85)">
                    {{ node.achievement.toFixed(1) }}%
                  </text>
                </g>
              </svg>
              <div class="treemap-legend">
                <div class="tl-item"><div class="tl-dot" style="background:#16a34a"></div><span>≥100% Capai</span></div>
                <div class="tl-item"><div class="tl-dot" style="background:#d97706"></div><span>≥80% Hampir</span></div>
                <div class="tl-item"><div class="tl-dot" style="background:#dc2626"></div><span>&lt;80% Kurang</span></div>
              </div>
            </div>
          </div>

          <div v-if="activeChart==='waterfall'" class="chart-wrap">
            <div class="chart-title">Waterfall Gap Analysis <span class="chart-sub">— hijau = surplus · merah = gap dari target</span></div>
            <div class="waterfall-container">
              <svg :viewBox="`0 0 ${waterfallW} ${waterfallH}`" width="100%" class="waterfall-svg" overflow="visible">
                <g :transform="`translate(${waterfallMargin.l},${waterfallMargin.t})`">
                  <line x1="0" :y1="wfScaleY(0)" :x2="wfInnerW" :y2="wfScaleY(0)" stroke="#94a3b8" stroke-width="1"/>
                  <line v-for="g in wfGridLines" :key="g" x1="0" :y1="wfScaleY(g)" :x2="wfInnerW" :y2="wfScaleY(g)" stroke="#f1f5f9" stroke-width="1"/>
                  <text v-for="g in wfGridLines" :key="'wl'+g" x="-8" :y="wfScaleY(g)+4" text-anchor="end" font-size="10" fill="#94a3b8">{{ fmtShort(g) }}</text>
                  <g v-for="(item, i) in waterfallData" :key="item.dealer">
                    <rect :x="wfBarX(i)" :y="Math.min(wfScaleY(item.gap), wfScaleY(0))" :width="wfBarW" :height="Math.abs(wfScaleY(item.gap) - wfScaleY(0))" :fill="item.gap >= 0 ? '#16a34a' : '#dc2626'" opacity="0.8" rx="3"/>
                    <text :x="wfBarX(i) + wfBarW/2" :y="item.gap >= 0 ? wfScaleY(item.gap)-5 : wfScaleY(item.gap)+14" text-anchor="middle" font-size="9" font-weight="700" :fill="item.gap >= 0 ? '#16a34a' : '#dc2626'">{{ fmtShort(Math.abs(item.gap)) }}</text>
                    <text :x="wfBarX(i) + wfBarW/2" :y="wfInnerH+16" text-anchor="middle" font-size="9" fill="#64748b" :transform="`rotate(-40, ${wfBarX(i)+wfBarW/2}, ${wfInnerH+16})`">
                      {{ item.dealer.length>12 ? item.dealer.slice(0,12)+'…' : item.dealer }}
                    </text>
                  </g>
                  <rect :x="wfBarX(waterfallData.length)" :y="wfTotalGap >= 0 ? wfScaleY(wfTotalGap) : wfScaleY(0)" :width="wfBarW" :height="Math.abs(wfScaleY(wfTotalGap) - wfScaleY(0))" fill="#2563eb" opacity="0.85" rx="3"/>
                  <text :x="wfBarX(waterfallData.length) + wfBarW/2" :y="wfTotalGap >= 0 ? wfScaleY(wfTotalGap)-5 : wfScaleY(wfTotalGap)+14" text-anchor="middle" font-size="9" font-weight="800" fill="#2563eb">{{ fmtShort(Math.abs(wfTotalGap)) }}</text>
                  <text :x="wfBarX(waterfallData.length) + wfBarW/2" :y="wfInnerH+16" text-anchor="middle" font-size="9" fill="#2563eb" font-weight="700">TOTAL</text>
                </g>
              </svg>
            </div>
          </div>

          <div v-if="activeChart==='pie'" class="chart-wrap">
            <div class="chart-title">Kontribusi Realisasi per Dealer</div>
            <div class="pie-container">
              <svg :viewBox="`0 0 ${pieSize} ${pieSize}`" :width="pieSize" :height="pieSize" class="pie-svg">
                <g :transform="`translate(${pieSize/2},${pieSize/2})`">
                  <path v-for="(slice, i) in pieSlices" :key="i" :d="slice.d" :fill="slice.color" :opacity="hoveredPie===i ? 1 : 0.85" stroke="white" stroke-width="2" @mouseenter="hoveredPie=i" @mouseleave="hoveredPie=null" style="cursor:pointer;transition:opacity 0.2s"/>
                  <circle cx="0" cy="0" :r="pieR*0.55" fill="white"/>
                  <text x="0" y="-10" text-anchor="middle" font-size="13" font-weight="800" fill="#0f172a">{{ filtered.length }} dealer</text>
                  <text x="0" y="10" text-anchor="middle" font-size="10" fill="#64748b">ditampilkan</text>
                </g>
              </svg>
              <div class="pie-legend">
                <div v-for="(slice, i) in pieSlices" :key="i" class="legend-row" @mouseenter="hoveredPie=i" @mouseleave="hoveredPie=null" :style="{opacity: hoveredPie===null||hoveredPie===i ? 1 : 0.4, cursor:'pointer'}">
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
            <div class="chart-title">Analisis Pareto Realisasi Dealer</div>
            <div class="pareto-container">
              <svg :viewBox="`0 0 ${paretoW} ${paretoH}`" width="100%" class="pareto-svg" overflow="visible">
                <g :transform="`translate(${paretoMargin.l},${paretoMargin.t})`">
                  <line v-for="g in [0,25,50,75,100]" :key="g" x1="0" :y1="paretoInnerH*(1-g/100)" :x2="paretoInnerW" :y2="paretoInnerH*(1-g/100)" stroke="#f1f5f9" stroke-width="1"/>
                  <text v-for="g in [0,25,50,75,100]" :key="'gl'+g" x="-8" :y="paretoInnerH*(1-g/100)+4" text-anchor="end" font-size="10" fill="#94a3b8">{{ g }}%</text>
                  <rect v-for="(item, i) in paretoData" :key="i" :x="paretoBarX(i)" :y="paretoBarY(item.realize)" :width="paretoBarW" :height="paretoInnerH - paretoBarY(item.realize)" :fill="achColor(item.achievement)" opacity="0.85" rx="2"/>
                  <polyline :points="paretoLinePoints" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
                  <circle v-for="(item, i) in paretoData" :key="'c'+i" :cx="paretoBarX(i)+paretoBarW/2" :cy="paretoLineY(item.cumPct)" r="3" fill="#2563eb"/>
                  <text v-for="(item, i) in paretoData" :key="'xl'+i" :x="paretoBarX(i)+paretoBarW/2" :y="paretoInnerH+14" text-anchor="middle" font-size="9" fill="#64748b" :transform="`rotate(-35, ${paretoBarX(i)+paretoBarW/2}, ${paretoInnerH+14})`">
                    {{ item.dealer.length>12 ? item.dealer.slice(0,12)+'…' : item.dealer }}
                  </text>
                  <text v-for="g in [0,25,50,75,100]" :key="'ra'+g" :x="paretoInnerW+8" :y="paretoInnerH*(1-g/100)+4" text-anchor="start" font-size="10" fill="#2563eb">{{ g }}%</text>
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
            <input v-model="search" placeholder="Cari dealer..." class="filter-input search-input" />
          </div>
        </div>
        <div class="filter-group">
          <label class="filter-label">KATEGORI</label>
          <select v-model="filterKat" class="filter-select">
            <option value="">Semua Kategori</option>
            <option v-for="k in katList" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">PLATFORM (PELANGGAN SEGMEN)</label>
          <select v-model="filterPlatform" class="filter-select">
            <option value="">Semua Platform</option>
            <option value="Shopee">Shopee</option>
            <option value="Tokopedia">Tokopedia</option>
            <option value="Website/Retail">Website/Retail</option>
            <option value="Offline/Dealer">Offline/Dealer</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">NAMA PELANGGAN / DEALER</label>
          <input v-model="filterDealerSearch" placeholder="Cari dealer..." class="filter-input" />
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">DEPARTEMEN (KODE)</label>
          <select v-model="filterDept" class="filter-select">
            <option value="">Semua Dept</option>
            <option v-for="d in deptList" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">KOTA / CABANG</label>
          <select v-model="filterCabang" class="filter-select">
            <option value="">Semua Kota</option>
            <option v-for="c in cabangList" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">GUDANG</label>
          <select v-model="filterGudang" class="filter-select">
            <option value="">Semua Gudang</option>
            <option v-for="g in gudangList" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">PROVINSI TOKO</label>
          <select v-model="filterProvinsi" class="filter-select">
            <option value="">Semua Provinsi</option>
            <option v-for="p in provinsiList" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">KABUPATEN / KOTA</label>
          <select v-model="filterKabupaten" class="filter-select" :disabled="!filterProvinsi">
            <option value="">Semua Kab/Kota</option>
            <option v-for="k in kabupatenList" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">KECAMATAN</label>
          <select v-model="filterKecamatan" class="filter-select" :disabled="!filterKabupaten">
            <option value="">Semua Kecamatan</option>
            <option v-for="k in kecamatanList" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">STATUS</label>
          <select v-model="filterStatus" class="filter-select">
            <option value="">Semua Status</option>
            <option v-for="st in ['capai','hampir','kurang']" :key="st" :value="st">
              {{ st === 'capai' ? 'Capai (≥100%)' : st === 'hampir' ? 'Hampir (≥80%)' : 'Kurang (<80%)' }}
            </option>
          </select>
        </div>
        <div class="filter-group" style="flex-direction:row;align-items:flex-end;gap:10px">
          <div class="mode-toggle-group" style="margin-bottom:1px">
            <button class="mode-toggle-btn" :class="{active:breakMode=='brand'}" @click="breakMode='brand'">By Brand</button>
            <button class="mode-toggle-btn" :class="{active:breakMode=='kategori'}" @click="breakMode='kategori'">By Kategori</button>
          </div>
          <button class="btn-clear-filter" @click="clearFilters">🔄 Reset</button>
          <div class="filter-meta">{{ filtered.length }} dealer</div>
        </div>
      </div>
      <div class="filter-chips" v-if="activeFilterChips.length">
        <span class="chip-label">Filter aktif:</span>
        <span v-for="chip in activeFilterChips" :key="chip.key" class="filter-chip" @click="clearChip(chip.key)">
          {{ chip.label }} ✕
        </span>
      </div>
    </div>

    <div v-if="!store.soBerjalan.length" class="empty">Upload data SO Berjalan terlebih dahulu.</div>
    <div v-else-if="!dealerData.length" class="empty">Tidak ada data untuk ditampilkan.</div>

    <div v-else class="table-card">
      <table>
        <colgroup>
          <col style="width:40px"><col><col style="width:80px"><col style="width:140px"><col style="width:140px"><col style="width:110px"><col style="width:100px"><col style="width:48px">
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th class="sortable" @click="sortBy('dealer')">DEALER {{ sortIcon('dealer') }}</th>
            <th class="num sortable" @click="sortBy('pctHist')">% HIST {{ sortIcon('pctHist') }}</th>
            <th class="num sortable" @click="sortBy('target')">TARGET {{ sortIcon('target') }}</th>
            <th class="num sortable" @click="sortBy('realize')">REALISASI {{ sortIcon('realize') }}</th>
            <th class="num sortable" @click="sortBy('achievement')">ACH {{ sortIcon('achievement') }}</th>
            <th class="sortable" @click="sortBy('achievement')">STATUS {{ sortIcon('achievement') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(dl, idx) in filtered" :key="dl.dealer">
            <tr class="row-dealer" @click="toggleAccordion(expanded, dl.dealer)">
              <td class="rank">{{ idx+1 }}</td>
              <td>
                <div class="name-main">{{ dl.dealer }}</div>
                <div class="name-sub">{{ dl.itemCount }} {{ breakMode==='brand'?'brand':'kategori' }}</div>
              </td>
              <td class="num muted fw5">{{ dl.pctHist != null ? dl.pctHist.toFixed(2)+'%' : '—' }}</td>
              <td class="num fw6">{{ fmt(dl.target) }}</td>
              <td class="num">{{ fmt(dl.realize) }}</td>
              <td class="num fw7" :style="{color:achColor(dl.achievement)}">{{ dl.achievement.toFixed(2) }}%</td>
              <td><span :class="['tag',achTag(dl.achievement)]">{{ achLabel(dl.achievement) }}</span></td>
              <td class="chevron-td"><span class="chev" :class="{open:expanded[dl.dealer]}">▾</span></td>
            </tr>
            <tr class="row-bar"><td colspan="8" style="padding:0"><div class="bar-wrap"><div class="bar-fill" :style="{width:Math.min(dl.achievement,100)+'%',background:achColor(dl.achievement)}"></div></div></td></tr>
            <template v-if="expanded[dl.dealer]">
              <tr><td colspan="8" class="no-padding">
                <div class="breakdown-scroll-area">
                  <table class="table-inner">
                    <colgroup><col style="width:40px"><col><col style="width:80px"><col style="width:140px"><col style="width:140px"><col style="width:110px"><col style="width:100px"><col style="width:48px"></colgroup>
                    <tbody>
                      <template v-for="[key1, d1] in sortedEntries(dl.items)" :key="key1">
                        <tr class="row-l1" @click="toggleAccordion(expL1, dl.dealer+'|'+key1)">
                          <td></td>
                          <td class="indent1">
                            <span class="chev-sm" :class="{open:expL1[dl.dealer+'|'+key1]}">▾</span>
                            <span :class="breakMode==='brand' ? 'brand-chip' : 'kat-label'">{{ key1 }}</span>
                          </td>
                          <td class="num muted fw5">{{ dl.target > 0 ? (d1.target / dl.target * 100).toFixed(2) + '%' : '—' }}</td>
                          <td class="num fw5">{{ fmt(d1.target) }}</td>
                          <td class="num">{{ fmt(d1.realize) }}</td>
                          <td class="num" :style="{color:achColor(d1.achievement)}">{{ d1.achievement.toFixed(2) }}%</td>
                          <td><span :class="['tag',achTag(d1.achievement)]">{{ achLabel(d1.achievement) }}</span></td>
                          <td></td>
                        </tr>
                        <template v-if="expL1[dl.dealer+'|'+key1]">
                          <template v-for="[key2, d2] in sortedEntries(d1.sub||{})" :key="key2">
                            <tr class="row-l2" @click="toggleAccordion(expL2, dl.dealer+'|'+key1+'|'+key2)">
                              <td></td>
                              <td class="indent2">
                                <span class="chev-sm" :class="{open:expL2[dl.dealer+'|'+key1+'|'+key2]}">▾</span>
                                <span :class="breakMode==='kategori' ? 'brand-chip' : 'kat-label'">{{ key2||'(tanpa nama)' }}</span>
                              </td>
                              <td class="num muted fw5">{{ d1.target > 0 ? (d2.target / d1.target * 100).toFixed(2) + '%' : '—' }}</td>
                              <td class="num">{{ fmt(d2.target) }}</td>
                              <td class="num">{{ fmt(d2.realize) }}</td>
                              <td class="num" :style="{color:achColor(d2.achievement)}">{{ d2.achievement.toFixed(2) }}%</td>
                              <td><span :class="['tag',achTag(d2.achievement)]">{{ achLabel(d2.achievement) }}</span></td>
                              <td></td>
                            </tr>
                            <template v-if="expL2[dl.dealer+'|'+key1+'|'+key2]">
                              <tr v-for="[skuNo, si] in sortedEntries(d2.sku||{})" :key="skuNo" class="row-sku">
                                <td></td>
                                <td class="indent3">
                                  <span class="sku-code">{{ skuNo }}</span>
                                  <span class="sku-name">{{ si.namaBarang || si.namaItem || '' }}</span>
                                </td>
                                <td class="num muted fw5">{{ d2.target > 0 ? (si.target / d2.target * 100).toFixed(2) + '%' : '—' }}</td>
                                <td class="num">{{ fmt(si.target) }}</td>
                                <td class="num">{{ fmt(si.realize) }}</td>
                                <td class="num" :style="{color:achColor(si.achievement)}">{{ si.achievement.toFixed(2) }}%</td>
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
              </td></tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useSelloutStore } from '@/stores/sellout'
import { mapCity, get3BulanHistoris } from '@/utils/calculations'
import { exportToExcel } from '@/utils/fileReader'
import { cleanBrand, cleanPelanggan, getPlatformGroup } from '@/utils/brandCleaner'

const store = useSelloutStore()

// ─── VISUALISASI STATE ────────────────────────────────────────────────────────
const showViz     = ref(false)
const activeChart = ref('bar')
const vizLimit    = ref(10)
const vizOrder    = ref('desc')
const hoveredPie  = ref(null)
const bubbleHover = ref(null)
const scatterHover = ref(null)
const treemapHover = ref(null)

// ─── FILTER STATE ─────────────────────────────────────────────────────────────
const search             = ref('')
const filterStatus       = ref('')
const breakMode          = ref('brand')
const filterKat          = ref('')
const filterPlatform     = ref('')
const filterDealerSearch = ref('')
const filterDept         = ref('')
const filterCabang       = ref('')
const filterGudang       = ref('')
const filterProvinsi     = ref('')
const filterKabupaten    = ref('')
const filterKecamatan    = ref('')

watch(filterProvinsi,  () => { filterKabupaten.value = ''; filterKecamatan.value = '' })
watch(filterKabupaten, () => { filterKecamatan.value = '' })

function clearFilters() {
  search.value = ''; filterStatus.value = ''; filterKat.value = ''
  filterPlatform.value = ''; filterDealerSearch.value = ''; filterDept.value = ''
  filterCabang.value = ''; filterGudang.value = ''; filterProvinsi.value = ''
  filterKabupaten.value = ''; filterKecamatan.value = ''
}

function clearChip(key) {
  const map = {
    search: () => search.value = '',
    filterStatus: () => filterStatus.value = '',
    filterKat: () => filterKat.value = '',
    filterPlatform: () => filterPlatform.value = '',
    filterDealerSearch: () => filterDealerSearch.value = '',
    filterDept: () => filterDept.value = '',
    filterCabang: () => filterCabang.value = '',
    filterGudang: () => filterGudang.value = '',
    filterProvinsi: () => { filterProvinsi.value = ''; filterKabupaten.value = ''; filterKecamatan.value = '' },
    filterKabupaten: () => { filterKabupaten.value = ''; filterKecamatan.value = '' },
    filterKecamatan: () => filterKecamatan.value = '',
  }
  map[key]?.()
}

const activeFilterChips = computed(() => {
  const chips = []
  if (search.value)             chips.push({ key: 'search',            label: `Cari: "${search.value}"` })
  if (filterKat.value)          chips.push({ key: 'filterKat',         label: `Kat: ${filterKat.value}` })
  if (filterPlatform.value)     chips.push({ key: 'filterPlatform',    label: `Platform: ${filterPlatform.value}` })
  if (filterDealerSearch.value) chips.push({ key: 'filterDealerSearch', label: `Dealer: ${filterDealerSearch.value}` })
  if (filterDept.value)         chips.push({ key: 'filterDept',        label: `Dept: ${filterDept.value}` })
  if (filterCabang.value)       chips.push({ key: 'filterCabang',      label: `Cabang: ${filterCabang.value}` })
  if (filterGudang.value)       chips.push({ key: 'filterGudang',      label: `Gudang: ${filterGudang.value}` })
  if (filterProvinsi.value)     chips.push({ key: 'filterProvinsi',    label: `Prov: ${filterProvinsi.value}` })
  if (filterKabupaten.value)    chips.push({ key: 'filterKabupaten',   label: `Kab: ${filterKabupaten.value}` })
  if (filterKecamatan.value)    chips.push({ key: 'filterKecamatan',   label: `Kec: ${filterKecamatan.value}` })
  if (filterStatus.value)       chips.push({ key: 'filterStatus',      label: `Status: ${filterStatus.value}` })
  return chips
})

// ─── SORT & ACCORDION ─────────────────────────────────────────────────────────
const sortKey   = ref('target')
const sortOrder = ref('desc')
const expanded  = reactive({})
const expL1     = reactive({})
const expL2     = reactive({})

function toggleAccordion(map, key) {
  const wasOpen = !!map[key]
  Object.keys(map).forEach(k => delete map[k])
  if (!wasOpen) map[key] = true
}
function sortBy(key) {
  if (sortKey.value === key) { sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc' }
  else { sortKey.value = key; sortOrder.value = 'desc' }
}
function sortIcon(key) {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}
watch(breakMode, () => {
  Object.keys(expanded).forEach(k => delete expanded[k])
  Object.keys(expL1).forEach(k => delete expL1[k])
  Object.keys(expL2).forEach(k => delete expL2[k])
})

// ─── WINDOW 3 BULAN HISTORIS ──────────────────────────────────────────────────
const BULAN_NAMA_D2 = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI",
  "JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"]

const window3D2 = computed(() => {
  if (!store.targetBulan || !store.targetTahun) return []
  return get3BulanHistoris(store.targetBulan, store.targetTahun)
})
const window3KeysD2 = computed(() => {
  const keys = new Set()
  window3D2.value.forEach(w => {
    const bIdx = BULAN_NAMA_D2.indexOf(String(w.bulan).toUpperCase())
    if (bIdx !== -1) keys.add(`${w.tahun}-${String(bIdx + 1).padStart(2, '0')}`)
  })
  return keys
})

// ─── SO ROWS & DROPDOWN LISTS ─────────────────────────────────────────────────
// FIX UTAMA: soRows langsung merujuk ke data bulan target yang sudah dipotong store (Mei 2026)
const soRows = computed(() => store.soTargetBulan || [])

const currentTargetMonthRows = computed(() => soRows.value)

const regionalFilteredRows = computed(() => {
  let rows = currentTargetMonthRows.value
  if (filterProvinsi.value) rows = rows.filter(r => (r['Provinsi'] || r['provinsi']) === filterProvinsi.value)
  if (filterKabupaten.value) rows = rows.filter(r => (r['Kabupaten'] || r['Kota'] || r['kabupaten']) === filterKabupaten.value)
  if (filterKecamatan.value) rows = rows.filter(r => (r['Kecamatan'] || r['kecamatan']) === filterKecamatan.value)
  return rows
})

const katList      = computed(() => [...new Set(regionalFilteredRows.value.map(r => r['Kategori']).filter(Boolean))].sort())
const deptList     = computed(() => [...new Set(regionalFilteredRows.value.map(r => r['Dept.']).filter(Boolean))].sort())
const gudangList   = computed(() => [...new Set(regionalFilteredRows.value.map(r => r['Gudang'] || r['gudang']).filter(Boolean))].sort())
const provinsiList = computed(() => [...new Set(currentTargetMonthRows.value.map(r => r['Provinsi'] || r['provinsi']).filter(Boolean))].sort())

const kabupatenList = computed(() => {
  if (!filterProvinsi.value) return []
  return [...new Set(currentTargetMonthRows.value
    .filter(r => (r['Provinsi'] || r['provinsi']) === filterProvinsi.value)
    .map(r => r['Kabupaten'] || r['Kota']).filter(Boolean))].sort()
})
const kecamatanList = computed(() => {
  if (!filterKabupaten.value) return []
  return [...new Set(currentTargetMonthRows.value
    .filter(r => (r['Kabupaten'] || r['Kota']) === filterKabupaten.value)
    .map(r => r['Kecamatan']).filter(Boolean))].sort()
})

const cabangList = computed(() => {
  const cities = new Set()
  regionalFilteredRows.value.forEach(r => {
    const kota = mapCity(r['Nama Dept.'] || r['Dept.'] || '')
    if (kota && kota !== 'Others') cities.add(kota)
  })
  return [...cities].sort()
})

// ─── FILTERED ROWS ────────────────────────────────────────────────────────────
const filteredRows = computed(() => {
  let rows = currentTargetMonthRows.value

  if (filterKat.value)          rows = rows.filter(r => (r['Kategori'] || r['kategori']) === filterKat.value)
  if (filterPlatform.value) {
    rows = rows.filter(r => getPlatformGroup(cleanPelanggan(r)) === filterPlatform.value)
  }
  if (filterDept.value)         rows = rows.filter(r => (r['Dept.'] || r['Nama Dept.'] || r['Departemen']) === filterDept.value)
  if (filterCabang.value)       rows = rows.filter(r => mapCity(r['Dept.'] || r['Nama Dept.'] || '') === filterCabang.value)
  if (filterGudang.value)       rows = rows.filter(r => (r['Gudang'] || r['gudang']) === filterGudang.value)
  if (filterProvinsi.value)     rows = rows.filter(r => (r['Provinsi'] || r['provinsi']) === filterProvinsi.value)
  if (filterKabupaten.value)    rows = rows.filter(r => (r['Kabupaten'] || r['Kota'] || r['kabupaten']) === filterKabupaten.value)
  if (filterKecamatan.value)    rows = rows.filter(r => (r['Kecamatan'] || r['kecamatan']) === filterKecamatan.value)
  if (filterDealerSearch.value) rows = rows.filter(r => (r['Dealer'] || r['Nama Dealer'] || r['Nama Pelanggan'] || '').toUpperCase().includes(filterDealerSearch.value.toUpperCase()))
  
  return rows
})

// ─── BRAND HISTORIS CACHE ─────────────────────────────────────────────────────
const brandHistorisCacheD2 = computed(() => {
  try {
    const map = {}
    // Menggunakan store.soBerjalan murni hanya untuk menarik cache rasio 3 bulan histories ke belakang
    ;(store.soBerjalan || []).forEach(r => {
      const ym = r['Tgl Faktur'] && String(r['Tgl Faktur']).includes('-') ? String(r['Tgl Faktur']).slice(0, 7) : ''
      if (!ym || !window3KeysD2.value.has(ym)) return
      const b = cleanBrand(r['Brand'] || r['BRAND Barang'])
      if (!b) return
      if (!map[b]) map[b] = { bulanMap: {}, total: 0 }
      const jml = parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
      map[b].bulanMap[ym] = (map[b].bulanMap[ym] || 0) + jml
      map[b].total += jml
    })
    const result = {}
    Object.entries(map).forEach(([brand, v]) => {
      const bulanAktif = Object.keys(v.bulanMap).length || 3
      result[brand.toUpperCase()] = Math.round((v.total / bulanAktif) * 1.15)
    })
    return result
  } catch(e) {
    console.error('❌ brandHistorisCacheD2 error:', e)
    return {}
  }
})

// ─── BRAND TARGET FINAL MAP ───────────────────────────────────────────────────
const brandTargetFinalMap = computed(() => {
  const result = {}
  Object.entries(brandHistorisCacheD2.value).forEach(([key, targetHistoris]) => {
    result[key] = targetHistoris
  })
  Object.entries(store.targetBrandInputs || {}).forEach(([brandKey, saved]) => {
    const key = brandKey.toUpperCase()
    const targetHistoris = brandHistorisCacheD2.value[key] || 0
    const isAuto = (!saved.targetManual || saved.targetManual === 0) && !saved.isForcePending
    if (isAuto) return
    if (saved.isAcc && saved.targetInputAcc > 0) {
      result[key] = saved.targetInputAcc
    } else if (saved.targetManual > 0) {
      result[key] = Math.round((targetHistoris + saved.targetManual) / 2)
    }
  })
  return result
})

// ─── HISTORIS REALISASI PER BRAND PER DEALER ─────────────────────────────────
const brandHistorisPerDealer = computed(() => {
  const map = {}
  ;(store.soBerjalan || []).forEach(r => {
    const ym = r['Tgl Faktur'] && String(r['Tgl Faktur']).includes('-') ? String(r['Tgl Faktur']).slice(0, 7) : ''
    if (!ym || !window3KeysD2.value.has(ym)) return
    const dealer = cleanPelanggan(r)
    const brand  = cleanBrand(r['Brand'] || r['BRAND Barang']) || ''
    const real   = parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
    if (!dealer || !brand) return
    const key = brand.toUpperCase()
    if (!map[key]) map[key] = {}
    map[key][dealer] = (map[key][dealer] || 0) + real
  })
  return map
})

// ─── DEALER DATA ──────────────────────────────────────────────────────────────
const dealerData = computed(() => {
  try {
    if (!filteredRows.value.length) return []

    const map = {}
    filteredRows.value.forEach(r => {
      const dealer = cleanPelanggan(r)
      if (!dealer) return
      const brand = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand'] || ''
      const real  = parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
      if (!map[dealer]) map[dealer] = { realize: 0, brandReal: {}, items: {}, target: 0 }
      map[dealer].realize += real
      if (brand) {
        if (!map[dealer].brandReal[brand]) map[dealer].brandReal[brand] = 0
        map[dealer].brandReal[brand] += real
      }
    })

    const brandTotalsThisMonth = {}
    currentTargetMonthRows.value.forEach(r => {
      const brand = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand'] || ''
      if (!brand) return
      const key = brand.toUpperCase()
      brandTotalsThisMonth[key] = (brandTotalsThisMonth[key] || 0) + (parseFloat(r['Total'] || r['Jumlah'] || 0) || 0)
    })

    for (const dealer in map) {
      let dealerTarget = 0
      for (const [brand, dealerBrandReal] of Object.entries(map[dealer].brandReal)) {
        const key       = brand.toUpperCase()
        const brandTotal  = brandTotalsThisMonth[key] || 0
        const brandTarget = brandTargetFinalMap.value[key] || 0
        if (brandTotal > 0) dealerTarget += (dealerBrandReal / brandTotal) * brandTarget
      }
      map[dealer].target = dealerTarget
    }

    for (const [brandKey, brandTarget] of Object.entries(brandTargetFinalMap.value)) {
      if ((brandTotalsThisMonth[brandKey] || 0) > 0) continue
      if (!brandTarget) continue
      const histDealers = brandHistorisPerDealer.value[brandKey]
      if (!histDealers) continue
      const histTotal = Object.values(histDealers).reduce((a, v) => a + v, 0)
      if (!histTotal) continue
      for (const [dealer, histReal] of Object.entries(histDealers)) {
        if (!map[dealer]) continue
        map[dealer].target += (histReal / histTotal) * brandTarget
      }
    }

    const rawTotalTarget = Object.values(map).reduce((s, d) => s + (d.target || 0), 0)

    filteredRows.value.forEach(r => {
      const dealer = cleanPelanggan(r)
      if (!dealer || !map[dealer]) return
      const brand = cleanBrand(r['Brand'] || r['BRAND Barang']) || r['Brand'] || r['brand'] || ''
      const kat   = r['Kategori'] || r['kategori'] || '(tanpa kategori)'
      const real  = parseFloat(r['Total'] || r['Jumlah'] || 0) || 0
      const skuNo = r['SKU'] || r['No. Barang'] || r['Kode Barang'] || '—'
      const skuNm = r['Nama Item'] || r['Nama Barang'] || ''
      if (!brand) return

      if (breakMode.value === 'brand') {
        if (!map[dealer].items[brand]) map[dealer].items[brand] = { target: 0, realize: 0, sub: {} }
        map[dealer].items[brand].realize += real
        if (!map[dealer].items[brand].sub[kat]) map[dealer].items[brand].sub[kat] = { target: 0, realize: 0, sku: {} }
        map[dealer].items[brand].sub[kat].realize += real
        if (!map[dealer].items[brand].sub[kat].sku[skuNo])
          map[dealer].items[brand].sub[kat].sku[skuNo] = { realize: 0, namaBarang: skuNm }
        map[dealer].items[brand].sub[kat].sku[skuNo].realize += real
      } else {
        if (!map[dealer].items[kat]) map[dealer].items[kat] = { target: 0, realize: 0, sub: {} }
        map[dealer].items[kat].realize += real
        if (!map[dealer].items[kat].sub[brand]) map[dealer].items[kat].sub[brand] = { target: 0, realize: 0, sku: {} }
        map[dealer].items[kat].sub[brand].realize += real
        if (!map[dealer].items[kat].sub[brand].sku[skuNo])
          map[dealer].items[kat].sub[brand].sku[skuNo] = { realize: 0, namaBarang: skuNm }
        map[dealer].items[kat].sub[brand].sku[skuNo].realize += real
      }
    })

    for (const dealer in map) {
      const d = map[dealer]
      if (breakMode.value === 'brand') {
        for (const [brand, d1] of Object.entries(d.items)) {
          const key             = brand.toUpperCase()
          const brandTotalMonth = brandTotalsThisMonth[key] || 0
          const brandTarget     = brandTargetFinalMap.value[key] || 0
          const dealerBrandReal = d.brandReal[brand] || 0
          d1.target = brandTotalMonth > 0 ? Math.round((dealerBrandReal / brandTotalMonth) * brandTarget) : 0
          d1.achievement = d1.target > 0 ? (d1.realize / d1.target) * 100 : 0
          for (const [, d2] of Object.entries(d1.sub)) {
            d2.target = d1.realize > 0 ? Math.round((d2.realize / d1.realize) * d1.target) : 0
            d2.achievement = d2.target > 0 ? (d2.realize / d2.target) * 100 : 0
            for (const [, si] of Object.entries(d2.sku || {})) {
              si.target = d2.realize > 0 ? Math.round((si.realize / d2.realize) * d2.target) : 0
              si.achievement = si.target > 0 ? (si.realize / si.target) * 100 : 0
            }
          }
        }
      } else {
        for (const [, d1] of Object.entries(d.items)) {
          d1.target = d.realize > 0 ? Math.round((d1.realize / d.realize) * d.target) : 0
          d1.achievement = d1.target > 0 ? (d1.realize / d1.target) * 100 : 0
          for (const [brand, d2] of Object.entries(d1.sub)) {
            const key             = brand.toUpperCase()
            const brandTotalMonth = brandTotalsThisMonth[key] || 0
            const brandTarget     = brandTargetFinalMap.value[key] || 0
            const dealerBrandReal = d.brandReal[brand] || 0
            d2.target = brandTotalMonth > 0 ? Math.round((dealerBrandReal / brandTotalMonth) * brandTarget) : 0
            d2.achievement = d2.target > 0 ? (d2.realize / d2.target) * 100 : 0
            for (const [, si] of Object.entries(d2.sku || {})) {
              si.target = d2.realize > 0 ? Math.round((si.realize / d2.realize) * d2.target) : 0
              si.achievement = si.target > 0 ? (si.realize / si.target) * 100 : 0
            }
          }
        }
      }
    }

    return Object.entries(map).map(([dealer, d]) => ({
      dealer,
      target:      d.target,
      realize:     d.realize,
      achievement: d.target > 0 ? (d.realize / d.target) * 100 : 0,
      pctHist:     rawTotalTarget > 0 ? (d.target / rawTotalTarget) * 100 : 0,
      itemCount:   Object.keys(d.items).length,
      items:       d.items,
    }))
  } catch(e) {
    console.log('[dealerData] error:', e)
    return []
  }
})

// ─── FILTERED & SORTED ────────────────────────────────────────────────────────
const filtered = computed(() => {
  let list = [...dealerData.value]
  if (search.value) list = list.filter(d => d.dealer.toUpperCase().includes(search.value.toUpperCase()))
  if (filterKat.value) {
    list = list.filter(d =>
      breakMode.value === 'kategori'
        ? !!d.items[filterKat.value]
        : Object.values(d.items).some(b => !!b.sub[filterKat.value])
    )
  }
  if (filterStatus.value) {
    list = list.filter(d => {
      const p = d.achievement
      if (filterStatus.value === 'capai')  return p >= 100
      if (filterStatus.value === 'hampir') return p >= 80 && p < 100
      if (filterStatus.value === 'kurang') return p < 80
      return true
    })
  }
  const key   = sortKey.value
  const order = sortOrder.value === 'asc' ? 1 : -1
  list.sort((a, b) => {
    if (key === 'dealer') return order * a.dealer.localeCompare(b.dealer)
    return order * ((a[key] || 0) - (b[key] || 0))
  })
  return list
})

// ─── SCORECARD TOTALS ─────────────────────────────────────────────────────────
const totalTarget = computed(() => filtered.value.reduce((a, d) => a + (d.target || 0), 0))
const totalReal   = computed(() => filtered.value.reduce((a, d) => a + (d.realize || 0), 0))
const totalAch    = computed(() => {
  const tt = totalTarget.value
  const tr = totalReal.value
  return tt > 0 ? (tr / tt) * 100 : 0
})

// ─── VIZ DATA ─────────────────────────────────────────────────────────────────
const vizData = computed(() => {
  let list = [...filtered.value]
  if (vizOrder.value === 'desc')          list.sort((a,b) => b.realize - a.realize)
  else if (vizOrder.value === 'asc')      list.sort((a,b) => a.realize - b.realize)
  else if (vizOrder.value === 'ach-desc') list.sort((a,b) => b.achievement - a.achievement)
  else if (vizOrder.value === 'ach-asc')  list.sort((a,b) => a.achievement - b.achievement)
  else if (vizOrder.value === 'target-desc') list.sort((a,b) => b.target - a.target)
  if (vizLimit.value < 9999) list = list.slice(0, vizLimit.value)
  return list
})

// ─── BUBBLE CHART ─────────────────────────────────────────────────────────────
const bubbleMargin = { t: 20, r: 20, b: 40, l: 70 }
const bubbleW = 580
const bubbleH = 380
const bubbleInnerW = computed(() => bubbleW - bubbleMargin.l - bubbleMargin.r)
const bubbleInnerH = computed(() => bubbleH - bubbleMargin.t - bubbleMargin.b)
const bubbleMaxVal = computed(() => Math.max(...vizData.value.map(d => Math.max(d.target, d.realize)), 1))
const bubbleGridX  = computed(() => {
  const mx = bubbleMaxVal.value
  const step = Math.pow(10, Math.floor(Math.log10(mx/4)))
  return [0, step, step*2, step*3, step*4].filter(v => v <= mx*1.1)
})
const bubbleGridY  = computed(() => bubbleGridX.value)
function bubbleScaleX(v) { return (v / bubbleMaxVal.value) * bubbleInnerW.value }
function bubbleScaleY(v) { return bubbleInnerH.value - (v / bubbleMaxVal.value) * bubbleInnerH.value }
function bubbleR(n) { return Math.max(6, Math.min(20, 6 + n * 2)) }

// ─── SCATTER KUADRAN ──────────────────────────────────────────────────────────
const scatterMargin = { t: 40, r: 20, b: 40, l: 55 }
const scatterW = 560
const scatterH = 380
const scatterInnerW = computed(() => scatterW - scatterMargin.l - scatterMargin.r)
const scatterInnerH = computed(() => scatterH - scatterMargin.t - scatterMargin.b)

const scatterData = computed(() => {
  const totalReal = filtered.value.reduce((s, d) => s + (d.realize || 0), 0)
  return filtered.value.map(d => ({
    ...d,
    pctContrib: totalReal > 0 ? (d.realize / totalReal) * 100 : 0
  }))
})
const scatterMaxX = computed(() => Math.max(...scatterData.value.map(d => d.pctContrib), 1))
function scatterScaleX(v) { return (v / scatterMaxX.value) * scatterInnerW.value }
function scatterScaleY(v) { return scatterInnerH.value - (v / 150) * scatterInnerH.value }

const quadrantSummary = computed(() => {
  const medX = scatterMaxX.value / 2
  const star   = scatterData.value.filter(d => d.pctContrib >= medX && d.achievement >= 100)
  const quick  = scatterData.value.filter(d => d.pctContrib <  medX && d.achievement >= 100)
  const prio   = scatterData.value.filter(d => d.pctContrib >= medX && d.achievement <  100)
  const low    = scatterData.value.filter(d => d.pctContrib <  medX && d.achievement <  100)
  return [
    { label: 'Star',     icon: '⭐', color: '#16a34a', bg: '#dcfce7', items: star.sort((a,b)=>b.realize-a.realize) },
    { label: 'Prioritas',icon: '🚨', color: '#dc2626', bg: '#fee2e2', items: prio.sort((a,b)=>b.realize-a.realize) },
    { label: 'Quick Win',icon: '⚡', color: '#d97706', bg: '#fef9c3', items: quick.sort((a,b)=>b.realize-a.realize) },
    { label: 'Low Prio', icon: '💤', color: '#2563eb', bg: '#eff6ff', items: low.sort((a,b)=>b.realize-a.realize) },
  ]
})

// ─── TREEMAP ──────────────────────────────────────────────────────────────────
const treemapW = 820
const treemapH = 360

const treemapNodes = computed(() => {
  const items = [...vizData.value].sort((a,b) => b.realize - a.realize)
  const total = items.reduce((s,i) => s + (i.realize || 0), 0)
  if (!total || !items.length) return []

  const nodes = []
  let x = 0, y = 0, w = treemapW, h = treemapH
  let remaining = [...items]

  function layoutRow(row, x, y, w, h, horizontal) {
    const rowTotal = row.reduce((s,i) => s + i.realize, 0)
    let pos = horizontal ? x : y
    row.forEach(item => {
      const frac = item.realize / rowTotal
      const nw = horizontal ? frac * w : w
      const nh = horizontal ? h : frac * h
      const nx = horizontal ? pos : x
      const ny = horizontal ? y : pos
      nodes.push({ dealer: item.dealer, realize: item.realize, achievement: item.achievement, x: nx, y: ny, w: nw, h: nh })
      pos += horizontal ? nw : nh
    })
  }

  while (remaining.length > 0) {
    const horizontal = w >= h
    const side = horizontal ? h : w
    let row = []
    let rowArea = 0

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i]
      const area = (item.realize / total) * treemapW * treemapH
      const testRow = [...row, item]
      const testArea = rowArea + area
      const mainLen = testArea / side
      let worstRatio = 0
      testRow.forEach(it => {
        const itArea = (it.realize / total) * treemapW * treemapH
        const len = itArea / mainLen
        const r = Math.max(mainLen/len, len/mainLen)
        if (r > worstRatio) worstRatio = r
      })
      if (row.length > 0 && worstRatio > (rowArea / side)) {
        break
      }
      row.push(item)
      rowArea += area
    }
    if (row.length === 0) row = [remaining[0]]

    const mainLen = rowArea / total * (horizontal ? treemapW * treemapH / h : treemapW * treemapH / w)
    layoutRow(row, x, y, horizontal ? w : mainLen, horizontal ? mainLen : h, horizontal)

    remaining = remaining.slice(row.length)
    if (horizontal) { y += mainLen; h -= mainLen }
    else            { x += mainLen; w -= mainLen }
    if (h <= 0 || w <= 0) break
  }
  return nodes
})

// ─── WATERFALL ────────────────────────────────────────────────────────────────
const waterfallMargin = { t: 20, r: 20, b: 70, l: 70 }
const waterfallW = 820
const waterfallH = 340
const wfInnerW   = computed(() => waterfallW - waterfallMargin.l - waterfallMargin.r)
const wfInnerH   = computed(() => waterfallH - waterfallMargin.t - waterfallMargin.b)

const waterfallData = computed(() => {
  return [...vizData.value]
    .map(d => ({ ...d, gap: d.realize - d.target }))
    .sort((a,b) => b.gap - a.gap)
})
const wfTotalGap  = computed(() => waterfallData.value.reduce((s,d) => s + d.gap, 0))
const wfMaxAbs    = computed(() => Math.max(...waterfallData.value.map(d => Math.abs(d.gap)), Math.abs(wfTotalGap.value), 1))
const wfGridLines = computed(() => {
  const mx = wfMaxAbs.value
  const step = Math.pow(10, Math.floor(Math.log10(mx/3)))
  const steps = [-3,-2,-1,0,1,2,3].map(i => i*step).filter(v => Math.abs(v) <= mx*1.1)
  return steps
})
function wfScaleY(v) {
  const mx = wfMaxAbs.value
  return wfInnerH.value/2 - (v / mx) * (wfInnerH.value/2)
}
const wfBarW = computed(() => {
  const n = waterfallData.value.length + 1
  return Math.max(8, Math.min(40, wfInnerW.value / n - 4))
})
function wfBarX(i) {
  const n = waterfallData.value.length + 1
  const bw = wfInnerW.value / n
  return i * bw + (bw - wfBarW.value) / 2
}

// ─── PIE CHART ────────────────────────────────────────────────────────────────
const PIE_COLORS = [
  '#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2',
  '#be185d','#854d0e','#166534','#1e40af','#92400e','#1d4ed8',
  '#15803d','#b45309','#b91c1c','#6d28d9','#0e7490','#9d174d'
]
const pieSize = 260
const pieR    = 110

const pieSlices = computed(() => {
  const items = [...vizData.value]
  const total = items.reduce((s, i) => s + (i.realize || 0), 0)
  if (!total) return []
  let startAngle = -Math.PI / 2
  return items.map((item, idx) => {
    const val      = item.realize || 0
    const pct      = val / total * 100
    const angle    = (val / total) * 2 * Math.PI
    const endAngle = startAngle + angle
    const x1 = Math.cos(startAngle) * pieR
    const y1 = Math.sin(startAngle) * pieR
    const x2 = Math.cos(endAngle)   * pieR
    const y2 = Math.sin(endAngle)   * pieR
    const large = angle > Math.PI ? 1 : 0
    const d = `M 0 0 L ${x1} ${y1} A ${pieR} ${pieR} 0 ${large} 1 ${x2} ${y2} Z`
    startAngle = endAngle
    return { d, color: PIE_COLORS[idx % PIE_COLORS.length], label: item.dealer, value: val, pct }
  })
})

// ─── PARETO CHART ─────────────────────────────────────────────────────────────
const paretoMargin = { t: 20, r: 50, b: 60, l: 55 }
const paretoW      = 820
const paretoH      = 320
const paretoInnerW = computed(() => paretoW - paretoMargin.l - paretoMargin.r)
const paretoInnerH = computed(() => paretoH - paretoMargin.t - paretoMargin.b)

const paretoData = computed(() => {
  const items = [...vizData.value].sort((a,b) => b.realize - a.realize)
  const total  = items.reduce((s,i) => s + (i.realize||0), 0)
  let cum = 0
  return items.map(item => {
    cum += item.realize || 0
    return { ...item, cumPct: total > 0 ? cum / total * 100 : 0 }
  })
})
const paretoBarW = computed(() => {
  const n = paretoData.value.length || 1
  return Math.max(10, paretoInnerW.value / n - 4)
})
function paretoBarX(i) {
  const n  = paretoData.value.length || 1
  const bw = paretoInnerW.value / n
  return i * bw + (bw - paretoBarW.value) / 2
}
function paretoBarY(val) {
  const maxVal = Math.max(...paretoData.value.map(d => d.realize), 1)
  return paretoInnerH.value * (1 - val / maxVal)
}
function paretoLineY(pct) { return paretoInnerH.value * (1 - pct / 100) }
const paretoLinePoints = computed(() => {
  return paretoData.value.map((item, i) => {
    const x = paretoBarX(i) + paretoBarW.value / 2
    const y = paretoLineY(item.cumPct)
    return `${x},${y}`
  }).join(' ')
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function sortedEntries(obj) {
  return Object.entries(obj ?? {}).sort((a, b) => (b[1].target || 0) - (a[1].target || 0))
}
function achColor(p) { return p >= 100 ? '#16a34a' : p >= 80 ? '#d97706' : '#dc2626' }
function achTag(p)   { return p >= 100 ? 'tag-green' : p >= 80 ? 'tag-yellow' : 'tag-red' }
function achLabel(p) { return p >= 100 ? 'Capai' : p >= 80 ? 'Hampir' : 'Kurang' }
function fmt(n)      { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID') }
function fmtShort(n) {
  if (!n) return 'Rp 0'
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(1) + 'M'
  if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(1) + 'jt'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

function exportExcel() {
  const rows = filtered.value.map(d => ({
    Dealer:    d.dealer,
    Target:    Math.round(d.target),
    Realisasi: Math.round(d.realize),
    Ach:       d.achievement.toFixed(2) + '%'
  }))
  exportToExcel(rows, `dealer_${store.targetBulanLabel}.xlsx`)
}
</script>

<style scoped>
thead { background-color: #2563eb !important; }
th { background-color: #2563eb !important; color: #ffffff !important; padding: 14px 12px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 3px solid #1e40af !important; white-space: nowrap; }
th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { background-color: #1d4ed8 !important; }

.page { padding: 28px; display: flex; flex-direction: column; gap: 14px; max-width: 1440px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-title { font-size: 22px; font-weight: 800; color: #0f172a; }
.page-sub { font-size: 12px; color: #64748b; }
.btn-primary { padding: 9px 18px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-primary:hover { background: #1d4ed8; }
.btn-viz { padding: 9px 18px; background: #fff; color: #475569; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.btn-viz:hover { border-color: #2563eb; color: #2563eb; }
.btn-viz.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; }
.btn-icon { font-size: 14px; }
.btn-clear-filter { padding: 7px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; white-space: nowrap; }
.btn-clear-filter:hover { background: #f1f5f9; }

/* FILTER CHIPS */
.filter-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-top: 4px; border-top: 1px dashed #e2e8f0; }
.chip-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 20px; font-size: 11px; font-weight: 600; color: #2563eb; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { background: #dbeafe; }

/* VIZ PANEL */
.viz-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(37,99,235,0.07); }
.viz-slide-enter-active, .viz-slide-leave-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); max-height: 900px; opacity: 1; }
.viz-slide-enter-from, .viz-slide-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
.viz-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.viz-tabs { display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; gap: 3px; flex-wrap: wrap; }
.viz-tab { padding: 6px 12px; border: none; background: transparent; font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 8px; color: #64748b; transition: all 0.2s; white-space: nowrap; }
.viz-tab.active { background: #fff; color: #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
.viz-controls { display: flex; align-items: center; gap: 8px; }
.viz-ctrl-label { font-size: 11px; font-weight: 700; color: #94a3b8; }
.viz-select { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #334155; background: #fff; cursor: pointer; outline: none; }
.viz-chart-area { min-height: 200px; }
.chart-wrap { display: flex; flex-direction: column; gap: 14px; }
.chart-title { font-size: 13px; font-weight: 800; color: #0f172a; }
.chart-sub { font-size: 11px; font-weight: 400; color: #94a3b8; }

/* BAR CHART */
.bar-chart-container { position: relative; }
.bar-chart-grid { position: absolute; top: 0; left: 180px; right: 80px; bottom: 0; pointer-events: none; }
.grid-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #f1f5f9; }
.grid-label { font-size: 9px; color: #cbd5e1; font-weight: 600; position: absolute; bottom: -16px; transform: translateX(-50%); }
.target-line { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(220,38,38,0.3); }
.bar-chart-rows { display: flex; flex-direction: column; gap: 6px; padding-bottom: 24px; }
.bar-chart-rows .bar-row { display: flex; align-items: center; gap: 8px; }
.bar-label-col { width: 172px; flex-shrink: 0; }
.bar-label-text { font-size: 11px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; text-align: right; }
.bar-col { flex: 1; display: flex; align-items: center; gap: 6px; }
.bar-bg { flex: 1; height: 26px; background: #f1f5f9; border-radius: 6px; position: relative; overflow: visible; }
.bar-inner { height: 100%; border-radius: 6px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }
.bar-val-inside { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 800; color: #fff; }
.bar-val-outside { font-size: 10px; font-weight: 800; min-width: 36px; }
.bar-meta-col { width: 72px; flex-shrink: 0; }
.bar-meta { font-size: 10px; font-weight: 600; color: #94a3b8; }

/* BUBBLE CHART */
.bubble-container { display: flex; gap: 20px; align-items: flex-start; overflow-x: auto; }
.bubble-svg { flex-shrink: 0; min-width: 400px; }
.bubble-legend { flex: 1; display: flex; flex-direction: column; gap: 6px; max-height: 380px; overflow-y: auto; min-width: 180px; }
.bubble-legend-item { display: flex; gap: 8px; align-items: flex-start; padding: 4px 6px; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
.bubble-legend-item:hover { background: #f8fafc; }
.bubble-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
.bubble-name { font-size: 11px; font-weight: 700; color: #334155; }
.bubble-stat { font-size: 10px; color: #94a3b8; }

/* SCATTER KUADRAN */
.scatter-container { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
.scatter-svg { flex-shrink: 0; min-width: 400px; }
.scatter-lists { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 280px; }
.quadrant-card { border: 1.5px solid; border-radius: 10px; padding: 10px 12px; }
.quadrant-title { font-size: 12px; font-weight: 800; margin-bottom: 2px; }
.quadrant-count { font-size: 11px; color: #64748b; margin-bottom: 6px; }
.quadrant-names { display: flex; flex-wrap: wrap; gap: 4px; }
.quadrant-chip { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
.quadrant-more { font-size: 10px; color: #94a3b8; align-self: center; }

/* TREEMAP */
.treemap-container { display: flex; flex-direction: column; gap: 10px; }
.treemap-svg { width: 100%; border-radius: 8px; overflow: hidden; }
.treemap-legend { display: flex; gap: 16px; }
.tl-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748b; }
.tl-dot { width: 12px; height: 12px; border-radius: 3px; }

/* WATERFALL */
.waterfall-container { overflow-x: auto; }
.waterfall-svg { min-width: 600px; width: 100%; }

/* PIE CHART */
.pie-container { display: flex; align-items: flex-start; gap: 32px; }
.pie-svg { flex-shrink: 0; }
.pie-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.legend-row { display: flex; align-items: center; gap: 10px; transition: opacity 0.2s; padding: 4px 0; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.legend-info { min-width: 0; }
.legend-name { font-size: 11px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.legend-val { font-size: 11px; color: #64748b; }

/* PARETO */
.pareto-container { overflow-x: auto; }
.pareto-svg { min-width: 600px; width: 100%; }

/* SCORECARD */
.scorecard-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.scorecard { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.sc-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; margin-bottom: 4px; }
.sc-val { font-size: 20px; font-weight: 700; color: #0f172a; }
.sc-val.bold { font-weight: 800; }

/* FILTER */
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
.mode-toggle-group { display: flex; background: #f1f5f9; padding: 3px; border-radius: 8px; }
.mode-toggle-btn { padding: 5px 12px; border: none; background: transparent; font-size: 11px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.mode-toggle-btn.active { background: #fff; color: #2563eb; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

/* TABLE */
.breakdown-scroll-area { max-height: 440px; overflow-y: auto; background: #fdfdfd; border-bottom: 1px solid #e2e8f0; }
.table-inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
.no-padding { padding: 0 !important; }
.empty { text-align: center; padding: 60px; color: #94a3b8; font-size: 14px; }
.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
td { padding: 12px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.num { text-align: right; font-family: monospace; }
.muted { color: #94a3b8; } .fw5 { font-weight: 500; } .fw6 { font-weight: 600; } .fw7 { font-weight: 700; }
.rank { color: #cbd5e1; font-weight: 700; font-size: 11px; }
.row-dealer { cursor: pointer; background: #fff; } .row-dealer:hover td { background: #f8fafc; }
.name-main { font-weight: 700; color: #0f172a; } .name-sub { font-size: 10px; color: #94a3b8; }
.row-bar td { padding: 0; border-bottom: 1px solid #f1f5f9; }
.bar-wrap { height: 3px; background: #f1f5f9; }
.bar-fill { height: 100%; border-radius: 0 2px 2px 0; transition: width .4s; }
.row-l1 { background: #f8f9ff; cursor: pointer; font-size: 12px; } .row-l1:hover td { background: #f0f3ff; }
.row-l2 { background: #fbfbff; cursor: pointer; font-size: 12px; } .row-l2:hover td { background: #f5f7ff; }
.row-sku td { background: #ffffff; border-bottom-color: #f1f5f9; font-size: 11px; color: #64748b; }
.indent1 { padding-left: 24px !important; } .indent2 { padding-left: 44px !important; }
.indent3 { padding-left: 64px !important; display: flex; align-items: center; gap: 6px; }
.chevron-td { text-align: center; width: 40px; }
.chev { color: #94a3b8; font-size: 12px; transition: transform .2s; display: inline-block; }
.chev.open { transform: rotate(180deg); color: #2563eb; }
.chev-sm { color: #94a3b8; font-size: 9px; transition: transform .2s; display: inline-block; margin-right: 4px; }
.chev-sm.open { transform: rotate(180deg); color: #2563eb; }
.brand-chip { font-weight: 800; color: #1e40af; background: #dbeafe; padding: 2px 8px; border-radius: 5px; font-size: 10px; text-transform: uppercase; }
.kat-label { font-weight: 600; color: #475569; }
.sku-code { font-family: monospace; color: #2563eb; font-size: 10px; background: #eff6ff; padding: 1px 5px; border-radius: 4px; }
.sku-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px; font-size: 11px; color: #475569; }
.tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
.tag-green  { background: #dcfce7; color: #16a34a; }
.tag-yellow { background: #fef9c3; color: #d97706; }
.tag-red    { background: #fee2e2; color: #dc2626; }
</style>