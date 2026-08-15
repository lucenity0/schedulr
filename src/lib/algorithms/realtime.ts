/**
 * Real-time scheduling of periodic tasks.
 *
 *   Rate Monotonic (RM) - fixed priority, shorter period wins. Simple and
 *     predictable, but it can miss deadlines below 100% utilization.
 *   Earliest Deadline First (EDF) - dynamic priority, nearest absolute
 *     deadline wins. Optimal: if any algorithm can meet every deadline, EDF
 *     will, and it stays feasible right up to 100% utilization.
 *
 * Both are simulated over the hyperperiod (the LCM of all periods), which is
 * the point at which the pattern repeats.
 */

export type RealTimeAlgorithm = 'RM' | 'EDF';

export interface PeriodicTask {
  id: string;
  /** worst-case execution time per job */
  computation: number;
  period: number;
  /** relative deadline; defaults to the period */
  deadline?: number;
}

export interface RealTimeSlice {
  time: number;
  /** task holding the CPU, or null when idle */
  taskId: string | null;
  /** job instance number of the running task */
  job?: number;
  narration: string;
}

export interface DeadlineMiss {
  taskId: string;
  job: number;
  deadline: number;
  remaining: number;
}

export interface Release {
  taskId: string;
  job: number;
  time: number;
  deadline: number;
}

export interface RealTimeResult {
  algorithm: RealTimeAlgorithm;
  slices: RealTimeSlice[];
  releases: Release[];
  misses: DeadlineMiss[];
  hyperperiod: number;
  utilization: number;
  /** RM only: n(2^(1/n) - 1) */
  utilizationBound: number;
  /** true when the task set is guaranteed schedulable by the bound test */
  boundTestPasses: boolean;
  schedulable: boolean;
  verdict: string;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

export const hyperperiodOf = (tasks: PeriodicTask[]) =>
  tasks.reduce((acc, task) => lcm(acc, task.period), 1);

export const utilizationOf = (tasks: PeriodicTask[]) =>
  tasks.reduce((sum, task) => sum + task.computation / task.period, 0);

/** Liu & Layland bound: n(2^(1/n) - 1), which tends to ln 2 ≈ 0.693. */
export const rmBound = (n: number) => (n === 0 ? 1 : n * (Math.pow(2, 1 / n) - 1));

interface Job {
  taskId: string;
  job: number;
  release: number;
  deadline: number;
  remaining: number;
  period: number;
}

export const simulateRealTime = (
  tasks: PeriodicTask[],
  algorithm: RealTimeAlgorithm,
  horizon?: number
): RealTimeResult => {
  const hyperperiod = tasks.length ? hyperperiodOf(tasks) : 0;
  const limit = horizon ?? hyperperiod;

  const slices: RealTimeSlice[] = [];
  const releases: Release[] = [];
  const misses: DeadlineMiss[] = [];
  const active: Job[] = [];

  for (let time = 0; time < limit; time++) {
    // Release any job whose period boundary falls on this tick.
    tasks.forEach(task => {
      if (time % task.period === 0) {
        const job = time / task.period + 1;
        const deadline = time + (task.deadline ?? task.period);
        active.push({
          taskId: task.id,
          job,
          release: time,
          deadline,
          remaining: task.computation,
          period: task.period
        });
        releases.push({ taskId: task.id, job, time, deadline });
      }
    });

    // A job that reached its deadline with work left has missed it.
    for (let i = active.length - 1; i >= 0; i--) {
      const job = active[i];
      if (job.deadline <= time && job.remaining > 0) {
        misses.push({
          taskId: job.taskId,
          job: job.job,
          deadline: job.deadline,
          remaining: job.remaining
        });
        active.splice(i, 1);
      }
    }

    if (active.length === 0) {
      slices.push({
        time,
        taskId: null,
        narration: `t=${time}: no job is pending - the processor idles.`
      });
      continue;
    }

    // The only difference between the two algorithms is this comparator.
    const chosen = active.reduce((best, job) => {
      if (algorithm === 'RM') {
        // Fixed priority: shorter period is higher priority.
        if (job.period !== best.period) return job.period < best.period ? job : best;
      } else {
        // Dynamic priority: nearest absolute deadline is higher priority.
        if (job.deadline !== best.deadline) return job.deadline < best.deadline ? job : best;
      }
      return job.release < best.release ? job : best;
    });

    chosen.remaining -= 1;

    const why =
      algorithm === 'RM'
        ? `it has the shortest period (${chosen.period})`
        : `its deadline (t=${chosen.deadline}) is the nearest`;

    slices.push({
      time,
      taskId: chosen.taskId,
      job: chosen.job,
      narration:
        chosen.remaining === 0
          ? `t=${time}: ${chosen.taskId} job ${chosen.job} runs and completes, ${chosen.deadline - time - 1} unit(s) before its deadline.`
          : `t=${time}: ${chosen.taskId} job ${chosen.job} runs because ${why}.`
    });

    if (chosen.remaining === 0) {
      active.splice(active.indexOf(chosen), 1);
    }
  }

  // Anything still unfinished at the horizon that is already past due.
  active.forEach(job => {
    if (job.deadline <= limit && job.remaining > 0) {
      misses.push({
        taskId: job.taskId,
        job: job.job,
        deadline: job.deadline,
        remaining: job.remaining
      });
    }
  });

  const utilization = utilizationOf(tasks);
  const bound = rmBound(tasks.length);
  const boundTestPasses = algorithm === 'RM' ? utilization <= bound : utilization <= 1;
  const schedulable = misses.length === 0;

  return {
    algorithm,
    slices,
    releases,
    misses,
    hyperperiod,
    utilization,
    utilizationBound: bound,
    boundTestPasses,
    schedulable,
    verdict: verdictFor(algorithm, utilization, bound, boundTestPasses, schedulable)
  };
};

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const verdictFor = (
  algorithm: RealTimeAlgorithm,
  utilization: number,
  bound: number,
  boundTestPasses: boolean,
  schedulable: boolean
) => {
  if (utilization > 1) {
    return `Utilization is ${pct(utilization)}, above 100% - no algorithm can schedule this task set.`;
  }
  if (algorithm === 'EDF') {
    return schedulable
      ? `Utilization ${pct(utilization)} ≤ 100%, and EDF meets every deadline - as the optimality result guarantees.`
      : `Utilization ${pct(utilization)} but deadlines were still missed - check for a relative deadline shorter than its period.`;
  }
  if (boundTestPasses) {
    return `Utilization ${pct(utilization)} is within the RM bound of ${pct(bound)}, so RM is guaranteed to meet every deadline.`;
  }
  return schedulable
    ? `Utilization ${pct(utilization)} exceeds the RM bound of ${pct(bound)}, so the test is inconclusive - but simulating the hyperperiod shows RM happens to meet every deadline here.`
    : `Utilization ${pct(utilization)} exceeds the RM bound of ${pct(bound)} and RM does miss a deadline. EDF would still schedule this set.`;
};

export const compareRealTime = (tasks: PeriodicTask[]) =>
  (['RM', 'EDF'] as const).map(algorithm => simulateRealTime(tasks, algorithm));
