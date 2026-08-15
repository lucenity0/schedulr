/**
 * Deadlock avoidance and detection.
 *
 * Banker's algorithm answers "is this state safe?" by trying to find an order
 * in which every process can finish, assuming each one may claim up to its
 * declared maximum. Detection answers the weaker question "is anyone stuck
 * right now?" using only what processes are actually waiting for.
 */

export interface BankerInput {
  /** resource type names, e.g. ['A', 'B', 'C'] */
  resources: string[];
  processes: string[];
  /** total instances of each resource */
  total: number[];
  /** allocation[p][r] - held right now */
  allocation: number[][];
  /** max[p][r] - most this process will ever need at once */
  max: number[][];
}

export interface SafetyStep {
  /** process granted at this step, or null when the search is stuck */
  processId: string | null;
  work: number[];
  /** need vector of the process picked */
  need?: number[];
  finished: string[];
  narration: string;
}

export interface SafetyResult {
  safe: boolean;
  sequence: string[];
  steps: SafetyStep[];
  need: number[][];
  available: number[];
}

const subtract = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
const lessOrEqual = (a: number[], b: number[]) => a.every((v, i) => v <= b[i]);
const vec = (v: number[]) => `[${v.join(', ')}]`;

export const computeNeed = (max: number[][], allocation: number[][]) =>
  max.map((row, i) => subtract(row, allocation[i]));

export const computeAvailable = (total: number[], allocation: number[][]) =>
  allocation.reduce((available, row) => subtract(available, row), [...total]);

/**
 * The safety algorithm. Repeatedly look for a process whose remaining need
 * fits in what is currently available; pretend it runs and returns everything
 * it holds. If every process can be retired this way, the state is safe.
 */
export const checkSafety = (input: BankerInput): SafetyResult => {
  const need = computeNeed(input.max, input.allocation);
  const available = computeAvailable(input.total, input.allocation);

  let work = [...available];
  const finished = new Set<string>();
  const sequence: string[] = [];
  const steps: SafetyStep[] = [];

  steps.push({
    processId: null,
    work: [...work],
    finished: [],
    narration: `Start with Available = ${vec(work)} and nobody finished yet.`
  });

  let progress = true;
  while (progress && finished.size < input.processes.length) {
    progress = false;

    for (let i = 0; i < input.processes.length; i++) {
      const id = input.processes[i];
      if (finished.has(id)) continue;
      if (!lessOrEqual(need[i], work)) continue;

      work = add(work, input.allocation[i]);
      finished.add(id);
      sequence.push(id);
      progress = true;

      steps.push({
        processId: id,
        work: [...work],
        need: [...need[i]],
        finished: [...sequence],
        narration: `${id} needs ${vec(need[i])}, which fits in ${vec(subtract(work, input.allocation[i]))}. Let it run to completion; it releases ${vec(input.allocation[i])}, so Work becomes ${vec(work)}.`
      });
      break;
    }
  }

  const safe = finished.size === input.processes.length;

  if (!safe) {
    const stuck = input.processes.filter(p => !finished.has(p));
    steps.push({
      processId: null,
      work: [...work],
      finished: [...sequence],
      narration: `No remaining process can be satisfied from Work = ${vec(work)}. ${stuck.join(', ')} are stuck, so the state is UNSAFE.`
    });
  }

  return { safe, sequence, steps, need, available };
};

export interface RequestResult {
  granted: boolean;
  reason: string;
  safety?: SafetyResult;
  /** state after granting, when granted */
  next?: BankerInput;
}

/**
 * A resource request is granted only if it is within the process's declared
 * need, within what is available, AND leaves the system in a safe state.
 */
export const requestResources = (
  input: BankerInput,
  processId: string,
  request: number[]
): RequestResult => {
  const index = input.processes.indexOf(processId);
  if (index === -1) return { granted: false, reason: `Unknown process ${processId}.` };

  const need = computeNeed(input.max, input.allocation)[index];
  const available = computeAvailable(input.total, input.allocation);

  if (!lessOrEqual(request, need)) {
    return {
      granted: false,
      reason: `Denied: ${processId} asked for ${vec(request)} but its remaining need is only ${vec(need)}. A process may never exceed its declared maximum.`
    };
  }

  if (!lessOrEqual(request, available)) {
    return {
      granted: false,
      reason: `${processId} must wait: it asked for ${vec(request)} but only ${vec(available)} is available.`
    };
  }

  const next: BankerInput = {
    ...input,
    allocation: input.allocation.map((row, i) => (i === index ? add(row, request) : [...row]))
  };

  const safety = checkSafety(next);
  if (!safety.safe) {
    return {
      granted: false,
      reason: `Denied: granting ${vec(request)} to ${processId} would leave the system in an unsafe state, so the request is rolled back even though the resources are free.`,
      safety
    };
  }

  return {
    granted: true,
    reason: `Granted: the resulting state is safe with sequence ${safety.sequence.join(' → ')}.`,
    safety,
    next
  };
};

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

export interface DetectionResult {
  deadlocked: boolean;
  /** processes involved in the deadlock */
  processes: string[];
  sequence: string[];
  narration: string;
}

/**
 * Detection uses the *actual* outstanding request rather than the declared
 * maximum, so a state can be unsafe (Banker's would refuse it) without being
 * deadlocked yet.
 */
export const detectDeadlock = (
  input: Omit<BankerInput, 'max'> & { request: number[][] }
): DetectionResult => {
  let work = computeAvailable(input.total, input.allocation);
  const finished = new Set<string>();
  const sequence: string[] = [];

  // A process holding nothing cannot be part of a hold-and-wait cycle.
  input.processes.forEach((id, i) => {
    if (input.allocation[i].every(v => v === 0)) {
      finished.add(id);
      sequence.push(id);
    }
  });

  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < input.processes.length; i++) {
      const id = input.processes[i];
      if (finished.has(id)) continue;
      if (!lessOrEqual(input.request[i], work)) continue;

      work = add(work, input.allocation[i]);
      finished.add(id);
      sequence.push(id);
      progress = true;
    }
  }

  const stuck = input.processes.filter(p => !finished.has(p));

  return {
    deadlocked: stuck.length > 0,
    processes: stuck,
    sequence,
    narration: stuck.length
      ? `${stuck.join(', ')} can never have their outstanding requests met from ${vec(work)} - they are deadlocked.`
      : `Every process can finish (order: ${sequence.join(' → ')}). No deadlock.`
  };
};

/** Edges for a resource-allocation graph drawing. */
export interface GraphEdge {
  from: string;
  to: string;
  kind: 'assignment' | 'request';
  resource: string;
  count: number;
}

export const buildGraph = (
  processes: string[],
  resources: string[],
  allocation: number[][],
  request: number[][]
): GraphEdge[] => {
  const edges: GraphEdge[] = [];
  processes.forEach((p, i) => {
    resources.forEach((r, j) => {
      // Resource -> process: this instance is assigned.
      if (allocation[i][j] > 0) {
        edges.push({ from: r, to: p, kind: 'assignment', resource: r, count: allocation[i][j] });
      }
      // Process -> resource: this process is waiting on it.
      if (request[i][j] > 0) {
        edges.push({ from: p, to: r, kind: 'request', resource: r, count: request[i][j] });
      }
    });
  });
  return edges;
};
