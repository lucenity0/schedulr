import { Process, ExecutionBlock, ProcessMetrics, SchedulingResult } from '@/types/scheduler';

/**
 * Every CPU algorithm here runs on one tick-accurate engine and produces a
 * timeline: which process held the CPU during each 1-unit slice. Blocks,
 * metrics and step narration are all derived from that single source, so a
 * preemptive algorithm can never disagree with its own Gantt chart.
 */

export const IDLE = 'IDLE';

export interface CpuTick {
  /** slice covers [time, time + 1) */
  time: number;
  /** process holding the CPU, or null when the CPU is idle */
  running: string | null;
  /** processes that had arrived and were waiting to run during this slice */
  ready: string[];
  event: 'dispatch' | 'continue' | 'preempt' | 'quantum' | 'complete' | 'idle';
  note: string;
}

export interface CpuResult extends SchedulingResult {
  ticks: CpuTick[];
  totalTime: number;
  cpuUtilization: number;
  throughput: number;
  averageResponseTime: number;
}

interface RunTask extends Process {
  remaining: number;
  /** MLFQ / MLQ only: which queue the task currently sits in */
  level: number;
  firstRun: number | null;
  completion: number | null;
}

type Select = (ready: RunTask[], time: number) => RunTask;

interface EngineOptions {
  /** re-decide which task holds the CPU on every tick */
  preemptive: boolean;
  select: Select;
  /** time slice, in ticks, after which the running task yields */
  quantum?: (task: RunTask) => number | undefined;
  /** called when a task is pushed off the CPU by its quantum expiring */
  onQuantumExpire?: (task: RunTask) => void;
  /**
   * Conditional preemption for otherwise non-preemptive algorithms: MLFQ has
   * to hand the CPU over the moment a higher-priority queue becomes non-empty.
   */
  preemptWhen?: (running: RunTask, ready: RunTask[]) => boolean;
  label: string;
}

/** Deterministic ordering so ties never depend on input array order. */
const byArrivalThenId = (a: RunTask, b: RunTask) =>
  a.arrivalTime - b.arrivalTime || a.id.localeCompare(b.id, undefined, { numeric: true });

const pickBy = (score: (t: RunTask, time: number) => number, prefer: 'min' | 'max'): Select =>
  (ready, time) => {
    const sorted = [...ready].sort(byArrivalThenId);
    return sorted.reduce((best, task) => {
      const d = score(task, time) - score(best, time);
      if (prefer === 'min' ? d < 0 : d > 0) return task;
      return best;
    }, sorted[0]);
  };

const priorityScore = (reverse: boolean) => (t: RunTask) =>
  reverse ? -(t.priority ?? -Infinity) : (t.priority ?? Infinity);

const run = (processes: Process[], options: EngineOptions): CpuResult => {
  const tasks: RunTask[] = processes.map(p => ({
    ...p,
    remaining: p.burstTime,
    level: 0,
    firstRun: null,
    completion: null
  }));

  const ticks: CpuTick[] = [];
  const queue: RunTask[] = [];
  const pending = [...tasks].sort(byArrivalThenId);

  let time = 0;
  let completed = 0;
  let running: RunTask | null = null;
  let sliceUsed = 0;

  // Guard against a malformed input (e.g. burstTime 0) spinning forever.
  const limit = tasks.reduce((sum, t) => sum + Math.max(t.burstTime, 0), 0) +
    Math.max(...tasks.map(t => t.arrivalTime), 0) + tasks.length + 1;

  while (completed < tasks.length && time <= limit) {
    // 1. Admit everything that has arrived by now, in arrival order.
    while (pending.length && pending[0].arrivalTime <= time) {
      const arrived = pending.shift()!;
      if (arrived.remaining > 0) queue.push(arrived);
      else {
        arrived.completion = time;
        arrived.firstRun = time;
        completed++;
      }
    }

    const previousId: string | null = running?.id ?? null;
    let quantumExpired = false;

    // 2. A quantum that expires now releases the CPU before the next decision.
    if (running) {
      const slice = options.quantum?.(running);
      if (slice !== undefined && sliceUsed >= slice && running.remaining > 0) {
        options.onQuantumExpire?.(running);
        queue.push(running);
        running = null;
        quantumExpired = true;
      }
    }

    // 3. A better-placed task can take the CPU even mid-slice.
    if (running && options.preemptWhen?.(running, queue)) {
      queue.push(running);
      running = null;
    }

    // 4. Preemptive algorithms re-open the decision on every tick.
    if (running && options.preemptive) {
      queue.push(running);
      running = null;
    }

    let event: CpuTick['event'] = 'continue';

    if (!running) {
      if (queue.length === 0) {
        ticks.push({
          time,
          running: null,
          ready: [],
          event: 'idle',
          note: `t=${time}: no process has arrived yet - the CPU sits idle.`
        });
        time++;
        continue;
      }
      const chosen = options.select(queue, time);
      queue.splice(queue.indexOf(chosen), 1);
      if (chosen.id !== previousId) {
        event = previousId !== null ? (quantumExpired ? 'quantum' : 'preempt') : 'dispatch';
      }
      running = chosen;
      sliceUsed = 0;
    }

    if (running.firstRun === null) {
      running.firstRun = time;
      event = 'dispatch';
    }

    const ready = [...queue].sort(byArrivalThenId).map(t => t.id);
    running.remaining--;
    sliceUsed++;

    const notes: Record<CpuTick['event'], string> = {
      dispatch: `t=${time}: ${running.id} is dispatched onto the CPU.`,
      preempt: `t=${time}: ${running.id} preempts ${previousId}, which goes back to the ready queue.`,
      quantum: `t=${time}: ${previousId} used its full time slice, so ${running.id} takes the CPU.`,
      continue: `t=${time}: ${running.id} continues (${running.remaining} unit${running.remaining === 1 ? '' : 's'} left).`,
      complete: '',
      idle: ''
    };
    let note = notes[event];

    if (running.remaining === 0) {
      running.completion = time + 1;
      completed++;
      event = 'complete';
      note = `t=${time + 1}: ${running.id} finishes its burst and leaves the system.`;
    }

    ticks.push({ time, running: running.id, ready, event, note });

    if (running.remaining === 0) {
      running = null;
      sliceUsed = 0;
    }

    time++;
  }

  return summarise(tasks, ticks, options.label);
};

/** Merge contiguous slices of the same process into one Gantt block. */
export const toBlocks = (ticks: CpuTick[]): ExecutionBlock[] => {
  const blocks: ExecutionBlock[] = [];
  for (const tick of ticks) {
    const id = tick.running ?? IDLE;
    const last = blocks[blocks.length - 1];
    if (last && last.processId === id && last.endTime === tick.time) {
      last.endTime = tick.time + 1;
    } else {
      blocks.push({ processId: id, startTime: tick.time, endTime: tick.time + 1 });
    }
  }
  return blocks;
};

const summarise = (tasks: RunTask[], ticks: CpuTick[], label: string): CpuResult => {
  const executionOrder = toBlocks(ticks);
  const totalTime = ticks.length;
  const busy = ticks.filter(t => t.running !== null).length;

  const processMetrics: ProcessMetrics[] = [...tasks]
    .sort(byArrivalThenId)
    .map(task => {
      const completion = task.completion ?? task.arrivalTime;
      const turnaround = completion - task.arrivalTime;
      return {
        id: task.id,
        arrivalTime: task.arrivalTime,
        burstTime: task.burstTime,
        completionTime: completion,
        turnaroundTime: turnaround,
        // waiting = time spent in the system but not on the CPU
        waitingTime: turnaround - task.burstTime,
        responseTime: (task.firstRun ?? completion) - task.arrivalTime,
        priority: task.priority
      };
    });

  const mean = (pick: (m: ProcessMetrics) => number) =>
    processMetrics.length ? processMetrics.reduce((s, m) => s + pick(m), 0) / processMetrics.length : 0;

  return {
    algorithm: label,
    executionOrder,
    processMetrics,
    ticks,
    totalTime,
    averageWaitingTime: mean(m => m.waitingTime),
    averageTurnaroundTime: mean(m => m.turnaroundTime),
    averageResponseTime: mean(m => m.responseTime ?? 0),
    cpuUtilization: totalTime ? (busy / totalTime) * 100 : 0,
    throughput: totalTime ? processMetrics.length / totalTime : 0
  };
};

/* ------------------------------------------------------------------ */
/* Algorithms                                                          */
/* ------------------------------------------------------------------ */

export const scheduleFCFS = (processes: Process[]): CpuResult =>
  run(processes, {
    preemptive: false,
    label: 'FCFS',
    // The queue is already in arrival order, so the head is the oldest arrival.
    select: ready => [...ready].sort(byArrivalThenId)[0]
  });

export const scheduleSJF = (processes: Process[]): CpuResult =>
  run(processes, {
    preemptive: false,
    label: 'SJF',
    select: pickBy(t => t.burstTime, 'min')
  });

export const scheduleLJF = (processes: Process[]): CpuResult =>
  run(processes, {
    preemptive: false,
    label: 'LJF',
    select: pickBy(t => t.burstTime, 'max')
  });

export const scheduleSRTF = (processes: Process[]): CpuResult =>
  run(processes, {
    preemptive: true,
    label: 'SRTF',
    select: pickBy(t => t.remaining, 'min')
  });

export const schedulePriority = (processes: Process[], reversePriority = false): CpuResult =>
  run(processes, {
    preemptive: false,
    label: 'Priority',
    select: pickBy(priorityScore(reversePriority), 'min')
  });

export const schedulePriorityPreemptive = (processes: Process[], reversePriority = false): CpuResult =>
  run(processes, {
    preemptive: true,
    label: 'Priority (Preemptive)',
    select: pickBy(priorityScore(reversePriority), 'min')
  });

/**
 * Highest Response Ratio Next: ratio = (waiting + burst) / burst. Long waits
 * raise a job's ratio, so HRRN gets SJF-like throughput without starving
 * long jobs.
 */
export const scheduleHRRN = (processes: Process[]): CpuResult =>
  run(processes, {
    preemptive: false,
    label: 'HRRN',
    select: pickBy((t, time) => {
      const waiting = time - t.arrivalTime;
      return t.burstTime > 0 ? (waiting + t.burstTime) / t.burstTime : Infinity;
    }, 'max')
  });

export const scheduleRoundRobin = (processes: Process[], timeQuantum: number): CpuResult => {
  const q = Math.max(1, Math.floor(timeQuantum));
  return run(processes, {
    preemptive: false,
    label: `Round Robin (q=${q})`,
    quantum: () => q,
    // FIFO: the engine pushes preempted tasks to the back of the queue.
    select: ready => ready[0]
  });
};

/**
 * Multilevel Feedback Queue. A job starts in the top queue and drops a level
 * each time it uses a full quantum, so short/interactive jobs stay near the
 * top and CPU-bound jobs sink. The bottom queue is plain round robin.
 */
export const scheduleMLFQ = (
  processes: Process[],
  quanta: number[] = [2, 4, 8]
): CpuResult =>
  run(processes, {
    preemptive: false,
    label: 'MLFQ',
    quantum: task => quanta[Math.min(task.level, quanta.length - 1)],
    onQuantumExpire: task => {
      task.level = Math.min(task.level + 1, quanta.length - 1);
    },
    // A job that has sunk gives way the moment a higher queue fills.
    preemptWhen: (running, ready) => ready.some(t => t.level < running.level),
    // Highest-priority (lowest-numbered) non-empty queue wins; FIFO within it.
    select: ready => [...ready].sort((a, b) => a.level - b.level)[0]
  });

/**
 * Multilevel Queue with fixed assignment: priority <= threshold is a system
 * job (round robin), everything else is a batch job (FCFS). The system queue
 * has absolute preference - batch jobs only run when it is empty.
 */
export const scheduleMLQ = (
  processes: Process[],
  systemQuantum = 2,
  threshold = 2
): CpuResult => {
  const band = (t: RunTask) => ((t.priority ?? Infinity) <= threshold ? 0 : 1);
  return run(processes, {
    preemptive: false,
    label: 'Multilevel Queue',
    quantum: task => (band(task) === 0 ? systemQuantum : undefined),
    select: ready => {
      const sorted = [...ready].sort((a, b) => band(a) - band(b));
      return sorted[0];
    }
  });
};
