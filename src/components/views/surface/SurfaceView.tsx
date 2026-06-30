import { useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTerminalStore } from '../../../store/terminalStore';
import { ivRamp01 } from '../../../lib/options/color';
import { VISUAL_CONFIG } from '../../../config/constants';
import { SurfaceTools, type SliceMode } from './SurfaceTools';
import { SurfaceInspect, type InspectPoint } from './SurfaceInspect';

const { MONEYNESS_MIN, MONEYNESS_MAX, WIDTH, DEPTH, VISUAL_HEIGHT, IV_CAP, UPSCALE, X_TICKS } = VISUAL_CONFIG.surface;

function upsampleGrid(
  iv: number[][],
  nZ: number,
  nX: number,
  factor: number,
): { values: number[][]; nZ2: number; nX2: number } {
  const nZ2 = (nZ - 1) * factor + 1;
  const nX2 = (nX - 1) * factor + 1;
  const values: number[][] = Array.from({ length: nZ2 }, () => Array(nX2).fill(0));

  for (let z2 = 0; z2 < nZ2; z2++) {
    const zf = z2 / factor;
    const z0 = Math.floor(zf);
    const z1 = Math.min(z0 + 1, nZ - 1);
    const tz = zf - z0;

    for (let x2 = 0; x2 < nX2; x2++) {
      const xf = x2 / factor;
      const x0 = Math.floor(xf);
      const x1 = Math.min(x0 + 1, nX - 1);
      const tx = xf - x0;

      const v00 = iv[z0]![x0]!;
      const v10 = iv[z0]![x1]!;
      const v01 = iv[z1]![x0]!;
      const v11 = iv[z1]![x1]!;

      const top = v00 * (1 - tx) + v10 * tx;
      const bot = v01 * (1 - tx) + v11 * tx;
      values[z2]![x2] = top * (1 - tz) + bot * tz;
    }
  }

  return { values, nZ2, nX2 };
}

interface GeometryInfo {
  geo: THREE.BufferGeometry;
  nZ: number;
  minIV: number;
  maxIV: number;
  atmPx: number;
  dtes: number[];
  pxForRatio: (ratio: number) => number;
  spot: number;
  start: number;
  end: number;
  nX: number;
  nX2: number;
  nZ2: number;
  mapPointToCell: (px: number, pz: number) => { expiryIdx: number; strikeIdx: number } | null;
}

function useSurfaceGeometry(): GeometryInfo | null {
  const surface = useTerminalStore(s => s.surface);
  const snapshot = useTerminalStore(s => s.snapshot);
  const spot = useTerminalStore(s => s.snapshot?.spot ?? 100);

  return useMemo(() => {
    if (!surface || !snapshot || surface.strikes.length < 2 || surface.expiries.length < 2) {
      return null;
    }

    const start = surface.strikes.findIndex(s => s / spot >= MONEYNESS_MIN);
    const end = surface.strikes.findLastIndex(s => s / spot <= MONEYNESS_MAX);
    if (start < 0 || end <= start) return null;

    const nX = end - start + 1;
    const nZ = surface.expiries.length;

    const logM = (strike: number) => Math.log(strike / spot);
    const logMMin = logM(surface.strikes[start]!);
    const logMMax = logM(surface.strikes[end]!);
    const logMSpan = logMMax - logMMin || 1;

    const rawIV: number[][] = [];
    for (let z = 0; z < nZ; z++) {
      const row: number[] = [];
      for (let x = 0; x < nX; x++) {
        const v = surface.iv[z]?.[start + x];
        row.push(v != null && isFinite(v) ? Math.min(v, IV_CAP) : IV_CAP * 0.5);
      }
      rawIV.push(row);
    }

    const { values: ivGrid, nZ2, nX2 } = upsampleGrid(rawIV, nZ, nX, UPSCALE);

    let minIV = Infinity, maxIV = -Infinity;
    for (let z = 0; z < nZ2; z++) {
      for (let x = 0; x < nX2; x++) {
        const v = ivGrid[z]![x]!;
        if (v < minIV) minIV = v;
        if (v > maxIV) maxIV = v;
      }
    }
    const range = maxIV - minIV || 1;

    const positions = new Float32Array(nX2 * nZ2 * 3);
    const colors = new Float32Array(nX2 * nZ2 * 3);
    const indices: number[] = [];

    for (let z = 0; z < nZ2; z++) {
      for (let x = 0; x < nX2; x++) {
        const idx = z * nX2 + x;

        const logMVal = logMMin + (logMMax - logMMin) * (x / (nX2 - 1));
        const strike = spot * Math.exp(logMVal);
        const px = (logM(strike) - logMMin) / logMSpan * WIDTH - WIDTH / 2;
        const pz = (z / (nZ2 - 1) - 0.5) * DEPTH;
        const cv = ivGrid[z]![x]!;
        const py = (cv - minIV) / range * VISUAL_HEIGHT;

        positions[idx * 3] = px;
        positions[idx * 3 + 1] = py;
        positions[idx * 3 + 2] = pz;

        const t = (cv - minIV) / range;
        const [r, g, b] = ivRamp01(t);
        colors[idx * 3] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;

        if (x < nX2 - 1 && z < nZ2 - 1) {
          const a = idx, bi = idx + 1, c = idx + nX2, d = idx + nX2 + 1;
          indices.push(a, bi, c, bi, d, c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    let atmPx = 0;
    let best = Infinity;
    for (let i = start; i <= end; i++) {
      const s = surface.strikes[i]!;
      const d = Math.abs(s - spot);
      if (d < best) { best = d; atmPx = (logM(s) - logMMin) / logMSpan * WIDTH - WIDTH / 2; }
    }

    const mapPointToCell = (px: number, pz: number): { expiryIdx: number; strikeIdx: number } | null => {
      const x2 = Math.round(((px + WIDTH / 2) / WIDTH) * (nX2 - 1));
      const z2 = Math.round(((pz / DEPTH) + 0.5) * (nZ2 - 1));
      if (x2 < 0 || x2 >= nX2 || z2 < 0 || z2 >= nZ2) return null;
      const expiryIdx = Math.round(z2 / UPSCALE);
      const strikeIdx = start + Math.round(x2 / UPSCALE);
      if (expiryIdx < 0 || expiryIdx >= nZ || strikeIdx < 0 || strikeIdx >= surface.strikes.length) return null;
      return { expiryIdx, strikeIdx };
    };

    return {
      geo,
      nZ: nZ2,
      minIV,
      maxIV,
      atmPx,
      dtes: snapshot.expiries.map(e => e.dte),
      pxForRatio: (ratio: number) => (Math.log(ratio) - logMMin) / logMSpan * WIDTH - WIDTH / 2,
      spot,
      start,
      end,
      nX,
      nX2,
      nZ2,
      mapPointToCell,
    };
  }, [surface, snapshot, spot]);
}

function SurfaceMesh({
  geo,
  wireframe,
  onPointerMove,
  onClick,
}: {
  geo: THREE.BufferGeometry;
  wireframe: boolean;
  onPointerMove?: (e: THREE.Event) => void;
  onClick?: (e: THREE.Event) => void;
}) {
  return (
    <mesh geometry={geo} onPointerMove={onPointerMove} onClick={onClick}>
      <meshPhongMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.92} wireframe={wireframe} shininess={40} />
    </mesh>
  );
}

function SurfaceAtmLine({ atmPx }: { atmPx: number }) {
  return (
    <mesh position={[atmPx, 0, 0]}>
      <boxGeometry args={[0.018, 0.006, DEPTH]} />
      <meshBasicMaterial color="#f0b400" transparent opacity={0.9} />
    </mesh>
  );
}

function SurfaceAxes({ info }: { info: GeometryInfo }) {
  const labelCls = 'text-[9px] font-mono whitespace-nowrap';

  return (
    <>
      <gridHelper args={[4, 8, '#2a2a33', '#1f1f26']} position={[0, 0, 0]} />

      {X_TICKS.map((ratio: number) => (
        <Html key={`x${ratio}`} position={[info.pxForRatio(ratio), 0, DEPTH / 2 + 0.05]} center distanceFactor={6}>
          <span className={labelCls} style={{ color: 'var(--muted-foreground)' }}>
            {Math.round(ratio * 100)}%
          </span>
        </Html>
      ))}
      <Html position={[0, 0, DEPTH / 2 + 0.35]} center distanceFactor={6}>
        <span className={`${labelCls} uppercase tracking-wider`} style={{ color: 'var(--muted-foreground)' }}>
          Strike / Spot
        </span>
      </Html>

      {info.dtes.map((dte, i) => {
        const len = info.dtes.length;
        if (len > 8 && i % Math.ceil((len - 1) / 6) !== 0 && i !== len - 1) return null;
        return (
          <Html
            key={`z${dte}`}
            position={[-WIDTH / 2 - 0.15, 0, (i / (len - 1) - 0.5) * DEPTH]}
            center
            distanceFactor={6}
          >
            <span className={labelCls} style={{ color: 'var(--muted-foreground)' }}>{dte}d</span>
          </Html>
        );
      })}
      <Html position={[-WIDTH / 2 - 0.4, 0, -DEPTH / 2 - 0.2]} center distanceFactor={6}>
        <span className={`${labelCls} uppercase tracking-wider`} style={{ color: 'var(--muted-foreground)' }}>
          DTE
        </span>
      </Html>

      {[0, 0.5, 1].map(t => {
        const iv = info.minIV + t * (info.maxIV - info.minIV);
        return (
          <Html key={`y${t}`} position={[-WIDTH / 2 - 0.1, t * VISUAL_HEIGHT, DEPTH / 2 + 0.1]} center distanceFactor={6}>
            <span className={labelCls} style={{ color: 'var(--cyan)' }}>{(iv * 100).toFixed(1)}%</span>
          </Html>
        );
      })}
    </>
  );
}

function SurfaceLegend({ minIV, maxIV }: { minIV: number; maxIV: number }) {
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => {
    const [r, g, b] = ivRamp01(t);
    return `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0}) ${(t * 100).toFixed(0)}%`;
  }).join(', ');

  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1 text-[10px] font-mono">
      <div className="flex justify-between text-muted-foreground">
        <span>{(minIV * 100).toFixed(1)}%</span>
        <span className="uppercase tracking-wider">IV</span>
        <span>{(maxIV * 100).toFixed(1)}%</span>
      </div>
      <div className="w-40 h-2 rounded" style={{ background: `linear-gradient(to right, ${stops})` }} />
    </div>
  );
}

export function SurfaceView() {
  const [wireframe, setWireframe] = useState(false);
  const [sliceMode, setSliceMode] = useState<SliceMode>('none');
  const [hover, setHover] = useState<InspectPoint | null>(null);
  const [selected, setSelected] = useState<InspectPoint | null>(null);

  const info = useSurfaceGeometry();
  const spot = useTerminalStore(s => s.snapshot?.spot ?? 0);
  const surface = useTerminalStore(s => s.surface);
  const snapshot = useTerminalStore(s => s.snapshot);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  const selectedExpiry = useTerminalStore(s => s.selectedExpiry);

  const buildPoint = useCallback((px: number, pz: number): InspectPoint | null => {
    if (!info || !surface || !snapshot) return null;
    const cell = info.mapPointToCell(px, pz);
    if (!cell) return null;
    const expiry = surface.expiries[cell.expiryIdx];
    const strike = surface.strikes[cell.strikeIdx];
    const iv = surface.iv[cell.expiryIdx]?.[cell.strikeIdx];
    if (!expiry || strike == null || iv == null || !isFinite(iv)) return null;
    const slice = snapshot.expiries[cell.expiryIdx];
    const dte = slice?.dte ?? 0;
    const quote = slice?.calls.find(q => q.strike === strike) ?? slice?.puts.find(q => q.strike === strike);
    return { strike, expiry, dte, iv, delta: quote?.delta ?? null };
  }, [info, surface, snapshot]);

  const handlePointerMove = useCallback((e: THREE.Event) => {
    const evt = e as unknown as { point: THREE.Vector3; stopPropagation: () => void };
    evt.stopPropagation();
    setHover(buildPoint(evt.point.x, evt.point.z));
  }, [buildPoint]);

  const handleClick = useCallback((e: THREE.Event) => {
    const evt = e as unknown as { point: THREE.Vector3; stopPropagation: () => void };
    evt.stopPropagation();
    const p = buildPoint(evt.point.x, evt.point.z);
    if (p) {
      setSelected(p);
      useTerminalStore.getState().setSelectedExpiry(p.expiry);
    }
  }, [buildPoint]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [3.4, 2.8, 3.8], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'var(--background)' }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <OrbitControls
          enablePan={false}
          target={[0, 0.5, 0]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={9}
        />
        {info && (
          <>
            <SurfaceMesh
              geo={info.geo}
              wireframe={wireframe}
              onPointerMove={handlePointerMove}
              onClick={handleClick}
            />
            <SurfaceAtmLine atmPx={info.atmPx} />
            <SurfaceAxes info={info} />
          </>
        )}
      </Canvas>

      {info && <SurfaceLegend minIV={info.minIV} maxIV={info.maxIV} />}

      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <button
          onClick={() => setWireframe(w => !w)}
          className="px-2 py-1 text-[10px] font-mono bg-card border border-border rounded hover:bg-muted text-muted-foreground"
        >
          {wireframe ? 'Solid' : 'Wireframe'}
        </button>
        {info && (
          <div className="px-2 py-1 text-[9px] font-mono bg-card/80 border border-border rounded text-muted-foreground">
            <div>Spot <span className="text-foreground tabular-nums">{spot.toFixed(2)}</span></div>
            <div>IV <span className="text-cyan tabular-nums">{(info.minIV * 100).toFixed(1)}–{(info.maxIV * 100).toFixed(1)}%</span></div>
          </div>
        )}
      </div>

      <SurfaceTools
        surface={surface}
        sviReadout={sviReadout}
        arbResult={arbResult}
        sliceMode={sliceMode}
        onSliceMode={setSliceMode}
        selectedExpiry={selectedExpiry}
        selectedStrike={selected?.strike ?? null}
      />

      <SurfaceInspect hover={hover} selected={selected} />
    </div>
  );
}
