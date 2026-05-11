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

function textToHtml(text: string): string {
  // Step A: split on ![alt](url) image markdown
  const imgParts = text.split(/(!\[[^\]]*\]\([^)]+\))/g)
  return imgParts.map((part) => {
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      return renderImg(imgMatch[2], imgMatch[1])
    }

    // Step B: split on <img ...> HTML tags
    const htmlImgParts = part.split(/(<img\b[^>]*\/?>)/gi)
    return htmlImgParts.map((p) => {
      if (/^<img\b/i.test(p)) {
        const srcMatch = p.match(/src=["']([^"']+)["']/)
        if (srcMatch) {
          const altMatch = p.match(/alt=["']([^"']*?)["']/)
          return renderImg(srcMatch[1], altMatch ? altMatch[1] : '')
        }
        return ''
      }

      // Step C: bold markdown (**...**)
      const boldParts = p.split(/(\*\*.*?\*\*)/g)
      return boldParts.map((bp) => {
        if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
          return `<strong>${escapeHtml(bp.slice(2, -2))}</strong>`
        }
        // Step D: italic markdown (*...*)
        const italicParts = bp.split(/(\*[^*\n]+\*)/g)
        return italicParts.map((ip) => {
          if (ip.startsWith('*') && ip.endsWith('*') && ip.length > 2) {
            return `<em>${escapeHtml(ip.slice(1, -1))}</em>`
          }
          return escapeHtml(ip)
        }).join('')
      }).join('')
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
