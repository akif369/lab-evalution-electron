export type CsvParsedRow = {
  lineNumber: number
  cells: string[]
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const nextChar = i + 1 < line.length ? line[i + 1] : ''

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

export function parseCsvText(text: string): CsvParsedRow[] {
  const lines = text.split(/\r?\n/)
  const parsed: CsvParsedRow[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    if (!rawLine || rawLine.trim() === '') continue

    parsed.push({
      lineNumber: index + 1,
      cells: parseCsvLine(rawLine),
    })
  }

  return parsed
}

export function looksLikeHeader(cells: string[]): boolean {
  const normalized = cells.map((cell) => cell.toLowerCase().trim())
  return normalized.includes('id') && normalized.includes('name')
}
