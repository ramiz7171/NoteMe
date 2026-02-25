import { saveAs } from 'file-saver'

export function exportAsTxt(title: string, htmlContent: string) {
  // Parse HTML to extract plain text
  const div = document.createElement('div')
  div.innerHTML = htmlContent
  const text = div.innerText || div.textContent || ''
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, `${title}.txt`)
}
