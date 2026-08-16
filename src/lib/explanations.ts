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

export const addressingExplanations: Record<string, AlgorithmExplanation> = {
  paging: {
    idea: 'Split every address into a page number and an offset. The page number is looked up in a table to find a frame; the offset is copied through untouched.',
    pseudocode: [
      'page   = address / pageSize',
      'offset = address % pageSize',
      'if page is in the TLB:',
      '  frame = TLB[page]          <- 1 memory access',
      'else:',
      '  frame = pageTable[page]    <- 2 memory accesses',
      '  if not valid: page fault',
      'physical = frame * pageSize + offset'
    ],
    strengths: ['No external fragmentation at all', 'Frames are interchangeable, so allocation is trivial', 'Pages can be shared between processes'],
    weaknesses: ['Internal fragmentation in the last page of every process', 'The page table itself costs memory', 'Without a TLB every access needs two memory references'],
    note: 'A flat page table for a 32-bit address space with 4 KB pages is 4 MB per process - which is exactly why real systems use multi-level or inverted page tables.'
  },
  segmentation: {
    idea: 'Divide a program the way a programmer thinks about it - code, stack, heap - and give each segment its own base and length.',
    pseudocode: [
      'read <segment, offset> from the address',
      'entry = segmentTable[segment]',
      'if offset >= entry.limit:',
      '  trap - addressing error',
      'physical = entry.base + offset'
    ],
    strengths: ['Matches the logical structure of a program', 'The limit check catches an overrun that paging would silently allow', 'Segments can be protected and shared by meaning, not by address'],
    weaknesses: ['Segments vary in size, so external fragmentation returns', 'Allocation needs first/best/worst fit again'],
    note: 'The limit register is what makes segmentation catch a buffer overrun: exceed the segment length and the hardware traps immediately.'
  }
};

export const filesystemExplanations: Record<string, AlgorithmExplanation> = {
  contiguous: {
    idea: 'Store every file in a run of consecutive blocks. The directory only needs a start block and a length.',
    pseudocode: [
      'find a run of `length` free blocks',
      'if no run is long enough: fail',
      'record (start, length) in the directory',
      'block i of the file = start + i'
    ],
    strengths: ['Both sequential and direct access are fast', 'Minimal seeking - the blocks are next to each other', 'Tiny directory entry'],
    weaknesses: ['External fragmentation', 'You must know the final file size when you create it', 'Growing a file may mean moving all of it'],
    note: 'This is why CD-ROMs use contiguous allocation and hard disks do not: a read-only medium knows every file size in advance.'
  },
  linked: {
    idea: 'Scatter the blocks anywhere and have each one point to the next, like a linked list on disk.',
    pseudocode: [
      'for each block needed:',
      '  take any free block',
      '  point the previous block at it',
      'directory stores only the first block',
      'block i = follow i pointers from the start'
    ],
    strengths: ['No external fragmentation whatsoever', 'Files can grow at any time', 'No need to declare a size up front'],
    weaknesses: ['Direct access is hopeless - reaching block i costs i+1 reads', 'A single corrupted pointer loses the rest of the file', 'Pointers consume space in every block'],
    note: 'The FAT file system fixes the direct-access problem by pulling all the pointers into one table at the front of the disk, which can be cached.'
  },
  indexed: {
    idea: 'Give each file one index block holding pointers to all of its data blocks.',
    pseudocode: [
      'allocate one index block',
      'for each data block:',
      '  take any free block',
      '  write its address into the index',
      'block i = read index, then read index[i]'
    ],
    strengths: ['Direct access in two reads regardless of i', 'No external fragmentation', 'Files can grow freely'],
    weaknesses: ['An entire block of overhead even for a one-block file', 'A single index block caps the maximum file size'],
    note: 'Unix inodes extend this with indirect blocks: an index that points to more indexes, so small files stay cheap and huge files remain possible.'
  }
};

export const criticalSectionExplanations: Record<string, AlgorithmExplanation> = {
  none: {
    idea: 'No protection at all. counter++ is three separate instructions, and any interleaving between them can lose an update.',
    pseudocode: [
      'register = counter    <- read',
      'register = register + 1',
      'counter  = register   <- write'
    ],
    strengths: ['Nothing to implement', 'No locking overhead'],
    weaknesses: ['The result depends on timing', 'It usually works, which is what makes the bug so hard to find'],
    note: 'Step the two threads alternately and watch two increments produce a count of one. That single lost update is the entire critical-section problem.'
  },
  peterson: {
    idea: 'A software-only solution for two threads: announce your interest, then politely give the other thread the turn.',
    pseudocode: [
      'flag[i] = true',
      'turn = j',
      'while (flag[j] && turn == j);   <- wait',
      '  ... critical section ...',
      'flag[i] = false'
    ],
    strengths: ['Needs no special hardware instruction', 'Satisfies all three requirements: mutual exclusion, progress and bounded waiting'],
    weaknesses: ['Works for two processes only', 'Busy-waits, burning CPU', 'Modern CPUs reorder memory writes, so it needs memory barriers to work for real'],
    note: 'Setting turn = j - handing the turn away - is the trick. If both threads set it, the second write wins, so exactly one of them proceeds.'
  },
  mutex: {
    idea: 'A lock with two operations: acquire it before the critical section, release it after. Anyone else has to wait.',
    pseudocode: [
      'acquire(mutex)',
      '  ... critical section ...',
      'release(mutex)'
    ],
    strengths: ['Works for any number of threads', 'Simple to reason about', 'A blocking mutex lets the waiter sleep instead of spinning'],
    weaknesses: ['Forgetting to release deadlocks everything', 'Contention serialises threads', 'Acquiring two locks in different orders deadlocks'],
    note: 'acquire() and release() must themselves be atomic - which is why they are built on a hardware instruction like TestAndSet.'
  },
  'test-and-set': {
    idea: 'One indivisible hardware instruction reads a lock and sets it in the same breath, so no interleaving can slip between the two.',
    pseudocode: [
      'boolean TestAndSet(target):',
      '  rv = *target',
      '  *target = true',
      '  return rv          <- all of this is atomic',
      '',
      'while (TestAndSet(&lock));',
      '  ... critical section ...',
      'lock = false'
    ],
    strengths: ['Atomicity guaranteed by the hardware', 'Works for any number of processors', 'The foundation every higher-level lock is built on'],
    weaknesses: ['Spins, wasting a whole CPU while waiting', 'No bounded waiting by itself - a thread can be unlucky forever'],
    note: 'The atomicity is the entire point: without it, two threads could both read false and both conclude the lock is theirs.'
  }
};

export const multiprocessorExplanations: Record<string, AlgorithmExplanation> = {
  common: {
    idea: 'One shared ready queue serving every core. Any core takes the next process whenever it goes idle.',
    pseudocode: [
      'single ready queue shared by all cores',
      'when a core goes idle:',
      '  lock the queue',
      '  take the next process',
      '  unlock the queue'
    ],
    strengths: ['Perfect load balance for free - no core idles while work waits', 'Simple to implement'],
    weaknesses: ['Every core contends for one lock, and that lock becomes the bottleneck', 'A process rarely returns to the same core, so its cache is always cold'],
    note: 'This is why it does not scale: at 64 cores the queue lock is contended constantly, and the cache misses cost more than the balance saves.'
  },
  'per-cpu': {
    idea: 'Each core keeps its own ready queue, so there is no shared lock and a process naturally stays where its cache is warm.',
    pseudocode: [
      'each core has a private ready queue',
      'when a core goes idle:',
      '  take from its own queue (no lock needed)',
      '  if empty: pull work from the busiest queue',
      'prefer a process that last ran on this core'
    ],
    strengths: ['No lock contention between cores', 'Processor affinity keeps caches warm', 'Scales to many cores - what Linux actually does'],
    weaknesses: ['Queues drift out of balance', 'Load balancing migrates processes, which throws away the cache affinity you were protecting'],
    note: 'Affinity and load balancing pull in opposite directions: every migration fixes the imbalance and costs a cold cache. Real schedulers tune the trade-off constantly.'
  }
};

export const virtualMemoryExplanations: Record<string, AlgorithmExplanation> = {
  'demand-paging': {
    idea: 'Never load a page until it is actually referenced. A program starts with almost nothing resident and faults its working set in.',
    pseudocode: [
      'on reference to page p:',
      '  if valid bit is set: proceed normally',
      '  else trap to the OS:',
      '    find a free frame (evict one if needed)',
      '    read the page in from disk',
      '    set the valid bit',
      '    restart the instruction'
    ],
    strengths: ['A process can be larger than physical memory', 'Starts faster - nothing unused is ever loaded', 'More processes fit in memory at once'],
    weaknesses: ['A fault costs milliseconds against nanoseconds for memory', 'Even a tiny fault rate dominates the average access time'],
    note: 'EAT = (1 − p) × memory + p × fault service. With 200 ns memory and 8 ms faults, one fault per thousand accesses makes the machine 40× slower.'
  },
  'copy-on-write': {
    idea: 'After fork(), parent and child share every frame read-only. Only when one of them writes is that single page copied.',
    pseudocode: [
      'fork():',
      '  child maps the parent\'s frames',
      '  mark every shared page read-only',
      'on write to a shared page:',
      '  trap, copy just that page',
      '  give the writer the private copy',
      '  restart the write'
    ],
    strengths: ['fork() becomes almost free', 'Pages never written are never copied', 'Makes the fork-then-exec pattern practical'],
    weaknesses: ['Every first write costs a trap and a copy', 'Bookkeeping for shared frames'],
    note: 'Since exec() replaces the image immediately, a fork-then-exec copies almost nothing - the pages are discarded before anyone writes to them.'
  },
  thrashing: {
    idea: 'A process needs its working set resident. Squeeze it below that and it faults constantly, spending all its time paging rather than working.',
    pseudocode: [
      'CPU utilization low?',
      '  the OS adds another process',
      '  frames per process fall',
      '  fault rate rises',
      '  CPU utilization falls further',
      '  -> the OS adds another process...'
    ],
    strengths: ['The working-set model predicts and prevents it', 'Page-fault frequency control reacts to it directly'],
    weaknesses: ['The feedback loop makes it self-reinforcing', 'The system looks idle while doing nothing but paging'],
    note: 'The cruel part is the feedback: low CPU utilization looks like "not enough processes", so the scheduler adds more, which makes it worse.'
  }
};

export const ipcExplanations: Record<string, AlgorithmExplanation> = {
  'shared-memory': {
    idea: 'Both processes map the same region of physical memory. After setup the kernel is not involved at all.',
    pseudocode: [
      'shmget()  <- ask the kernel for a region',
      'shmat()   <- map it into your address space',
      '... plain memory reads and writes ...',
      '(the kernel never sees them)'
    ],
    strengths: ['Memory speed - no copying, no system calls', 'Ideal for large or high-volume data'],
    weaknesses: ['You must provide your own synchronization', 'Only works between processes on one machine', 'A bug in one process can corrupt the other'],
    note: 'Notice what is missing: nothing here prevents both processes writing the same slot at once. That is the producer-consumer problem, and you have to solve it yourself.'
  },
  'message-passing': {
    idea: 'Processes never share memory. They ask the kernel to carry each message from one to the other.',
    pseudocode: [
      'send(destination, message)',
      '  -> traps into the kernel',
      '  -> copies the message into a kernel buffer',
      'receive(source, &message)',
      '  -> traps into the kernel',
      '  -> copies the message back out'
    ],
    strengths: ['Synchronization is built in - the channel is atomic', 'Works unchanged across a network', 'Processes stay isolated from each other'],
    weaknesses: ['Two copies and two system calls per message', 'Much slower for large payloads'],
    note: 'A zero-capacity channel forces a rendezvous: the sender blocks until the receiver arrives, so the two are synchronized by the act of communicating.'
  }
};

export const protectionExplanation: AlgorithmExplanation = {
  idea: 'Model protection as a matrix: rows are domains, columns are objects, and each cell lists exactly what that domain may do to that object.',
  pseudocode: [
    'on access(domain, object, right):',
    '  if right in matrix[domain][object]:',
    '    allow',
    '  else:',
    '    trap - protection violation',
    '',
    'switching domains needs the `switch` right'
  ],
  strengths: ['One uniform model for every resource', 'Enforces least privilege precisely', 'Rows become capability lists; columns become access control lists'],
  weaknesses: ['The full matrix is enormous and mostly empty', 'Nobody stores it as a matrix in practice'],
  note: 'Store it by column and you get the access control list every file system uses. Store it by row and you get the capability list. They are the same matrix, sliced two ways.'
};
