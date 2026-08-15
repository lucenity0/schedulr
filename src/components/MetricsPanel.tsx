import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProcessMetrics } from '@/types/scheduler';
import { fadeUp, stagger } from '@/lib/motion';
import { BarChart3 } from 'lucide-react';

interface MetricsPanelProps {
  processMetrics: ProcessMetrics[];
  averageWaitingTime: number;
  averageTurnaroundTime: number;
  averageResponseTime?: number;
  cpuUtilization?: number;
  throughput?: number;
}

const Metric = ({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <motion.div
    variants={fadeUp}
    className="p-3 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent"
  >
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold text-primary font-mono">{value}</p>
    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
  </motion.div>
);

export const MetricsPanel = ({
  processMetrics,
  averageWaitingTime,
  averageTurnaroundTime,
  averageResponseTime,
  cpuUtilization,
  throughput
}: MetricsPanelProps) => {
  if (processMetrics.length === 0) {
    return (
      <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Performance metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Run the scheduler to see performance metrics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Performance metrics
        </CardTitle>
        <CardDescription>
          Waiting time is what the scheduler controls; turnaround is what the user feels.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <Metric
            label="Avg waiting"
            value={averageWaitingTime.toFixed(2)}
            hint="Time in the ready queue, not running"
          />
          <Metric
            label="Avg turnaround"
            value={averageTurnaroundTime.toFixed(2)}
            hint="Arrival to completion"
          />
          {averageResponseTime !== undefined && (
            <Metric
              label="Avg response"
              value={averageResponseTime.toFixed(2)}
              hint="Arrival to first run - what interactivity feels like"
            />
          )}
          {cpuUtilization !== undefined && (
            <Metric
              label="CPU utilization"
              value={`${cpuUtilization.toFixed(0)}%`}
              hint="Share of the timeline actually doing work"
            />
          )}
          {throughput !== undefined && (
            <Metric
              label="Throughput"
              value={throughput.toFixed(3)}
              hint="Processes completed per time unit"
            />
          )}
        </motion.div>

        <div className="rounded-lg border border-border/60 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="font-semibold">Process</TableHead>
                <TableHead className="font-semibold">Arrival</TableHead>
                <TableHead className="font-semibold">Burst</TableHead>
                <TableHead className="font-semibold">Completion</TableHead>
                <TableHead className="font-semibold">Turnaround</TableHead>
                <TableHead className="font-semibold">Waiting</TableHead>
                <TableHead className="font-semibold">Response</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processMetrics.map((process, index) => (
                <motion.tr
                  key={process.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border/40 hover:bg-muted/10"
                >
                  <TableCell className="font-medium">{process.id}</TableCell>
                  <TableCell className="font-mono">{process.arrivalTime}</TableCell>
                  <TableCell className="font-mono">{process.burstTime}</TableCell>
                  <TableCell className="font-mono">{process.completionTime}</TableCell>
                  <TableCell className="font-mono font-semibold">{process.turnaroundTime}</TableCell>
                  <TableCell className="font-mono font-semibold text-primary">
                    {process.waitingTime}
                  </TableCell>
                  <TableCell className="font-mono">{process.responseTime ?? '—'}</TableCell>
                  <TableCell className="font-mono">{process.priority ?? '—'}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Turnaround = completion − arrival. Waiting = turnaround − burst. Response = first run −
          arrival, which is why round robin can have poor turnaround but excellent response.
        </p>
      </CardContent>
    </Card>
  );
};
