import { saveAs } from 'file-saver'

export async function exportAsDocx(title: string, htmlContent: string) {
  try {
    const htmlToDocx = (await import('html-to-docx')).default
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${htmlContent}</body></html>`
    const blob = await htmlToDocx(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    })
    saveAs(blob as Blob, `${title}.docx`)
  } catch (err) {
    console.error('html-to-docx failed, falling back to HTML download:', err)
    // Fallback: export as .doc (HTML format that Word can open)
    const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title></head><body>${htmlContent}</body></html>`
    const blob = new Blob([fullHtml], { type: 'application/msword' })
    saveAs(blob, `${title}.doc`)
  }
}
