import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function exportAsCsv(title: string, htmlContent: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const tables = doc.querySelectorAll('table')

  if (tables.length === 0) {
    const text = doc.body.textContent || ''
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `${title}.csv`)
    return
  }

  const ws = XLSX.utils.table_to_sheet(tables[0])
  const csv = XLSX.utils.sheet_to_csv(ws)
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${title}.csv`)
}
