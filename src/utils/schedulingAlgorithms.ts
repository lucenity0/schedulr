import { Process, ExecutionBlock, ProcessMetrics, SchedulingResult } from '@/types/scheduler';

export const scheduleFCFS = (processes: Process[]): SchedulingResult => {
  const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const executionOrder: ExecutionBlock[] = [];
  const processMetrics: ProcessMetrics[] = [];
  
  let currentTime = 0;
  
  sortedProcesses.forEach(process => {
    const startTime = Math.max(currentTime, process.arrivalTime);
    const endTime = startTime + process.burstTime;
    
    executionOrder.push({
      processId: process.id,
      startTime,
      endTime
    });
    
    processMetrics.push({
      id: process.id,
      arrivalTime: process.arrivalTime,
      burstTime: process.burstTime,
      completionTime: endTime,
      turnaroundTime: endTime - process.arrivalTime,
      waitingTime: startTime - process.arrivalTime,
      priority: process.priority
    });
    
    currentTime = endTime;
  });
  
  return calculateAverages(executionOrder, processMetrics);
};

export const scheduleSJF = (processes: Process[]): SchedulingResult => {
  const remainingProcesses = [...processes].map(p => ({ ...p, remainingTime: p.burstTime }));
  const executionOrder: ExecutionBlock[] = [];
  const processMetrics: ProcessMetrics[] = [];
  const completedProcesses: Set<string> = new Set();
  
  let currentTime = 0;
  
  while (completedProcesses.size < processes.length) {
    const availableProcesses = remainingProcesses.filter(
      p => p.arrivalTime <= currentTime && !completedProcesses.has(p.id)
    );
    
    if (availableProcesses.length === 0) {
      currentTime++;
      continue;
    }
    
    // Find shortest job
    const shortestJob = availableProcesses.reduce((min, current) =>
      current.burstTime < min.burstTime ? current : min
    );
    
    const startTime = currentTime;
    const endTime = startTime + shortestJob.burstTime;
    
    executionOrder.push({
      processId: shortestJob.id,
      startTime,
      endTime
    });
    
    processMetrics.push({
      id: shortestJob.id,
      arrivalTime: shortestJob.arrivalTime,
      burstTime: shortestJob.burstTime,
      completionTime: endTime,
      turnaroundTime: endTime - shortestJob.arrivalTime,
      waitingTime: startTime - shortestJob.arrivalTime,
      priority: shortestJob.priority
    });
    
    completedProcesses.add(shortestJob.id);
    currentTime = endTime;
  }
  
  return calculateAverages(executionOrder, processMetrics);
};

export const schedulePriority = (processes: Process[]): SchedulingResult => {
  const remainingProcesses = [...processes].map(p => ({ ...p, remainingTime: p.burstTime }));
  const executionOrder: ExecutionBlock[] = [];
  const processMetrics: ProcessMetrics[] = [];
  const completedProcesses: Set<string> = new Set();
  
  let currentTime = 0;
  
  while (completedProcesses.size < processes.length) {
    const availableProcesses = remainingProcesses.filter(
      p => p.arrivalTime <= currentTime && !completedProcesses.has(p.id)
    );
    
    if (availableProcesses.length === 0) {
      currentTime++;
      continue;
    }
    
    // Find highest priority (lowest number)
    const highestPriority = availableProcesses.reduce((min, current) => {
      const minPriority = min.priority ?? Infinity;
      const currentPriority = current.priority ?? Infinity;
      return currentPriority < minPriority ? current : min;
    });
    
    const startTime = currentTime;
    const endTime = startTime + highestPriority.burstTime;
    
    executionOrder.push({
      processId: highestPriority.id,
      startTime,
      endTime
    });
    
    processMetrics.push({
      id: highestPriority.id,
      arrivalTime: highestPriority.arrivalTime,
      burstTime: highestPriority.burstTime,
      completionTime: endTime,
      turnaroundTime: endTime - highestPriority.arrivalTime,
      waitingTime: startTime - highestPriority.arrivalTime,
      priority: highestPriority.priority
    });
    
    completedProcesses.add(highestPriority.id);
    currentTime = endTime;
  }
  
  return calculateAverages(executionOrder, processMetrics);
};

export const scheduleRoundRobin = (processes: Process[], timeQuantum: number): SchedulingResult => {
  const processQueue = [...processes]
    .sort((a, b) => a.arrivalTime - b.arrivalTime)
    .map(p => ({ ...p, remainingTime: p.burstTime }));
  
  const executionOrder: ExecutionBlock[] = [];
  const processMetrics: ProcessMetrics[] = [];
  const readyQueue: typeof processQueue = [];
  
  let currentTime = 0;
  let processIndex = 0;
  
  while (processIndex < processQueue.length || readyQueue.length > 0) {
    // Add newly arrived processes to ready queue
    while (processIndex < processQueue.length && processQueue[processIndex].arrivalTime <= currentTime) {
      readyQueue.push(processQueue[processIndex]);
      processIndex++;
    }
    
    if (readyQueue.length === 0) {
      currentTime++;
      continue;
    }
    
    const currentProcess = readyQueue.shift()!;
    const executionTime = Math.min(timeQuantum, currentProcess.remainingTime);
    const startTime = currentTime;
    const endTime = startTime + executionTime;
    
    executionOrder.push({
      processId: currentProcess.id,
      startTime,
      endTime
    });
    
    currentProcess.remainingTime -= executionTime;
    currentTime = endTime;
    
    // Add newly arrived processes to ready queue
    while (processIndex < processQueue.length && processQueue[processIndex].arrivalTime <= currentTime) {
      readyQueue.push(processQueue[processIndex]);
      processIndex++;
    }
    
    if (currentProcess.remainingTime > 0) {
      readyQueue.push(currentProcess);
    } else {
      // Process completed
      processMetrics.push({
        id: currentProcess.id,
        arrivalTime: currentProcess.arrivalTime,
        burstTime: currentProcess.burstTime,
        completionTime: endTime,
        turnaroundTime: endTime - currentProcess.arrivalTime,
        waitingTime: endTime - currentProcess.arrivalTime - currentProcess.burstTime,
        priority: currentProcess.priority
      });
    }
  }
  
  return calculateAverages(executionOrder, processMetrics);
};

const calculateAverages = (executionOrder: ExecutionBlock[], processMetrics: ProcessMetrics[]): SchedulingResult => {
  const averageWaitingTime = processMetrics.reduce((sum, p) => sum + p.waitingTime, 0) / processMetrics.length;
  const averageTurnaroundTime = processMetrics.reduce((sum, p) => sum + p.turnaroundTime, 0) / processMetrics.length;
  
  return {
    executionOrder,
    processMetrics,
    averageWaitingTime,
    averageTurnaroundTime
  };
};