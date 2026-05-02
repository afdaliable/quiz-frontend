import { Pipe, PipeTransform } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import katex from 'katex'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textToHtml(text: string): string {
  // Step A: split on ![alt](url) image markdown
  const imgParts = text.split(/(!\[[^\]]*\]\([^)]+\))/g)
  return imgParts.map((part) => {
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      const alt = escapeHtml(imgMatch[1])
      const src = escapeHtml(imgMatch[2])
      return `<img src="${src}" alt="${alt}" class="max-w-full rounded my-1" />`
    }
    // Step B: bold markdown
    const boldParts = part.split(/(\*\*.*?\*\*)/g)
    return boldParts.map((p) => {
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
        return `<strong>${escapeHtml(p.slice(2, -2))}</strong>`
      }
      return escapeHtml(p)
    }).join('')
  }).join('')
}

export function toMathHtml(text: string): string {
  const blockParts = text.split(/(\$\$[\s\S]*?\$\$)/g)
  return blockParts.map((part) => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      const latex = part.slice(2, -2)
      return katex.renderToString(latex, { displayMode: true, throwOnError: false })
    }
    const inlineParts = part.split(/(\$[^$\n]+\$)/g)
    return inlineParts.map((inner) => {
      if (inner.startsWith('$') && inner.endsWith('$') && inner.length > 2) {
        const latex = inner.slice(1, -1)
        return katex.renderToString(latex, { displayMode: false, throwOnError: false })
      }
      return textToHtml(inner)
    }).join('')
  }).join('')
}

@Pipe({
  name: 'mathText',
})
export class MathTextPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return ''
    return this.sanitizer.bypassSecurityTrustHtml(toMathHtml(value))
  }
}
