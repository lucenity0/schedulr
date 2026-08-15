import { describe, expect, it } from 'vitest';
import { Block, MemoryRequest, compact, simulateMemory } from './memory';

// A 1000-unit memory carved into the classic hole layout.
const holes: Block[] = [
  { id: 0, start: 0, size: 100, processId: null },
  { id: 1, start: 100, size: 500, processId: null },
  { id: 2, start: 600, size: 200, processId: null },
  { id: 3, start: 800, size: 300, processId: null },
  { id: 4, start: 1100, size: 600, processId: null }
];

const requests: MemoryRequest[] = [
  { processId: 'P1', size: 212 },
  { processId: 'P2', size: 417 },
  { processId: 'P3', size: 112 },
  { processId: 'P4', size: 426 }
];

const placement = (strategy: Parameters<typeof simulateMemory>[2]) => {
  const result = simulateMemory(1700, requests, strategy, holes);
  return result.steps.map(s => (s.success ? s.blocks.find(b => b.processId === s.request.processId)!.start : null));
};

describe('fit strategies on the textbook hole layout', () => {
  it('First Fit places each request in the first hole that fits', () => {
    // 212 -> 500-hole at 100, 417 -> 600-hole at 1100, 112 -> rest of 500-hole,
    // 426 -> fails, nothing large enough remains.
    expect(placement('First Fit')).toEqual([100, 1100, 312, null]);
  });

  it('Best Fit uses the tightest hole each time and fits everything', () => {
    // 212 -> the 300-hole at 800 (the 200-hole is too small);
    // 417 -> the 500-hole at 100; 112 -> the 200-hole at 600;
    // 426 -> the 600-hole at 1100. Best Fit is the only strategy here that
    // places all four.
    expect(placement('Best Fit')).toEqual([800, 100, 600, 1100]);
    expect(simulateMemory(1700, requests, 'Best Fit', holes).failed).toBe(0);
  });

  it('Worst Fit always takes the biggest hole', () => {
    expect(placement('Worst Fit')).toEqual([1100, 100, 1312, null]);
  });
});

describe('fragmentation', () => {
  it('reports external fragmentation when free space exists but is scattered', () => {
    const scattered: Block[] = [
      { id: 0, start: 0, size: 50, processId: null },
      { id: 1, start: 50, size: 50, processId: 'A', requestedSize: 50 },
      { id: 2, start: 100, size: 50, processId: null }
    ];
    const result = simulateMemory(150, [{ processId: 'B', size: 80 }], 'First Fit', scattered);
    const step = result.steps[0];
    expect(step.success).toBe(false);
    // 100 units are free, but no single hole can take 80.
    expect(step.externalFragmentation).toBe(100);
    expect(step.largestFreeHole).toBe(50);
    expect(step.narration).toContain('external fragmentation');
  });

  it('coalesces neighbouring holes when a block is freed', () => {
    const result = simulateMemory(
      300,
      [
        { processId: 'A', size: 100 },
        { processId: 'B', size: 100 },
        { processId: 'A', size: 0, action: 'free' },
        { processId: 'B', size: 0, action: 'free' },
        { processId: 'C', size: 250 }
      ],
      'First Fit'
    );
    // Without coalescing, C would not fit in two adjacent 100-unit holes.
    expect(result.steps[4].success).toBe(true);
  });
});

describe('compaction', () => {
  it('slides allocations to the front and gathers free space at the end', () => {
    const fragmented: Block[] = [
      { id: 0, start: 0, size: 50, processId: null },
      { id: 1, start: 50, size: 100, processId: 'A', requestedSize: 100 },
      { id: 2, start: 150, size: 50, processId: null },
      { id: 3, start: 200, size: 100, processId: 'B', requestedSize: 100 }
    ];
    const result = compact(fragmented, 300);
    expect(result.map(b => [b.processId, b.start, b.size])).toEqual([
      ['A', 0, 100],
      ['B', 100, 100],
      [null, 200, 100]
    ]);
  });
});

describe('Next Fit', () => {
  it('resumes the search where the previous one stopped', () => {
    const memory: Block[] = [{ id: 0, start: 0, size: 300, processId: null }];
    const result = simulateMemory(
      300,
      [
        { processId: 'A', size: 100 },
        { processId: 'B', size: 100 }
      ],
      'Next Fit',
      memory
    );
    expect(result.steps[1].blocks.find(b => b.processId === 'B')!.start).toBe(100);
  });
});
