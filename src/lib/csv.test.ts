import { describe, it, expect } from 'vitest';
import { rowsToCsv } from './csv';

describe('rowsToCsv', () => {
  it('joins headers and rows', () => {
    const csv = rowsToCsv(['a', 'b'], [[1, 2], ['x', 'y,z']]);
    expect(csv).toBe('a,b\n1,2\nx,"y,z"');
  });

  it('handles nulls', () => {
    expect(rowsToCsv(['a'], [[null], [undefined]])).toBe('a\n\n');
  });
});
