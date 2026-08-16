import { describe, expect, it } from 'vitest';
import {
  CsState,
  Solution,
  expectedCounter,
  initialCriticalSection,
  isCorrect,
  programFor,
  stepThread
} from './criticalsection';

/** Interleave the two threads strictly alternately - the worst case. */
const interleave = (solution: Solution, steps: number): CsState => {
  let state = initialCriticalSection(solution);
  for (let i = 0; i < steps; i++) {
    state = stepThread(state, i % 2);
  }
  return state;
};

/** Run one thread to completion, then the other - the lucky case. */
const sequential = (solution: Solution, each: number): CsState => {
  let state = initialCriticalSection(solution);
  const length = programFor(solution).length;
  for (let i = 0; i < each * length; i++) state = stepThread(state, 0);
  for (let i = 0; i < each * length; i++) state = stepThread(state, 1);
  return state;
};

describe('race condition', () => {
  it('loses an update when two threads interleave without protection', () => {
    // Both load 0, both add 1, both store 1 - two increments, counter = 1.
    const state = interleave('none', 6);
    expect(state.counter).toBe(1);
    expect(expectedCounter(state)).toBe(2);
    expect(isCorrect(state)).toBe(false);
    expect(state.raceDetected).toBe(true);
  });

  it('happens to be correct when the threads do not overlap', () => {
    const state = sequential('none', 1);
    expect(state.counter).toBe(2);
    expect(isCorrect(state)).toBe(true);
    // The bug is still there - it just was not triggered by this interleaving.
    expect(state.raceDetected).toBe(false);
  });

  it('logs the lost update', () => {
    const state = interleave('none', 6);
    expect(state.log.some(line => line.includes('LOST'))).toBe(true);
  });
});

describe("Peterson's solution", () => {
  it('keeps the counter correct under the same interleaving that broke it', () => {
    const state = interleave('peterson', 40);
    expect(isCorrect(state)).toBe(true);
    expect(state.raceDetected).toBe(false);
  });

  it('never lets both threads into the critical section at once', () => {
    let state = initialCriticalSection('peterson');
    for (let i = 0; i < 60; i++) {
      state = stepThread(state, i % 2);
      expect(state.threads.filter(t => t.inCritical).length).toBeLessThanOrEqual(1);
    }
  });

  it('blocks the second thread while the first holds the section', () => {
    let state = initialCriticalSection('peterson');
    state = stepThread(state, 0); // A enters
    state = stepThread(state, 1); // B tries and spins
    expect(state.threads[0].inCritical).toBe(true);
    expect(state.threads[1].blocked).toBe(true);
  });
});

describe('mutex and test-and-set', () => {
  for (const solution of ['mutex', 'test-and-set'] as const) {
    it(`${solution} preserves mutual exclusion`, () => {
      let state = initialCriticalSection(solution);
      for (let i = 0; i < 60; i++) {
        state = stepThread(state, i % 2);
        expect(state.threads.filter(t => t.inCritical).length).toBeLessThanOrEqual(1);
      }
      expect(isCorrect(state)).toBe(true);
    });

    it(`${solution} blocks the second thread on a held lock`, () => {
      let state = initialCriticalSection(solution);
      state = stepThread(state, 0);
      expect(state.lock).toBe(true);
      state = stepThread(state, 1);
      expect(state.threads[1].blocked).toBe(true);
    });

    it(`${solution} releases the lock on exit`, () => {
      let state = initialCriticalSection(solution);
      const length = programFor(solution).length;
      for (let i = 0; i < length; i++) state = stepThread(state, 0);
      expect(state.lock).toBe(false);
    });
  }
});

describe('programs', () => {
  it('wraps the critical section in entry and exit code', () => {
    expect(programFor('none')).toHaveLength(3);
    expect(programFor('peterson')).toHaveLength(5);
    expect(programFor('peterson')[0].op).toBe('entry');
    expect(programFor('peterson')[4].op).toBe('exit');
  });
});
