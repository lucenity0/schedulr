import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Play, RotateCcw, XCircle } from 'lucide-react';

interface FlowNode {
  id: string; 
  pid: number;
  command: string;
  state: 'Running' | 'Waiting' | 'Terminated';
  children: FlowNode[];
}

const SystemCalls = () => {
  const [processTree, setProcessTree] = useState<FlowNode>({
    id: 'root_1',
    pid: 1,
    command: 'Main Process',
    state: 'Running',
    children: []
  });
  const [nextPid, setNextPid] = useState(2);
  const [selectedProcess, setSelectedProcess] = useState<number>(1);
  const [log, setLog] = useState<string[]>(['System initialized with Main Process (PID: 1)']);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const findLeaf = (node: FlowNode, pid: number): FlowNode | null => {
    if (node.pid === pid && node.children.length === 0) return node;
    for (const child of node.children) {
      const found = findLeaf(child, pid);
      if (found) return found;
    }
    return null;
  };

  const updateLeaf = (node: FlowNode, leafId: string, updates: Partial<FlowNode> | { replaceWithChildren: FlowNode[] }): FlowNode => {
    if (node.id === leafId) {
      if ('replaceWithChildren' in updates) {
        return { ...node, children: updates.replaceWithChildren };
      }
      return { ...node, ...updates };
    }
    return {
      ...node,
      children: node.children.map(child => updateLeaf(child, leafId, updates))
    };
  };

  const handleFork = () => {
    const activeLeaf = findLeaf(processTree, selectedProcess);
    
    if (!activeLeaf) {
      addLog(`Cannot fork: PID ${selectedProcess} is terminated or not active.`);
      return;
    }
    if (activeLeaf.state !== 'Running') {
      addLog(`Cannot fork: PID ${selectedProcess} is currently ${activeLeaf.state}.`);
      return;
    }

    const newChildPid = nextPid;

    const continuingParent: FlowNode = {
      id: `pid_${activeLeaf.pid}_gen_${Date.now()}`,
      pid: activeLeaf.pid,
      command: 'Parent Process',
      state: 'Running',
      children: []
    };

    const newChild: FlowNode = {
      id: `pid_${newChildPid}_gen_${Date.now()}`,
      pid: newChildPid,
      command: 'Child Process',
      state: 'Running',
      children: []
    };

    setProcessTree(updateLeaf(processTree, activeLeaf.id, { replaceWithChildren: [continuingParent, newChild] }));
    setNextPid(nextPid + 1);
    
    addLog(`fork(): PID ${activeLeaf.pid} split execution. New child PID ${newChildPid} created.`);
  };

  const handleExec = () => {
    const activeLeaf = findLeaf(processTree, selectedProcess);
    if (!activeLeaf) return;

    const newCommand = `exec_${Date.now() % 1000}()`;
    setProcessTree(updateLeaf(processTree, activeLeaf.id, {
      command: newCommand
    }));
    addLog(`exec(): PID ${selectedProcess} image replaced with ${newCommand}.`);
  };

  const handleWait = () => {
    const activeLeaf = findLeaf(processTree, selectedProcess);
    if (!activeLeaf) return;

    setProcessTree(updateLeaf(processTree, activeLeaf.id, { state: 'Waiting' }));
    addLog(`wait(): PID ${selectedProcess} is now waiting for children to terminate.`);

    setTimeout(() => {
      const leafToCheck = findLeaf(processTree, selectedProcess);
      if (leafToCheck && leafToCheck.state === 'Waiting') {
        setProcessTree(prev => updateLeaf(prev, leafToCheck.id, { state: 'Running' }));
        addLog(`PID ${selectedProcess} resumed execution after wait().`);
      }
    }, 3000);
  };

  const handleExit = () => {
    const activeLeaf = findLeaf(processTree, selectedProcess);
    if (!activeLeaf) return;

    setProcessTree(updateLeaf(processTree, activeLeaf.id, { state: 'Terminated', command: 'Terminated' }));
    addLog(`exit(): PID ${selectedProcess} terminated execution.`);
    setSelectedProcess(1); 
  };

  const reset = () => {
    setProcessTree({
      id: 'root_1',
      pid: 1,
      command: 'Main Process',
      state: 'Running',
      children: []
    });
    setNextPid(2);
    setSelectedProcess(1);
    setLog(['System initialized with Main Process (PID: 1)']);
  };

  const renderFlowGraph = (node: FlowNode) => {
    const isLeaf = node.children.length === 0;
    const isSelected = selectedProcess === node.pid && isLeaf && node.state !== 'Terminated';
    
    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          onClick={() => isLeaf && node.state !== 'Terminated' && setSelectedProcess(node.pid)}
          className={`relative px-4 py-3 min-w-[140px] border-2 rounded-lg text-center transition-all ${
            isSelected ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer' :
            isLeaf && node.state !== 'Terminated' ? 'border-border bg-card hover:border-primary/50 cursor-pointer' :
            node.state === 'Terminated' ? 'border-destructive/40 bg-destructive/5 opacity-50 cursor-not-allowed' :
            'border-muted bg-muted/20 opacity-60 cursor-default'
          }`}
        >
          <div className={`font-bold text-sm ${node.state === 'Terminated' ? 'text-destructive' : 'text-foreground'}`}>
            {node.command}
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            PID: {node.pid}
          </div>
          
          <div className="absolute -top-1.5 -right-1.5">
            <div className={`w-3 h-3 rounded-full border border-background ${
              node.state === 'Running' && isLeaf ? 'bg-green-500' :
              node.state === 'Waiting' ? 'bg-blue-500' :
              node.state === 'Terminated' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
          </div>
        </div>

        {node.children.length > 0 && (
          <div className="flex flex-col items-center w-full relative">
            <div className="w-px h-6 bg-border" />
            
            <div className="px-3 py-1 rounded-full border bg-background text-xs font-mono text-muted-foreground z-10 -my-3 shadow-sm">
              fork()
            </div>
            
            <div className="w-px h-6 bg-border" />
            
            <div className="flex relative pt-4 w-full justify-center">
              <div className="absolute top-0 w-1/2 h-px bg-border" />
              
              <div className="flex gap-12 justify-center w-full">
                {node.children.map((child) => (
                  <div key={child.id} className="flex flex-col items-center relative">
                    <div className="absolute top-[-1rem] w-px h-4 bg-border" />
                    {renderFlowGraph(child)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4">
      <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-primary" />
            Execution Flow Visualizer
          </CardTitle>
          <CardDescription className="text-base">
            Visualize the timeline of process execution. Notice how <code>fork()</code> splits a single timeline into two parallel running paths.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-border/60 shadow-md bg-background/90 min-h-[500px] overflow-hidden flex flex-col">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg">Execution Timeline</CardTitle>
            <CardDescription>Click on an active leaf node (bottommost boxes) to apply system calls.</CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 relative min-h-[400px]">
            {/* Added custom scrollbar styles here to ensure horizontal visibility */}
            <div className="absolute inset-0 overflow-auto p-8 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-muted/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 hover:[&::-webkit-scrollbar-thumb]:bg-primary/60 [&::-webkit-scrollbar-thumb]:rounded-full transition-all">
              <div className="w-max min-w-full mx-auto pb-10 flex justify-center">
                {renderFlowGraph(processTree)}
              </div>
            </div>
          </CardContent>

        </Card>

        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border/60 shadow-md">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-lg">System Calls</CardTitle>
              <div className="font-mono text-sm text-muted-foreground mt-2">
                Target: <span className="text-primary font-bold">PID {selectedProcess}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex flex-col gap-3">
                <Button onClick={handleFork} className="w-full justify-start">
                  <GitBranch className="h-4 w-4 mr-2" /> fork()
                </Button>
                <Button onClick={handleExec} variant="outline" className="w-full justify-start">
                  <Play className="h-4 w-4 mr-2" /> exec()
                </Button>
                <Button onClick={handleWait} variant="outline" className="w-full justify-start">
                  <span className="h-4 w-4 mr-2 text-center inline-block">⏳</span> wait()
                </Button>
                <Button onClick={handleExit} variant="destructive" className="w-full justify-start">
                  <XCircle className="h-4 w-4 mr-2" /> exit()
                </Button>
              </div>
              <div className="pt-4 border-t">
                <Button onClick={reset} variant="secondary" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-md">
            <CardHeader className="py-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold">Event Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto p-4 space-y-2 font-mono text-[11px] leading-relaxed">
                {log.map((entry, index) => (
                  <div key={index} className="text-muted-foreground border-b border-border/40 pb-2 last:border-0">
                    <span className="text-primary/70 mr-1">[{index}]</span>
                    {entry}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemCalls;