import { describe, expect, it } from 'vitest';
import {
  BUFFER_SIZE,
  DiningStrategy,
  allHungry,
  forkOrder,
  initialDining,
  initialProducerConsumer,
  initialReadersWriters,
  makeHungry,
  stepDining,
  stepProducerConsumer,
  stepReadersWriters
} from './sync';

const runDining = (strategy: DiningStrategy, steps: number) => {
  let state = allHungry(initialDining(strategy));
  for (let i = 0; i < steps; i++) state = stepDining(state);
  return state;
};

describe('Dining Philosophers', () => {
  it('deadlocks when every philosopher reaches left-first', () => {
    // The core lesson: one fork each, everyone stuck waiting on a neighbour.
    // Grabbing both forks atomically made this unreachable.
    const state = runDining('none', 2);
    expect(state.deadlocked).toBe(true);
    expect(state.philosophers.every(p => p.holds.length === 1)).toBe(true);
    expect(state.log.some(line => line.includes('DEADLOCK'))).toBe(true);
  });

  it('never deadlocks under the odd-even strategy', () => {
    const state = runDining('oddEven', 40);
    expect(state.deadlocked).toBe(false);
    expect(state.philosophers.some(p => p.meals > 0)).toBe(true);
  });

  it('never deadlocks under the resource hierarchy strategy', () => {
    const state = runDining('hierarchy', 40);
    expect(state.deadlocked).toBe(false);
    expect(state.philosophers.some(p => p.meals > 0)).toBe(true);
  });

  it('never deadlocks when a waiter limits seating', () => {
    const state = runDining('waiter', 60);
    expect(state.deadlocked).toBe(false);
    expect(state.philosophers.some(p => p.meals > 0)).toBe(true);
  });

  it('picks up one fork at a time', () => {
    const state = stepDining(makeHungry(initialDining('none'), 0));
    expect(state.philosophers[0].holds).toHaveLength(1);
    expect(state.philosophers[0].state).toBe('hungry');
  });

  it('never lets two philosophers hold the same fork', () => {
    let state = allHungry(initialDining('oddEven'));
    for (let i = 0; i < 50; i++) {
      state = stepDining(state);
      const held = state.philosophers.flatMap(p => p.holds);
      expect(new Set(held).size).toBe(held.length);
      // A fork's owner must agree with what the philosopher thinks they hold.
      state.forks.forEach((owner, fork) => {
        if (owner !== null) {
          expect(state.philosophers[owner].holds).toContain(fork);
        }
      });
    }
  });

  it('orders fork pickup per strategy', () => {
    expect(forkOrder(1, 'none')).toEqual([1, 2]);
    expect(forkOrder(1, 'oddEven')).toEqual([2, 1]);
    // Philosopher 4's forks are 4 and 0; the hierarchy takes 0 first.
    expect(forkOrder(4, 'hierarchy')).toEqual([0, 4]);
  });
});

describe('Producer - Consumer', () => {
  const cycle = (state: ReturnType<typeof initialProducerConsumer>, actor: string, times: number) => {
    let next = state;
    for (let i = 0; i < times; i++) next = stepProducerConsumer(next, actor);
    return next;
  };

  it('moves an item through the buffer with correct semaphore values', () => {
    let state = initialProducerConsumer(1, 1);
    expect(state.semaphores).toEqual({ empty: BUFFER_SIZE, full: 0, mutex: 1 });

    state = cycle(state, 'Producer 1', 5); // one full program cycle
    expect(state.produced).toBe(1);
    expect(state.semaphores.empty).toBe(BUFFER_SIZE - 1);
    expect(state.semaphores.full).toBe(1);
    expect(state.semaphores.mutex).toBe(1);
    expect(state.buffer[0]).toBe(1);

    state = cycle(state, 'Consumer 1', 5);
    expect(state.consumed).toBe(1);
    expect(state.semaphores.empty).toBe(BUFFER_SIZE);
    expect(state.semaphores.full).toBe(0);
    expect(state.buffer[0]).toBeNull();
  });

  it('blocks a consumer on an empty buffer instead of consuming nothing', () => {
    let state = initialProducerConsumer(1, 1);
    state = cycle(state, 'Consumer 1', 3);
    expect(state.consumed).toBe(0);
    expect(state.actors.find(a => a.id === 'Consumer 1')!.blockedOn).toBe('full');
  });

  it('blocks a producer once the buffer is full', () => {
    let state = initialProducerConsumer(1, 1);
    state = cycle(state, 'Producer 1', 5 * BUFFER_SIZE);
    expect(state.produced).toBe(BUFFER_SIZE);
    expect(state.semaphores.empty).toBe(0);

    state = cycle(state, 'Producer 1', 2);
    expect(state.produced).toBe(BUFFER_SIZE);
    expect(state.actors.find(a => a.id === 'Producer 1')!.blockedOn).toBe('empty');
  });

  it('deadlocks when mutex is taken before the counting semaphore', () => {
    // The textbook bug: a producer holding mutex blocks on empty, and the
    // consumer that would free a slot can never get mutex.
    let state = initialProducerConsumer(1, 1, true);
    for (let i = 0; i < 5 * BUFFER_SIZE + 4; i++) {
      state = stepProducerConsumer(state, 'Producer 1');
    }
    state = stepProducerConsumer(state, 'Consumer 1');
    expect(state.deadlocked).toBe(true);
  });

  it('wraps the buffer indices around', () => {
    let state = initialProducerConsumer(1, 1);
    for (let i = 0; i < BUFFER_SIZE + 2; i++) {
      state = cycle(state, 'Producer 1', 5);
      state = cycle(state, 'Consumer 1', 5);
    }
    expect(state.produced).toBe(BUFFER_SIZE + 2);
    expect(state.consumed).toBe(BUFFER_SIZE + 2);
    expect(state.buffer.every(slot => slot === null)).toBe(true);
  });
});

describe('Readers - Writers', () => {
  const cycle = (state: ReturnType<typeof initialReadersWriters>, actor: string, times: number) => {
    let next = state;
    for (let i = 0; i < times; i++) next = stepReadersWriters(next, actor);
    return next;
  };

  it('lets several readers in at once and only locks out writers once', () => {
    let state = initialReadersWriters(2, 1);
    state = cycle(state, 'Reader 1', 3); // wait(mutex), enterRead, signal(mutex)
    expect(state.readCount).toBe(1);
    expect(state.semaphores.rw).toBe(0);

    state = cycle(state, 'Reader 2', 3);
    expect(state.readCount).toBe(2);
    expect(state.semaphores.rw).toBe(0); // still just the one lock
  });

  it('blocks a writer while any reader is active', () => {
    let state = initialReadersWriters(1, 1);
    state = cycle(state, 'Reader 1', 3);
    state = cycle(state, 'Writer 1', 2);
    expect(state.writes).toBe(0);
    expect(state.actors.find(a => a.id === 'Writer 1')!.blockedOn).toBe('rw');
  });

  it('releases the resource when the last reader leaves', () => {
    let state = initialReadersWriters(1, 1);
    state = cycle(state, 'Reader 1', 7); // full reader cycle
    expect(state.readCount).toBe(0);
    expect(state.semaphores.rw).toBe(1);

    state = cycle(state, 'Writer 1', 2);
    expect(state.writes).toBe(1);
  });

  it('tracks readCount from live state rather than a stale snapshot', () => {
    let state = initialReadersWriters(3, 0);
    for (const reader of ['Reader 1', 'Reader 2', 'Reader 3']) {
      state = cycle(state, reader, 3);
    }
    expect(state.readCount).toBe(3);
    for (const reader of ['Reader 1', 'Reader 2']) {
      state = cycle(state, reader, 4); // read, wait(mutex), exitRead, signal(mutex)
    }
    expect(state.readCount).toBe(1);
    expect(state.semaphores.rw).toBe(0); // one reader still inside
  });
});
