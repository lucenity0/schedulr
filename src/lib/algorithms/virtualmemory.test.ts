import { describe, expect, it } from 'vitest';
import {
  allocateFrames,
  demandPagingEat,
  optimalDegree,
  simulateCopyOnWrite,
  thrashingCurve,
  workingSet,
  workingSetSeries
} from './virtualmemory';

describe('demand paging effective access time', () => {
  it('matches the standard worked example', () => {
    // 200 ns memory, 8 ms fault service, 1 fault in 1000.
    // EAT = 0.999*200 + 0.001*8_000_000 = 199.8 + 8000 = 8199.8 ns
    const result = demandPagingEat({
      memoryAccessTime: 200,
      pageFaultTime: 8000,
      faultRate: 0.001
    });
    expect(result.effectiveAccessTime).toBeCloseTo(8199.8, 1);
    // A fault rate of 0.1% makes the machine 41x slower.
    expect(result.slowdownFactor).toBeCloseTo(41, 0);
  });

  it('costs nothing when there are no faults', () => {
    const result = demandPagingEat({ memoryAccessTime: 200, pageFaultTime: 8000, faultRate: 0 });
    expect(result.effectiveAccessTime).toBe(200);
    expect(result.slowdownFactor).toBe(1);
  });

  it('computes the fault rate needed to stay within 10% of memory speed', () => {
    const result = demandPagingEat({
      memoryAccessTime: 200,
      pageFaultTime: 8000,
      faultRate: 0.001
    });
    // Under one fault per 400,000 accesses.
    expect(result.faultRateForTenPercent).toBeLessThan(0.0000026);
    expect(result.faultRateForTenPercent).toBeGreaterThan(0);
  });
});

describe('copy-on-write', () => {
  it('shares every frame at fork and copies nothing', () => {
    const steps = simulateCopyOnWrite(4, []);
    const afterFork = steps[1];
    expect(afterFork.framesUsed).toBe(4);
    expect(afterFork.pages.every(p => p.sharedBy.length === 2)).toBe(true);
    expect(afterFork.pages.every(p => p.copyOnWrite)).toBe(true);
  });

  it('duplicates only the page that is written', () => {
    const steps = simulateCopyOnWrite(4, [{ process: 'Child', page: 1 }]);
    const last = steps[steps.length - 1];
    // One extra frame for the copy - the other three are still shared.
    expect(last.framesUsed).toBe(5);
    expect(last.pages.filter(p => p.sharedBy.length === 2)).toHaveLength(3);
  });

  it('does not copy again once a page is private', () => {
    const steps = simulateCopyOnWrite(4, [
      { process: 'Child', page: 1 },
      { process: 'Child', page: 1 }
    ]);
    expect(steps[steps.length - 1].framesUsed).toBe(5);
  });
});

describe('frame allocation', () => {
  const processes = [
    { name: 'P1', size: 10 },
    { name: 'P2', size: 127 }
  ];

  it('equal allocation ignores process size', () => {
    const result = allocateFrames(processes, 62, 'equal');
    expect(result.map(r => r.frames)).toEqual([31, 31]);
  });

  it('proportional allocation follows the size ratio', () => {
    // 10/137 * 62 = 4.5 -> 4; 127/137 * 62 = 57.4 -> 57
    const result = allocateFrames(processes, 62, 'proportional');
    expect(result.map(r => r.frames)).toEqual([4, 57]);
  });

  it('always leaves a process at least one frame', () => {
    const result = allocateFrames([{ name: 'tiny', size: 1 }, { name: 'huge', size: 10000 }], 10, 'proportional');
    expect(result[0].frames).toBeGreaterThanOrEqual(1);
  });
});

describe('thrashing', () => {
  const curve = thrashingCurve(60, 10);

  it('rises then collapses as the degree of multiprogramming grows', () => {
    const peak = optimalDegree(curve);
    expect(peak.degree).toBeGreaterThan(1);
    expect(peak.degree).toBeLessThan(20);

    const last = curve[curve.length - 1];
    expect(last.cpuUtilization).toBeLessThan(peak.cpuUtilization);
  });

  it('flags thrashing only once processes drop below their working set', () => {
    // 60 frames / 6 processes = 10 frames each, exactly the working set.
    expect(curve.find(p => p.degree === 6)!.thrashing).toBe(false);
    // 60 / 15 = 4 frames each, far below it.
    expect(curve.find(p => p.degree === 15)!.thrashing).toBe(true);
  });

  it('drives the fault rate up as frames per process fall', () => {
    const few = curve.find(p => p.degree === 3)!;
    const many = curve.find(p => p.degree === 18)!;
    expect(many.faultRate).toBeGreaterThan(few.faultRate);
  });
});

describe('working set', () => {
  const references = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3];

  it('is the set of distinct pages in the window', () => {
    const result = workingSet(references, 4, 5);
    // references[2..5] = 3,4,1,2
    expect(result.pages).toEqual([1, 2, 3, 4]);
  });

  it('shrinks when the program keeps touching the same pages', () => {
    const tight = workingSet([7, 7, 7, 7], 4, 3);
    expect(tight.pages).toEqual([7]);
  });

  it('produces a size series over the whole reference string', () => {
    const series = workingSetSeries(references, 4);
    expect(series).toHaveLength(references.length);
    expect(series[0].size).toBe(1);
    expect(series.every(point => point.size <= 4)).toBe(true);
  });
});
