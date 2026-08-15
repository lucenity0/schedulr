import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Play, RotateCcw, XCircle } from 'lucide-react';

interface FlowNode {
  id: string;
  pid: number;
  parentPid: number | null;
  command: string;
  state: 'Running' | 'Waiting' | 'Terminated';
  children: FlowNode[];
  /** ids of child branches already reaped by a wait() call on this leaf */
  reaped?: string[];
}

const makeRoot = (): FlowNode => ({
  id: 'n0',
  pid: 1,
  parentPid: null,
  command: 'Main Process',
  state: 'Running',
  children: []
});

const INITIAL_LOG = 'System initialized with Main Process (PID: 1)';

/**
 * A leaf is the *current* state of a process: the bottom-most node on one
 * execution path. Interior nodes are history - the moment before a fork() split.
 */
const findLeaf = (node: FlowNode, pid: number): FlowNode | null => {
  if (node.children.length === 0) return node.pid === pid ? node : null;
  for (const child of node.children) {
    const found = findLeaf(child, pid);
    if (found) return found;
  }
  return null;
};

const updateLeaf = (
  node: FlowNode,
  leafId: string,
  updates: Partial<FlowNode> | { replaceWithChildren: FlowNode[] }
): FlowNode => {
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

const collectLeaves = (node: FlowNode, out: FlowNode[] = []): FlowNode[] => {
  if (node.children.length === 0) out.push(node);
  else node.children.forEach(child => collectLeaves(child, out));
  return out;
};

/** A spawned branch has finished only once every path inside it has exited. */
const isBranchTerminated = (node: FlowNode): boolean =>
  collectLeaves(node).every(leaf => leaf.state === 'Terminated');

/**
 * The child processes of a given leaf. Walking root -> leaf, every fork node
 * where the path continued as the parent (same pid) also spawned a sibling
 * branch - and that sibling is a child process of this leaf.
 */
const getChildBranches = (root: FlowNode, leafId: string): FlowNode[] => {
  const branches: FlowNode[] = [];

  const walk = (node: FlowNode): boolean => {
    if (node.id === leafId) return true;
    for (const child of node.children) {
      if (!walk(child)) continue;
      if (node.pid === child.pid) {
        branches.push(...node.children.filter(sib => sib.id !== child.id));
      }
      return true;
    }
    return false;
  };

  walk(root);
  return branches;
};

/**
 * Resume any leaf blocked in wait() whose child branch has since terminated.
 * Runs against the freshly-computed tree so it never reads a stale snapshot.
 */
const resolveWaits = (root: FlowNode): { tree: FlowNode; logs: string[] } => {
  const logs: string[] = [];
  let tree = root;

  for (const leaf of collectLeaves(root)) {
    if (leaf.state !== 'Waiting') continue;

    const reaped = leaf.reaped ?? [];
    const finished = getChildBranches(root, leaf.id).find(
      branch => !reaped.includes(branch.id) && isBranchTerminated(branch)
    );
    if (!finished) continue;

    tree = updateLeaf(tree, leaf.id, {
      state: 'Running',
      reaped: [...reaped, finished.id]
    });
    logs.push(`PID ${leaf.pid} resumed: child PID ${finished.pid} terminated and was reaped by wait().`);
  }

  return { tree, logs };
};

const findFirstRunningLeaf = (root: FlowNode): FlowNode | null =>
  collectLeaves(root).find(leaf => leaf.state === 'Running') ?? null;

const SystemCalls = () => {
  const [processTree, setProcessTree] = useState<FlowNode>(makeRoot);
  const [nextPid, setNextPid] = useState(2);
  const [selectedProcess, setSelectedProcess] = useState<number>(1);
  const [log, setLog] = useState<string[]>([INITIAL_LOG]);

  // Monotonic id source. Wall-clock ids can collide within the same millisecond,
  // and updateLeaf matches on id - a collision would rewrite the wrong subtree.
  const nextNodeId = useRef(1);
  const makeId = () => `n${nextNodeId.current++}`;

  const addLog = (...messages: string[]) => {
    if (messages.length) setLog(prev => [...prev, ...messages]);
  };

  /** Resolve the target leaf and guard it, so no call ever acts on a dead path. */
  const withActiveLeaf = (call: string, run: (leaf: FlowNode) => void) => {
    const leaf = findLeaf(processTree, selectedProcess);
    if (!leaf) {
      addLog(`${call}: PID ${selectedProcess} is not an active execution path.`);
      return;
    }
    if (leaf.state !== 'Running') {
      addLog(`${call}: PID ${selectedProcess} cannot run a system call while ${leaf.state}.`);
      return;
    }
    run(leaf);
  };

  const handleFork = () => {
    withActiveLeaf('fork()', leaf => {
      const childPid = nextPid;

      const continuingParent: FlowNode = {
        id: makeId(),
        pid: leaf.pid,
        parentPid: leaf.parentPid,
        command: 'Parent Process',
        state: 'Running',
        children: []
      };

      const newChild: FlowNode = {
        id: makeId(),
        pid: childPid,
        parentPid: leaf.pid,
        command: 'Child Process',
        state: 'Running',
        children: []
      };

      setProcessTree(prev =>
        updateLeaf(prev, leaf.id, { replaceWithChildren: [continuingParent, newChild] })
      );
      setNextPid(childPid + 1);
      addLog(
        `fork(): PID ${leaf.pid} split execution. Returns ${childPid} in the parent, 0 in the new child PID ${childPid}.`
      );
    });
  };

  const handleExec = () => {
    withActiveLeaf('exec()', leaf => {
      const newCommand = `/bin/program_${leaf.pid}`;
      setProcessTree(prev => updateLeaf(prev, leaf.id, { command: newCommand }));
      addLog(`exec(): PID ${leaf.pid} kept its PID but its memory image was replaced with ${newCommand}.`);
    });
  };

  const handleWait = () => {
    withActiveLeaf('wait()', leaf => {
      const branches = getChildBranches(processTree, leaf.id);
      const reaped = leaf.reaped ?? [];
      const unreaped = branches.filter(branch => !reaped.includes(branch.id));

      if (unreaped.length === 0) {
        addLog(`wait(): PID ${leaf.pid} has no un-reaped children - returns -1 immediately.`);
        return;
      }

      const alreadyFinished = unreaped.find(isBranchTerminated);
      if (alreadyFinished) {
        setProcessTree(prev =>
          updateLeaf(prev, leaf.id, { reaped: [...reaped, alreadyFinished.id] })
        );
        addLog(`wait(): PID ${leaf.pid} reaped already-terminated child PID ${alreadyFinished.pid} without blocking.`);
        return;
      }

      setProcessTree(prev => updateLeaf(prev, leaf.id, { state: 'Waiting' }));
      addLog(
        `wait(): PID ${leaf.pid} is blocked until a child exits (waiting on PID ${unreaped
          .map(b => b.pid)
          .join(', ')}).`
      );
    });
  };

  const handleExit = () => {
    withActiveLeaf('exit()', leaf => {
      const terminated = updateLeaf(processTree, leaf.id, {
        state: 'Terminated',
        command: 'Terminated'
      });
      // A parent blocked in wait() unblocks here, off real state - not a timer.
      const { tree, logs } = resolveWaits(terminated);
      const next = findFirstRunningLeaf(tree);

      setProcessTree(tree);
      setSelectedProcess(next ? next.pid : leaf.pid);
      addLog(`exit(): PID ${leaf.pid} terminated.`, ...logs);
    });
  };

  const reset = () => {
    nextNodeId.current = 1;
    setProcessTree(makeRoot());
    setNextPid(2);
    setSelectedProcess(1);
    setLog([INITIAL_LOG]);
  };

  const renderFlowGraph = (node: FlowNode) => {
    const isLeaf = node.children.length === 0;
    const isSelectable = isLeaf && node.state !== 'Terminated';
    const isSelected = selectedProcess === node.pid && isSelectable;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <div
          onClick={() => isSelectable && setSelectedProcess(node.pid)}
          className={`relative px-4 py-3 min-w-[140px] border-2 rounded-lg text-center transition-all ${isSelected ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer' :
            isSelectable ? 'border-border bg-card hover:border-primary/50 cursor-pointer' :
              node.state === 'Terminated' ? 'border-destructive/40 bg-destructive/5 opacity-50 cursor-not-allowed' :
                'border-muted bg-muted/20 opacity-60 cursor-default'
            }`}
        >
          <div className={`font-bold text-sm ${node.state === 'Terminated' ? 'text-destructive' : 'text-foreground'}`}>
            {node.command}
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            PID: {node.pid}
            {node.parentPid !== null && <span className="opacity-70"> · PPID: {node.parentPid}</span>}
          </div>
          {isLeaf && node.state !== 'Running' && (
            <div className={`text-[10px] font-mono mt-1 ${node.state === 'Waiting' ? 'text-blue-400' : 'text-destructive'}`}>
              {node.state}
            </div>
          )}

          <div className="absolute -top-1.5 -right-1.5">
            <div className={`w-3 h-3 rounded-full border border-background ${node.state === 'Running' && isLeaf ? 'bg-green-500' :
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
