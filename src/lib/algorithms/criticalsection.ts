/**
 * The critical-section problem.
 *
 * A race condition is only convincing if you can watch it happen, so the
 * shared counter is modelled at instruction granularity - load, add, store -
 * and the interleaving is yours to choose. Run the two threads in lockstep
 * and the count comes out wrong; that lost update *is* the problem every
 * lock in the syllabus exists to solve.
 */

export type Solution = 'none' | 'peterson' | 'mutex' | 'test-and-set';

export type Instruction =
  | { op: 'entry'; label: string }
  | { op: 'load'; label: string }
  | { op: 'add'; label: string }
  | { op: 'store'; label: string }
  | { op: 'exit'; label: string };

export interface Thread {
  id: number;
  name: string;
  pc: number;
  /** the thread's private copy of the shared counter */
  register: number | null;
  inCritical: boolean;
  blocked: boolean;
  completed: number;
}

export interface CsState {
  threads: Thread[];
  /** the shared variable both threads are incrementing */
  counter: number;
  /** how many increments have actually been issued */
  increments: number;
  solution: Solution;
  /** Peterson's: interest flags and whose turn it is */
  flag: [boolean, boolean];
  turn: number;
  /** mutex / test-and-set lock */
  lock: boolean;
  log: string[];
  raceDetected: boolean;
}

const MAX_LOG = 40;

const push = (log: string[], message: string) => [...log, message].slice(-MAX_LOG);

export const programFor = (solution: Solution): Instruction[] => {
  const body: Instruction[] = [
    { op: 'load', label: 'reg = counter' },
    { op: 'add', label: 'reg = reg + 1' },
    { op: 'store', label: 'counter = reg' }
  ];

  switch (solution) {
    case 'peterson':
      return [
        { op: 'entry', label: 'flag[i] = true; turn = j; while (flag[j] && turn == j);' },
        ...body,
        { op: 'exit', label: 'flag[i] = false' }
      ];
    case 'mutex':
      return [{ op: 'entry', label: 'acquire(mutex)' }, ...body, { op: 'exit', label: 'release(mutex)' }];
    case 'test-and-set':
      return [
        { op: 'entry', label: 'while (TestAndSet(&lock));' },
        ...body,
        { op: 'exit', label: 'lock = false' }
      ];
    default:
      return body;
  }
};

export const initialCriticalSection = (solution: Solution = 'none'): CsState => ({
  threads: [0, 1].map(id => ({
    id,
    name: `Thread ${id === 0 ? 'A' : 'B'}`,
    pc: 0,
    register: null,
    inCritical: false,
    blocked: false,
    completed: 0
  })),
  counter: 0,
  increments: 0,
  solution,
  flag: [false, false],
  turn: 0,
  lock: false,
  log: ['counter = 0. Each thread will increment it; the correct final value is one per increment.'],
  raceDetected: false
});

/**
 * Advance one thread by one instruction. Which thread you pick is the
 * scheduling decision - and picking them alternately is what exposes the race.
 */
export const stepThread = (state: CsState, threadId: number): CsState => {
  const program = programFor(state.solution);
  const index = state.threads.findIndex(t => t.id === threadId);
  if (index === -1) return state;

  const thread = { ...state.threads[index] };
  const other = state.threads[1 - index];
  const instruction = program[thread.pc];

  let { counter, increments, lock, turn, raceDetected } = state;
  const flag: [boolean, boolean] = [...state.flag] as [boolean, boolean];
  let log = state.log;

  switch (instruction.op) {
    case 'entry': {
      if (state.solution === 'peterson') {
        flag[thread.id] = true;
        turn = other.id;
        // Wait while the other thread is interested AND it is their turn.
        if (other.inCritical || (flag[other.id] && turn === other.id)) {
          thread.blocked = true;
          log = push(log, `${thread.name}: sets flag[${thread.id}]=true, turn=${other.id}, and spins - ${other.name} has priority.`);
          break;
        }
        thread.blocked = false;
        thread.inCritical = true;
        thread.pc += 1;
        log = push(log, `${thread.name}: enters the critical section (flag[${other.id}] is false or it is not ${other.name}'s turn).`);
        break;
      }

      if (state.solution === 'mutex' || state.solution === 'test-and-set') {
        if (lock) {
          thread.blocked = true;
          log = push(log, `${thread.name}: the lock is held, so it ${state.solution === 'test-and-set' ? 'spins on TestAndSet' : 'blocks on acquire()'}.`);
          break;
        }
        lock = true;
        thread.blocked = false;
        thread.inCritical = true;
        thread.pc += 1;
        log = push(log, `${thread.name}: takes the lock and enters the critical section.`);
        break;
      }

      thread.pc += 1;
      break;
    }

    case 'load': {
      thread.register = counter;
      thread.pc += 1;
      if (state.solution === 'none') thread.inCritical = true;
      log = push(log, `${thread.name}: reads counter (${counter}) into its own register.`);
      break;
    }

    case 'add': {
      thread.register = (thread.register ?? 0) + 1;
      thread.pc += 1;
      log = push(log, `${thread.name}: increments its register to ${thread.register}.`);
      break;
    }

    case 'store': {
      const written = thread.register ?? 0;
      // A lost update: this thread writes a value based on a counter that has
      // moved on since it read it.
      const lost = written <= counter && increments > 0;
      counter = written;
      increments += 1;
      thread.completed += 1;
      thread.pc += 1;
      if (state.solution === 'none') thread.inCritical = false;

      if (lost) {
        raceDetected = true;
        log = push(log, `${thread.name}: writes ${written} back - but the counter had already moved on. An increment has been LOST.`);
      } else {
        log = push(log, `${thread.name}: writes ${written} back to counter.`);
      }
      break;
    }

    case 'exit': {
      if (state.solution === 'peterson') {
        flag[thread.id] = false;
        log = push(log, `${thread.name}: clears flag[${thread.id}] and leaves the critical section.`);
      } else {
        lock = false;
        log = push(log, `${thread.name}: releases the lock.`);
      }
      thread.inCritical = false;
      thread.pc += 1;
      break;
    }
  }

  if (thread.pc >= program.length) {
    thread.pc = 0;
    thread.register = null;
  }

  const threads = [...state.threads];
  threads[index] = thread;

  // Any moment where both threads sit inside the critical section is a
  // mutual-exclusion violation, whatever the counter happens to say.
  const bothInside = threads.filter(t => t.inCritical).length > 1;
  if (bothInside) raceDetected = true;

  return {
    ...state,
    threads,
    counter,
    increments,
    lock,
    flag,
    turn,
    log,
    raceDetected
  };
};

/** The counter should equal the number of completed increments. */
export const expectedCounter = (state: CsState) =>
  state.threads.reduce((sum, t) => sum + t.completed, 0);

export const isCorrect = (state: CsState) => state.counter === expectedCounter(state);
