/**
 * Synchronization primitives, modelled properly.
 *
 * Every actor runs a small program of wait()/signal()/work instructions and
 * the engine advances one instruction at a time. That matters for teaching:
 * a semaphore only makes sense if you can watch a process block on it, and a
 * deadlock only makes sense if the simulator is actually capable of reaching
 * one. Grabbing both forks in a single atomic update - the previous
 * behaviour - makes the Dining Philosophers deadlock unreachable, which
 * removes the entire point of the problem.
 */

export type Op = 'wait' | 'signal' | 'work';

export interface Instruction {
  op: Op;
  /** semaphore name for wait/signal */
  sem?: string;
  label: string;
  /** side effect for a `work` instruction */
  effect?: string;
}

export interface Actor {
  id: string;
  kind: string;
  /** index into its program */
  pc: number;
  blockedOn: string | null;
  /** how many full cycles of its program it has completed */
  cycles: number;
}

export interface MachineState {
  semaphores: Record<string, number>;
  actors: Actor[];
  log: string[];
  /** every actor is blocked and no semaphore can free them */
  deadlocked: boolean;
}

const MAX_LOG = 60;

const pushLog = (log: string[], message: string) =>
  [...log, message].slice(-MAX_LOG);

/**
 * Advance one actor by one instruction. Returns the new state plus whether
 * the actor made progress (a blocked wait() is not progress).
 */
const stepActor = (
  state: MachineState,
  program: Instruction[],
  actorId: string,
  applyEffect: (effect: string, actor: Actor) => { ok: boolean; note?: string }
): { state: MachineState; progressed: boolean } => {
  const index = state.actors.findIndex(a => a.id === actorId);
  if (index === -1) return { state, progressed: false };

  const actor = { ...state.actors[index] };
  const instruction = program[actor.pc];
  const semaphores = { ...state.semaphores };
  let log = state.log;
  let progressed = true;

  if (instruction.op === 'wait') {
    const name = instruction.sem!;
    if (semaphores[name] > 0) {
      semaphores[name] -= 1;
      actor.blockedOn = null;
      actor.pc += 1;
      log = pushLog(log, `${actor.id}: wait(${name}) succeeds - ${name} is now ${semaphores[name]}.`);
    } else {
      // Blocked. The actor stays parked on this instruction.
      progressed = false;
      if (actor.blockedOn !== name) {
        log = pushLog(log, `${actor.id}: wait(${name}) blocks - ${name} is 0.`);
      }
      actor.blockedOn = name;
    }
  } else if (instruction.op === 'signal') {
    const name = instruction.sem!;
    semaphores[name] += 1;
    actor.blockedOn = null;
    actor.pc += 1;
    log = pushLog(log, `${actor.id}: signal(${name}) - ${name} is now ${semaphores[name]}.`);
  } else {
    const result = applyEffect(instruction.effect ?? '', actor);
    if (!result.ok) {
      progressed = false;
    } else {
      actor.blockedOn = null;
      actor.pc += 1;
      if (result.note) log = pushLog(log, result.note);
    }
  }

  if (actor.pc >= program.length) {
    actor.pc = 0;
    actor.cycles += 1;
  }

  const actors = [...state.actors];
  actors[index] = actor;

  return {
    state: { ...state, semaphores, actors, log, deadlocked: false },
    progressed
  };
};

/* ------------------------------------------------------------------ */
/* Producer - Consumer                                                 */
/* ------------------------------------------------------------------ */

export interface ProducerConsumerState extends MachineState {
  buffer: (number | null)[];
  in: number;
  out: number;
  produced: number;
  consumed: number;
  /** the classic bug: taking mutex before the counting semaphore */
  swappedWaitOrder: boolean;
}

export const BUFFER_SIZE = 5;

export const producerProgram = (swapped: boolean): Instruction[] =>
  swapped
    ? [
      { op: 'wait', sem: 'mutex', label: 'wait(mutex)' },
      { op: 'wait', sem: 'empty', label: 'wait(empty)' },
      { op: 'work', effect: 'produce', label: 'buffer[in] = item' },
      { op: 'signal', sem: 'mutex', label: 'signal(mutex)' },
      { op: 'signal', sem: 'full', label: 'signal(full)' }
    ]
    : [
      { op: 'wait', sem: 'empty', label: 'wait(empty)' },
      { op: 'wait', sem: 'mutex', label: 'wait(mutex)' },
      { op: 'work', effect: 'produce', label: 'buffer[in] = item' },
      { op: 'signal', sem: 'mutex', label: 'signal(mutex)' },
      { op: 'signal', sem: 'full', label: 'signal(full)' }
    ];

export const consumerProgram = (swapped: boolean): Instruction[] =>
  swapped
    ? [
      { op: 'wait', sem: 'mutex', label: 'wait(mutex)' },
      { op: 'wait', sem: 'full', label: 'wait(full)' },
      { op: 'work', effect: 'consume', label: 'item = buffer[out]' },
      { op: 'signal', sem: 'mutex', label: 'signal(mutex)' },
      { op: 'signal', sem: 'empty', label: 'signal(empty)' }
    ]
    : [
      { op: 'wait', sem: 'full', label: 'wait(full)' },
      { op: 'wait', sem: 'mutex', label: 'wait(mutex)' },
      { op: 'work', effect: 'consume', label: 'item = buffer[out]' },
      { op: 'signal', sem: 'mutex', label: 'signal(mutex)' },
      { op: 'signal', sem: 'empty', label: 'signal(empty)' }
    ];

export const initialProducerConsumer = (
  producers = 2,
  consumers = 2,
  swappedWaitOrder = false
): ProducerConsumerState => ({
  semaphores: { empty: BUFFER_SIZE, full: 0, mutex: 1 },
  actors: [
    ...Array.from({ length: producers }, (_, i) => ({
      id: `Producer ${i + 1}`,
      kind: 'producer',
      pc: 0,
      blockedOn: null,
      cycles: 0
    })),
    ...Array.from({ length: consumers }, (_, i) => ({
      id: `Consumer ${i + 1}`,
      kind: 'consumer',
      pc: 0,
      blockedOn: null,
      cycles: 0
    }))
  ],
  log: ['Buffer empty. empty=5, full=0, mutex=1.'],
  deadlocked: false,
  buffer: Array(BUFFER_SIZE).fill(null),
  in: 0,
  out: 0,
  produced: 0,
  consumed: 0,
  swappedWaitOrder
});

export const stepProducerConsumer = (
  state: ProducerConsumerState,
  actorId: string
): ProducerConsumerState => {
  const actor = state.actors.find(a => a.id === actorId);
  if (!actor) return state;

  const program =
    actor.kind === 'producer'
      ? producerProgram(state.swappedWaitOrder)
      : consumerProgram(state.swappedWaitOrder);

  let buffer = state.buffer;
  let inIndex = state.in;
  let outIndex = state.out;
  let produced = state.produced;
  let consumed = state.consumed;

  const { state: next } = stepActor(state, program, actorId, (effect, a) => {
    if (effect === 'produce') {
      const item = produced + 1;
      buffer = [...buffer];
      buffer[inIndex] = item;
      const slot = inIndex;
      inIndex = (inIndex + 1) % BUFFER_SIZE;
      produced += 1;
      return { ok: true, note: `${a.id}: wrote item ${item} into slot ${slot}.` };
    }
    if (effect === 'consume') {
      const item = buffer[outIndex];
      buffer = [...buffer];
      buffer[outIndex] = null;
      const slot = outIndex;
      outIndex = (outIndex + 1) % BUFFER_SIZE;
      consumed += 1;
      return { ok: true, note: `${a.id}: read item ${item} from slot ${slot}.` };
    }
    return { ok: true };
  });

  const result: ProducerConsumerState = {
    ...(next as ProducerConsumerState),
    buffer,
    in: inIndex,
    out: outIndex,
    produced,
    consumed,
    swappedWaitOrder: state.swappedWaitOrder
  };

  return { ...result, deadlocked: isDeadlocked(result, id => programFor(result, id)) };
};

const programFor = (state: ProducerConsumerState, actorId: string) => {
  const actor = state.actors.find(a => a.id === actorId)!;
  return actor.kind === 'producer'
    ? producerProgram(state.swappedWaitOrder)
    : consumerProgram(state.swappedWaitOrder);
};

/**
 * Deadlock: every actor sits on a wait() whose semaphore is 0. Nobody can
 * signal, so nothing will ever change.
 */
export const isDeadlocked = (
  state: MachineState,
  program: (actorId: string) => Instruction[]
): boolean =>
  state.actors.length > 0 &&
  state.actors.every(actor => {
    const instruction = program(actor.id)[actor.pc];
    return instruction.op === 'wait' && state.semaphores[instruction.sem!] === 0;
  });

/* ------------------------------------------------------------------ */
/* Readers - Writers                                                   */
/* ------------------------------------------------------------------ */

export interface ReadersWritersState extends MachineState {
  readCount: number;
  activeReaders: string[];
  activeWriter: string | null;
  reads: number;
  writes: number;
}

export const readerProgram: Instruction[] = [
  { op: 'wait', sem: 'mutex', label: 'wait(mutex)' },
  { op: 'work', effect: 'enterRead', label: 'readCount++; if (readCount == 1) wait(rw)' },
  { op: 'signal', sem: 'mutex', label: 'signal(mutex)' },
  { op: 'work', effect: 'read', label: '... reading ...' },
  { op: 'wait', sem: 'mutex', label: 'wait(mutex)' },
  { op: 'work', effect: 'exitRead', label: 'readCount--; if (readCount == 0) signal(rw)' },
  { op: 'signal', sem: 'mutex', label: 'signal(mutex)' }
];

export const writerProgram: Instruction[] = [
  { op: 'wait', sem: 'rw', label: 'wait(rw)' },
  { op: 'work', effect: 'write', label: '... writing ...' },
  { op: 'signal', sem: 'rw', label: 'signal(rw)' }
];

export const initialReadersWriters = (readers = 3, writers = 1): ReadersWritersState => ({
  semaphores: { mutex: 1, rw: 1 },
  actors: [
    ...Array.from({ length: readers }, (_, i) => ({
      id: `Reader ${i + 1}`,
      kind: 'reader',
      pc: 0,
      blockedOn: null,
      cycles: 0
    })),
    ...Array.from({ length: writers }, (_, i) => ({
      id: `Writer ${i + 1}`,
      kind: 'writer',
      pc: 0,
      blockedOn: null,
      cycles: 0
    }))
  ],
  log: ['No readers, no writer. mutex=1, rw=1.'],
  deadlocked: false,
  readCount: 0,
  activeReaders: [],
  activeWriter: null,
  reads: 0,
  writes: 0
});

export const stepReadersWriters = (
  state: ReadersWritersState,
  actorId: string
): ReadersWritersState => {
  const actor = state.actors.find(a => a.id === actorId);
  if (!actor) return state;

  const program = actor.kind === 'reader' ? readerProgram : writerProgram;

  let readCount = state.readCount;
  let activeReaders = state.activeReaders;
  let activeWriter = state.activeWriter;
  let reads = state.reads;
  let writes = state.writes;
  const semaphores = { ...state.semaphores };

  const { state: next } = stepActor(state, program, actorId, (effect, a) => {
    if (effect === 'enterRead') {
      // The first reader takes the resource lock on behalf of all readers.
      if (readCount === 0) {
        if (semaphores.rw === 0) {
          return { ok: false };
        }
        semaphores.rw -= 1;
      }
      readCount += 1;
      activeReaders = [...activeReaders, a.id];
      return {
        ok: true,
        note:
          readCount === 1
            ? `${a.id}: first reader in - takes rw so writers are locked out.`
            : `${a.id}: joins ${readCount - 1} other reader(s) - no extra lock needed.`
      };
    }
    if (effect === 'read') {
      reads += 1;
      return { ok: true, note: `${a.id}: reading the shared data.` };
    }
    if (effect === 'exitRead') {
      readCount -= 1;
      activeReaders = activeReaders.filter(id => id !== a.id);
      if (readCount === 0) {
        semaphores.rw += 1;
        return { ok: true, note: `${a.id}: last reader out - releases rw, writers may proceed.` };
      }
      return { ok: true, note: `${a.id}: done reading, ${readCount} reader(s) still active.` };
    }
    if (effect === 'write') {
      activeWriter = a.id;
      writes += 1;
      return { ok: true, note: `${a.id}: writing with exclusive access.` };
    }
    return { ok: true };
  });

  // `enterRead`/`exitRead` change rw directly, so fold that back in.
  const merged = {
    ...(next as ReadersWritersState),
    semaphores: { ...next.semaphores, rw: semaphores.rw },
    readCount,
    activeReaders,
    activeWriter: actor.kind === 'writer' && next.actors.find(a => a.id === actorId)!.pc === 0
      ? null
      : activeWriter,
    reads,
    writes
  };

  return merged;
};

/* ------------------------------------------------------------------ */
/* Dining Philosophers                                                 */
/* ------------------------------------------------------------------ */

export type DiningStrategy = 'none' | 'oddEven' | 'hierarchy' | 'waiter';
export type PhilosopherState = 'thinking' | 'hungry' | 'eating';

export interface Philosopher {
  id: number;
  state: PhilosopherState;
  /** fork ids currently held - the whole point is that this can be length 1 */
  holds: number[];
  meals: number;
  seated: boolean;
}

export interface DiningState {
  philosophers: Philosopher[];
  /** owner of each fork, or null */
  forks: (number | null)[];
  strategy: DiningStrategy;
  log: string[];
  deadlocked: boolean;
  /** waiter strategy: how many philosophers may be seated at once */
  seatsAvailable: number;
}

export const PHILOSOPHER_COUNT = 5;

const leftFork = (id: number) => id;
const rightFork = (id: number) => (id + 1) % PHILOSOPHER_COUNT;

/** The order in which philosopher `id` reaches for forks under `strategy`. */
export const forkOrder = (id: number, strategy: DiningStrategy): [number, number] => {
  const left = leftFork(id);
  const right = rightFork(id);

  switch (strategy) {
    case 'oddEven':
      // Odd philosophers reach right-first, breaking the symmetry that
      // lets everyone grab a left fork simultaneously.
      return id % 2 === 0 ? [left, right] : [right, left];
    case 'hierarchy':
      // Always take the lower-numbered fork first - no cycle can form.
      return left < right ? [left, right] : [right, left];
    default:
      // Everyone reaches left-first. This is the version that deadlocks.
      return [left, right];
  }
};

export const initialDining = (strategy: DiningStrategy = 'none'): DiningState => ({
  philosophers: Array.from({ length: PHILOSOPHER_COUNT }, (_, id) => ({
    id,
    state: 'thinking' as PhilosopherState,
    holds: [],
    meals: 0,
    seated: false
  })),
  forks: Array(PHILOSOPHER_COUNT).fill(null),
  strategy,
  log: ['All five philosophers are thinking. Every fork is on the table.'],
  deadlocked: false,
  seatsAvailable: PHILOSOPHER_COUNT - 1
});

export const makeHungry = (state: DiningState, id: number): DiningState => {
  const philosopher = state.philosophers[id];
  if (philosopher.state !== 'thinking') return state;

  return {
    ...state,
    philosophers: state.philosophers.map(p =>
      p.id === id ? { ...p, state: 'hungry' as PhilosopherState } : p
    ),
    log: pushLog(state.log, `P${id} gets hungry and heads for the table.`)
  };
};

/**
 * One simulation step: every hungry philosopher reaches for exactly ONE fork.
 * Acquiring both at once - the previous implementation - is what made
 * deadlock impossible.
 */
export const stepDining = (state: DiningState): DiningState => {
  const forks = [...state.forks];
  let seats = state.seatsAvailable;
  let log = state.log;

  const philosophers = state.philosophers.map(p => ({ ...p, holds: [...p.holds] }));

  for (const p of philosophers) {
    if (p.state === 'eating') {
      // Finish the meal and put both forks back.
      p.holds.forEach(fork => {
        forks[fork] = null;
      });
      log = pushLog(log, `P${p.id} finishes eating and puts down forks ${p.holds.join(' and ')}.`);
      p.holds = [];
      p.state = 'thinking';
      p.meals += 1;
      if (state.strategy === 'waiter' && p.seated) {
        p.seated = false;
        seats += 1;
      }
      continue;
    }

    if (p.state !== 'hungry') continue;

    if (state.strategy === 'waiter' && !p.seated) {
      if (seats <= 0) {
        log = pushLog(log, `P${p.id} waits for a seat - the waiter allows only ${PHILOSOPHER_COUNT - 1} at the table.`);
        continue;
      }
      p.seated = true;
      seats -= 1;
      log = pushLog(log, `P${p.id} is seated by the waiter (${seats} seat(s) left).`);
      continue;
    }

    const [first, second] = forkOrder(p.id, state.strategy);
    const next = p.holds.includes(first) ? second : first;

    if (forks[next] === null) {
      forks[next] = p.id;
      p.holds.push(next);
      log = pushLog(log, `P${p.id} picks up fork ${next}.`);

      if (p.holds.length === 2) {
        p.state = 'eating';
        log = pushLog(log, `P${p.id} has both forks and starts eating.`);
      }
    } else if (forks[next] !== p.id) {
      log = pushLog(log, `P${p.id} reaches for fork ${next} but P${forks[next]} is holding it.`);
    }
  }

  const deadlocked =
    philosophers.every(p => p.state === 'hungry' && p.holds.length === 1) &&
    forks.every(owner => owner !== null);

  if (deadlocked && !state.deadlocked) {
    log = pushLog(
      log,
      'DEADLOCK: every philosopher holds one fork and is waiting for a neighbour to release the other. Nobody can proceed.'
    );
  }

  return {
    ...state,
    philosophers,
    forks,
    seatsAvailable: seats,
    log,
    deadlocked
  };
};

/** Make every philosopher hungry at once - the fastest route to deadlock. */
export const allHungry = (state: DiningState): DiningState =>
  state.philosophers.reduce((acc, p) => makeHungry(acc, p.id), state);
