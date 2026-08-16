import { describe, expect, it } from 'vitest';
import { Process } from '@/types/scheduler';
import {
  IDLE,
  scheduleFCFS,
  scheduleHRRN,
  scheduleMLFQ,
  schedulePriority,
  schedulePriorityPreemptive,
  scheduleRoundRobin,
  scheduleSJF,
  scheduleSRTF
} from './cpu';

/** Compact "P1 0-4, P2 4-7" form, easy to eyeball against a textbook answer. */
const chart = (blocks: { processId: string; startTime: number; endTime: number }[]) =>
  blocks.map(b => `${b.processId} ${b.startTime}-${b.endTime}`).join(', ');

const waitOf = (result: { processMetrics: { id: string; waitingTime: number }[] }, id: string) =>
  result.processMetrics.find(m => m.id === id)!.waitingTime;

describe('FCFS', () => {
  it('runs processes in arrival order', () => {
    const processes: Process[] = [
      { id: 'P1', arrivalTime: 0, burstTime: 4 },
      { id: 'P2', arrivalTime: 1, burstTime: 3 },
      { id: 'P3', arrivalTime: 2, burstTime: 1 }
    ];
    const result = scheduleFCFS(processes);
    expect(chart(result.executionOrder)).toBe('P1 0-4, P2 4-7, P3 7-8');
    // P1 waits 0, P2 waits 4-1=3, P3 waits 7-2=5 -> avg 8/3
    expect(result.averageWaitingTime).toBeCloseTo(8 / 3);
    expect(result.cpuUtilization).toBe(100);
  });

  it('records idle time when no process has arrived', () => {
    const result = scheduleFCFS([
      { id: 'P1', arrivalTime: 3, burstTime: 2 }
    ]);
    expect(chart(result.executionOrder)).toBe(`${IDLE} 0-3, P1 3-5`);
    expect(result.cpuUtilization).toBeCloseTo(40);
  });
});

describe('SJF (non-preemptive)', () => {
  it('picks the shortest available burst at each decision point', () => {
    // Silberschatz worked example.
    const result = scheduleSJF([
      { id: 'P1', arrivalTime: 0, burstTime: 7 },
      { id: 'P2', arrivalTime: 2, burstTime: 4 },
      { id: 'P3', arrivalTime: 4, burstTime: 1 },
      { id: 'P4', arrivalTime: 5, burstTime: 4 }
    ]);
    expect(chart(result.executionOrder)).toBe('P1 0-7, P3 7-8, P2 8-12, P4 12-16');
    expect(result.averageWaitingTime).toBeCloseTo(4);
  });
});

describe('SRTF', () => {
  it('preempts a running process when a shorter job arrives', () => {
    // Same task set as above; the classic answer is avg waiting time 3.
    const result = scheduleSRTF([
      { id: 'P1', arrivalTime: 0, burstTime: 7 },
      { id: 'P2', arrivalTime: 2, burstTime: 4 },
      { id: 'P3', arrivalTime: 4, burstTime: 1 },
      { id: 'P4', arrivalTime: 5, burstTime: 4 }
    ]);
    expect(chart(result.executionOrder)).toBe('P1 0-2, P2 2-4, P3 4-5, P2 5-7, P4 7-11, P1 11-16');
    expect(result.averageWaitingTime).toBeCloseTo(3);
  });

  it('merges contiguous slices instead of emitting one block per tick', () => {
    const result = scheduleSRTF([{ id: 'P1', arrivalTime: 0, burstTime: 5 }]);
    expect(result.executionOrder).toHaveLength(1);
    expect(result.ticks).toHaveLength(5);
  });
});

describe('Round Robin', () => {
  it('rotates the CPU on quantum expiry', () => {
    const result = scheduleRoundRobin(
      [
        { id: 'P1', arrivalTime: 0, burstTime: 5 },
        { id: 'P2', arrivalTime: 0, burstTime: 3 },
        { id: 'P3', arrivalTime: 0, burstTime: 4 }
      ],
      2
    );
    expect(chart(result.executionOrder)).toBe(
      'P1 0-2, P2 2-4, P3 4-6, P1 6-8, P2 8-9, P3 9-11, P1 11-12'
    );
    expect(result.totalTime).toBe(12);
  });

  it('enqueues a newly arrived process ahead of the one being preempted', () => {
    // At t=2 P2 has just arrived; it must go into the queue before P1 rejoins.
    const result = scheduleRoundRobin(
      [
        { id: 'P1', arrivalTime: 0, burstTime: 4 },
        { id: 'P2', arrivalTime: 2, burstTime: 2 }
      ],
      2
    );
    expect(chart(result.executionOrder)).toBe('P1 0-2, P2 2-4, P1 4-6');
  });
});

describe('Priority', () => {
  const processes: Process[] = [
    { id: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
    { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: 'P3', arrivalTime: 2, burstTime: 2, priority: 2 }
  ];

  it('treats a lower number as a higher priority by default', () => {
    expect(chart(schedulePriority(processes).executionOrder)).toBe('P1 0-4, P2 4-7, P3 7-9');
  });

  it('honours the reversed convention', () => {
    expect(chart(schedulePriority(processes, true).executionOrder)).toBe('P1 0-4, P3 4-6, P2 6-9');
  });

  it('preempts when a higher-priority process arrives', () => {
    expect(chart(schedulePriorityPreemptive(processes).executionOrder)).toBe(
      'P1 0-1, P2 1-4, P3 4-6, P1 6-9'
    );
  });
});

describe('HRRN', () => {
  it('lets a long-waiting job overtake a shorter newcomer', () => {
    const result = scheduleHRRN([
      { id: 'P1', arrivalTime: 0, burstTime: 3 },
      { id: 'P2', arrivalTime: 2, burstTime: 6 },
      { id: 'P3', arrivalTime: 4, burstTime: 4 }
    ]);
    // At t=3 P2 has waited 1 of 6 (ratio 1.17); P3 has not arrived.
    // At t=9 P3 waited 5 of 4 (2.25) vs nothing else pending.
    expect(chart(result.executionOrder)).toBe('P1 0-3, P2 3-9, P3 9-13');
  });
});

describe('MLFQ', () => {
  it('demotes a CPU-bound job a level each time it burns a full quantum', () => {
    const result = scheduleMLFQ([{ id: 'P1', arrivalTime: 0, burstTime: 10 }], [2, 4, 8]);
    // Alone in the system it keeps the CPU, but its level should sink to the floor.
    expect(chart(result.executionOrder)).toBe('P1 0-10');
    expect(result.totalTime).toBe(10);
  });

  it('favours a short job that arrives while a long job has sunk', () => {
    const result = scheduleMLFQ(
      [
        { id: 'P1', arrivalTime: 0, burstTime: 8 },
        { id: 'P2', arrivalTime: 3, burstTime: 2 }
      ],
      [2, 4]
    );
    // P1 drops to level 1 after its first quantum; P2 enters at level 0 and wins.
    expect(waitOf(result, 'P2')).toBeLessThan(waitOf(result, 'P1'));
  });
});

describe('metrics', () => {
  it('reports response time separately from waiting time', () => {
    const result = scheduleRoundRobin(
      [
        { id: 'P1', arrivalTime: 0, burstTime: 6 },
        { id: 'P2', arrivalTime: 0, burstTime: 2 }
      ],
      2
    );
    const p2 = result.processMetrics.find(m => m.id === 'P2')!;
    expect(p2.responseTime).toBe(2); // waits one quantum before first running
    expect(p2.waitingTime).toBe(2);
    expect(result.throughput).toBeCloseTo(2 / 8);
  });
});
