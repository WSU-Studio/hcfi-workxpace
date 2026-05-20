/**
 * Utility export PDF dari DOM.
 *
 * Pakai `html2canvas-pro` (fork modern yang men-support fungsi warna CSS
 * modern seperti `oklch`, `oklab`, `lab`, `lch`, `color()`) untuk merender
 * elemen ke canvas, lalu `jsPDF` untuk menjadikannya PDF.
 *
 * Kenapa tidak `html2pdf.js`?
 * - `html2pdf.js` membundle `html2canvas` original yang BELUM dukung
 *   `oklch` (warna default Tailwind v4) sehingga error
 *   "Attempting to parse an unsupported color function 'oklch'" dan
 *   prosesnya hang.
 *
 * Inline computed colors tetap disediakan sebagai defensive measure untuk
 * properti yang mungkin masih meleset (mis. CSS yang nge-set warna via
 * variabel custom). Aman dipanggil dua-kali tanpa side effect.
 */

import jsPDF from 'jspdf';

const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'fill',
  'stroke',
  'caretColor',
  'accentColor',
  'columnRuleColor',
] as const;

type ColorProp = (typeof COLOR_PROPS)[number];

export function inlineComputedColors(root: HTMLElement): void {
  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  for (const el of elements) {
    const cs = window.getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const value = cs[prop as keyof CSSStyleDeclaration] as string | undefined;
      if (typeof value === 'string' && value) {
        try {
          (el.style as unknown as Record<ColorProp, string>)[prop] = value;
        } catch {
          /* ignore read-only */
        }
      }
    }
  }
}

export type RenderPdfOptions = {
  filename: string;
  /** [top, right, bottom, left] dalam millimeter. Default [10, 10, 14, 10]. */
  margin?: [number, number, number, number];
  /** Scale render html2canvas. Default 2 (HiDPI). */
  scale?: number;
  /** Format kertas. Default 'a4'. */
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  /** Timeout total proses; jika terlewat, throw untuk mencegah UI hang. Default 60s. */
  timeoutMs?: number;
};

/** Bungkus janji dengan timeout — kalau lewat batas, reject dengan pesan jelas. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout setelah ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}

/**
 * Render PDF dari sebuah elemen DOM dengan paginasi otomatis.
 *
 * - Elemen di-clone & dipasang off-screen agar tidak mengganggu live DOM.
 * - Computed colors di-inline sebagai defensive measure (multi-browser).
 * - `html2canvas-pro` merender ke canvas.
 * - Canvas dipotong per-halaman A4 (atau ukuran lain) lalu dimasukkan ke
 *   PDF lewat jsPDF.
 */
export async function renderPdfFromElement(
  source: HTMLElement,
  options: RenderPdfOptions
): Promise<void> {
  const margin = options.margin ?? [10, 10, 14, 10];
  const scale = options.scale ?? 2;
  const format = options.format ?? 'a4';
  const orientation = options.orientation ?? 'portrait';
  const timeoutMs = options.timeoutMs ?? 60_000;

  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = [
    'position: fixed',
    'left: -10000px',
    'top: 0',
    `width: ${source.offsetWidth || 794}px`,
    'background: #ffffff',
    'pointer-events: none',
    'z-index: -1',
  ].join(';');

  const clone = source.cloneNode(true) as HTMLElement;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    inlineComputedColors(clone);

    const { default: html2canvas } = await import('html2canvas-pro');

    const canvas = await withTimeout(
      html2canvas(clone, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      }),
      timeoutMs,
      'Render canvas'
    );

    const pdf = new jsPDF({ unit: 'mm', format, orientation, compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const [mt, mr, mb, ml] = margin;
    const usableWidth = pageWidth - ml - mr;
    const usableHeight = pageHeight - mt - mb;

    const pxPerMm = canvas.width / usableWidth;
    const pageHeightPx = Math.floor(usableHeight * pxPerMm);

    if (canvas.height <= pageHeightPx) {
      const renderedHeight = canvas.height / pxPerMm;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.96),
        'JPEG',
        ml,
        mt,
        usableWidth,
        renderedHeight
      );
    } else {
      let y = 0;
      let isFirst = true;
      while (y < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - y);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Tidak bisa membuat canvas 2D context');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, -y);

        if (!isFirst) pdf.addPage();
        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.96),
          'JPEG',
          ml,
          mt,
          usableWidth,
          sliceHeight / pxPerMm
        );
        y += sliceHeight;
        isFirst = false;
      }
    }

    pdf.save(options.filename);
  } finally {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}
