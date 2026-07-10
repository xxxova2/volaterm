import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTerminalStore } from '../../store/terminalStore';
import { VISUAL_CONFIG } from '../../config/constants';
import { GREEK_META, type GreekKey } from './greeksTypes';
import { greekRamp01, useGreekSurfaceGeometry } from './useGreekSurfaceGeometry';
import { cn } from '../../lib/utils';
import { EmptyState } from '../common/EmptyState';

const { WIDTH, DEPTH, VISUAL_HEIGHT } = VISUAL_CONFIG.surface;

interface ReadoutPoint {
  strike: number;
  dte: number;
  expiry: string;
  value: number;
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
      <meshBasicMaterial color="#f0b400" transparent opacity={0.9} />
    </mesh>
  );
}

function Axes({
  info,
  greekLabel,
}: {
  info: NonNullable<ReturnType<typeof useGreekSurfaceGeometry>>;
  greekLabel: string;
}) {
  const labelCls = 'text-type-2xs font-mono whitespace-nowrap';

  return (
    <>
      <gridHelper args={[4, 8, '#2a2a33', '#1f1f26']} position={[0, 0, 0]} />

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

export function GreeksSurface3D() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const [greek, setGreek] = useState<GreekKey>('gamma');
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

  const info = useGreekSurfaceGeometry(greek);
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
      if (!info || !snapshot) return null;
      const cell = info.mapPointToCell(px, pz);
      if (!cell) return null;
      const strike = info.strikes[cell.strikeIdx];
      const dte = info.dtes[cell.expiryIdx];
      const slice = snapshot.expiries[cell.expiryIdx];
      if (strike == null || dte == null || !slice) return null;
      const callQuote = slice.calls.find(q => q.strike === strike);
      const putQuote = callQuote ? null : slice.puts.find(q => q.strike === strike);
      const q = callQuote ?? putQuote;
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

  if (!snapshot) {
    return (
      <EmptyState
        kind="no-data"
        title="No chain for 3D surface"
        body="Load a LIVE surface to render greek mesh."
        className="h-full"
      />
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onPointerEnter={() => setPointerOver(true)}
      onPointerLeave={() => setPointerOver(false)}
    >
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
          autoRotate={autoRotate}
          autoRotateSpeed={0.4}
        />
        {info && (
          <>
            <SurfaceMesh
              geo={info.geo}
              wireframe={wireframe}
              onPointerMove={handlePointerMove}
              onClick={handleClick}
            />
            <AtmLine x={atmX} />
            <Axes info={info} greekLabel={GREEK_META.find(g => g.key === greek)?.label ?? greek} />
          </>
        )}
      </Canvas>

      {info && (
        <Legend
          minV={info.minV}
          maxV={info.maxV}
          greekLabel={GREEK_META.find(g => g.key === greek)?.label ?? greek}
        />
      )}

      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <button
            data-testid="wireframe-toggle"
            onClick={() => setWireframe(w => !w)}
            className="px-2 py-1 text-type-xs font-mono bg-card border border-border rounded hover:bg-muted text-muted-foreground"
          >
            {wireframe ? 'Solid' : 'Wireframe'}
          </button>
          {info && (
            <div className="px-2 py-1 text-type-2xs font-mono bg-card/80 border border-border rounded text-muted-foreground">
              <div>
                Spot <span className="text-foreground tabular-nums">{snapshot.spot.toFixed(2)}</span>
              </div>
              <div>
                {GREEK_META.find(g => g.key === greek)?.label ?? greek}{' '}
                <span className="text-cyan tabular-nums">
                  {info.minV.toExponential(2)}–{info.maxV.toExponential(2)}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5 px-2 py-1 bg-card/80 border border-border rounded">
          <div className="flex gap-1">
            {greekRow1.map(g => (
              <button
                key={g.key}
                data-greek-button={g.key}
                onClick={() => setGreek(g.key)}
                className={cn(
                  'px-1.5 py-0.5 text-type-xs font-mono rounded',
                  greek === g.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
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
                data-greek-button={g.key}
                onClick={() => setGreek(g.key)}
                className={cn(
                  'px-1.5 py-0.5 text-type-xs font-mono rounded',
                  greek === g.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
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
