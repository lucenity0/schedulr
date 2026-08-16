import { describe, expect, it } from 'vitest';
import { DiskAlgorithm, simulateDisk } from './disk';

// The canonical Silberschatz example: 200-track disk, head at 53.
const CLASSIC = {
  head: 53,
  requests: [98, 183, 37, 122, 14, 124, 65, 67],
  diskSize: 200,
  direction: 'right' as const
};

const seek = (algorithm: DiskAlgorithm, overrides = {}) =>
  simulateDisk(algorithm, { ...CLASSIC, ...overrides }).totalSeek;

const order = (algorithm: DiskAlgorithm, overrides = {}) =>
  simulateDisk(algorithm, { ...CLASSIC, ...overrides }).sequence;

describe('textbook seek totals (head 53, 200 tracks)', () => {
  it('FCFS is 640', () => expect(seek('FCFS')).toBe(640));
  it('SSTF is 236', () => expect(seek('SSTF')).toBe(236));
  it('SCAN is 331', () => expect(seek('SCAN')).toBe(331));
  it('C-SCAN is 382 including the wrap', () => expect(seek('C-SCAN')).toBe(382));
  it('LOOK is 299', () => expect(seek('LOOK')).toBe(299));
  it('C-LOOK is 322 including the jump', () => expect(seek('C-LOOK')).toBe(322));
});

describe('service order', () => {
  it('SCAN sweeps up, touches the far edge, then sweeps down', () => {
    expect(order('SCAN')).toEqual([53, 65, 67, 98, 122, 124, 183, 199, 37, 14]);
  });

  it('LOOK is SCAN without the trip to the edge', () => {
    expect(order('LOOK')).toEqual([53, 65, 67, 98, 122, 124, 183, 37, 14]);
    expect(order('LOOK')).not.toContain(199);
  });

  it('C-SCAN wraps through both edges and only ever sweeps upward', () => {
    expect(order('C-SCAN')).toEqual([53, 65, 67, 98, 122, 124, 183, 199, 0, 14, 37]);
  });

  it('C-LOOK jumps straight to the lowest pending request', () => {
    expect(order('C-LOOK')).toEqual([53, 65, 67, 98, 122, 124, 183, 14, 37]);
  });
});

describe('C-SCAN moving left', () => {
  // This direction used to fall through an if with no else, producing an empty
  // schedule and a seek time of 0.
  it('services every request instead of doing nothing', () => {
    const result = simulateDisk('C-SCAN', { ...CLASSIC, direction: 'left' });
    expect(result.totalSeek).toBeGreaterThan(0);
    for (const request of CLASSIC.requests) {
      expect(result.sequence).toContain(request);
    }
  });

  it('sweeps down, wraps at the top, and keeps sweeping down', () => {
    const result = simulateDisk('C-SCAN', { ...CLASSIC, direction: 'left' });
    expect(result.sequence).toEqual([53, 37, 14, 0, 199, 183, 124, 122, 98, 67, 65]);
    // 53 down to 0 (53) + wrap 0 -> 199 (199) + 199 down to 65 (134)
    expect(result.totalSeek).toBe(386);
    expect(result.wrapSeek).toBe(199);
  });
});

describe('every algorithm', () => {
  const algorithms: DiskAlgorithm[] = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'];

  for (const direction of ['left', 'right'] as const) {
    it(`services all requests moving ${direction}`, () => {
      for (const algorithm of algorithms) {
        const result = simulateDisk(algorithm, { ...CLASSIC, direction });
        const serviced = result.moves.filter(m => m.serviced).map(m => m.to).sort((a, b) => a - b);
        expect(serviced).toEqual([...CLASSIC.requests].sort((a, b) => a - b));
      }
    });
  }

  it('reports total seek as the sum of every move', () => {
    for (const algorithm of algorithms) {
      const result = simulateDisk(algorithm, CLASSIC);
      const summed = result.moves.reduce((s, m) => s + m.distance, 0);
      expect(result.totalSeek).toBe(summed);
    }
  });

  it('never beats SSTF locally without a reason - FCFS is always the worst here', () => {
    const fcfs = seek('FCFS');
    for (const algorithm of algorithms.filter(a => a !== 'FCFS')) {
      expect(seek(algorithm)).toBeLessThan(fcfs);
    }
  });
});

describe('edge cases', () => {
  it('handles a request exactly at the head position', () => {
    const result = simulateDisk('SCAN', { head: 50, requests: [50, 60], diskSize: 200, direction: 'right' });
    expect(result.sequence).toEqual([50, 50, 60]);
    expect(result.totalSeek).toBe(10);
  });

  it('handles an empty request list', () => {
    const result = simulateDisk('SSTF', { head: 50, requests: [], diskSize: 200, direction: 'right' });
    expect(result.totalSeek).toBe(0);
    expect(result.averageSeek).toBe(0);
  });
});
