'use client';

import { useCallback } from 'react';
import { Download, FileSpreadsheet, ImageIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRidership } from '@/hooks/use-ridership';

/**
 * Build CSV string from ridership data.
 */
function buildCSV(data: ReturnType<typeof useRidership>['data']): string {
  const headers = [
    'Date',
    'MRT Kajang (SBK)',
    'MRT Putrajaya (SSP)',
    'LRT Kelana Jaya',
    'LRT Ampang',
    'Monorail',
    'KTM Komuter',
    'Total Rail',
    'Bus KL',
  ];

  const rows = data.map((d) =>
    [d.date, d.mrtKajang, d.mrtPutrajaya, d.lrtKelanaJaya, d.lrtAmpang, d.monorail, d.komuter, d.total, d.busKl].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download helper: tries `a.click()` first, falls back to `window.open()`.
 * Works in both normal browsers and sandboxed iframes.
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  // Primary: create an anchor and click it
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Delay cleanup so the browser can initiate the download
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 250);
    return true;
  } catch {
    // noop — fall through to window.open
  }

  // Fallback: open the blob URL in a new tab
  try {
    const win = window.open(url, '_blank');
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }
  } catch {
    // noop
  }

  URL.revokeObjectURL(url);
  return false;
}

/**
 * Serialize an SVG element to a PNG Blob via Canvas.
 * Works natively — no external libraries needed.
 */
async function svgToPNG(
  svgElement: SVGSVGElement,
  opts: { scale?: number; background?: string } = {}
): Promise<Blob | null> {
  const scale = opts.scale ?? 2;
  const background = opts.background ?? '#0a120a';

  // Serialize SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  // Compute dimensions from the SVG's viewBox or explicit width/height
  const viewBox = svgElement.getAttribute('viewBox');
  let svgWidth = 800;
  let svgHeight = 400;

  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      svgWidth = parts[2] - parts[0];
      svgHeight = parts[3] - parts[1];
    }
  }
  const w = svgElement.getAttribute('width');
  const h = svgElement.getAttribute('height');
  if (w) svgWidth = parseFloat(w) || svgWidth;
  if (h) svgHeight = parseFloat(h) || svgHeight;

  // Use a container div to get the rendered size
  const container = svgElement.closest('[data-chart]');
  if (container) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0) svgWidth = rect.width;
    if (rect.height > 0) svgHeight = rect.height;
  }

  // Create an image from the SVG
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }

      // Draw background
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => resolve(pngBlob), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function useCSVExport() {
  const { data } = useRidership();

  const exportCSV = useCallback(() => {
    if (!data.length) return;
    const csv = buildCSV(data);
    const filename = `rapidstats_${data[data.length - 1]?.date ?? 'data'}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  }, [data]);

  return { exportCSV };
}

function usePNGExport() {
  const exportPNG = useCallback(async () => {
    const chartContainer = document.querySelector('[data-chart]') as HTMLElement;
    if (!chartContainer) return;

    // Try to find the SVG rendered by Recharts
    const svg = chartContainer.querySelector('svg.recharts-surface') as SVGSVGElement
      ?? chartContainer.querySelector('svg') as SVGSVGElement;

    if (svg) {
      // Determine background color based on theme
      const isDark = document.documentElement.classList.contains('dark');
      const background = isDark ? '#0a120a' : '#f5f5f0';

      const pngBlob = await svgToPNG(svg, { scale: 2, background });
      if (pngBlob) {
        const ok = downloadBlob(pngBlob, 'rapidstats_chart.png');
        if (ok) return;
      }
    }

    // Last resort: html2canvas (if available)
    try {
      const html2canvas = (await import('html2canvas')).default;
      const isDark = document.documentElement.classList.contains('dark');
      const bg = isDark ? '#0a120a' : '#f5f5f0';

      const canvas = await html2canvas(chartContainer, {
        backgroundColor: bg,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (pngBlob) {
        downloadBlob(pngBlob, 'rapidstats_chart.png');
      }
    } catch {
      // Silent fail
    }
  }, []);

  return { exportPNG };
}

export function ExportDropdown() {
  const { exportCSV } = useCSVExport();
  const { exportPNG } = usePNGExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--text-secondary)] px-3 py-2 rounded-full bg-[var(--surface-card)] border border-[var(--border-faint)] hover:bg-[var(--surface-active)] transition-all duration-200"
          aria-label="Export data"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[var(--bg-dropdown)]/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-xl"
      >
        <DropdownMenuItem
          onSelect={exportCSV}
          className="flex items-center gap-3 py-2.5 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">CSV (raw data)</p>
            <p className="text-[10px] text-[var(--text-faint)]">Spreadsheet-compatible format</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={exportPNG}
          className="flex items-center gap-3 py-2.5 cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-sky-400" />
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">PNG (chart image)</p>
            <p className="text-[10px] text-[var(--text-faint)]">High-resolution screenshot</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
