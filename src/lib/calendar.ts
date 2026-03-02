/**
 * Calendar sync utilities — one-click URL-based sync for Google/Outlook,
 * plus .ics download fallback for Apple/Windows Calendar.
 */

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/** Format date as YYYYMMDDTHHMMSSZ for Google Calendar URLs */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

interface CalendarEventOpts {
  title: string
  description: string
  startDate: Date
  endDate?: Date
  uid?: string
}

/* ─── One-click URL openers ─── */

export function openGoogleCalendar(opts: CalendarEventOpts) {
  const start = formatGoogleDate(opts.startDate)
  const end = formatGoogleDate(opts.endDate ?? new Date(opts.startDate.getTime() + 60 * 60 * 1000))
  const plain = stripHtml(opts.description).slice(0, 500)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${start}/${end}`,
    details: plain,
  })

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank')
}

export function openOutlookCalendar(opts: CalendarEventOpts) {
  const start = opts.startDate.toISOString()
  const end = (opts.endDate ?? new Date(opts.startDate.getTime() + 60 * 60 * 1000)).toISOString()
  const plain = stripHtml(opts.description).slice(0, 500)

  const params = new URLSearchParams({
    subject: opts.title,
    startdt: start,
    enddt: end,
    body: plain,
    path: '/calendar/action/compose',
  })

  window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank')
}

/* ─── .ics file download (Apple Calendar, Windows Calendar, etc.) ─── */

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function downloadICS(opts: CalendarEventOpts) {
  const start = formatGoogleDate(opts.startDate)
  const end = formatGoogleDate(opts.endDate ?? new Date(opts.startDate.getTime() + 60 * 60 * 1000))
  const now = formatGoogleDate(new Date())
  const uid = opts.uid || `${Date.now()}@criptnote.app`
  const plain = stripHtml(opts.description).slice(0, 500)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CriptNote//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(opts.title)}`,
    `DESCRIPTION:${escapeICS(plain)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(opts.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${opts.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
