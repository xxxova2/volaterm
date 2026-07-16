import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTerminalStore } from '../../store/terminalStore';
import { VISUAL_CONFIG } from '../../config/constants';
import { CANVAS } from '../../lib/chartTheme';
import type { SurfaceGrid } from '../../lib/macrovol/api';
import { GREEK_META, type GreekKey } from './greeksTypes';
import { greekRamp01, useGreekSurfaceGeometry } from './useGreekSurfaceGeometry';
import {
  buildGreekSurfaceFromMacroVolGrid,
  type GreekSurfaceInfo,
} from './buildGreekSurfaceGeometry';
import { cn } from '../../lib/utils';
import { EmptyState } from '../common/EmptyState';

const { WIDTH, DEPTH, VISUAL_HEIGHT } = VISUAL_CONFIG.surface;

interface ReadoutPoint {
  strike: number;
  dte: number;
  expiry: string;
  value: number;
}

export type MacrovolMeshMeta = {
  r?: number;
  q?: number;
  r_source?: string;
  source?: string;
  units?: string;
};

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
      <meshPhongMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent
        opacity={0.95}
        wireframe={wireframe}
        shininess={40}
      />
    </mesh>
  );
}

function AtmLine({ x }: { x: number }) {
  return (
    <mesh position={[x, 0, 0]}>
      <boxGeometry args={[0.018, 0.006, DEPTH]} />
      <meshBasicMaterial color={CANVAS.brand} transparent opacity={0.9} />
    </mesh>
  );
}

function Axes({
  info,
  greekLabel,
}: {
  info: GreekSurfaceInfo;
  greekLabel: string;
}) {
  const labelCls = 'text-type-2xs font-mono whitespace-nowrap';

  return (
    <>
      <gridHelper args={[4, 8, CANVAS.grid, CANVAS.gridMinor]} position={[0, 0, 0]} />

      {info.xTicks.map((tick, i) => (
        <Html key={`x${i}-${tick.label}`} position={[tick.px, 0, DEPTH / 2 + 0.05]} center distanceFactor={6}>
          <span className={labelCls} style={{ color: 'var(--muted-foreground)' }} data-testid={`x-tick-${i}`}>
            {tick.label}
          </span>
        </Html>
      ))}
      <Html position={[0, 0, DEPTH / 2 + 0.35]} center distanceFactor={6}>
        <span
          className={`${labelCls} uppercase tracking-wider`}
          style={{ color: 'var(--muted-foreground)' }}
          data-testid="x-axis-label"
        >
          {info.xAxisLabel}
        </span>
      </Html>

      {info.dtes.map((dte, i) => {
        const len = info.dtes.length;
        if (len > 8 && i % Math.ceil((len - 1) / 6) !== 0 && i !== len - 1) return null;
        const pz = (len === 1 ? 0 : i / (len - 1) - 0.5) * DEPTH;
        return (
          <Html key={`z${dte}-${i}`} position={[-WIDTH / 2 - 0.15, 0, pz]} center distanceFactor={6}>
            <span className={labelCls} style={{ color: 'var(--muted-foreground)' }}>{dte}d</span>
          </Html>
        );
      })}
      <Html position={[-WIDTH / 2 - 0.4, 0, -DEPTH / 2 - 0.2]} center distanceFactor={6}>
        <span className={`${labelCls} uppercase tracking-wider`} style={{ color: 'var(--muted-foreground)' }}>
          DTE
        </span>
      </Html>

      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const v = info.minV + t * (info.maxV - info.minV);
        return (
          <Html key={`y${t}`} position={[-WIDTH / 2 - 0.1, t * VISUAL_HEIGHT, DEPTH / 2 + 0.1]} center distanceFactor={6}>
            <span className={labelCls} style={{ color: 'var(--cyan)' }} data-testid={`y-tick-${t}`}>
              {v.toExponential(2)}
            </span>
          </Html>
        );
      })}
      <Html position={[-WIDTH / 2 - 0.4, VISUAL_HEIGHT / 2, DEPTH / 2 + 0.05]} center distanceFactor={6}>
        <span
          className={`${labelCls} uppercase tracking-wider`}
          style={{ color: 'var(--cyan)' }}
          data-testid="y-axis-label"
        >
          {greekLabel} {info.minV.toExponential(2)}–{info.maxV.toExponential(2)}
        </span>
      </Html>
    </>
  );
}

function Legend({
  minV,
  maxV,
  greekLabel,
}: {
  minV: number;
  maxV: number;
  greekLabel: string;
}) {
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1]
    .map(t => {
      const [r, g, b] = greekRamp01(t);
      return `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0}) ${(t * 100).toFixed(0)}%`;
    })
    .join(', ');

  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1 text-type-xs font-mono">
      <div className="flex justify-between gap-2 text-muted-foreground">
        <span>{minV.toExponential(2)}</span>
        <span className="uppercase tracking-wider">{greekLabel}</span>
        <span>{maxV.toExponential(2)}</span>
      </div>
      <div className="w-40 h-2 rounded" style={{ background: `linear-gradient(to right, ${stops})` }} />
    </div>
  );
}

export type GreeksSurface3DProps = {
  /** Controlled greek (Greeks 1.0 ATM cards). Uncontrolled when omitted. */
  greek?: GreekKey;
  onGreekChange?: (g: GreekKey) => void;
  /** Hide internal greek picker when parent owns selection. */
  hideGreekPicker?: boolean;
  className?: string;
  /**
   * MacroVol interpolated grid for this greek (Option A same-API path).
   * When present and valid, mesh uses these numbers (matches Plotly).
   * Falls back to desk LIVE chain when missing/empty (Option C).
   */
  macrovolGrid?: SurfaceGrid | null;
  macrovolSpot?: number;
  macrovolMeta?: MacrovolMeshMeta;
};

export function GreeksSurface3D({
  greek: greekProp,
  onGreekChange,
  hideGreekPicker = false,
  className,
  macrovolGrid = null,
  macrovolSpot,
  macrovolMeta,
}: GreeksSurface3DProps = {}) {
  const snapshot = useTerminalStore(s => s.snapshot);
  const [greekLocal, setGreekLocal] = useState<GreekKey>(greekProp ?? 'gamma');
  const greek = greekProp ?? greekLocal;
  const setGreek = useCallback(
    (g: GreekKey) => {
      if (greekProp == null) setGreekLocal(g);
      onGreekChange?.(g);
    },
    [greekProp, onGreekChange],
  );

  useEffect(() => {
    if (greekProp != null) setGreekLocal(greekProp);
  }, [greekProp]);

  const [wireframe, setWireframe] = useState(false);
  const [hover, setHover] = useState<ReadoutPoint | null>(null);
  const [pointerOver, setPointerOver] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const deskInfo = useGreekSurfaceGeometry(greek);

  const macroInfo = useMemo(() => {
    if (!macrovolGrid?.T_vals?.length || !macrovolGrid?.K_vals?.length) return null;
    const spot = macrovolSpot ?? snapshot?.spot;
    if (spot == null || !(spot > 0)) return null;
    return buildGreekSurfaceFromMacroVolGrid(macrovolGrid, spot);
  }, [macrovolGrid, macrovolSpot, snapshot?.spot]);

  useEffect(() => {
    return () => {
      macroInfo?.geo.dispose();
    };
  }, [macroInfo]);

  // Prefer MacroVol when ready (Option A); else desk chain (Option C fallback).
  const info = macroInfo ?? deskInfo;
  const autoRotate = !reduceMotion && !pointerOver;

  const atmX = useMemo(() => {
    if (!info || info.strikes.length === 0) return 0;
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < info.strikes.length; i++) {
      const d = Math.abs(info.strikes[i]! - info.spot);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return info.strikeXs[bestIdx] ?? 0;
  }, [info]);

  const buildReadout = useCallback(
    (px: number, pz: number): ReadoutPoint | null => {
      if (!info) return null;
      const cell = info.mapPointToCell(px, pz);
      if (!cell) return null;
      const strike = info.strikes[cell.strikeIdx];
      const dte = info.dtes[cell.expiryIdx];
      if (strike == null || dte == null) return null;

      if (info.source === 'macrovol') {
        const v = info.values[cell.expiryIdx]?.[cell.strikeIdx];
        if (v == null || !Number.isFinite(v)) return null;
        return { strike, dte, expiry: `${dte}d`, value: v };
      }

      if (!snapshot) return null;
      const slice = snapshot.expiries[cell.expiryIdx];
      if (!slice) return null;
      const preferPut = strike < info.spot;
      const primary = preferPut ? slice.puts : slice.calls;
      const secondary = preferPut ? slice.calls : slice.puts;
      const q =
        primary.find(qq => qq.strike === strike)
        ?? secondary.find(qq => qq.strike === strike)
        ?? null;
      const v = q?.[greek];
      if (v == null || !Number.isFinite(v)) return null;
      return { strike, dte, expiry: slice.expiry, value: v };
    },
    [info, snapshot, greek],
  );

  const handlePointerMove = useCallback(
    (e: THREE.Event) => {
      const evt = e as unknown as { point: THREE.Vector3; stopPropagation: () => void };
      evt.stopPropagation();
      setHover(buildReadout(evt.point.x, evt.point.z));
    },
    [buildReadout],
  );

  const handleClick = useCallback(
    (e: THREE.Event) => {
      const evt = e as unknown as { point: THREE.Vector3; stopPropagation: () => void };
      evt.stopPropagation();
      setHover(buildReadout(evt.point.x, evt.point.z));
    },
    [buildReadout],
  );

  const greekRow1 = GREEK_META.slice(0, 7);
  const greekRow2 = GREEK_META.slice(7);

  const hasAnyData = Boolean(info) || Boolean(snapshot) || Boolean(macroInfo);
  if (!hasAnyData) {
    return (
      <EmptyState
        kind="no-data"
        title="No surface for 3D mesh"
        body="Load yfinance greeks or a LIVE chain to render the mesh."
        className="h-full"
      />
    );
  }

  if (!info) {
    return (
      <EmptyState
        kind="no-data"
        title="Building mesh…"
        body={macrovolGrid ? 'Greeks grid not dense enough yet; waiting for desk chain…' : 'Need ≥2 expiries on the chain.'}
        className="h-full"
      />
    );
  }

  const r = macrovolMeta?.r;
  const q = macrovolMeta?.q;
  const rSrc = macrovolMeta?.r_source;
  const provLabel =
    info.source === 'macrovol'
      ? `yfinance OTM grid · same API as Plotly`
      : `desk LIVE chain · fallback`;

  return (
    <div
      className={cn('relative h-full w-full min-h-[320px]', className)}
      onPointerEnter={() => setPointerOver(true)}
      onPointerLeave={() => setPointerOver(false)}
      data-mesh-source={info.source}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap gap-x-2 gap-y-0.5 border-b border-border/50 bg-background/90 px-2 py-0.5 font-mono text-type-2xs text-muted-foreground backdrop-blur-sm">
        <span className="text-foreground" data-testid="mesh-provenance">
          {provLabel}
        </span>
        <span>· OTM · θ &amp; charm /day · ν /1vol</span>
        {r != null && Number.isFinite(r) && (
          <span>
            r={(r * 100).toFixed(2)}%
            {rSrc ? ` (${rSrc})` : ''}
          </span>
        )}
        {q != null && Number.isFinite(q) && <span>q={(q * 100).toFixed(2)}%</span>}
        {info.source === 'desk' && snapshot && (
          <span className="text-muted-foreground/80">
            {snapshot.symbol} · may differ vs greeks API when r/q/IV source differ
          </span>
        )}
      </div>
      <Canvas
        camera={{ position: [3.4, 2.8, 3.8], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'var(--background)', paddingTop: 22 }}
        className="pt-5"
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
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
        />
        <SurfaceMesh
          geo={info.geo}
          wireframe={wireframe}
          onPointerMove={handlePointerMove}
          onClick={handleClick}
        />
        <AtmLine x={atmX} />
        <Axes info={info} greekLabel={GREEK_META.find(g => g.key === greek)?.label ?? greek} />
      </Canvas>

      <Legend
        minV={info.minV}
        maxV={info.maxV}
        greekLabel={GREEK_META.find(g => g.key === greek)?.label ?? greek}
      />

      <div className="absolute left-3 top-8 flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <button
            data-testid="wireframe-toggle"
            onClick={() => setWireframe(w => !w)}
            className="px-2 py-1 text-type-xs font-mono bg-card border border-border rounded hover:bg-muted text-muted-foreground"
          >
            {wireframe ? 'Solid' : 'Wireframe'}
          </button>
          <div className="px-2 py-1 text-type-2xs font-mono bg-card/80 border border-border rounded text-muted-foreground">
            <div>
              Spot <span className="text-foreground tabular-nums">{info.spot.toFixed(2)}</span>
            </div>
            <div>
              {GREEK_META.find(g => g.key === greek)?.label ?? greek}{' '}
              <span className="text-cyan tabular-nums">
                {info.minV.toExponential(2)}–{info.maxV.toExponential(2)}
              </span>
            </div>
          </div>
        </div>
        {!hideGreekPicker && (
          <div className="flex flex-col gap-0.5 px-2 py-1 bg-card/80 border border-border rounded">
            <div className="flex gap-1">
              {greekRow1.map(g => (
                <button
                  key={g.key}
                  type="button"
                  data-greek-button={g.key}
                  onClick={() => setGreek(g.key)}
                  className={cn(
                    'px-1.5 py-0.5 text-type-xs font-mono rounded',
                    greek === g.key ? 'bg-secondary text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {greekRow2.map(g => (
                <button
                  key={g.key}
                  type="button"
                  data-greek-button={g.key}
                  onClick={() => setGreek(g.key)}
                  className={cn(
                    'px-1.5 py-0.5 text-type-xs font-mono rounded',
                    greek === g.key ? 'bg-secondary text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hover && (
        <div
          data-greek-3d-readout=""
          className="pointer-events-none absolute bottom-3 left-3 z-10 bg-card/90 border border-border rounded px-2 py-1 text-type-2xs font-mono text-muted-foreground"
        >
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
            <span>Strike</span>
            <span className="tabular-nums text-foreground text-right">{hover.strike.toFixed(2)}</span>
            <span>DTE</span>
            <span className="tabular-nums text-foreground text-right">{hover.dte}d</span>
            <span>{GREEK_META.find(g => g.key === greek)?.label ?? greek}</span>
            <span className="tabular-nums text-cyan text-right">{hover.value.toExponential(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
