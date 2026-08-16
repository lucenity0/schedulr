import { describe, expect, it } from 'vitest';
import { BankerInput, checkSafety, computeNeed, detectDeadlock, requestResources } from './deadlock';

// The Silberschatz Banker's example.
const BANKER: BankerInput = {
  resources: ['A', 'B', 'C'],
  processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
  total: [10, 5, 7],
  allocation: [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
  ],
  max: [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
  ]
};

describe("Banker's algorithm", () => {
  it('computes the Need matrix as Max - Allocation', () => {
    expect(computeNeed(BANKER.max, BANKER.allocation)).toEqual([
      [7, 4, 3],
      [1, 2, 2],
      [6, 0, 0],
      [0, 1, 1],
      [4, 3, 1]
    ]);
  });

  it('finds the system safe with the textbook sequence', () => {
    const result = checkSafety(BANKER);
    expect(result.available).toEqual([3, 3, 2]);
    expect(result.safe).toBe(true);
    expect(result.sequence).toEqual(['P1', 'P3', 'P0', 'P2', 'P4']);
  });

  it('grants a request that keeps the state safe', () => {
    // P1 requests (1,0,2) - the standard follow-up question.
    const result = requestResources(BANKER, 'P1', [1, 0, 2]);
    expect(result.granted).toBe(true);
    expect(result.safety!.sequence).toEqual(['P1', 'P3', 'P0', 'P2', 'P4']);
  });

  it('refuses a request that exceeds the declared maximum', () => {
    const result = requestResources(BANKER, 'P0', [8, 0, 0]);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('remaining need');
  });

  it('makes a process wait when resources are simply unavailable', () => {
    const result = requestResources(BANKER, 'P0', [4, 0, 0]);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('must wait');
  });

  it('refuses a request that would leave an unsafe state even though it fits', () => {
    // P4 asking for (3,3,0) fits in Available (3,3,2) but no safe order remains.
    const result = requestResources(BANKER, 'P4', [3, 3, 0]);
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('unsafe');
    expect(result.safety!.safe).toBe(false);
  });

  it('flags an unsafe state', () => {
    // The state that results from granting P4's (3,3,0) request: Available
    // drops to (0,0,2) and no process's remaining need fits inside it.
    const unsafe: BankerInput = {
      ...BANKER,
      allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [3, 3, 2]
      ]
    };
    const result = checkSafety(unsafe);
    expect(result.available).toEqual([0, 0, 2]);
    expect(result.safe).toBe(false);
    expect(result.sequence).toEqual([]);
  });
});

describe('deadlock detection', () => {
  it('reports no deadlock when every outstanding request can be met in some order', () => {
    const result = detectDeadlock({
      resources: ['A', 'B', 'C'],
      processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
      total: [7, 2, 6],
      allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 3],
        [2, 1, 1],
        [0, 0, 2]
      ],
      request: [
        [0, 0, 0],
        [2, 0, 2],
        [0, 0, 0],
        [1, 0, 0],
        [0, 0, 2]
      ]
    });
    expect(result.deadlocked).toBe(false);
  });

  it('detects a deadlock once a held resource is requested by everyone', () => {
    // P2 now needs one more C, which nobody will release.
    const result = detectDeadlock({
      resources: ['A', 'B', 'C'],
      processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
      total: [7, 2, 6],
      allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 3],
        [2, 1, 1],
        [0, 0, 2]
      ],
      request: [
        [0, 0, 0],
        [2, 0, 2],
        [0, 0, 1],
        [1, 0, 0],
        [0, 0, 2]
      ]
    });
    expect(result.deadlocked).toBe(true);
    expect(result.processes).toEqual(['P1', 'P2', 'P3', 'P4']);
  });

  it('detects the simplest two-process circular wait', () => {
    const result = detectDeadlock({
      resources: ['R1', 'R2'],
      processes: ['P0', 'P1'],
      total: [1, 1],
      allocation: [
        [1, 0],
        [0, 1]
      ],
      request: [
        [0, 1],
        [1, 0]
      ]
    });
    expect(result.deadlocked).toBe(true);
    expect(result.processes).toEqual(['P0', 'P1']);
  });
});
