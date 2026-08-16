import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NumberField } from '@/components/NumberField';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { virtualMemoryExplanations } from '@/lib/explanations';
import { spring } from '@/lib/motion';
import {
  allocateFrames,
  demandPagingEat,
  optimalDegree,
  simulateCopyOnWrite,
  thrashingCurve,
  workingSetSeries
} from '@/lib/algorithms/virtualmemory';
import { Layers3, TriangleAlert } from 'lucide-react';

const DemandPaging = () => {
  const [memoryTime, setMemoryTime] = useState(200);
  const [faultTime, setFaultTime] = useState(8000);
  const [faultPercent, setFaultPercent] = useState(0.1);

  const result = useMemo(
    () =>
      demandPagingEat({
        memoryAccessTime: memoryTime,
        pageFaultTime: faultTime,
        faultRate: faultPercent / 100
      }),
    [memoryTime, faultTime, faultPercent]
  );

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Effective access time</CardTitle>
          <CardDescription>
            A page fault is measured in milliseconds and a memory access in nanoseconds. That gap is
            why the fault rate has to be almost zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memoryTime">Memory access (ns)</Label>
              <NumberField id="memoryTime" min={1} max={1000} value={memoryTime} onChange={setMemoryTime} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faultTime">Page fault service (µs)</Label>
              <NumberField id="faultTime" min={1} max={20000} value={faultTime} onChange={setFaultTime} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faultRate">Fault rate: {faultPercent}%</Label>
              <input
                id="faultRate"
                type="range"
                min={0}
                max={5}
                step={0.01}
                value={faultPercent}
                onChange={e => setFaultPercent(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs text-muted-foreground">Effective access time</div>
              <motion.div
                key={result.effectiveAccessTime.toFixed(0)}
                initial={{ scale: 1.1, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
                className="text-3xl font-bold font-mono text-primary"
              >
                {result.effectiveAccessTime < 10000
                  ? `${result.effectiveAccessTime.toFixed(0)} ns`
                  : `${(result.effectiveAccessTime / 1000).toFixed(1)} µs`}
              </motion.div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Slowdown</div>
              <div
                className={`text-3xl font-bold font-mono ${result.slowdownFactor > 10 ? 'text-destructive' : ''
                  }`}
              >
                {result.slowdownFactor.toFixed(1)}×
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Max fault rate for &lt;10% slowdown</div>
              <div className="text-2xl font-bold font-mono">
                {(result.faultRateForTenPercent * 100).toExponential(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                1 fault per {Math.round(1 / result.faultRateForTenPercent).toLocaleString()} accesses
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground border-t border-border/60 pt-3">
            {result.narration}
          </p>
        </CardContent>
      </Card>

      <ConceptPanel
        title="demand paging"
        explanation={virtualMemoryExplanations['demand-paging']}
        narration={result.narration}
        activeLine={faultPercent > 0 ? 3 : 1}
      />
    </div>
  );
};

const CopyOnWrite = () => {
  const steps = useMemo(
    () =>
      simulateCopyOnWrite(4, [
        { process: 'Child', page: 1 },
        { process: 'Parent', page: 3 }
      ]),
    []
  );

  const player = useSimulationPlayer(steps, { baseInterval: 1400 });
  const { step, current } = player;
  const view = step ?? steps[0];

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">fork() with copy-on-write</CardTitle>
          <CardDescription>{view.narration}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <SimulationControls player={player} label={`Step ${current} / ${steps.length}`} />

          <div className="flex flex-wrap justify-center gap-4">
            {view.pages.map(page => (
              <motion.div
                key={page.id}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={spring}
                className={`w-28 rounded-lg border-2 p-3 text-center ${page.sharedBy.length > 1
                  ? 'border-primary/60 bg-primary/10'
                  : page.copiedFrom !== null
                    ? 'border-amber-500/60 bg-amber-500/10'
                    : 'border-border bg-card'
                  }`}
              >
                <div className="text-xs text-muted-foreground font-mono">
                  frame {page.id}
                </div>
                {page.copiedFrom !== null && (
                  <div className="text-[10px] text-amber-400">copy of {page.copiedFrom}</div>
                )}
                <div className="text-xs mt-1 font-medium">{page.sharedBy.join(' + ')}</div>
                {page.copyOnWrite && (
                  <Badge variant="outline" className="mt-1 text-[9px] px-1 py-0 border-primary/40">
                    read-only
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-xs text-muted-foreground">Frames in use</div>
            <motion.div
              key={view.framesUsed}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={spring}
              className="text-3xl font-bold font-mono"
            >
              {view.framesUsed}
            </motion.div>
            <div className="text-xs text-muted-foreground">
              A naive fork would have copied all 4 immediately.
            </div>
          </div>
        </CardContent>
      </Card>

      <ConceptPanel
        title="copy-on-write"
        explanation={virtualMemoryExplanations['copy-on-write']}
        narration={view.narration}
        activeLine={current > 2 ? 5 : 1}
      />
    </div>
  );
};

const Thrashing = () => {
  const [totalFrames, setTotalFrames] = useState(60);
  const [workingSetSize, setWorkingSetSize] = useState(10);
  const [windowSize, setWindowSize] = useState(5);

  const curve = useMemo(
    () => thrashingCurve(totalFrames, workingSetSize),
    [totalFrames, workingSetSize]
  );
  const peak = optimalDegree(curve);

  const references = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5, 6, 6, 6, 1, 2, 3];
  const series = useMemo(() => workingSetSeries(references, windowSize), [windowSize]);

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 32, left: 44 };
  const x = (degree: number) => pad.left + ((degree - 1) / (curve.length - 1)) * (width - pad.left - pad.right);
  const y = (value: number) => pad.top + (1 - value / 100) * (height - pad.top - pad.bottom);

  const path = curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.degree)} ${y(p.cpuUtilization)}`).join(' ');

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">CPU utilization vs degree of multiprogramming</CardTitle>
          <CardDescription>
            Adding processes helps &mdash; right up until each one falls below its working set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalFrames">Total frames</Label>
              <NumberField id="totalFrames" min={10} max={200} value={totalFrames} onChange={setTotalFrames} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wss">Working set size per process</Label>
              <NumberField id="wss" min={1} max={40} value={workingSetSize} onChange={setWorkingSetSize} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[480px]" role="img" aria-label="Thrashing curve">
              {[0, 25, 50, 75, 100].map(value => (
                <g key={value}>
                  <line
                    x1={pad.left}
                    y1={y(value)}
                    x2={width - pad.right}
                    y2={y(value)}
                    stroke="hsl(var(--border))"
                    strokeDasharray="2 4"
                  />
                  <text x={pad.left - 6} y={y(value) + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9 }}>
                    {value}%
                  </text>
                </g>
              ))}

              {/* Thrashing region */}
              {curve.some(p => p.thrashing) && (
                <rect
                  x={x(curve.find(p => p.thrashing)!.degree)}
                  y={pad.top}
                  width={width - pad.right - x(curve.find(p => p.thrashing)!.degree)}
                  height={height - pad.top - pad.bottom}
                  fill="hsl(var(--destructive))"
                  opacity={0.08}
                />
              )}

              <motion.path
                d={path}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6 }}
              />

              {curve.map(point => (
                <circle
                  key={point.degree}
                  cx={x(point.degree)}
                  cy={y(point.cpuUtilization)}
                  r={point.degree === peak.degree ? 5 : 2.5}
                  fill={point.thrashing ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                >
                  <title>
                    {point.degree} processes: {point.cpuUtilization.toFixed(0)}% CPU,{' '}
                    {point.framesPerProcess.toFixed(1)} frames each
                  </title>
                </circle>
              ))}

              <text
                x={x(peak.degree)}
                y={y(peak.cpuUtilization) - 10}
                textAnchor="middle"
                className="fill-primary"
                style={{ fontSize: 10 }}
              >
                peak
              </text>

              <text
                x={width / 2}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                degree of multiprogramming
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground">Best degree</div>
              <div className="text-2xl font-bold font-mono text-primary">{peak.degree}</div>
              <div className="text-[10px] text-muted-foreground">
                {peak.framesPerProcess.toFixed(1)} frames each
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Peak utilization</div>
              <div className="text-2xl font-bold font-mono">{peak.cpuUtilization.toFixed(0)}%</div>
            </div>
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <div className="text-xs text-muted-foreground">Thrashing begins at</div>
              <div className="text-2xl font-bold font-mono text-destructive">
                {curve.find(p => p.thrashing)?.degree ?? '—'}
              </div>
              <div className="text-[10px] text-muted-foreground">processes</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <span>
              The feedback loop is what makes this vicious: low CPU utilization looks like
              &ldquo;not enough processes&rdquo;, so the long-term scheduler admits more, each
              process gets fewer frames still, and utilization falls further.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Working set */}
      <Card className="border-border/60 shadow-md bg-background/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Working set model</CardTitle>
          <CardDescription>
            The pages touched in the last Δ references &mdash; the frame demand at that instant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="window">Window Δ = {windowSize} references</Label>
            <input
              id="window"
              type="range"
              min={2}
              max={10}
              value={windowSize}
              onChange={e => setWindowSize(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {series.map(point => (
                <div key={point.index} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {references[point.index]}
                  </div>
                  <motion.div
                    animate={{ height: point.size * 14 }}
                    transition={spring}
                    className={`w-7 rounded-t ${point.size >= windowSize ? 'bg-destructive/70' : 'bg-primary/70'
                      }`}
                    title={`WS = {${point.pages.join(', ')}} → ${point.size} frames`}
                  />
                  <div className="text-[10px] font-mono">{point.size}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Give a process fewer frames than its working set and it faults on almost every
            reference. Sum the working sets of every process: if that total exceeds physical
            memory, the system will thrash.
          </p>
        </CardContent>
      </Card>

      <ConceptPanel
        title="thrashing"
        explanation={virtualMemoryExplanations.thrashing}
        narration={`At ${peak.degree} processes the CPU peaks at ${peak.cpuUtilization.toFixed(0)}% with ${peak.framesPerProcess.toFixed(1)} frames each. Beyond that, frames per process fall below the working set of ${workingSetSize} and utilization collapses.`}
        activeLine={3}
      />
    </div>
  );
};

const FrameAllocation = () => {
  const [totalFrames, setTotalFrames] = useState(62);
  const processes = [
    { name: 'P1 (small)', size: 10 },
    { name: 'P2 (large)', size: 127 }
  ];

  const equal = allocateFrames(processes, totalFrames, 'equal');
  const proportional = allocateFrames(processes, totalFrames, 'proportional');

  return (
    <Card className="border-border/60 shadow-md bg-background/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Allocation of frames</CardTitle>
        <CardDescription>
          How the available frames are divided between processes of very different sizes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="frames">Frames available</Label>
          <NumberField id="frames" min={2} max={500} value={totalFrames} onChange={setTotalFrames} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Equal allocation', data: equal, note: 'Every process gets the same share, regardless of how much memory it actually needs.' },
            { title: 'Proportional allocation', data: proportional, note: 'Frames follow the ratio of virtual memory sizes, so a large process gets more.' }
          ].map(block => (
            <div key={block.title} className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="font-medium text-sm">{block.title}</div>
              {block.data.map(item => (
                <div key={item.process}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{item.process}</span>
                    <span className="font-mono">{item.frames} frames</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      animate={{ width: `${(item.frames / totalFrames) * 100}%` }}
                      transition={spring}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground leading-snug">{block.note}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground border-t border-border/60 pt-3">
          Equal allocation gives the 10-page process {equal[0].frames} frames it cannot use, while
          the 127-page process gets only {equal[1].frames}. Proportional allocation gives them{' '}
          {proportional[0].frames} and {proportional[1].frames} instead — but a process&rsquo;s size
          is not the same as its working set, which is why neither is ideal.
        </p>
      </CardContent>
    </Card>
  );
};

const VirtualMemory = () => (
  <div className="space-y-6 max-w-7xl mx-auto">
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Layers3 className="w-8 h-8 text-primary" />
          </div>
          Virtual Memory Management
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          Running programs larger than physical memory &mdash; and the price you pay when you push
          it too far.
        </p>
      </CardHeader>
    </Card>

    <Tabs defaultValue="demand" className="space-y-6">
      <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
        {[
          ['demand', 'Demand paging'],
          ['cow', 'Copy-on-write'],
          ['thrashing', 'Thrashing'],
          ['frames', 'Frame allocation']
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="py-2.5 text-sm font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="demand">
        <DemandPaging />
      </TabsContent>
      <TabsContent value="cow">
        <CopyOnWrite />
      </TabsContent>
      <TabsContent value="thrashing">
        <Thrashing />
      </TabsContent>
      <TabsContent value="frames">
        <FrameAllocation />
      </TabsContent>
    </Tabs>
  </div>
);

export default VirtualMemory;
