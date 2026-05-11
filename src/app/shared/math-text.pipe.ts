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

function renderImg(src: string, alt: string): string {
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="max-w-full rounded my-1" />`
}

// Process ![alt](url) markdown images only — everything else passes through as raw HTML
function processMarkdownImages(text: string): string {
  return text.replace(/(!\[[^\]]*\]\([^)]+\))/g, (match) => {
    const m = match.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    return m ? renderImg(m[2], m[1]) : match
  })
}

export function toMathHtml(text: string): string {
  // Block KaTeX ($$...$$)
  const blockParts = text.split(/(\$\$[\s\S]*?\$\$)/g)
  return blockParts.map((part) => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
      const latex = part.slice(2, -2)
      return katex.renderToString(latex, { displayMode: true, throwOnError: false })
    }
    // Inline KaTeX ($...$)
    const inlineParts = part.split(/(\$[^$\n]+\$)/g)
    return inlineParts.map((inner) => {
      if (inner.startsWith('$') && inner.endsWith('$') && inner.length > 2) {
        const latex = inner.slice(1, -1)
        return katex.renderToString(latex, { displayMode: false, throwOnError: false })
      }
      // Pass HTML from backend through as-is; only convert markdown image syntax
      return processMarkdownImages(inner)
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
