import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Home from '@/pages/Home';
import SystemCalls from '@/pages/SystemCalls';
import PageReplacement from '@/pages/PageReplacement';
import DiskScheduling from '@/pages/DiskScheduling';
import Synchronization from '@/pages/Synchronization';
import MemoryAllocation from '@/pages/MemoryAllocation';
import Deadlock from '@/pages/Deadlock';
import RealTimeScheduling from '@/pages/RealTimeScheduling';
import { CPUScheduler } from '@/components/CPUScheduler';
import { DiningPhilosophers } from '@/components/sync/DiningPhilosophers';
import { Navigation } from '@/components/Navigation';

afterEach(cleanup);

const renderPage = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * These are smoke tests, not behaviour tests: they prove each page mounts,
 * renders and survives interaction without throwing. Type checking cannot
 * catch a division by zero or an undefined array access inside a render.
 */
describe('pages render', () => {
  const pages: [string, React.ReactElement][] = [
    ['Home', <Home />],
    ['CPU scheduling', <CPUScheduler />],
    ['System calls', <SystemCalls />],
    ['Real-time', <RealTimeScheduling />],
    ['Synchronization', <Synchronization />],
    ['Deadlock', <Deadlock />],
    ['Page replacement', <PageReplacement />],
    ['Memory allocation', <MemoryAllocation />],
    ['Disk scheduling', <DiskScheduling />],
    ['Navigation', <Navigation />]
  ];

  for (const [name, element] of pages) {
    it(`${name} mounts without throwing`, () => {
      expect(() => renderPage(element)).not.toThrow();
    });
  }
});

describe('playback controls', () => {
  it('steps the page replacement simulation forward and back', () => {
    renderPage(<PageReplacement />);

    const next = screen.getByLabelText('Next step');
    expect(screen.getByText(/Nothing referenced yet/)).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByText(/Reference 1 of/)).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByText(/Reference 2 of/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Previous step'));
    expect(screen.getByText(/Reference 1 of/)).toBeInTheDocument();
  });

  it('skips the disk simulation to its result', () => {
    renderPage(<DiskScheduling />);
    fireEvent.click(screen.getByRole('button', { name: /skip to result/i }));
    // SCAN on the default input totals 331 tracks.
    expect(screen.getAllByText('331').length).toBeGreaterThan(0);
  });
});

describe('system calls', () => {
  it('forks into two branches and resumes a blocked wait() when the child exits', () => {
    renderPage(<SystemCalls />);

    fireEvent.click(screen.getByRole('button', { name: /fork\(\)/ }));
    expect(screen.getByText('Child Process')).toBeInTheDocument();

    // The parent blocks on wait()...
    fireEvent.click(screen.getByRole('button', { name: /wait\(\)/ }));
    expect(screen.getByText(/is blocked until a child exits/)).toBeInTheDocument();

    // ...and only resumes because the child actually terminates.
    fireEvent.click(screen.getByText('Child Process'));
    fireEvent.click(screen.getByRole('button', { name: /exit\(\)/ }));
    expect(screen.getByText(/resumed: child PID 2 terminated/)).toBeInTheDocument();
  });

  it('refuses to run a system call on a terminated path', () => {
    renderPage(<SystemCalls />);
    fireEvent.click(screen.getByRole('button', { name: /fork\(\)/ }));
    fireEvent.click(screen.getByText('Child Process'));
    fireEvent.click(screen.getByRole('button', { name: /exit\(\)/ }));

    // Selection moves to a live leaf, so PID 2 can no longer be targeted.
    expect(screen.getAllByText('Terminated').length).toBeGreaterThan(0);
    expect(screen.getByText(/Target:/).textContent).toContain('PID 1');
  });
});

describe('dining philosophers', () => {
  it('reaches a deadlock with the naive strategy', () => {
    renderPage(<DiningPhilosophers />);

    fireEvent.click(screen.getByRole('button', { name: /all hungry/i }));
    const step = screen.getByRole('button', { name: /^step$/i });
    act(() => {
      fireEvent.click(step);
      fireEvent.click(step);
    });

    expect(screen.getByText(/Deadlock reached/i)).toBeInTheDocument();
  });
});

describe("banker's algorithm", () => {
  it('reports the default textbook state as safe', () => {
    renderPage(<Deadlock />);
    expect(screen.getByText('Safe state')).toBeInTheDocument();
  });
});
