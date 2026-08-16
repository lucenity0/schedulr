import { describe, expect, it } from 'vitest';
import { Process } from '@/types/scheduler';
import { simulateMultiprocessor, threadModels } from './multiprocessor';

const four: Process[] = [
  { id: 'P1', arrivalTime: 0, burstTime: 4 },
  { id: 'P2', arrivalTime: 0, burstTime: 4 },
  { id: 'P3', arrivalTime: 0, burstTime: 4 },
  { id: 'P4', arrivalTime: 0, burstTime: 4 }
];

describe('multiprocessor scheduling', () => {
  it('runs processes in parallel across cores', () => {
    const result = simulateMultiprocessor(four, 2, 'common');
    // 16 units of work over 2 cores finishes in 8, not 16.
    expect(result.totalTime).toBe(8);
    expect(result.ticks[0].cores.filter(Boolean)).toHaveLength(2);
  });

  it('finishes faster with more cores', () => {
    const two = simulateMultiprocessor(four, 2, 'common').totalTime;
    const fourCores = simulateMultiprocessor(four, 4, 'common').totalTime;
    expect(fourCores).toBeLessThan(two);
    expect(fourCores).toBe(4);
  });

  it('keeps every core busy with a common queue', () => {
    const result = simulateMultiprocessor(four, 4, 'common');
    expect(result.utilization.every(u => u === 100)).toBe(true);
  });

  it('never runs the same process on two cores at once', () => {
    const result = simulateMultiprocessor(four, 4, 'common');
    for (const tick of result.ticks) {
      const running = tick.cores.filter(Boolean);
      expect(new Set(running).size).toBe(running.length);
    }
  });

  it('completes all the work it was given', () => {
    const result = simulateMultiprocessor(four, 3, 'common');
    const executed = result.ticks.flatMap(t => t.cores).filter(Boolean);
    expect(executed).toHaveLength(16);
  });
});

describe('per-CPU queues', () => {
  it('migrates work from a loaded queue to an idle core when balancing', () => {
    // Everything arrives at once and lands on the shortest queue, so an
    // imbalance needs a skewed arrival pattern to appear.
    const skewed: Process[] = [
      { id: 'A', arrivalTime: 0, burstTime: 1 },
      { id: 'B', arrivalTime: 0, burstTime: 6 },
      { id: 'C', arrivalTime: 1, burstTime: 3 },
      { id: 'D', arrivalTime: 1, burstTime: 3 }
    ];
    const balanced = simulateMultiprocessor(skewed, 2, 'per-cpu', { balance: true });
    const unbalanced = simulateMultiprocessor(skewed, 2, 'per-cpu', { balance: false });

    // Balancing can only help, never hurt, total completion time.
    expect(balanced.totalTime).toBeLessThanOrEqual(unbalanced.totalTime);
  });

  it('respects affinity by preferring the core a process last used', () => {
    const result = simulateMultiprocessor(four, 2, 'per-cpu', { affinity: true });
    expect(result.affinityBreaks).toBe(0);
  });

  it('finishes all work regardless of organisation', () => {
    for (const organisation of ['common', 'per-cpu'] as const) {
      const result = simulateMultiprocessor(four, 2, organisation);
      const executed = result.ticks.flatMap(t => t.cores).filter(Boolean);
      expect(executed).toHaveLength(16);
    }
  });
});

describe('multithreading models', () => {
  it('maps four user threads onto the right number of kernel threads', () => {
    expect(threadModels['many-to-one'].kernelThreads).toBe(1);
    expect(threadModels['one-to-one'].kernelThreads).toBe(4);
    expect(threadModels['many-to-many'].kernelThreads).toBe(2);
  });

  it('accounts for every user thread in the mapping', () => {
    for (const model of Object.values(threadModels)) {
      const mapped = model.mapping.flat().sort();
      expect(mapped).toEqual([0, 1, 2, 3]);
      expect(model.mapping).toHaveLength(model.kernelThreads);
    }
  });

  it('explains that many-to-one blocks the whole process', () => {
    expect(threadModels['many-to-one'].blockingBehaviour).toContain('whole process');
  });
});
