import { AlgorithmExplanation } from '@/components/ConceptPanel';

/**
 * Plain-language explanations, kept beside the algorithms rather than inside
 * the pages, so every module describes its rules the same way and the text
 * stays in one place when an algorithm changes.
 */

export const cpuExplanations: Record<string, AlgorithmExplanation> = {
  FCFS: {
    idea: 'Whoever asks first, runs first - the CPU version of a single queue at a counter.',
    pseudocode: [
      'while processes remain:',
      '  pick the process that arrived earliest',
      '  run it until its burst finishes',
      '  never interrupt it'
    ],
    strengths: ['Trivial to implement', 'No starvation - everyone eventually runs', 'Fair in the "first come" sense'],
    weaknesses: ['One long job delays everyone behind it', 'Terrible average waiting time', 'Bad for interactive work'],
    note: 'The convoy effect: put a 100-unit job first and three 1-unit jobs behind it, and all three wait 100 units for work that takes 1.'
  },
  SJF: {
    idea: 'Always run the shortest job available - the greedy way to minimise average waiting time.',
    pseudocode: [
      'while processes remain:',
      '  among processes that have arrived:',
      '    pick the one with the smallest burst time',
      '  run it to completion'
    ],
    strengths: ['Provably optimal average waiting time', 'Great throughput on short jobs'],
    weaknesses: ['Needs the burst time in advance, which you rarely have', 'Long jobs can starve forever'],
    note: 'Optimal only among non-preemptive schedules. Real systems estimate the next burst from the previous ones.'
  },
  SRTF: {
    idea: 'Shortest Job First, but re-decided every tick - a shorter arrival snatches the CPU immediately.',
    pseudocode: [
      'at every time unit:',
      '  among processes that have arrived:',
      '    pick the smallest remaining time',
      '  if it is not the running process:',
      '    preempt and switch'
    ],
    strengths: ['Best possible average waiting time', 'Reacts instantly to short arrivals'],
    weaknesses: ['Long jobs starve even harder than under SJF', 'Every preemption costs a context switch'],
    note: 'Watch the Gantt chart: a job can be pushed off the CPU and resumed several times before it finishes.'
  },
  LJF: {
    idea: 'The opposite of SJF - run the longest job first. Useful mainly as a counter-example.',
    pseudocode: [
      'while processes remain:',
      '  among processes that have arrived:',
      '    pick the one with the largest burst time',
      '  run it to completion'
    ],
    strengths: ['Long batch jobs finish early', 'Fewer context switches than preemptive schemes'],
    weaknesses: ['Worst average waiting time of any common policy', 'Short interactive jobs starve'],
    note: 'Compare its average waiting time against SJF on the same input - the gap is the point.'
  },
  HRRN: {
    idea: 'Pick the highest response ratio, (waiting + burst) / burst, so a job that has waited long enough overtakes a shorter newcomer.',
    pseudocode: [
      'while processes remain:',
      '  for each arrived process:',
      '    ratio = (waiting time + burst) / burst',
      '  pick the highest ratio',
      '  run it to completion'
    ],
    strengths: ['Near-SJF throughput with no starvation', 'Ageing is built into the formula, not bolted on'],
    weaknesses: ['Still needs an estimate of burst time', 'Recomputing ratios costs more than a simple queue'],
    note: 'A job that has waited exactly as long as it will run has ratio 2, so waiting effectively doubles your priority.'
  },
  Priority: {
    idea: 'Every process carries a priority number, and the best one runs to completion.',
    pseudocode: [
      'while processes remain:',
      '  among processes that have arrived:',
      '    pick the best priority',
      '  run it to completion'
    ],
    strengths: ['Important work goes first', 'Maps directly onto real system/user job classes'],
    weaknesses: ['Low-priority jobs can starve indefinitely', 'Choosing priorities well is its own hard problem'],
    note: 'The standard fix for starvation is ageing: raise a process\'s priority the longer it waits.'
  },
  PriorityP: {
    idea: 'Priority scheduling re-decided every tick, so a high-priority arrival preempts whatever is running.',
    pseudocode: [
      'at every time unit:',
      '  among processes that have arrived:',
      '    pick the best priority',
      '  if it is not the running process:',
      '    preempt and switch'
    ],
    strengths: ['Urgent work starts immediately', 'Essential for anything with a response requirement'],
    weaknesses: ['Starvation is worse than in the non-preemptive form', 'Risks priority inversion around shared locks'],
    note: 'Priority inversion is what stalled the Mars Pathfinder in 1997 - a high-priority task blocked on a lock held by a low-priority one.'
  },
  RoundRobin: {
    idea: 'Everyone gets an equal time slice in turn; run out of slice and you go to the back of the queue.',
    pseudocode: [
      'queue = processes in arrival order',
      'while queue is not empty:',
      '  take the process at the front',
      '  run it for min(quantum, remaining)',
      '  if it still has work left:',
      '    put it at the back of the queue'
    ],
    strengths: ['Excellent response time', 'No starvation - the queue guarantees a turn', 'The natural fit for time-sharing'],
    weaknesses: ['Turnaround time is worse than SJF', 'Context switch overhead grows as the quantum shrinks'],
    note: 'Quantum choice is the whole game: too large and it degenerates into FCFS, too small and the CPU spends its time switching.'
  },
  MLQ: {
    idea: 'Processes are permanently assigned to a queue by class, and a lower queue only runs when every higher queue is empty.',
    pseudocode: [
      'system queue  <- high priority processes (round robin)',
      'batch queue   <- everything else (FCFS)',
      'while any queue is not empty:',
      '  serve the highest non-empty queue',
      '  a process never changes queue'
    ],
    strengths: ['Different job classes get scheduling suited to them', 'Cheap to implement'],
    weaknesses: ['Batch jobs starve under a busy system queue', 'A process misclassified at start-up stays misclassified'],
    note: 'The rigidity here is exactly what MLFQ was invented to fix.'
  },
  MLFQ: {
    idea: 'Start every job in the top queue; each time it uses a whole time slice, demote it. Short interactive jobs stay near the top, CPU-bound jobs sink.',
    pseudocode: [
      'new process enters the top queue',
      'while queues are not empty:',
      '  run the front job of the highest non-empty queue',
      '  if it uses its whole quantum:',
      '    demote it one level (longer quantum, lower priority)',
      '  if a higher queue fills:',
      '    preempt immediately'
    ],
    strengths: ['Learns each job\'s behaviour without being told anything', 'Good response time and good throughput at once'],
    weaknesses: ['Long jobs can starve without periodic priority boosts', 'A job can game it by yielding just before its quantum ends'],
    note: 'Real schedulers periodically push everything back to the top queue to stop long jobs starving.'
  }
};

export const pagingExplanations: Record<string, AlgorithmExplanation> = {
  FIFO: {
    idea: 'Evict whichever page has been in memory longest, regardless of how heavily it is being used.',
    pseudocode: [
      'on page reference:',
      '  if page is resident: it is a hit, change nothing',
      '  else:',
      '    if a frame is free: use it',
      '    else: evict the page with the oldest load time',
      '    load the new page and stamp its load time'
    ],
    strengths: ['Cheapest possible bookkeeping - one queue', 'No per-access updates'],
    weaknesses: ['Evicts hot pages just because they are old', 'Suffers Belady\'s anomaly'],
    note: 'A hit must NOT refresh the load time. Refreshing it turns FIFO into LRU - a subtle bug that makes the two algorithms produce identical output.'
  },
  LRU: {
    idea: 'Evict the page that has gone unused the longest, betting that the recent past predicts the near future.',
    pseudocode: [
      'on page reference:',
      '  if page is resident:',
      '    hit - refresh its last-used time',
      '  else:',
      '    evict the page with the oldest last-used time',
      '    load the new page and stamp last-used'
    ],
    strengths: ['Close to Optimal on real workloads', 'A stack algorithm, so it never suffers Belady\'s anomaly'],
    weaknesses: ['Needs an update on every single memory access', 'True LRU is too expensive for hardware; real CPUs approximate it'],
    note: 'Clock (second chance) is the approximation actual operating systems use.'
  },
  LFU: {
    idea: 'Evict the page referenced the fewest times, betting that popularity predicts future use.',
    pseudocode: [
      'on page reference:',
      '  if page is resident:',
      '    hit - increment its counter',
      '  else:',
      '    evict the lowest counter',
      '    (ties broken by least recently used)',
      '    load the new page with counter = 1'
    ],
    strengths: ['Protects genuinely hot pages', 'Good where access frequency is stable'],
    weaknesses: ['A page popular once and never again lingers forever', 'A newly loaded hot page is evicted before it can build a count'],
    note: 'Ageing counters - halving them periodically - is the usual fix for stale popularity.'
  },
  Clock: {
    idea: 'Approximate LRU cheaply: sweep a hand around the frames, giving any page with its reference bit set a second chance instead of evicting it.',
    pseudocode: [
      'on page fault:',
      '  while the frame under the hand has reference bit = 1:',
      '    clear the bit and advance the hand',
      '  evict the frame under the hand',
      '  load the new page there, set its bit, advance'
    ],
    strengths: ['One bit per frame instead of a timestamp', 'Nearly LRU quality at FIFO cost', 'What real kernels actually use'],
    weaknesses: ['Only approximates recency', 'Degenerates to FIFO when every reference bit is set'],
    note: 'If every bit is set, the hand clears them all and lands back where it started - which is exactly FIFO order.'
  },
  Optimal: {
    idea: 'Evict the page whose next use is furthest in the future. Needs to see the future, so it cannot be implemented - it exists to measure the others.',
    pseudocode: [
      'on page fault:',
      '  for each resident page:',
      '    find its next use AFTER the current position',
      '  evict the one used farthest ahead',
      '  (a page never used again is evicted first)'
    ],
    strengths: ['Provably the fewest possible faults', 'The benchmark every real algorithm is measured against'],
    weaknesses: ['Requires knowledge of future references', 'Unimplementable on a real system'],
    note: 'The lookahead must start from the CURRENT position. Searching the whole reference string from the beginning finds the wrong occurrence for any repeated page.'
  }
};

export const diskExplanations: Record<string, AlgorithmExplanation> = {
  FCFS: {
    idea: 'Service requests in the exact order they arrive, however far apart the tracks are.',
    pseudocode: [
      'for each request in arrival order:',
      '  seek to that track',
      '  total += |track - head|',
      '  head = track'
    ],
    strengths: ['Perfectly fair', 'Trivial to implement', 'No starvation'],
    weaknesses: ['Wild head swings across the platter', 'Worst total seek time of any policy'],
    note: 'It is the baseline: every other algorithm is judged by how much seek time it saves over FCFS.'
  },
  SSTF: {
    idea: 'Always go to the nearest pending request - the greedy choice.',
    pseudocode: [
      'while requests remain:',
      '  pick the request closest to the head',
      '  seek to it',
      '  head = that track'
    ],
    strengths: ['Big improvement over FCFS', 'Simple and intuitive'],
    weaknesses: ['Requests far from the head can starve indefinitely', 'Greedy, so not globally optimal'],
    note: 'A steady stream of requests near the head can keep a far-off request waiting forever.'
  },
  SCAN: {
    idea: 'The elevator: sweep in one direction servicing everything on the way, run all the way to the edge of the disk, then sweep back.',
    pseudocode: [
      'sweep toward the chosen direction:',
      '  service every request passed',
      'on reaching the physical end of the disk:',
      '  reverse',
      '  service the rest on the way back'
    ],
    strengths: ['No starvation - the sweep always comes back', 'Much better than FCFS', 'Predictable service pattern'],
    weaknesses: ['Travels to the edge even with nothing there', 'Tracks just behind the head wait almost a full sweep'],
    note: 'The trip to the physical edge is what separates SCAN from LOOK.'
  },
  LOOK: {
    idea: 'SCAN, but reverse at the last actual request rather than at the edge of the disk.',
    pseudocode: [
      'sweep toward the chosen direction:',
      '  service every request passed',
      'when no requests remain ahead:',
      '  reverse immediately',
      '  service the rest'
    ],
    strengths: ['Strictly less head movement than SCAN', 'Keeps SCAN\'s starvation freedom'],
    weaknesses: ['Still uneven waiting times between the two ends', 'Needs to know where the last request is'],
    note: 'LOOK is what real disk drivers implement; textbook SCAN is the idealised version.'
  },
  'C-SCAN': {
    idea: 'Sweep in one direction only. On reaching the end, jump straight back to the start without servicing anything, and sweep the same way again.',
    pseudocode: [
      'sweep upward servicing requests',
      'on reaching the last track:',
      '  jump to track 0 servicing nothing',
      '  continue sweeping upward'
    ],
    strengths: ['Uniform waiting time across the whole disk', 'No end-of-disk bias'],
    weaknesses: ['The return jump is wasted movement', 'Higher total seek than SCAN in exchange for fairness'],
    note: 'Treat the disk as circular: every track waits roughly one full revolution of the head, no matter where it sits.'
  },
  'C-LOOK': {
    idea: 'C-SCAN without the pointless trip to the edge - jump straight from the last request to the first one.',
    pseudocode: [
      'sweep upward servicing requests',
      'when no requests remain ahead:',
      '  jump to the LOWEST pending request',
      '  continue sweeping upward'
    ],
    strengths: ['C-SCAN\'s fairness at lower cost', 'The best all-round choice in practice'],
    weaknesses: ['The jump still counts as head movement', 'Slightly more bookkeeping'],
    note: 'Compare its total against C-SCAN on the same input: the difference is exactly the empty edge C-SCAN visits.'
  }
};

export const memoryExplanations: Record<string, AlgorithmExplanation> = {
  'First Fit': {
    idea: 'Scan from the start and take the first hole big enough. Stop looking as soon as one fits.',
    pseudocode: [
      'for each hole from the start:',
      '  if hole.size >= request:',
      '    allocate here',
      '    leave the remainder as a smaller hole',
      '    stop'
    ],
    strengths: ['Fastest search - stops at the first match', 'Good enough in practice'],
    weaknesses: ['Small unusable slivers pile up at the front of memory', 'Later searches keep scanning past them'],
    note: 'Studies put First Fit and Best Fit close on storage use, but First Fit is clearly faster.'
  },
  'Best Fit': {
    idea: 'Check every hole and take the smallest one that fits, to waste as little as possible on this request.',
    pseudocode: [
      'best = none',
      'for each hole:',
      '  if hole.size >= request and hole.size < best.size:',
      '    best = hole',
      'allocate in best'
    ],
    strengths: ['Least leftover space per allocation', 'Keeps large holes intact for large requests'],
    weaknesses: ['Must search the whole free list every time', 'Leaves slivers too small for anyone to use'],
    note: 'Minimising waste per request maximises the number of useless fragments overall - a genuinely counter-intuitive result.'
  },
  'Worst Fit': {
    idea: 'Take the largest hole, on the theory that the leftover piece will still be big enough to be useful.',
    pseudocode: [
      'worst = none',
      'for each hole:',
      '  if hole.size >= request and hole.size > worst.size:',
      '    worst = hole',
      'allocate in worst'
    ],
    strengths: ['Remainders stay large enough to reuse', 'Fewer tiny fragments than Best Fit'],
    weaknesses: ['Destroys the large holes big requests need', 'Performs worst of the three in practice'],
    note: 'The reasoning sounds convincing and the measurements disagree - which is why it is worth simulating.'
  },
  'Next Fit': {
    idea: 'First Fit, but start each search where the last one finished instead of at the beginning.',
    pseudocode: [
      'start scanning at the last allocation point',
      'take the first hole that fits',
      'wrap around to the start if needed',
      'remember where you stopped'
    ],
    strengths: ['Spreads allocations evenly across memory', 'Avoids re-scanning the crowded front every time'],
    weaknesses: ['Breaks up large holes at the end of memory', 'Usually slightly worse storage use than First Fit'],
    note: 'Watch the search cursor move: it never rewinds to the start unless it has to wrap.'
  }
};

export const bankerExplanation: AlgorithmExplanation = {
  idea: 'Before granting any request, check whether some order exists in which every process could still finish. If not, refuse - even though the resources are sitting free.',
  pseudocode: [
    'Need = Max - Allocation',
    'Work = Available, Finish[] = false',
    'while some process i has Need[i] <= Work:',
    '  Work = Work + Allocation[i]',
    '  Finish[i] = true',
    'if all Finish are true: state is SAFE',
    'else: state is UNSAFE - deny the request'
  ],
  strengths: ['Prevents deadlock instead of recovering from it', 'Never has to kill or roll back a process'],
  weaknesses: ['Every process must declare its maximum need up front', 'Refuses requests that would have been fine', 'Assumes a fixed number of processes and resources'],
  note: 'Unsafe is not the same as deadlocked. An unsafe state might still work out - Banker\'s simply refuses to gamble.'
};

export const realTimeExplanations: Record<string, AlgorithmExplanation> = {
  RM: {
    idea: 'Fixed priorities assigned by period: the task that repeats most often gets the highest priority, forever.',
    pseudocode: [
      'assign priority by period (shorter period = higher)',
      'at every instant:',
      '  run the highest-priority released job',
      '  preempt a lower-priority job immediately',
      'schedulable if utilization <= n(2^(1/n) - 1)'
    ],
    strengths: ['Priorities computed once, offline', 'Cheap and predictable at runtime', 'Optimal among fixed-priority schemes'],
    weaknesses: ['Can miss deadlines well below 100% utilization', 'The bound falls to about 69% as tasks are added'],
    note: 'Passing the utilization bound guarantees schedulability, but failing it does not guarantee failure - the test is sufficient, not necessary.'
  },
  EDF: {
    idea: 'Priorities change constantly: whichever released job has the nearest absolute deadline runs now.',
    pseudocode: [
      'at every instant:',
      '  among released, unfinished jobs:',
      '    pick the earliest absolute deadline',
      '  preempt if that is not the running job',
      'schedulable if utilization <= 100%'
    ],
    strengths: ['Optimal - if any schedule meets every deadline, EDF does', 'Usable right up to 100% utilization'],
    weaknesses: ['Priorities must be recomputed at runtime', 'Behaviour degrades unpredictably under overload'],
    note: 'Overload EDF and it does not fail gracefully: it can cascade, missing deadlines it would otherwise have met.'
  }
};

export const syncExplanations: Record<string, AlgorithmExplanation> = {
  'producer-consumer': {
    idea: 'Two counting semaphores track free slots and filled slots; a binary mutex protects the buffer itself.',
    pseudocode: [
      'producer:                consumer:',
      '  wait(empty)              wait(full)',
      '  wait(mutex)              wait(mutex)',
      '  add item                 remove item',
      '  signal(mutex)            signal(mutex)',
      '  signal(full)             signal(empty)'
    ],
    strengths: ['Blocks instead of busy-waiting', 'Buffer access is always mutually exclusive'],
    weaknesses: ['The order of the two waits matters enormously', 'A missed signal deadlocks everything'],
    note: 'Swap the first two lines so mutex is taken first, and you get a deadlock: a producer holds mutex while blocked on empty, and the consumer that would free a slot can never get mutex.'
  },
  'readers-writers': {
    idea: 'Any number of readers may share the data, but a writer needs it entirely to itself. The first reader in locks out writers; the last one out releases them.',
    pseudocode: [
      'reader:                      writer:',
      '  wait(mutex)                  wait(rw)',
      '  readCount++                  ... write ...',
      '  if readCount == 1: wait(rw)  signal(rw)',
      '  signal(mutex)',
      '  ... read ...',
      '  wait(mutex)',
      '  readCount--',
      '  if readCount == 0: signal(rw)',
      '  signal(mutex)'
    ],
    strengths: ['Readers proceed concurrently', 'Only one lock acquisition no matter how many readers'],
    weaknesses: ['Writers can starve under a steady stream of readers', 'readCount itself needs its own mutex'],
    note: 'This is the reader-preference version. Writer-preference and fair variants exist precisely because writer starvation is a real problem.'
  },
  'dining-philosophers': {
    idea: 'Five philosophers, five forks, and each needs both neighbours\' forks to eat. Picking up one fork at a time is what makes deadlock possible.',
    pseudocode: [
      'philosopher i:',
      '  think',
      '  wait(fork[left])   <- one fork...',
      '  wait(fork[right])  <- ...then the other',
      '  eat',
      '  signal(fork[left])',
      '  signal(fork[right])'
    ],
    strengths: ['The clearest illustration of the four deadlock conditions', 'Several genuinely different fixes exist'],
    weaknesses: ['The naive solution deadlocks immediately', 'Naive fixes can still starve a philosopher'],
    note: 'All four Coffman conditions hold here at once: mutual exclusion, hold-and-wait, no preemption, and circular wait. Break any one of them and the deadlock is impossible.'
  }
};
