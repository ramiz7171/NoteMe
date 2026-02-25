import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function exportAsExcel(title: string, htmlContent: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const tables = doc.querySelectorAll('table')

  const wb = XLSX.utils.book_new()

  if (tables.length === 0) {
    const text = doc.body.textContent || ''
    const rows = text.split('\n').filter((l) => l.trim()).map((line) => [line])
    const ws = XLSX.utils.aoa_to_sheet([[title], ...rows])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  } else {
    tables.forEach((table, i) => {
      const ws = XLSX.utils.table_to_sheet(table)
      XLSX.utils.book_append_sheet(wb, ws, `Table ${i + 1}`)
    })
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${title}.xlsx`)
}
