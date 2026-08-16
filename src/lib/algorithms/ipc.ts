/**
 * Inter-process communication, process states and the access matrix.
 *
 * Shared memory and message passing solve the same problem from opposite
 * ends: shared memory is fast because the kernel steps out of the way after
 * setup, and message passing is safe because the kernel never does.
 */

export type IpcMechanism = 'shared-memory' | 'message-passing' | 'pipe';

export interface IpcMessage {
  id: number;
  from: string;
  to: string;
  body: string;
  /** where the message currently is */
  location: 'sender' | 'kernel' | 'receiver';
}

export interface IpcState {
  mechanism: IpcMechanism;
  /** shared memory region, for the shared-memory mechanism */
  sharedRegion: (string | null)[];
  /** kernel message queue, for message passing and pipes */
  queue: IpcMessage[];
  delivered: IpcMessage[];
  /** how many times control crossed into the kernel */
  kernelCrossings: number;
  /** capacity of the queue: 0 = no buffering (rendezvous) */
  capacity: number;
  senderBlocked: boolean;
  receiverBlocked: boolean;
  log: string[];
  nextId: number;
}

const MAX_LOG = 30;
const push = (log: string[], message: string) => [...log, message].slice(-MAX_LOG);

export const SHARED_SLOTS = 6;

export const initialIpc = (mechanism: IpcMechanism, capacity = 3): IpcState => ({
  mechanism,
  sharedRegion: Array(SHARED_SLOTS).fill(null),
  queue: [],
  delivered: [],
  kernelCrossings: mechanism === 'shared-memory' ? 2 : 0,
  capacity: mechanism === 'pipe' ? 4 : capacity,
  senderBlocked: false,
  receiverBlocked: false,
  log:
    mechanism === 'shared-memory'
      ? ['Both processes asked the kernel to map one shared region. That was 2 system calls; from here the kernel is not involved at all.']
      : ['The kernel owns the channel. Every send and every receive is a system call.'],
  nextId: 1
});

export const ipcSend = (state: IpcState, body: string): IpcState => {
  if (state.mechanism === 'shared-memory') {
    const slot = state.sharedRegion.findIndex(cell => cell === null);
    if (slot === -1) {
      return { ...state, log: push(state.log, 'The shared region is full. Note that nothing stopped the write - the processes must synchronise this themselves.') };
    }
    const region = [...state.sharedRegion];
    region[slot] = body;
    return {
      ...state,
      sharedRegion: region,
      nextId: state.nextId + 1,
      log: push(
        state.log,
        `Producer writes "${body}" straight into slot ${slot} of the shared region - an ordinary memory write, at memory speed, with no system call.`
      )
    };
  }

  // Message passing / pipe: the message goes through the kernel.
  if (state.capacity > 0 && state.queue.length >= state.capacity) {
    return {
      ...state,
      senderBlocked: true,
      log: push(state.log, `The channel holds its capacity of ${state.capacity} message(s), so the sender blocks until the receiver drains one.`)
    };
  }

  const message: IpcMessage = {
    id: state.nextId,
    from: 'Sender',
    to: 'Receiver',
    body,
    location: 'kernel'
  };

  return {
    ...state,
    queue: [...state.queue, message],
    kernelCrossings: state.kernelCrossings + 1,
    senderBlocked: state.capacity === 0,
    nextId: state.nextId + 1,
    log: push(
      state.log,
      state.capacity === 0
        ? `send("${body}") - zero-capacity channel, so the sender now blocks until the receiver takes it. This is a rendezvous.`
        : `send("${body}") copies the message into the kernel's buffer. That is one system call and one copy.`
    )
  };
};

export const ipcReceive = (state: IpcState): IpcState => {
  if (state.mechanism === 'shared-memory') {
    const slot = state.sharedRegion.findIndex(cell => cell !== null);
    if (slot === -1) {
      return { ...state, log: push(state.log, 'Nothing in the shared region to read.') };
    }
    const value = state.sharedRegion[slot];
    const region = [...state.sharedRegion];
    region[slot] = null;
    return {
      ...state,
      sharedRegion: region,
      log: push(state.log, `Consumer reads "${value}" directly out of slot ${slot}. Again, no kernel involvement.`)
    };
  }

  if (!state.queue.length) {
    return {
      ...state,
      receiverBlocked: true,
      log: push(state.log, 'receive() finds the channel empty, so the receiver blocks.')
    };
  }

  const [message, ...rest] = state.queue;
  return {
    ...state,
    queue: rest,
    delivered: [...state.delivered, { ...message, location: 'receiver' }],
    kernelCrossings: state.kernelCrossings + 1,
    senderBlocked: false,
    receiverBlocked: false,
    log: push(
      state.log,
      `receive() copies "${message.body}" out of the kernel to the receiver - a second system call and a second copy for this one message.`
    )
  };
};

export const ipcComparison = [
  {
    aspect: 'Speed',
    shared: 'Memory speed after setup',
    message: 'Two copies and two system calls per message'
  },
  {
    aspect: 'Kernel involvement',
    shared: 'Only to create and map the region',
    message: 'On every single send and receive'
  },
  {
    aspect: 'Synchronization',
    shared: 'Your problem - you must add locks or semaphores',
    message: 'Built in; the channel is atomic'
  },
  {
    aspect: 'Across machines',
    shared: 'Not possible - needs shared physical memory',
    message: 'Works unchanged over a network'
  },
  {
    aspect: 'Best for',
    shared: 'Large data, high volume, same machine',
    message: 'Small messages, or where isolation matters more than speed'
  }
];

/* ------------------------------------------------------------------ */
/* Process states                                                      */
/* ------------------------------------------------------------------ */

export type ProcessState = 'new' | 'ready' | 'running' | 'waiting' | 'terminated';

export interface StateTransition {
  from: ProcessState;
  to: ProcessState;
  trigger: string;
  detail: string;
}

export const processTransitions: StateTransition[] = [
  {
    from: 'new',
    to: 'ready',
    trigger: 'admitted',
    detail: 'The OS has built the PCB and allocated memory, so the process may now be scheduled.'
  },
  {
    from: 'ready',
    to: 'running',
    trigger: 'scheduler dispatch',
    detail: 'The short-term scheduler picks this process and the dispatcher loads its context onto the CPU.'
  },
  {
    from: 'running',
    to: 'ready',
    trigger: 'interrupt / quantum expiry',
    detail: 'A preemption. The process is still perfectly able to run - it just lost the CPU.'
  },
  {
    from: 'running',
    to: 'waiting',
    trigger: 'I/O or event wait',
    detail: 'The process asked for something it cannot have yet, so it cannot use the CPU even if given it.'
  },
  {
    from: 'waiting',
    to: 'ready',
    trigger: 'I/O completion',
    detail: 'The event happened. Note it goes to ready, not straight to running - it must be scheduled again.'
  },
  {
    from: 'running',
    to: 'terminated',
    trigger: 'exit()',
    detail: 'The process finished or was killed; the OS reclaims its resources.'
  }
];

export const PCB_FIELDS = [
  { field: 'Process state', why: 'new, ready, running, waiting or terminated' },
  { field: 'Program counter', why: 'the address of the next instruction to execute' },
  { field: 'CPU registers', why: 'saved on a context switch so execution can resume exactly where it stopped' },
  { field: 'CPU scheduling information', why: 'priority, queue pointers, scheduling parameters' },
  { field: 'Memory-management information', why: 'base/limit registers, page tables or segment tables' },
  { field: 'Accounting information', why: 'CPU time used, time limits, process and user identifiers' },
  { field: 'I/O status information', why: 'allocated devices and the list of open files' }
];

/* ------------------------------------------------------------------ */
/* Protection: access matrix                                           */
/* ------------------------------------------------------------------ */

export type Right = 'read' | 'write' | 'execute' | 'owner' | 'copy' | 'switch';

export interface AccessMatrix {
  domains: string[];
  objects: string[];
  /** rights[domain][object] */
  rights: Right[][][];
}

export const hasRight = (
  matrix: AccessMatrix,
  domain: number,
  object: number,
  right: Right
) => matrix.rights[domain]?.[object]?.includes(right) ?? false;

export interface AccessCheck {
  allowed: boolean;
  narration: string;
}

/**
 * The reference monitor: every access is checked against the matrix entry for
 * <current domain, object>. Nothing outside that cell is permitted.
 */
export const checkAccess = (
  matrix: AccessMatrix,
  domain: number,
  object: number,
  right: Right
): AccessCheck => {
  const allowed = hasRight(matrix, domain, object, right);
  const domainName = matrix.domains[domain];
  const objectName = matrix.objects[object];
  const held = matrix.rights[domain]?.[object] ?? [];

  return {
    allowed,
    narration: allowed
      ? `Allowed: ${domainName} holds ${right} on ${objectName}.`
      : `Denied: ${domainName} holds ${held.length ? held.join(', ') : 'no rights'} on ${objectName}, and ${right} is not among them. The access is refused before it happens - this is the principle of least privilege in action.`
  };
};

/** A domain may only be entered if the current domain holds `switch` on it. */
export const canSwitch = (matrix: AccessMatrix, from: number, to: number) => {
  const objectIndex = matrix.objects.indexOf(matrix.domains[to]);
  if (objectIndex === -1) return false;
  return hasRight(matrix, from, objectIndex, 'switch');
};

export const defaultAccessMatrix = (): AccessMatrix => ({
  domains: ['D1', 'D2', 'D3'],
  objects: ['File A', 'File B', 'Printer', 'D1', 'D2', 'D3'],
  rights: [
    // D1: can read File A, and may switch into D2
    [['read'], [], [], [], ['switch'], []],
    // D2: owns File B, can print, may switch into D3
    [[], ['read', 'write', 'owner'], ['write'], [], [], ['switch']],
    // D3: can execute File A and read File B
    [['execute'], ['read'], [], [], [], []]
  ]
});
