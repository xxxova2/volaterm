import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasHeatmap } from './CanvasHeatmap';
import type { HeatmapCell } from './greeksTypes';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

function makeCell(strike: number, dte: number, value: number | null, delta?: number): HeatmapCell {
  return {
    strike,
    dte,
    expiry: '2026-07-31',
    value,
    quote: { type: 'call', mid: 5.0, iv: 0.25, delta: delta ?? null },
  };
}

const mockRows = [
  { expiry: '2026-07-31', dte: 30 },
  { expiry: '2026-08-28', dte: 58 },
];

const mockCols = [95, 100, 105];

const mockMatrix: HeatmapCell[][] = [
  [makeCell(95, 30, 0.5), makeCell(100, 30, 0.3), makeCell(105, 30, 0.1)],
  [makeCell(95, 58, 0.4), makeCell(100, 58, 0.2), makeCell(105, 58, 0.05)],
];

describe('CanvasHeatmap', () => {
  it('renders a canvas element', () => {
    render(
      <CanvasHeatmap
        rows={mockRows}
        cols={mockCols}
        cellMatrix={mockMatrix}
        min={0}
        max={0.5}
        diverging={false}
        onCellHover={vi.fn()}
        onCellClick={vi.fn()}
        selectedCell={null}
      />
    );
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders the color legend bar', () => {
    render(
      <CanvasHeatmap
        rows={mockRows}
        cols={mockCols}
        cellMatrix={mockMatrix}
        min={0}
        max={0.5}
        diverging={false}
        onCellHover={vi.fn()}
        onCellClick={vi.fn()}
        selectedCell={null}
      />
    );
    expect(screen.getByText('0.000')).toBeInTheDocument();
    expect(screen.getByText('0.500')).toBeInTheDocument();
  });

  it('calls onCellClick when canvas is clicked', () => {
    const onClick = vi.fn();
    render(
      <CanvasHeatmap
        rows={mockRows}
        cols={mockCols}
        cellMatrix={mockMatrix}
        min={0}
        max={0.5}
        diverging={false}
        onCellHover={vi.fn()}
        onCellClick={onClick}
        selectedCell={null}
      />
    );
    const canvas = document.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a selected ring overlay when selectedCell is provided', () => {
    render(
      <CanvasHeatmap
        rows={mockRows}
        cols={mockCols}
        cellMatrix={mockMatrix}
        min={0}
        max={0.5}
        diverging={false}
        onCellHover={vi.fn()}
        onCellClick={vi.fn()}
        selectedCell={mockMatrix[0]![0]!}
      />
    );
    const canvas = document.querySelector('canvas')!;
    expect(canvas).toBeInTheDocument();
  });
});
