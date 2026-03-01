export interface ParsedUA {
  browser: string
  os: string
  device: string
}

export function parseUserAgent(ua: string): ParsedUA {
  // Device
  let device = 'Desktop'
  if (/iPad|Tablet/i.test(ua)) device = 'Tablet'
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = 'Mobile'

  // OS
  let os = 'Unknown'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|macOS/i.test(ua)) os = 'macOS'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/CrOS/i.test(ua)) os = 'ChromeOS'

  // Browser (order matters)
  let browser = 'Unknown'
  if (/OPR|Opera/i.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet'
  else if (/Edg/i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Safari/i.test(ua)) browser = 'Safari'

  return { browser, os, device }
}

export function formatUserAgent(ua: string): string {
  const { browser, os } = parseUserAgent(ua)
  return `${browser} on ${os}`
}
