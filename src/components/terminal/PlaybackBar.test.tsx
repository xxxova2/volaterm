import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaybackBar } from './PlaybackBar';
import { useTerminalStore } from '../../store/terminalStore';

describe('PlaybackBar', () => {
  it('renders nothing when fewer than 2 historical frames', () => {
    useTerminalStore.setState({
      historicalFrames: [],
      frameIndex: 0,
      isPlaying: false,
      speed: 1,
    });
    const { container } = render(<PlaybackBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders playback controls when historicalFrames.length >= 2', () => {
    const now = Date.now();
    useTerminalStore.setState({
      historicalFrames: [
        { timestamp: now - 60_000, snapshot: null as any, surface: null as any },
        { timestamp: now, snapshot: null as any, surface: null as any },
      ],
      frameIndex: 0,
      isPlaying: false,
      speed: 1,
    });
    render(<PlaybackBar />);
    expect(screen.getByRole('toolbar', { name: 'Historical playback controls' })).toBeTruthy();
    expect(screen.getByLabelText('Historical timeline scrubber')).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
  });
});
