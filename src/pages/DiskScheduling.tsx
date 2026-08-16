import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { HardDrive } from 'lucide-react';
import { SimulationControls } from '@/components/SimulationControls';
import { ConceptPanel } from '@/components/ConceptPanel';
import { useSimulationPlayer } from '@/hooks/useSimulationPlayer';
import { diskExplanations } from '@/lib/explanations';
import { spring, swift } from '@/lib/motion';
import {
  DiskAlgorithm,
  Direction,
  compareDisk,
  parseRequests,
  simulateDisk
} from '@/lib/algorithms/disk';

const ALGORITHMS: { value: DiskAlgorithm; label: string }[] = [
  { value: 'FCFS', label: 'FCFS (First Come First Served)' },
  { value: 'SSTF', label: 'SSTF (Shortest Seek Time First)' },
  { value: 'SCAN', label: 'SCAN (Elevator)' },
  { value: 'LOOK', label: 'LOOK' },
  { value: 'C-SCAN', label: 'C-SCAN (Circular SCAN)' },
  { value: 'C-LOOK', label: 'C-LOOK' }
];

// Chart geometry.
const WIDTH = 760;
const HEIGHT = 340;
const PAD = { top: 28, right: 24, bottom: 28, left: 48 };

const DiskScheduling = () => {
  const [algorithm, setAlgorithm] = useState<DiskAlgorithm>('SCAN');
  const [head, setHead] = useState(53);
  const [diskSize, setDiskSize] = useState(200);
  const [direction, setDirection] = useState<Direction>('right');
  const [input, setInput] = useState('98,183,37,122,14,124,65,67');

  const requests = useMemo(() => parseRequests(input, diskSize), [input, diskSize]);

  const options = useMemo(
    () => ({ head, requests, diskSize, direction }),
    [head, requests, diskSize, direction]
  );

  const result = useMemo(() => simulateDisk(algorithm, options), [algorithm, options]);
  const comparison = useMemo(() => compareDisk(options), [options]);

  const player = useSimulationPlayer(result.moves, { baseInterval: 900 });
  const { step, current, history } = player;

  const headPosition = step ? step.to : head;
  const seekSoFar = step ? step.totalSoFar : 0;

  // Map a track number onto the x axis; service order onto the y axis.
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (track: number) => PAD.left + (track / (diskSize - 1)) * plotWidth;
  const y = (index: number) =>
    PAD.top + (result.moves.length ? (index / result.moves.length) * plotHeight : 0);

  const points = [{ track: head, index: 0 }, ...result.moves.map((m, i) => ({ track: m.to, index: i + 1 }))];
  const visiblePoints = points.slice(0, current + 1);

  const pathFor = (list: typeof points) =>
    list.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.track)} ${y(p.index)}`).join(' ');

  const best = comparison.reduce((a, b) => (a.totalSeek <= b.totalSeek ? a : b));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
            <div className="p-2 bg-primary/20 rounded-lg">
              <HardDrive className="w-8 h-8 text-primary" />
            </div>
            Disk Scheduling
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Every track the head crosses costs time. Watch the arm move and see how much distance
            each algorithm saves.
          </p>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
        <CardHeader className="pb-4">
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select value={algorithm} onValueChange={value => setAlgorithm(value as DiskAlgorithm)}>
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
              <Label htmlFor="head">Initial head</Label>
              <Input
                id="head"
                type="number"
                min={0}
                max={diskSize - 1}
                value={head}
                onChange={e => setHead(Math.max(0, Math.min(diskSize - 1, parseInt(e.target.value) || 0)))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Disk size (tracks)</Label>
              <Input
                id="size"
                type="number"
                min={10}
                max={1000}
                value={diskSize}
                onChange={e => setDiskSize(Math.max(10, parseInt(e.target.value) || 200))}
              />
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={direction === 'left' ? 'default' : 'outline'}
                  onClick={() => setDirection('left')}
                  className="flex-1"
                >
                  ← Down
                </Button>
                <Button
                  size="sm"
                  variant={direction === 'right' ? 'default' : 'outline'}
                  onClick={() => setDirection('right')}
                  className="flex-1"
                >
                  Up →
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requests">Request queue</Label>
            <Input
              id="requests"
              placeholder="98,183,37,122"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
          </div>

          <SimulationControls player={player} label={`Seek ${current} / ${result.moves.length}`} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Head movement chart */}
        <Card className="lg:col-span-2 border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle>Head movement</CardTitle>
            <CardDescription>
              Track number across the top, service order down the side. A steeper line means a
              longer seek.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full min-w-[560px]"
                role="img"
                aria-label="Disk head movement chart"
              >
                {/* Track axis */}
                {Array.from({ length: 5 }, (_, i) => Math.round((i * (diskSize - 1)) / 4)).map(track => (
                  <g key={track}>
                    <line
                      x1={x(track)}
                      y1={PAD.top - 8}
                      x2={x(track)}
                      y2={HEIGHT - PAD.bottom}
                      stroke="hsl(var(--border))"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={x(track)}
                      y={PAD.top - 14}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      style={{ fontSize: 11 }}
                    >
                      {track}
                    </text>
                  </g>
                ))}

                {/* Pending requests sit on the top rule */}
                {requests.map(track => {
                  const done = history.some(m => m.serviced && m.to === track);
                  return (
                    <motion.circle
                      key={`req-${track}`}
                      cx={x(track)}
                      cy={PAD.top - 2}
                      r={4}
                      animate={{
                        fill: done ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        opacity: done ? 1 : 0.45
                      }}
                      transition={swift}
                    />
                  );
                })}

                {/* The path travelled so far */}
                <motion.path
                  d={pathFor(visiblePoints)}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{ opacity: 1 }}
                />

                {/* The route still to come, faint */}
                <path
                  d={pathFor(points)}
                  fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  opacity={0.25}
                />

                {/* Stops */}
                {visiblePoints.map((point, index) => {
                  const move = index > 0 ? result.moves[index - 1] : null;
                  return (
                    <g key={`${point.track}-${index}`}>
                      <circle
                        cx={x(point.track)}
                        cy={y(point.index)}
                        r={index === visiblePoints.length - 1 ? 6 : 4}
                        fill={
                          move && move.wrap
                            ? 'hsl(var(--muted-foreground))'
                            : move && !move.serviced
                              ? 'hsl(var(--muted-foreground))'
                              : 'hsl(var(--primary))'
                        }
                      />
                      <text
                        x={x(point.track)}
                        y={y(point.index) - 10}
                        textAnchor="middle"
                        className="fill-foreground"
                        style={{ fontSize: 10, fontFamily: 'monospace' }}
                      >
                        {point.track}
                      </text>
                    </g>
                  );
                })}

                {/* The head itself */}
                <motion.g
                  animate={{ x: x(headPosition), y: y(current) }}
                  transition={spring}
                  initial={false}
                >
                  <circle r={9} fill="hsl(var(--primary))" opacity={0.25} />
                  <circle r={4.5} fill="hsl(var(--primary))" />
                </motion.g>
              </svg>
            </div>

            {/* Service sequence */}
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              {result.sequence.map((track, index) => (
                <motion.span
                  key={index}
                  animate={{ opacity: index <= current ? 1 : 0.3, scale: index === current ? 1.1 : 1 }}
                  transition={swift}
                  className={`px-2 py-1 rounded-md border text-xs font-mono ${index === 0
                    ? 'border-primary/60 bg-primary/10'
                    : index <= current
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-muted/20'
                    }`}
                >
                  {track}
                </motion.span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Numbers */}
        <div className="space-y-6">
          <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle>Seek time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Total head movement so far</div>
                <motion.div
                  key={seekSoFar}
                  initial={{ scale: 1.15, color: 'hsl(var(--primary))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  transition={spring}
                  className="text-4xl font-bold font-mono"
                >
                  {seekSoFar}
                </motion.div>
                <div className="text-xs text-muted-foreground">
                  of {result.totalSeek} tracks total
                </div>
              </div>

              {result.wrapSeek > 0 && (
                <div className="text-xs text-muted-foreground border-t border-border/60 pt-3">
                  Includes <span className="font-mono text-foreground">{result.wrapSeek}</span>{' '}
                  tracks of circular jump. Some textbooks exclude this — without it the total is{' '}
                  <span className="font-mono text-foreground">
                    {result.totalSeek - result.wrapSeek}
                  </span>
                  .
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Requests</div>
                  <div className="text-xl font-bold font-mono">{requests.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Avg per request</div>
                  <div className="text-xl font-bold font-mono">
                    {result.averageSeek.toFixed(1)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All algorithms, same input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...comparison]
                .sort((a, b) => a.totalSeek - b.totalSeek)
                .map(item => {
                  const isCurrent = item.algorithm === algorithm;
                  // Guard the empty-queue case, where every total is 0.
                  const worst = Math.max(...comparison.map(c => c.totalSeek), 1);
                  const width = (item.totalSeek / worst) * 100;
                  return (
                    <button
                      key={item.algorithm}
                      onClick={() => setAlgorithm(item.algorithm)}
                      className="w-full text-left group"
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className={isCurrent ? 'text-primary font-medium' : ''}>
                          {item.algorithm}
                          {item.algorithm === best.algorithm && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 border-primary/40 text-primary">
                              best
                            </Badge>
                          )}
                        </span>
                        <span className="font-mono text-muted-foreground">{item.totalSeek}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div
                          animate={{ width: `${width}%` }}
                          transition={spring}
                          className={`h-full rounded-full ${isCurrent ? 'bg-primary' : 'bg-muted-foreground/40 group-hover:bg-muted-foreground/60'
                            }`}
                        />
                      </div>
                    </button>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConceptPanel
        title={algorithm}
        explanation={diskExplanations[algorithm]}
        narration={step?.narration}
        activeLine={step ? (step.wrap ? 2 : step.serviced ? 1 : 2) : undefined}
      />
    </div>
  );
};

export default DiskScheduling;
