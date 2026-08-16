import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutionBlock } from '@/types/scheduler';
import { IDLE } from '@/lib/algorithms/cpu';
import { spring, swift } from '@/lib/motion';
import { Clock } from 'lucide-react';

interface GanttChartProps {
  blocks: ExecutionBlock[];
  totalTime: number;
  /** playhead position in time units */
  currentTime: number;
  /** processes waiting in the ready queue at `currentTime` */
  readyQueue?: string[];
  running?: string | null;
}

const processColors = [
  'bg-process-1', 'bg-process-2', 'bg-process-3', 'bg-process-4',
  'bg-process-5', 'bg-process-6', 'bg-process-7', 'bg-process-8'
];

export const useProcessColors = (blocks: ExecutionBlock[]) =>
  useMemo(() => {
    const ids = Array.from(new Set(blocks.map(b => b.processId))).filter(id => id !== IDLE);
    return ids.reduce<Record<string, string>>((map, id, index) => {
      map[id] = processColors[index % processColors.length];
      return map;
    }, {});
  }, [blocks]);

export const GanttChart = ({
  blocks,
  totalTime,
  currentTime,
  readyQueue = [],
  running
}: GanttChartProps) => {
  const colorMap = useProcessColors(blocks);

  // Enough ticks to read, but not so many they collide.
  const tickStep = Math.max(1, Math.ceil(totalTime / 20));
  const ticks = useMemo(() => {
    const marks: number[] = [];
    for (let t = 0; t <= totalTime; t += tickStep) marks.push(t);
    if (marks[marks.length - 1] !== totalTime) marks.push(totalTime);
    return marks;
  }, [totalTime, tickStep]);

  if (!blocks.length) {
    return (
      <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Gantt chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Add processes and run the scheduler to see the timeline.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pct = (time: number) => (totalTime ? (time / totalTime) * 100 : 0);

  return (
    <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Gantt chart
        </CardTitle>
        <CardDescription>
          Each band is one continuous run on the CPU. The line sweeps as the simulation plays.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(colorMap).map(([id, color]) => (
            <div key={id} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded ${color}`} />
              <span className="text-sm font-medium">{id}</span>
            </div>
          ))}
          {blocks.some(b => b.processId === IDLE) && (
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded border border-dashed border-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">idle</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <div className="relative h-16 w-full rounded-lg border border-border/60 overflow-hidden bg-muted/20">
            {blocks.map((block, index) => {
              const isIdle = block.processId === IDLE;
              // How much of this block the playhead has passed.
              const filled = Math.max(
                0,
                Math.min(1, (currentTime - block.startTime) / (block.endTime - block.startTime))
              );

              return (
                <div
                  key={`${block.processId}-${block.startTime}-${index}`}
                  className="absolute top-0 h-full border-r border-background/40"
                  style={{
                    left: `${pct(block.startTime)}%`,
                    width: `${pct(block.endTime - block.startTime)}%`
                  }}
                >
                  <div
                    className={`absolute inset-0 ${isIdle
                      ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,hsl(var(--muted-foreground)/0.15)_5px,hsl(var(--muted-foreground)/0.15)_10px)]'
                      : `${colorMap[block.processId]} opacity-20`
                      }`}
                  />
                  {/* The played portion fills in solid. */}
                  <motion.div
                    className={`absolute inset-y-0 left-0 ${isIdle ? '' : colorMap[block.processId]}`}
                    animate={{ width: `${filled * 100}%` }}
                    transition={spring}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-luminosity">
                    {isIdle ? '' : block.processId}
                  </div>
                </div>
              );
            })}

            {/* Playhead */}
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-foreground z-10 pointer-events-none"
              animate={{ left: `${pct(currentTime)}%` }}
              transition={spring}
            >
              <div className="absolute -top-0.5 -left-[3px] w-2 h-2 rounded-full bg-foreground" />
            </motion.div>
          </div>

          {/* Time axis */}
          <div className="relative h-6 mt-1.5 w-full">
            {ticks.map(t => (
              <div
                key={t}
                className="absolute flex flex-col items-center text-[10px] text-muted-foreground"
                style={{ left: `${pct(t)}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-2 bg-border" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live CPU + ready queue */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start border-t border-border/60 pt-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
              On the CPU
            </div>
            <motion.div
              key={running ?? 'idle'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className={`w-16 h-10 rounded-lg flex items-center justify-center text-sm font-semibold ${running
                ? `${colorMap[running]} text-white`
                : 'border border-dashed border-muted-foreground/40 text-muted-foreground'
                }`}
            >
              {running ?? 'idle'}
            </motion.div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
              Ready queue
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {readyQueue.length === 0 && (
                <span className="text-sm text-muted-foreground self-center">empty</span>
              )}
              {readyQueue.map(id => (
                <motion.div
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={swift}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold text-white ${colorMap[id]} opacity-70`}
                >
                  {id}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
