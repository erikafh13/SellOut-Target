// public/csvWorker.js — Web Worker untuk parse CSV besar tanpa block UI

function splitCsvLine(line, sep) {
  const result = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (c === sep && !inQuote) {
      result.push(cur.trim()); cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur.trim())
  return result
}

self.onmessage = function(e) {
  const { text, sep } = e.data
  const result = []
  let pos = 0
  const len = text.length

  let lineEnd = text.indexOf('\n', pos)
  if (lineEnd === -1) { self.postMessage({ rows: [] }); return }
  const headerLine = text.slice(pos, lineEnd).replace(/\r$/, '')
  const headers = splitCsvLine(headerLine, sep).map(h => h.replace(/^"|"$/g, '').trim())
  pos = lineEnd + 1

  let count = 0
  while (pos < len) {
    lineEnd = text.indexOf('\n', pos)
    if (lineEnd === -1) lineEnd = len
    const line = text.slice(pos, lineEnd).replace(/\r$/, '')
    pos = lineEnd + 1
    if (!line.trim() || line.replace(/,/g, '').trim() === '') continue

    const vals = splitCsvLine(line, sep)
    const obj  = {}
    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim()
    })
    result.push(obj)
    count++
    if (count % 10000 === 0) self.postMessage({ progress: count })
  }

  self.postMessage({ rows: result })
}