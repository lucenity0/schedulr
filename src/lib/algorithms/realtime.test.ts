import { describe, expect, it } from 'vitest';
import { PeriodicTask, hyperperiodOf, rmBound, simulateRealTime, utilizationOf } from './realtime';

const chart = (result: ReturnType<typeof simulateRealTime>) =>
  result.slices.map(s => s.taskId ?? '-').join(',');

describe('task set arithmetic', () => {
  it('computes the hyperperiod as the LCM of the periods', () => {
    expect(hyperperiodOf([
      { id: 'T1', computation: 1, period: 4 },
      { id: 'T2', computation: 2, period: 6 }
    ])).toBe(12);
  });

  it('computes utilization as the sum of C/T', () => {
    expect(utilizationOf([
      { id: 'T1', computation: 1, period: 4 },
      { id: 'T2', computation: 2, period: 8 }
    ])).toBeCloseTo(0.5);
  });

  it('matches the Liu & Layland bound', () => {
    expect(rmBound(1)).toBeCloseTo(1);
    expect(rmBound(2)).toBeCloseTo(0.8284, 4);
    expect(rmBound(3)).toBeCloseTo(0.7798, 4);
  });
});

describe('Rate Monotonic', () => {
  it('always runs the shorter-period task first', () => {
    const tasks: PeriodicTask[] = [
      { id: 'T1', computation: 1, period: 4 },
      { id: 'T2', computation: 2, period: 8 }
    ];
    const result = simulateRealTime(tasks, 'RM');
    // Both release at t=0; T1 has the shorter period so it wins. T2 then runs
    // its two units, the CPU idles, and T1's second job arrives at t=4.
    expect(chart(result)).toBe('T1,T2,T2,-,T1,-,-,-');
    expect(result.schedulable).toBe(true);
  });

  it('meets every deadline when utilization is under the bound', () => {
    const result = simulateRealTime(
      [
        { id: 'T1', computation: 1, period: 4 },
        { id: 'T2', computation: 2, period: 8 }
      ],
      'RM'
    );
    expect(result.utilization).toBeCloseTo(0.5);
    expect(result.boundTestPasses).toBe(true);
    expect(result.misses).toHaveLength(0);
    expect(result.verdict).toContain('guaranteed');
  });

  it('misses a deadline on a task set that EDF can still schedule', () => {
    // U = 2/5 + 4/7 = 0.971 - above the RM bound, below 100%.
    const tasks: PeriodicTask[] = [
      { id: 'T1', computation: 2, period: 5 },
      { id: 'T2', computation: 4, period: 7 }
    ];
    const rm = simulateRealTime(tasks, 'RM');
    const edf = simulateRealTime(tasks, 'EDF');

    expect(rm.utilization).toBeCloseTo(0.9714, 4);
    expect(rm.boundTestPasses).toBe(false);
    expect(rm.misses.length).toBeGreaterThan(0);
    // EDF is optimal, so it must succeed where RM failed.
    expect(edf.misses).toHaveLength(0);
    expect(edf.schedulable).toBe(true);
  });
});

describe('EDF', () => {
  it('switches priority when a later-released job has a nearer deadline', () => {
    const tasks: PeriodicTask[] = [
      { id: 'T1', computation: 1, period: 4 },
      { id: 'T2', computation: 2, period: 6 }
    ];
    const result = simulateRealTime(tasks, 'EDF');
    expect(result.schedulable).toBe(true);
    // At t=4 T1's new job (deadline 8) beats T2's job (deadline 12).
    expect(result.slices[4].taskId).toBe('T1');
  });

  it('cannot schedule an overloaded task set', () => {
    const result = simulateRealTime(
      [
        { id: 'T1', computation: 3, period: 4 },
        { id: 'T2', computation: 3, period: 5 }
      ],
      'EDF'
    );
    expect(result.utilization).toBeGreaterThan(1);
    expect(result.misses.length).toBeGreaterThan(0);
    expect(result.verdict).toContain('no algorithm');
  });
});

describe('deadline misses', () => {
  it('records which job missed and by how much work', () => {
    const result = simulateRealTime(
      [
        { id: 'T1', computation: 3, period: 4 },
        { id: 'T2', computation: 3, period: 5 }
      ],
      'RM'
    );
    const miss = result.misses[0];
    expect(miss.taskId).toBeDefined();
    expect(miss.remaining).toBeGreaterThan(0);
    expect(miss.deadline).toBeGreaterThan(0);
  });
});
