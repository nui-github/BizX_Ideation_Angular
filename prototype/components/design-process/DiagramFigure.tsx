import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minus, Plus, Scan, X } from 'lucide-react';

// A diagram card for the /design-process page. The SVG renders inline; the expand button opens it in
// a full-screen modal where it can be panned (drag) and zoomed (wheel, +/-), anchored on the cursor.

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const BUTTON_STEP = 1.25;
const FRAME_PAD = 32; // equal breathing room on every side of the cropped diagram
const CANVAS_PAD = 16;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

interface Cropped {
  html: string;
  w: number;
  h: number;
}

// Crop the SVG's viewBox to its content plus FRAME_PAD on every side, so the modal has no dead space
// at the right/bottom. The natural size is read from the cropped viewBox. Falls back to the original
// viewBox (then width/height) when the content cannot be measured.
function cropSvg(src: string): Cropped | null {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;width:960px';
  host.innerHTML = src;
  document.body.appendChild(host);
  try {
    const svg = host.querySelector('svg');
    if (!svg) return null;
    let [vx, vy, vw, vh] = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (![vx, vy, vw, vh].every(Number.isFinite) || !vw || !vh) {
      vx = 0; vy = 0;
      vw = parseFloat(svg.getAttribute('width') || '0');
      vh = parseFloat(svg.getAttribute('height') || '0');
      if (!vw || !vh) return null;
    }
    svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
    svg.style.cssText = 'display:block;width:960px;height:auto';
    const svgRect = svg.getBoundingClientRect();
    const sx = vw / svgRect.width;
    const sy = vh / svgRect.height;

    const skip = new Set(['title', 'desc', 'defs', 'style', 'metadata']);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let bg: Element | null = null;
    Array.from(svg.children).forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (skip.has(tag)) return;
      if (tag === 'rect' && el.getAttribute('width') === '100%' && el.getAttribute('height') === '100%') { bg = el; return; }
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      minX = Math.min(minX, vx + (r.left - svgRect.left) * sx);
      minY = Math.min(minY, vy + (r.top - svgRect.top) * sy);
      maxX = Math.max(maxX, vx + (r.right - svgRect.left) * sx);
      maxY = Math.max(maxY, vy + (r.bottom - svgRect.top) * sy);
    });

    let nx = vx, ny = vy, nw = vw, nh = vh;
    if (Number.isFinite(minX) && maxX > minX && maxY > minY) {
      nx = Math.floor(minX - FRAME_PAD);
      ny = Math.floor(minY - FRAME_PAD);
      nw = Math.ceil(maxX - minX + FRAME_PAD * 2);
      nh = Math.ceil(maxY - minY + FRAME_PAD * 2);
    }
    svg.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
    svg.setAttribute('width', String(nw));
    svg.setAttribute('height', String(nh));
    svg.removeAttribute('style');
    if (bg) {
      (bg as Element).setAttribute('x', String(nx));
      (bg as Element).setAttribute('y', String(ny));
      (bg as Element).setAttribute('width', String(nw));
      (bg as Element).setAttribute('height', String(nh));
    }
    return { html: svg.outerHTML, w: nw, h: nh };
  } finally {
    document.body.removeChild(host);
  }
}

const MODAL_CSS = `
.dgm-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.5); }
.dgm-panel { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); width: 92vw; height: calc(100vh - 48px);
  display: flex; flex-direction: column; background: #fff; color: #010136; border-radius: 12px; overflow: hidden;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.35); }
.dgm-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0; font-weight: 800; font-size: 15px; }
.dgm-toolbar { display: flex; justify-content: center; padding: 10px 0; }
.dgm-tools { display: inline-flex; align-items: center; gap: 2px; padding: 4px; border-radius: 10px; background: #f1f5f9; }
.dgm-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0;
  border: 0; border-radius: 8px; background: transparent; color: #334155; cursor: pointer; }
.dgm-btn:hover { background: #e2e8f0; }
.dgm-btn:focus-visible { outline: 2px solid #1f5df9; outline-offset: 1px; }
.dgm-zoom { min-width: 52px; text-align: center; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; color: #334155; }
.dgm-canvas { flex: 1; min-height: 0; display: flex; overflow: auto; padding: ${CANVAS_PAD}px; cursor: grab; touch-action: none;
  background-color: #f8fafc; background-image: radial-gradient(circle, rgba(15, 23, 42, 0.2) 1px, transparent 1.5px);
  background-size: 16px 16px; background-attachment: local; user-select: none; }
.dgm-canvas.panning { cursor: grabbing; }
.dgm-sizer { position: relative; flex: none; margin: auto; }
.dgm-stage { position: absolute; top: 0; left: 0; transform-origin: 0 0; }
.dgm-stage svg { display: block; max-width: none; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .dgm-overlay { background: rgba(0, 0, 0, 0.65); }
  :root:not([data-theme="light"]) .dgm-panel { background: #0f172a; color: #e2e8f0; }
  :root:not([data-theme="light"]) .dgm-head { border-bottom-color: #1e293b; }
  :root:not([data-theme="light"]) .dgm-tools { background: #1e293b; }
  :root:not([data-theme="light"]) .dgm-btn, :root:not([data-theme="light"]) .dgm-zoom { color: #cbd5e1; }
  :root:not([data-theme="light"]) .dgm-btn:hover { background: #334155; }
  :root:not([data-theme="light"]) .dgm-canvas { background-color: #0b1220;
    background-image: radial-gradient(circle, rgba(148, 163, 184, 0.28) 1px, transparent 1.5px); }
}
`;

const DiagramModal: React.FC<{ svg: string; onClose: () => void }> = ({ svg, onClose }) => {
  const cropped = useMemo(() => cropSvg(svg), [svg]);
  const natW = cropped?.w ?? 960;
  const natH = cropped?.h ?? 400;

  const canvasRef = useRef<HTMLDivElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [animate, setAnimate] = useState(false);
  const [panning, setPanning] = useState(false);

  const fitZoom = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return clampZoom((canvas.clientWidth - CANVAS_PAD * 2) / natW);
  };

  // Zoom keeping the point under (cx, cy) fixed. Sizes are written to the DOM straight away so that
  // rapid wheel events always measure against the latest layout.
  const applyZoom = (next: number, cx: number, cy: number) => {
    const canvas = canvasRef.current, sizer = sizerRef.current, stage = stageRef.current;
    const prev = zoomRef.current;
    next = clampZoom(next);
    if (!canvas || !sizer || !stage || next === prev) return;
    const rect = sizer.getBoundingClientRect();
    const px = cx - rect.left;
    const py = cy - rect.top;
    const r = next / prev;
    sizer.style.transition = 'none';
    stage.style.transition = 'none';
    sizer.style.width = `${natW * next}px`;
    sizer.style.height = `${natH * next}px`;
    stage.style.transform = `scale(${next})`;
    const after = sizer.getBoundingClientRect();
    canvas.scrollLeft += after.left + px * r - cx;
    canvas.scrollTop += after.top + py * r - cy;
    zoomRef.current = next;
    setAnimate(false);
    setZoom(next);
  };

  const zoomFromCenter = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    applyZoom(zoomRef.current * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const reset = () => {
    const next = fitZoom();
    zoomRef.current = next;
    setAnimate(true);
    setZoom(next);
    canvasRef.current?.scrollTo({ left: 0, top: 0 });
  };

  // Start at "fit width" before first paint.
  useLayoutEffect(() => {
    const next = fitZoom();
    zoomRef.current = next;
    setZoom(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel must be non-passive so the page behind does not scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
      applyZoom(zoomRef.current * Math.exp(-e.deltaY * unit * 0.0015), e.clientX, e.clientY);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natW, natH]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    panRef.current = { x: e.clientX, y: e.clientY, left: canvas.scrollLeft, top: canvas.scrollTop };
    setPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current, canvas = canvasRef.current;
    if (!pan || !canvas) return;
    canvas.scrollLeft = pan.left - (e.clientX - pan.x);
    canvas.scrollTop = pan.top - (e.clientY - pan.y);
  };
  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    setPanning(false);
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  const transition = animate ? 'width .2s ease, height .2s ease, transform .2s ease' : 'none';

  return createPortal(
    <div className="dgm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{MODAL_CSS}</style>
      <div className="dgm-panel" role="dialog" aria-modal="true" aria-label="Flow Diagram">
        <div className="dgm-head">
          <span>Flow Diagram</span>
          <button type="button" className="dgm-btn" onClick={onClose} aria-label="ปิด" title="ปิด (Esc)">
            <X size={18} />
          </button>
        </div>
        <div className="dgm-toolbar">
          <div className="dgm-tools">
            <button type="button" className="dgm-btn" onClick={() => zoomFromCenter(1 / BUTTON_STEP)} aria-label="ซูมออก" title="ซูมออก">
              <Minus size={16} />
            </button>
            <span className="dgm-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" className="dgm-btn" onClick={() => zoomFromCenter(BUTTON_STEP)} aria-label="ซูมเข้า" title="ซูมเข้า">
              <Plus size={16} />
            </button>
            <button type="button" className="dgm-btn" onClick={reset} aria-label="พอดีความกว้าง" title="พอดีความกว้าง (Reset)">
              <Scan size={16} />
            </button>
          </div>
        </div>
        <div
          ref={canvasRef}
          className={`dgm-canvas${panning ? ' panning' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div ref={sizerRef} className="dgm-sizer" style={{ width: natW * zoom, height: natH * zoom, transition }}>
            <div
              ref={stageRef}
              className="dgm-stage"
              style={{ width: natW, height: natH, transform: `scale(${zoom})`, transition }}
              dangerouslySetInnerHTML={{ __html: cropped?.html ?? svg }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const DiagramFigure: React.FC<{ svg: string; className?: string; children?: React.ReactNode }> = ({ svg, className = '', children }) => {
  const [open, setOpen] = useState(false);
  return (
    <figure className={`relative rounded-xl bg-white border border-slate-200 p-4 shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-3 right-3 z-10 w-8 h-8 p-0 inline-flex items-center justify-center rounded-lg bg-white/90 text-slate-500 hover:text-[#1f5df9] hover:bg-blue-50 border border-slate-200 shadow-sm"
        aria-label="ดูไดอะแกรมแบบเต็มจอ"
        title="ดูแบบเต็มจอ"
      >
        <Maximize2 size={15} />
      </button>
      <div
        className="w-full overflow-x-auto [&_svg]:block [&_svg]:w-full [&_svg]:min-w-[960px]"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-3 text-[12px] font-medium text-slate-400 leading-relaxed">{children}</figcaption>
      {open && <DiagramModal svg={svg} onClose={() => setOpen(false)} />}
    </figure>
  );
};
