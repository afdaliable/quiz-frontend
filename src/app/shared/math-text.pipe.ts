import { Pipe, PipeTransform } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import katex from 'katex'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function textToHtml(text: string): string {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`
    }
    return escapeHtml(part)
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
