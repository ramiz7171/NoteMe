export interface StrokeData {
  points: [number, number, number][]
  color: string
  size: number
  tool: 'pen' | 'marker' | 'highlighter' | 'eraser'
  opacity: number
}

export function getStrokeOptions(tool: string, size: number) {
  switch (tool) {
    case 'marker':
      return { size: size * 2.5, thinning: 0.1, smoothing: 0.5, streamline: 0.3, simulatePressure: true }
    case 'highlighter':
      return { size: size * 4, thinning: 0, smoothing: 0.5, streamline: 0.3, simulatePressure: false }
    case 'eraser':
      return { size: size * 3, thinning: 0, smoothing: 0.5, streamline: 0.5, simulatePressure: false }
    default: // pen
      return { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true }
  }
}

export function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return ''

  const d: (string | number)[] = []
  const [fx, fy] = points[0]
  d.push('M', fx, fy)

  if (points.length === 1) {
    d.push('L', fx + 0.01, fy + 0.01)
    return d.join(' ')
  }

  d.push('Q')
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[(i + 1) % points.length]
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  d.push('Z')
  return d.join(' ')
}
