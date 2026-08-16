import {
  ArrowLeftRight,
  Boxes,
  Cpu,
  Database,
  FolderTree,
  GitBranch,
  HardDrive,
  KeyRound,
  Layers,
  Layers3,
  Lock,
  LucideIcon,
  MemoryStick,
  ShieldAlert,
  Timer,
  Workflow
} from 'lucide-react';

/**
 * One registry for every module, used by the router, the navigation menu and
 * the home page. With eight modules across four categories, keeping three
 * separate hand-maintained lists in sync stopped being realistic.
 */

export type ModuleCategory = 'Processes' | 'Concurrency' | 'Memory' | 'Storage & Protection';

/** Which unit of the OS syllabus a module belongs to. */
export type SyllabusUnit = 1 | 2 | 3 | 4 | 5;

export interface OsModule {
  path: string;
  name: string;
  /** longer title for cards */
  title: string;
  description: string;
  icon: LucideIcon;
  category: ModuleCategory;
  /** syllabus unit(s) this module covers */
  units: SyllabusUnit[];
  /** algorithms or problems covered */
  topics: string[];
  level: 'Start here' | 'Core' | 'Advanced';
  /** shown on the card when a concept builds on another module */
  prerequisite?: string;
}

export const MODULES: OsModule[] = [
  {
    path: '/cpu-scheduling',
    name: 'CPU Scheduling',
    title: 'CPU Scheduling Algorithms',
    description:
      'Ten algorithms on one tick-accurate timeline. Step through every dispatch and preemption and see why the scheduler chose what it did.',
    icon: Cpu,
    category: 'Processes',
    units: [2],
    topics: ['FCFS', 'SJF', 'SRTF', 'LJF', 'HRRN', 'Priority', 'Round Robin', 'MLQ', 'MLFQ'],
    level: 'Start here'
  },
  {
    path: '/system-calls',
    name: 'System Calls',
    title: 'System Call Visualizer',
    description:
      'Watch fork() split one execution path into two. Two forks give three children, three give seven - see why.',
    icon: GitBranch,
    category: 'Processes',
    units: [1],
    topics: ['fork()', 'exec()', 'wait()', 'exit()'],
    level: 'Start here'
  },
  {
    path: '/ipc',
    name: 'Processes & IPC',
    title: 'Processes & Inter-process Communication',
    description:
      'The five process states, what lives in a PCB, and the two ways processes talk - shared memory at memory speed, or message passing through the kernel.',
    icon: ArrowLeftRight,
    category: 'Processes',
    units: [1],
    topics: ['Process states', 'PCB', 'Context switch', 'Shared memory', 'Message passing', 'Pipes'],
    level: 'Start here'
  },
  {
    path: '/multiprocessor',
    name: 'Multiprocessor & Threads',
    title: 'Multiprocessor & Thread Scheduling',
    description:
      'Scheduling across many cores, where affinity and load balancing pull against each other - plus how user threads map onto kernel threads.',
    icon: Layers,
    category: 'Processes',
    units: [2],
    topics: ['Common vs per-CPU queues', 'Load balancing', 'Processor affinity', 'Multithreading models'],
    level: 'Advanced',
    prerequisite: 'CPU Scheduling'
  },
  {
    path: '/real-time',
    name: 'Real-Time',
    title: 'Real-Time Scheduling',
    description:
      'Periodic tasks with hard deadlines. Compare fixed-priority Rate Monotonic against Earliest Deadline First and watch deadlines get missed.',
    icon: Timer,
    category: 'Processes',
    units: [2],
    topics: ['Rate Monotonic', 'EDF', 'Utilization bound', 'Deadline misses'],
    level: 'Advanced',
    prerequisite: 'CPU Scheduling'
  },
  {
    path: '/critical-section',
    name: 'Critical Section',
    title: 'The Critical Section Problem',
    description:
      'Two threads, one counter, and a lost update you can watch happen instruction by instruction. Then fix it four different ways.',
    icon: ShieldAlert,
    category: 'Concurrency',
    units: [3],
    topics: ['Race conditions', "Peterson's solution", 'Mutex locks', 'TestAndSet'],
    level: 'Core'
  },
  {
    path: '/synchronization',
    name: 'Synchronization',
    title: 'Process Synchronization',
    description:
      'Three classic problems on a real semaphore machine. Step one process at a time and reach the deadlock yourself.',
    icon: Lock,
    category: 'Concurrency',
    units: [3],
    topics: ['Semaphores', 'Producer-Consumer', 'Readers-Writers', 'Dining Philosophers'],
    level: 'Core',
    prerequisite: 'Critical Section'
  },
  {
    path: '/deadlock',
    name: 'Deadlock',
    title: "Deadlock: Prevention, Avoidance & Detection",
    description:
      'Break one of the four Coffman conditions, refuse unsafe states with Banker\'s algorithm, or detect the cycle after the fact.',
    icon: Workflow,
    category: 'Concurrency',
    units: [3],
    topics: ['Coffman conditions', 'Prevention', "Banker's algorithm", 'Detection', 'Recovery'],
    level: 'Advanced',
    prerequisite: 'Synchronization'
  },
  {
    path: '/address-translation',
    name: 'Address Translation',
    title: 'Address Translation: Paging & Segmentation',
    description:
      'How a logical address becomes a physical one - page tables, the TLB that makes them affordable, and the limit check segmentation gives you.',
    icon: MemoryStick,
    category: 'Memory',
    units: [4],
    topics: ['Paging', 'Page table', 'TLB', 'Segmentation', 'Effective access time'],
    level: 'Core'
  },
  {
    path: '/page-replacement',
    name: 'Page Replacement',
    title: 'Page Replacement Algorithms',
    description:
      'See exactly which page each algorithm throws out, and why - including the reference string where more memory means more faults.',
    icon: Database,
    category: 'Memory',
    units: [4],
    topics: ['FIFO', 'LRU', 'LFU', 'Clock', 'Optimal', "Belady's anomaly"],
    level: 'Core'
  },
  {
    path: '/virtual-memory',
    name: 'Virtual Memory',
    title: 'Virtual Memory Management',
    description:
      'Demand paging, copy-on-write, and the feedback loop that turns a busy system into one that does nothing but page.',
    icon: Layers3,
    category: 'Memory',
    units: [4],
    topics: ['Demand paging', 'Copy-on-write', 'Thrashing', 'Working set', 'Frame allocation'],
    level: 'Advanced',
    prerequisite: 'Page Replacement'
  },
  {
    path: '/memory-allocation',
    name: 'Memory Allocation',
    title: 'Contiguous Memory Allocation',
    description:
      'Four ways to choose a free hole, and the fragmentation each one leaves behind.',
    icon: Boxes,
    category: 'Memory',
    units: [4],
    topics: ['First Fit', 'Best Fit', 'Worst Fit', 'Next Fit', 'Fragmentation', 'Compaction'],
    level: 'Core'
  },
  {
    path: '/file-systems',
    name: 'File Systems',
    title: 'File System Implementation',
    description:
      'Where a file\'s blocks actually go on disk, what it costs to read block i, and how the free list is tracked.',
    icon: FolderTree,
    category: 'Storage & Protection',
    units: [5],
    topics: ['Contiguous', 'Linked', 'Indexed', 'Bit vector', 'Grouping', 'Counting'],
    level: 'Core'
  },
  {
    path: '/disk-scheduling',
    name: 'Disk Scheduling',
    title: 'Disk Scheduling',
    description:
      'Track the arm across the platter and compare how much seek distance each algorithm saves.',
    icon: HardDrive,
    category: 'Storage & Protection',
    units: [5],
    topics: ['FCFS', 'SSTF', 'SCAN', 'LOOK', 'C-SCAN', 'C-LOOK'],
    level: 'Core'
  },
  {
    path: '/protection',
    name: 'Protection',
    title: 'System Protection',
    description:
      'Who may do what to which object, modelled as one matrix - and the two ways every real system stores it.',
    icon: KeyRound,
    category: 'Storage & Protection',
    units: [5],
    topics: ['Access matrix', 'Domains', 'Capability lists', 'Access control lists'],
    level: 'Core'
  }
];

export const CATEGORY_ORDER: ModuleCategory[] = [
  'Processes',
  'Concurrency',
  'Memory',
  'Storage & Protection'
];

export const CATEGORY_BLURB: Record<ModuleCategory, string> = {
  Processes: 'How the CPU decides what runs next, and how processes come into being.',
  Concurrency: 'What happens when processes share things — and how it goes wrong.',
  Memory: 'Deciding what lives in memory and where it goes.',
  'Storage & Protection': 'Laying files out on disk, reaching them quickly, and controlling who may touch them.'
};

/** Syllabus unit titles, for the by-unit view. */
export const UNIT_TITLES: Record<SyllabusUnit, string> = {
  1: 'Introduction, System Structures & Process Concept',
  2: 'Multithreaded Programming & Process Scheduling',
  3: 'Synchronization & Deadlocks',
  4: 'Memory & Virtual Memory Management',
  5: 'File Systems, Mass Storage & Protection'
};

export const modulesByUnit = () =>
  ([1, 2, 3, 4, 5] as SyllabusUnit[]).map(unit => ({
    unit,
    title: UNIT_TITLES[unit],
    modules: MODULES.filter(module => module.units.includes(unit))
  }));

export const modulesByCategory = () =>
  CATEGORY_ORDER.map(category => ({
    category,
    blurb: CATEGORY_BLURB[category],
    modules: MODULES.filter(module => module.category === category)
  }));
