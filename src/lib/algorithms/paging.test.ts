import { describe, expect, it } from 'vitest';
import { detectBeladyAnomaly, parseReferenceString, simulatePaging } from './paging';

const frames = (result: ReturnType<typeof simulatePaging>, step: number) =>
  result.steps[step].frames.map(f => f.page);

describe('FIFO', () => {
  it('evicts by load order, not by last use', () => {
    // 1,2,3 fill the frames; 1 is then referenced again (a hit, which must NOT
    // save it); the next fault has to evict 1 because it was loaded first.
    const result = simulatePaging([1, 2, 3, 1, 4], 3, 'FIFO');
    expect(frames(result, 4)).toEqual([4, 2, 3]);
    expect(result.faults).toBe(4);
  });

  it('differs from LRU on the same input - the bug that made them identical', () => {
    const input = [1, 2, 3, 1, 4];
    const fifo = simulatePaging(input, 3, 'FIFO');
    const lru = simulatePaging(input, 3, 'LRU');
    // LRU keeps page 1 alive because it was just used; FIFO throws it out.
    expect(frames(fifo, 4)).toEqual([4, 2, 3]);
    expect(frames(lru, 4)).toEqual([1, 4, 3]);
  });

  it('reproduces Belady\'s anomaly on the classic reference string', () => {
    const pages = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    expect(simulatePaging(pages, 3, 'FIFO').faults).toBe(9);
    expect(simulatePaging(pages, 4, 'FIFO').faults).toBe(10);

    const anomaly = detectBeladyAnomaly(pages, 'FIFO');
    expect(anomaly.anomaly).toBe(true);
  });

  it('does not report an anomaly for a stack algorithm like LRU', () => {
    const pages = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    expect(detectBeladyAnomaly(pages, 'LRU').anomaly).toBe(false);
  });
});

describe('LRU', () => {
  it('matches the standard worked example', () => {
    const pages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
    expect(simulatePaging(pages, 3, 'LRU').faults).toBe(12);
  });
});

describe('Optimal', () => {
  it('matches the standard worked example', () => {
    const pages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
    expect(simulatePaging(pages, 3, 'Optimal').faults).toBe(9);
  });

  it('looks ahead from the current position, not the first occurrence', () => {
    // Page 1 appears at index 0 and again at index 6. When the fault happens at
    // index 4 the lookahead must start there - measuring from index 0 was the
    // bug, and it made Optimal evict the wrong page.
    const pages = [1, 2, 3, 2, 4, 3, 1];
    const result = simulatePaging(pages, 3, 'Optimal');
    // At index 4 the resident set is {1,2,3}. Next uses: 1 -> 6, 2 -> never,
    // 3 -> 5. So page 2 must be the victim.
    expect(result.steps[4].evicted).toBe(2);
  });

  it('never faults more than any other algorithm', () => {
    const pages = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    const optimal = simulatePaging(pages, 3, 'Optimal').faults;
    for (const algo of ['FIFO', 'LRU', 'LFU', 'Clock'] as const) {
      expect(optimal).toBeLessThanOrEqual(simulatePaging(pages, 3, algo).faults);
    }
  });
});

describe('LFU', () => {
  it('evicts the least referenced page and breaks ties by least recent use', () => {
    // 1 is referenced 3 times, 2 twice, 3 once -> 3 goes first.
    const result = simulatePaging([1, 1, 1, 2, 2, 3, 4], 3, 'LFU');
    expect(result.steps[6].evicted).toBe(3);
  });
});

describe('Clock', () => {
  it('degenerates to FIFO when every reference bit is set', () => {
    // Nothing has a clear bit, so the hand clears all three and comes back to
    // the oldest frame - which is exactly what FIFO would have picked.
    const result = simulatePaging([1, 2, 3, 1, 4], 3, 'Clock');
    expect(result.steps[4].evicted).toBe(1);
  });

  it('spends a second chance to save a recently referenced page', () => {
    const pages = [1, 2, 3, 4, 2, 5];
    const clock = simulatePaging(pages, 3, 'Clock');
    // Page 2 was referenced at index 4, so the hand clears its bit and passes
    // over it, evicting page 3 instead...
    expect(clock.steps[5].evicted).toBe(3);
    // ...whereas FIFO, which ignores the reference, throws page 2 out.
    expect(simulatePaging(pages, 3, 'FIFO').steps[5].evicted).toBe(2);
  });
});

describe('parseReferenceString', () => {
  it('accepts commas and whitespace and keeps page 0', () => {
    expect(parseReferenceString('7, 0 1,,2')).toEqual([7, 0, 1, 2]);
  });
});
