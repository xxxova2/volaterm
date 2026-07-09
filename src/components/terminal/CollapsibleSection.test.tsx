import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts open by default and hides body when collapsed', () => {
    render(
      <CollapsibleSection id="test-sec" title="TEST SEC" apis={['FRED']}>
        <div>body content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('body content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /TEST SEC/i }));
    expect(screen.queryByText('body content')).not.toBeInTheDocument();
  });

  it('respects defaultOpen=false', () => {
    render(
      <CollapsibleSection id="dv01" title="DV01" defaultOpen={false}>
        <div>hidden body</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('hidden body')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /DV01/i }));
    expect(screen.getByText('hidden body')).toBeInTheDocument();
  });

  it('persists open state to localStorage', () => {
    const { unmount } = render(
      <CollapsibleSection id="persist" title="PERSIST" defaultOpen={true} storageKey="test.persist">
        <div>x</div>
      </CollapsibleSection>,
    );
    fireEvent.click(screen.getByRole('button', { name: /PERSIST/i }));
    expect(localStorage.getItem('test.persist')).toBe('0');
    unmount();
    render(
      <CollapsibleSection id="persist" title="PERSIST" defaultOpen={true} storageKey="test.persist">
        <div>x</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('x')).not.toBeInTheDocument();
  });
});
