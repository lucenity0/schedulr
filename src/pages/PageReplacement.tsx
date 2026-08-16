import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Database, TriangleAlert } from 'lucide-react';
import { SimulationControls } from '@/components/SimulationControls';
import { NumberField } from '@/components/NumberField';
import { PageMatrix } from '@/components/PageMatrix';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { pagingExplanations } from '@/lib/explanations';
import { spring, swift } from '@/lib/motion';
import {
  PagingAlgorithm,
  detectBeladyAnomaly,
  parseReferenceString,
  simulatePaging
} from '@/lib/algorithms/paging';

const ALGORITHMS: { value: PagingAlgorithm; label: string }[] = [
  { value: 'FIFO', label: 'FIFO (First In First Out)' },
  { value: 'LRU', label: 'LRU (Least Recently Used)' },
  { value: 'LFU', label: 'LFU (Least Frequently Used)' },
  { value: 'Clock', label: 'Clock (Second Chance)' },
  { value: 'Optimal', label: "Optimal (Belady's)" }
];

/** Which pseudocode line the current step is executing. */
const activeLineFor = (algorithm: PagingAlgorithm, hit: boolean, wasEmpty: boolean) => {
  if (hit) return algorithm === 'Clock' ? 0 : 2;
  if (wasEmpty) return algorithm === 'Optimal' ? 1 : 3;
  return algorithm === 'Clock' ? 2 : 4;
};

const PageReplacement = () => {
  const [algorithm, setAlgorithm] = useState<PagingAlgorithm>('FIFO');
  const [frameCount, setFrameCount] = useState(3);
  // The box view shows memory as it is now; the table is the exam layout.
  const [view, setView] = useState<'frames' | 'table'>('frames');
  const [input, setInput] = useState('7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1');

  const pages = useMemo(() => parseReferenceString(input), [input]);

  const result = useMemo(
    () => simulatePaging(pages, frameCount, algorithm),
    [pages, frameCount, algorithm]
  );

  const player = useSimulationPlayer(result.steps, { baseInterval: 850 });
  const { step, current, history } = player;

  const faults = history.filter(s => !s.hit).length;
  const hits = current - faults;

  // Compare against Optimal so the fault count has something to mean.
  const optimalFaults = useMemo(
    () => (algorithm === 'Optimal' ? null : simulatePaging(pages, frameCount, 'Optimal').faults),
    [pages, frameCount, algorithm]
  );

  const belady = useMemo(() => detectBeladyAnomaly(pages, algorithm), [pages, algorithm]);

  const frames = step
    ? step.frames
    : Array.from({ length: frameCount }, () => ({
      page: null,
      loadedAt: -1,
      lastUsed: -1,
      frequency: 0,
      referenceBit: false
    }));

  const previousFrames = current > 1 ? result.steps[current - 2].frames : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Database className="w-8 h-8 text-primary" />
            </div>
            Page Replacement Algorithms
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Watch pages move in and out of physical memory, one reference at a time, and see exactly
            which page each algorithm decides to throw away.
          </p>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Change anything here and the simulation is rebuilt immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select value={algorithm} onValueChange={value => setAlgorithm(value as PagingAlgorithm)}>
                <SelectTrigger id="algorithm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHMS.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frames">Number of frames</Label>
              <NumberField
                id="frames"
                min={1}
                max={8}
                value={frameCount}
                onChange={setFrameCount}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sequence">Page reference string</Label>
              <Input
                id="sequence"
                placeholder="7,0,1,2,0,3"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            </div>
          </div>

          <SimulationControls
            player={player}
            label={`Reference ${current} / ${result.steps.length}`}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memory */}
        <Card className="lg:col-span-2 border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Physical memory</CardTitle>
                <CardDescription>
                  {step
                    ? `Reference ${step.index + 1} of ${result.steps.length}: page ${step.page}`
                    : 'Nothing referenced yet - every frame is empty.'}
                </CardDescription>
              </div>

              {/* Two ways to read the same run: memory now, or the whole
                  worked table the way it is solved on paper. */}
              <Tabs value={view} onValueChange={value => setView(value as 'frames' | 'table')}>
                <TabsList className="h-9">
                  <TabsTrigger value="frames" className="text-xs px-3">
                    Frames
                  </TabsTrigger>
                  <TabsTrigger value="table" className="text-xs px-3">
                    Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {view === 'table' ? (
              <PageMatrix
                steps={result.steps}
                frameCount={frameCount}
                current={current}
                onSeek={player.seek}
              />
            ) : (
              <>
            {/* The frames themselves */}
            <div className="flex flex-wrap justify-center gap-4">
              {frames.map((frame, index) => {
                const isTarget = step && step.frameIndex === index;
                const justLoaded = isTarget && !step!.hit;
                const justHit = isTarget && step!.hit;
                const evictedHere =
                  justLoaded && previousFrames ? previousFrames[index].page : null;

                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">Frame {index}</span>
                    <motion.div
                      animate={
                        justHit
                          ? { scale: [1, 1.08, 1], borderColor: 'hsl(142 76% 45%)' }
                          : justLoaded
                            ? { scale: [1, 1.08, 1], borderColor: 'hsl(0 84% 60%)' }
                            : { scale: 1 }
                      }
                      transition={spring}
                      className={`relative w-20 h-20 rounded-xl border-2 flex items-center justify-center overflow-hidden ${frame.page === null
                        ? 'border-dashed border-muted-foreground/30 bg-muted/20'
                        : 'border-border bg-card'
                        }`}
                    >
                      <AnimatePresence mode="popLayout">
                        {frame.page !== null && (
                          <motion.span
                            key={`${index}-${frame.page}-${frame.loadedAt}`}
                            initial={{ y: -44, opacity: 0, scale: 0.6 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 44, opacity: 0, scale: 0.6 }}
                            transition={spring}
                            className="text-2xl font-bold font-mono"
                          >
                            {frame.page}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* The page that was thrown out of this frame */}
                      <AnimatePresence>
                        {evictedHere !== null && (
                          <motion.span
                            key={`evicted-${step!.index}-${evictedHere}`}
                            initial={{ y: 0, opacity: 0.9, scale: 1 }}
                            animate={{ y: 52, opacity: 0, scale: 0.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute text-xl font-bold font-mono text-destructive"
                          >
                            {evictedHere}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Clock hand */}
                      {algorithm === 'Clock' && step?.hand === index && (
                        <motion.div
                          layoutId="clock-hand"
                          transition={spring}
                          className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary"
                        />
                      )}
                    </motion.div>

                    {/* Per-frame bookkeeping - the thing the algorithm actually reads */}
                    <span className="text-[10px] font-mono text-muted-foreground h-4">
                      {frame.page === null
                        ? '—'
                        : algorithm === 'FIFO'
                          ? `in @${frame.loadedAt}`
                          : algorithm === 'LRU'
                            ? `used @${frame.lastUsed}`
                            : algorithm === 'LFU'
                              ? `count ${frame.frequency}`
                              : algorithm === 'Clock'
                                ? `ref ${frame.referenceBit ? 1 : 0}`
                                : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Reference string timeline */}
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Reference string
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.steps.map((s, index) => {
                  const done = index < current;
                  const isCurrent = index === current - 1;
                  return (
                    <motion.button
                      key={index}
                      onClick={() => player.seek(index + 1)}
                      animate={{
                        scale: isCurrent ? 1.15 : 1,
                        opacity: done ? 1 : 0.35
                      }}
                      transition={swift}
                      className={`w-9 h-9 rounded-md border text-sm font-mono flex items-center justify-center ${done
                        ? s.hit
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-destructive/20 border-destructive text-destructive'
                        : 'border-border bg-muted/30'
                        }`}
                      title={`Reference ${index + 1}: page ${s.page} - ${s.hit ? 'hit' : 'fault'}`}
                    >
                      {s.page}
                    </motion.button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-500/30 border border-green-500" /> hit
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-destructive/30 border border-destructive" /> fault
                </span>
              </div>
            </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Page faults" value={faults} tone="bad" />
              <Stat label="Page hits" value={hits} tone="good" />
              <Stat
                label="Fault rate"
                value={current ? `${((faults / current) * 100).toFixed(1)}%` : '—'}
              />
              <Stat label="Frames" value={frameCount} />
            </div>

            {player.isComplete && optimalFaults !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
              >
                <span className="font-medium">{algorithm}</span> took{' '}
                <span className="font-mono text-destructive">{result.faults}</span> faults.
                Optimal needs{' '}
                <span className="font-mono text-primary">{optimalFaults}</span> on the same input —{' '}
                {result.faults === optimalFaults
                  ? 'it matched the theoretical best here.'
                  : `${result.faults - optimalFaults} more than any algorithm could possibly avoid.`}
              </motion.div>
            )}

            {belady.anomaly && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <TriangleAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium">Belady&rsquo;s anomaly.</span> With this reference
                  string, {algorithm} faults{' '}
                  <span className="font-mono">{belady.faults![0]}</span> times using{' '}
                  {belady.frames![0]} frames but{' '}
                  <span className="font-mono">{belady.faults![1]}</span> times using{' '}
                  {belady.frames![1]} — more memory, worse performance. Try it.
                </span>
              </div>
            )}

            {step && (
              <div className="space-y-2 border-t border-border/60 pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested</span>
                  <Badge variant="outline" className="font-mono">
                    page {step.page}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Result</span>
                  <Badge variant={step.hit ? 'default' : 'destructive'}>
                    {step.hit ? 'Hit' : 'Fault'}
                  </Badge>
                </div>
                {step.evicted !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Evicted</span>
                    <Badge variant="secondary" className="font-mono">
                      page {step.evicted}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConceptPanel
        title={algorithm}
        explanation={pagingExplanations[algorithm]}
        narration={step?.narration}
        activeLine={
          step
            ? activeLineFor(algorithm, step.hit, step.evicted === null && !step.hit)
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
  tone?: 'good' | 'bad';
}) => (
  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div
      className={`text-2xl font-bold font-mono ${tone === 'good' ? 'text-green-500' : tone === 'bad' ? 'text-destructive' : ''
        }`}
    >
      {value}
    </div>
  </div>
);

export default PageReplacement;
