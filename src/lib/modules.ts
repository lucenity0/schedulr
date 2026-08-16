import {
  Boxes,
  Cpu,
  Database,
  GitBranch,
  HardDrive,
  Lock,
  LucideIcon,
  Timer,
  Workflow
} from 'lucide-react';

/**
 * One registry for every module, used by the router, the navigation menu and
 * the home page. With eight modules across four categories, keeping three
 * separate hand-maintained lists in sync stopped being realistic.
 */

export type ModuleCategory = 'Processes' | 'Concurrency' | 'Memory' | 'Storage';

export interface OsModule {
  path: string;
  name: string;
  /** longer title for cards */
  title: string;
  description: string;
  icon: LucideIcon;
  category: ModuleCategory;
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
    topics: ['FCFS', 'SJF', 'SRTF', 'LJF', 'HRRN', 'Priority', 'Round Robin', 'MLQ', 'MLFQ'],
    level: 'Start here'
  },
  {
    path: '/system-calls',
    name: 'System Calls',
    title: 'System Call Visualizer',
    description:
      'Watch fork() split one execution path into two. Two forks give three children, three give seven — see why.',
    icon: GitBranch,
    category: 'Processes',
    topics: ['fork()', 'exec()', 'wait()', 'exit()'],
    level: 'Start here'
  },
  {
    path: '/real-time',
    name: 'Real-Time',
    title: 'Real-Time Scheduling',
    description:
      'Periodic tasks with hard deadlines. Compare fixed-priority Rate Monotonic against Earliest Deadline First and watch deadlines get missed.',
    icon: Timer,
    category: 'Processes',
    topics: ['Rate Monotonic', 'EDF', 'Utilization bound', 'Deadline misses'],
    level: 'Advanced',
    prerequisite: 'CPU Scheduling'
  },
  {
    path: '/synchronization',
    name: 'Synchronization',
    title: 'Process Synchronization',
    description:
      'Three classic problems on a real semaphore machine. Step one process at a time and reach the deadlock yourself.',
    icon: Lock,
    category: 'Concurrency',
    topics: ['Semaphores', 'Producer-Consumer', 'Readers-Writers', 'Dining Philosophers'],
    level: 'Core'
  },
  {
    path: '/deadlock',
    name: 'Deadlock',
    title: "Deadlock & Banker's Algorithm",
    description:
      'Avoid deadlock by refusing unsafe states, or detect it after the fact with a resource-allocation graph.',
    icon: Workflow,
    category: 'Concurrency',
    topics: ["Banker's algorithm", 'Safe sequences', 'Detection', 'Resource graph'],
    level: 'Advanced',
    prerequisite: 'Synchronization'
  },
  {
    path: '/page-replacement',
    name: 'Page Replacement',
    title: 'Page Replacement Algorithms',
    description:
      'See exactly which page each algorithm throws out, and why — including the reference string where more memory means more faults.',
    icon: Database,
    category: 'Memory',
    topics: ['FIFO', 'LRU', 'LFU', 'Clock', 'Optimal', "Belady's anomaly"],
    level: 'Core'
  },
  {
    path: '/memory-allocation',
    name: 'Memory Allocation',
    title: 'Contiguous Memory Allocation',
    description:
      'Four ways to choose a free hole, and the fragmentation each one leaves behind.',
    icon: Boxes,
    category: 'Memory',
    topics: ['First Fit', 'Best Fit', 'Worst Fit', 'Next Fit', 'Fragmentation'],
    level: 'Core'
  },
  {
    path: '/disk-scheduling',
    name: 'Disk Scheduling',
    title: 'Disk Scheduling',
    description:
      'Track the arm across the platter and compare how much seek distance each algorithm saves.',
    icon: HardDrive,
    category: 'Storage',
    topics: ['FCFS', 'SSTF', 'SCAN', 'LOOK', 'C-SCAN', 'C-LOOK'],
    level: 'Core'
  }
];

export const CATEGORY_ORDER: ModuleCategory[] = ['Processes', 'Concurrency', 'Memory', 'Storage'];

export const CATEGORY_BLURB: Record<ModuleCategory, string> = {
  Processes: 'How the CPU decides what runs next, and how processes come into being.',
  Concurrency: 'What happens when processes share things — and how it goes wrong.',
  Memory: 'Deciding what lives in memory and where it goes.',
  Storage: 'Getting data off a spinning platter without wasting the trip.'
};

export const modulesByCategory = () =>
  CATEGORY_ORDER.map(category => ({
    category,
    blurb: CATEGORY_BLURB[category],
    modules: MODULES.filter(module => module.category === category)
  }));
