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
  /**
   * Selector tambahan untuk dianggap sebagai "block atomic" yang tidak boleh
   * dipotong saat paginasi PDF. Default sudah mencakup tabel-baris, paragraf,
   * heading, list item, dan elemen ber-`data-pdf-keep-together`.
   */
  keepTogetherSelectors?: string[];
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
 * Kumpulkan posisi-Y (dalam pixel canvas, setelah dikali scale) yang aman
 * sebagai tempat memotong halaman PDF. Strategi:
 *   1. Bottom edge dari setiap top-level child di printable root → break
 *      paling natural (antar section/card).
 *   2. Bottom edge dari elemen "garis-tunggal" (tr, p, li, h1..h4) → break
 *      sekunder jika section terlalu tinggi.
 *   3. Elemen ber-`data-pdf-keep-together` ditambah TOP-nya (boleh break
 *      sebelum) tapi tidak diizinkan break di tengah — caller filter sendiri.
 *
 * Boundary di-deduplikasi & disortir ascending.
 */
function collectBreakBoundaries(
  root: HTMLElement,
  scale: number,
  extraSelectors: string[] = []
): number[] {
  const rootRect = root.getBoundingClientRect();
  const boundaries = new Set<number>([0]);

  const addBottom = (el: Element) => {
    const r = el.getBoundingClientRect();
    const y = Math.round((r.bottom - rootRect.top) * scale);
    if (y > 0) boundaries.add(y);
  };
  const addTop = (el: Element) => {
    const r = el.getBoundingClientRect();
    const y = Math.round((r.top - rootRect.top) * scale);
    if (y > 0) boundaries.add(y);
  };

  for (const child of Array.from(root.children)) {
    addBottom(child);
    addTop(child);
  }

  const secondary = [
    'tr',
    'thead',
    'tbody',
    'p',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    '[data-pdf-keep-together]',
    ...extraSelectors,
  ].join(', ');

  for (const el of Array.from(root.querySelectorAll(secondary))) {
    addBottom(el);
    addTop(el);
  }

  return Array.from(boundaries).sort((a, b) => a - b);
}

/**
 * Pilih posisi cut terbaik untuk satu halaman.
 *   - Mulai dari `yStart` (px canvas).
 *   - Batas atas page = yStart + maxPageHeight.
 *   - Cari boundary terbesar yang ≤ maxEnd DAN > yStart + minPageHeight.
 *   - Kalau tidak ada (mis. elemen tunggal lebih tinggi dari halaman), fallback ke `yStart + maxPageHeight` (forced cut).
 */
function pickPageEnd(
  boundaries: number[],
  yStart: number,
  maxPageHeight: number,
  canvasHeight: number
): number {
  const maxEnd = Math.min(yStart + maxPageHeight, canvasHeight);
  if (maxEnd >= canvasHeight) return canvasHeight;

  // Hindari halaman terlalu pendek (≥ 35% halaman penuh)
  const minEnd = yStart + Math.floor(maxPageHeight * 0.35);

  for (let i = boundaries.length - 1; i >= 0; i--) {
    const b = boundaries[i];
    if (b <= maxEnd && b > minEnd) return b;
  }
  return maxEnd;
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

    // Kumpulkan break boundaries dari CLONE (posisi DOM sesuai apa yang
    // direkam oleh html2canvas). Wajib dilakukan SEBELUM render karena
    // setelah render kita hanya punya canvas pixel, bukan DOM.
    const boundaries = collectBreakBoundaries(clone, scale, options.keepTogetherSelectors);

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
      let safety = 0;
      while (y < canvas.height) {
        if (++safety > 200) throw new Error('Pagination safety stop (>200 pages)');

        const sliceEnd = pickPageEnd(boundaries, y, pageHeightPx, canvas.height);
        const sliceHeight = sliceEnd - y;
        if (sliceHeight <= 0) break;

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
        y = sliceEnd;
        isFirst = false;
      }
    }

    pdf.save(options.filename);
  } finally {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}
