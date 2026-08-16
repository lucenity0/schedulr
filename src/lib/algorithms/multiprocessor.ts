/**
 * Multiple-processor scheduling and multithreading models.
 *
 * With more than one CPU the question stops being "who runs next" and becomes
 * "who runs next, where" - and the two organisations answer it differently:
 *
 *   Common queue  - one shared ready queue, perfect load balance, but every
 *                   dispatch contends on the same lock and a process bounces
 *                   between cores, losing its cache.
 *   Per-CPU queue - no contention and natural affinity, but the queues drift
 *                   out of balance and need migration to fix it.
 */

import { Process } from '@/types/scheduler';

export type QueueOrganisation = 'common' | 'per-cpu';

export interface CoreTick {
  time: number;
  /** what each core is running this tick, null when idle */
  cores: (string | null)[];
  /** processes waiting, per core for per-cpu, index 0 for common */
  queues: string[][];
  /** processes that moved core this tick */
  migrations: { process: string; from: number; to: number }[];
  narration: string;
}

export interface MultiprocessorResult {
  organisation: QueueOrganisation;
  coreCount: number;
  ticks: CoreTick[];
  totalTime: number;
  /** per-core busy tick counts */
  utilization: number[];
  migrationCount: number;
  /** how many times a process resumed on a different core than it left */
  affinityBreaks: number;
  averageWaitingTime: number;
}

interface Job extends Process {
  remaining: number;
  /** core this job last ran on, for affinity */
  lastCore: number | null;
  queue: number;
  completion: number | null;
}

export const simulateMultiprocessor = (
  processes: Process[],
  coreCount: number,
  organisation: QueueOrganisation,
  { affinity = true, balance = true }: { affinity?: boolean; balance?: boolean } = {}
): MultiprocessorResult => {
  const jobs: Job[] = processes.map(p => ({
    ...p,
    remaining: p.burstTime,
    lastCore: null,
    queue: 0,
    completion: null
  }));

  const ticks: CoreTick[] = [];
  const running: (Job | null)[] = Array(coreCount).fill(null);
  const queues: Job[][] = Array.from({ length: organisation === 'common' ? 1 : coreCount }, () => []);
  const pending = [...jobs].sort((a, b) => a.arrivalTime - b.arrivalTime || a.id.localeCompare(b.id));

  let time = 0;
  let completed = 0;
  let migrationCount = 0;
  let affinityBreaks = 0;
  const busy = Array(coreCount).fill(0);
  const limit = jobs.reduce((s, j) => s + j.burstTime, 0) + Math.max(...jobs.map(j => j.arrivalTime), 0) + 2;

  while (completed < jobs.length && time <= limit) {
    const migrations: CoreTick['migrations'] = [];

    // Admit arrivals. Per-CPU queues get the shortest queue at arrival time.
    while (pending.length && pending[0].arrivalTime <= time) {
      const job = pending.shift()!;
      if (organisation === 'common') {
        job.queue = 0;
      } else {
        const lengths = queues.map((q, i) => ({ i, n: q.length + (running[i] ? 1 : 0) }));
        job.queue = lengths.reduce((best, c) => (c.n < best.n ? c : best)).i;
      }
      queues[job.queue].push(job);
    }

    // Load balancing: pull work from the busiest queue to an idle one.
    if (organisation === 'per-cpu' && balance) {
      for (let core = 0; core < coreCount; core++) {
        if (running[core] || queues[core].length) continue;
        const donor = queues
          .map((q, i) => ({ i, n: q.length }))
          .filter(c => c.n > 1)
          .sort((a, b) => b.n - a.n)[0];
        if (!donor) continue;
        const stolen = queues[donor.i].pop()!;
        stolen.queue = core;
        queues[core].push(stolen);
        migrations.push({ process: stolen.id, from: donor.i, to: core });
        migrationCount++;
      }
    }

    // Dispatch to every free core.
    for (let core = 0; core < coreCount; core++) {
      if (running[core]) continue;
      const queue = organisation === 'common' ? queues[0] : queues[core];
      if (!queue.length) continue;

      let pick = 0;
      if (affinity) {
        // Prefer a job that last ran here - its cache is still warm.
        const warm = queue.findIndex(j => j.lastCore === core);
        if (warm !== -1) pick = warm;
      }

      const job = queue.splice(pick, 1)[0];
      if (job.lastCore !== null && job.lastCore !== core) affinityBreaks++;
      job.lastCore = core;
      running[core] = job;
    }

    // Run one tick on every busy core.
    const snapshot: (string | null)[] = Array(coreCount).fill(null);
    for (let core = 0; core < coreCount; core++) {
      const job = running[core];
      if (!job) continue;
      snapshot[core] = job.id;
      job.remaining -= 1;
      busy[core] += 1;

      if (job.remaining === 0) {
        job.completion = time + 1;
        completed += 1;
        running[core] = null;
      }
    }

    const activeCores = snapshot.filter(Boolean).length;
    ticks.push({
      time,
      cores: snapshot,
      queues: queues.map(q => q.map(j => j.id)),
      migrations,
      narration: migrations.length
        ? `t=${time}: ${migrations.map(m => `${m.process} migrates from core ${m.from} to core ${m.to}`).join('; ')} - load balancing moves work to an idle core, at the cost of a cold cache.`
        : activeCores === 0
          ? `t=${time}: every core is idle.`
          : `t=${time}: ${activeCores} of ${coreCount} core(s) busy - ${snapshot.map((id, i) => (id ? `core ${i}: ${id}` : null)).filter(Boolean).join(', ')}.`
    });

    // Preempt nothing: this is a non-preemptive per-core model, so a job that
    // still has work stays on its core into the next tick.
    time++;
  }

  const totalTime = ticks.length;
  const waiting = jobs.map(j => (j.completion ?? j.arrivalTime) - j.arrivalTime - j.burstTime);

  return {
    organisation,
    coreCount,
    ticks,
    totalTime,
    utilization: busy.map(b => (totalTime ? (b / totalTime) * 100 : 0)),
    migrationCount,
    affinityBreaks,
    averageWaitingTime: waiting.length ? waiting.reduce((a, b) => a + b, 0) / waiting.length : 0
  };
};

/* ------------------------------------------------------------------ */
/* Multithreading models                                               */
/* ------------------------------------------------------------------ */

export type ThreadModel = 'many-to-one' | 'one-to-one' | 'many-to-many';

export interface ModelInfo {
  model: ThreadModel;
  title: string;
  summary: string;
  /** user threads mapped onto each kernel thread */
  mapping: number[][];
  kernelThreads: number;
  strengths: string[];
  weaknesses: string[];
  /** what happens when one user thread makes a blocking system call */
  blockingBehaviour: string;
  example: string;
}

export const threadModels: Record<ThreadModel, ModelInfo> = {
  'many-to-one': {
    model: 'many-to-one',
    title: 'Many-to-One',
    summary: 'Many user threads are multiplexed onto a single kernel thread by a user-level library.',
    mapping: [[0, 1, 2, 3]],
    kernelThreads: 1,
    strengths: ['Thread management is entirely in user space, so it is fast', 'No kernel involvement to create a thread'],
    weaknesses: ['One blocking call stops every thread', 'Cannot use more than one core, ever'],
    blockingBehaviour:
      'The kernel sees a single thread, so when one user thread blocks on I/O the whole process blocks - the other three cannot run even on an idle core.',
    example: 'Green threads in early Java; GNU Portable Threads.'
  },
  'one-to-one': {
    model: 'one-to-one',
    title: 'One-to-One',
    summary: 'Every user thread gets its own kernel thread.',
    mapping: [[0], [1], [2], [3]],
    kernelThreads: 4,
    strengths: ['A blocking call stops only that thread', 'True parallelism across cores'],
    weaknesses: ['Every user thread costs a kernel thread', 'Systems cap the number you may create'],
    blockingBehaviour:
      'Each thread blocks independently. If thread 0 waits on I/O, threads 1-3 keep running on other cores.',
    example: 'Linux, Windows, and modern Java on both.'
  },
  'many-to-many': {
    model: 'many-to-many',
    title: 'Many-to-Many',
    summary: 'Many user threads are multiplexed onto a smaller-or-equal number of kernel threads.',
    mapping: [[0, 1], [2, 3]],
    kernelThreads: 2,
    strengths: ['Create as many user threads as you like', 'The kernel can still schedule them in parallel', 'No hard per-thread kernel cost'],
    weaknesses: ['The most complex to implement', 'The library and kernel schedulers can work against each other'],
    blockingBehaviour:
      'When a user thread blocks, the library can move the others onto a free kernel thread - so the process keeps running without one kernel thread per user thread.',
    example: 'Solaris before version 9; Windows fibers with the ThreadFiber package.'
  }
};
