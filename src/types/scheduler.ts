export interface Process {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority?: number;
  remainingTime?: number;
}

export interface ExecutionBlock {
  processId: string;
  startTime: number;
  endTime: number;
}

export interface ProcessMetrics {
  id: string;
  arrivalTime: number;
  burstTime: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  /** time from arrival until the process first reaches the CPU */
  responseTime?: number;
  priority?: number;
}

export interface SchedulingResult {
  algorithm?: string;
  executionOrder: ExecutionBlock[];
  processMetrics: ProcessMetrics[];
  averageWaitingTime: number;
  averageTurnaroundTime: number;
}

export type SchedulingAlgorithm =
  | 'FCFS'
  | 'SJF'
  | 'SRTF'
  | 'LJF'
  | 'HRRN'
  | 'Priority'
  | 'PriorityP'
  | 'RoundRobin'
  | 'MLQ'
  | 'MLFQ';
