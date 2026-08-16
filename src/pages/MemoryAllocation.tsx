import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { memoryExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  Block,
  FitStrategy,
  MemoryRequest,
  compareFits,
  simulateMemory
} from '@/lib/algorithms/memory';
import { Boxes } from 'lucide-react';

const STRATEGIES: FitStrategy[] = ['First Fit', 'Best Fit', 'Worst Fit', 'Next Fit'];

const TOTAL = 1700;

const INITIAL_HOLES: Block[] = [
  { id: 0, start: 0, size: 100, processId: null },
  { id: 1, start: 100, size: 500, processId: null },
  { id: 2, start: 600, size: 200, processId: null },
  { id: 3, start: 800, size: 300, processId: null },
  { id: 4, start: 1100, size: 600, processId: null }
];

const PROCESS_COLORS = [
  'bg-process-1', 'bg-process-2', 'bg-process-3', 'bg-process-4',
  'bg-process-5', 'bg-process-6', 'bg-process-7', 'bg-process-8'
];

const parseRequests = (input: string): MemoryRequest[] =>
  input
    .split(',')
    .map(token => token.trim())
    .filter(Boolean)
    .map((token, index): MemoryRequest | null => {
      // "free P1" releases; "212" or "P1:212" allocates.
      const freeMatch = token.match(/^free\s+(\S+)$/i);
      if (freeMatch) return { processId: freeMatch[1], size: 0, action: 'free' };

      const named = token.match(/^(\S+)\s*:\s*(\d+)$/);
      if (named) return { processId: named[1], size: parseInt(named[2], 10) };

      const size = parseInt(token, 10);
      return Number.isFinite(size) ? { processId: `P${index + 1}`, size } : null;
    })
    .filter((r): r is MemoryRequest => r !== null && (r.action === 'free' || r.size > 0));

const MemoryAllocation = () => {
  const [strategy, setStrategy] = useState<FitStrategy>('First Fit');
  const [input, setInput] = useState('P1:212, P2:417, P3:112, P4:426');

  const requests = useMemo(() => parseRequests(input), [input]);
  const result = useMemo(
    () => simulateMemory(TOTAL, requests, strategy, INITIAL_HOLES),
    [requests, strategy]
  );
  const comparison = useMemo(() => compareFits(TOTAL, requests, INITIAL_HOLES), [requests]);

  const player = useSimulationPlayer(result.steps, { baseInterval: 1100 });
  const { step, current } = player;

  const blocks = step ? step.blocks : INITIAL_HOLES;

  const colorFor = (processId: string) => {
    const index = requests.findIndex(r => r.processId === processId);
    return PROCESS_COLORS[(index < 0 ? 0 : index) % PROCESS_COLORS.length];
  };

  const freeTotal = blocks.filter(b => b.processId === null).reduce((s, b) => s + b.size, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Boxes className="w-8 h-8 text-primary" />
            </div>
            Memory Allocation
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Four strategies for choosing which free hole a process goes into — and the
            fragmentation each one leaves behind.
          </p>
        </CardHeader>
      </Card>

      <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Memory is {TOTAL} units with holes of 100, 500, 200, 300 and 600 — the standard
            textbook layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={strategy} onValueChange={value => setStrategy(value as FitStrategy)}>
                <SelectTrigger id="strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map(item => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="requests">Requests</Label>
              <Input
                id="requests"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="P1:212, P2:417, free P1, P3:112"
              />
              <p className="text-xs text-muted-foreground">
                <code className="font-mono">name:size</code> to allocate,{' '}
                <code className="font-mono">free name</code> to release.
              </p>
            </div>
          </div>

          <SimulationControls player={player} label={`Request ${current} / ${result.steps.length}`} />
        </CardContent>
      </Card>

      <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle>Physical memory</CardTitle>
          <CardDescription>
            Width is proportional to size. Hatched regions are free holes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative h-24 w-full rounded-lg border border-border/60 overflow-hidden bg-muted/10 flex">
            {blocks.map(block => {
              const isTarget =
                step?.success && step.request.processId === block.processId && !step.request.action;
              return (
                <motion.div
                  key={`${block.start}-${block.processId ?? 'free'}`}
                  layout
                  transition={spring}
                  style={{ width: `${(block.size / TOTAL) * 100}%` }}
                  className="relative h-full border-r border-background/50 last:border-r-0"
                >
                  <motion.div
                    animate={isTarget ? { scale: [1, 1.03, 1] } : {}}
                    transition={spring}
                    className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden ${block.processId
                      ? `${colorFor(block.processId)} bg-opacity-80`
                      : 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--muted-foreground)/0.15)_6px,hsl(var(--muted-foreground)/0.15)_12px)]'
                      }`}
                  >
                    <span
                      className={`text-xs font-semibold truncate px-1 ${block.processId ? 'text-white' : 'text-muted-foreground'
                        }`}
                    >
                      {block.processId ?? 'free'}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${block.processId ? 'text-white/80' : 'text-muted-foreground'
                        }`}
                    >
                      {block.size}
                    </span>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Address ruler */}
          <div className="relative h-5 -mt-3">
            {[0, 0.25, 0.5, 0.75, 1].map(fraction => (
              <span
                key={fraction}
                className="absolute text-[10px] text-muted-foreground font-mono"
                style={{ left: `${fraction * 100}%`, transform: 'translateX(-50%)' }}
              >
                {Math.round(fraction * TOTAL)}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Free memory" value={freeTotal} />
            <Stat label="Largest hole" value={step?.largestFreeHole ?? Math.max(...INITIAL_HOLES.map(h => h.size))} />
            <Stat label="Allocated" value={result.steps.slice(0, current).filter(s => s.success && !s.request.action).length} />
            <Stat label="Failed" value={result.steps.slice(0, current).filter(s => !s.success).length} tone="bad" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All strategies, same requests</CardTitle>
            <CardDescription>
              How many of the {requests.filter(r => r.action !== 'free').length} requests each one
              manages to place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {comparison.map(item => {
              const total = item.allocated + item.failed;
              return (
                <button
                  key={item.strategy}
                  onClick={() => setStrategy(item.strategy)}
                  className="w-full text-left"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className={item.strategy === strategy ? 'text-primary font-medium' : ''}>
                      {item.strategy}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.allocated} placed
                      {item.failed > 0 && `, ${item.failed} failed`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden flex">
                    <motion.div
                      animate={{ width: `${total ? (item.allocated / total) * 100 : 0}%` }}
                      transition={spring}
                      className={item.strategy === strategy ? 'bg-primary' : 'bg-muted-foreground/40'}
                    />
                    <motion.div
                      animate={{ width: `${total ? (item.failed / total) * 100 : 0}%` }}
                      transition={spring}
                      className="bg-destructive/60"
                    />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Request log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {result.steps.map((s, index) => (
                <button
                  key={index}
                  onClick={() => player.seek(index + 1)}
                  className={`w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${index === current - 1 ? 'bg-primary/15' : 'hover:bg-muted/40'
                    } ${index >= current ? 'opacity-40' : ''}`}
                >
                  <Badge
                    variant={s.success ? 'outline' : 'destructive'}
                    className="font-mono text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {s.request.action === 'free' ? 'free' : s.request.size}
                  </Badge>
                  <span className="font-medium shrink-0">{s.request.processId}</span>
                  <span className="text-muted-foreground truncate">{s.narration}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ConceptPanel
        title={strategy}
        explanation={memoryExplanations[strategy]}
        narration={step?.narration}
        activeLine={step ? (step.success ? 2 : 1) : undefined}
        alert={
          step && !step.success && step.externalFragmentation > 0
            ? `External fragmentation: ${step.externalFragmentation} units are free but split across holes too small to use. Compaction would fix this by sliding the allocated blocks together.`
            : undefined
        }
      />
    </div>
  );
};

const Stat = ({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone?: 'bad';
}) => (
  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-xl font-bold font-mono ${tone === 'bad' ? 'text-destructive' : ''}`}>
      {value}
    </div>
  </div>
);

export default MemoryAllocation;
