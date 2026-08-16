import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NumberField } from './NumberField';
import { Process } from '@/types/scheduler';

interface ProcessFormProps {
  processes: Process[];
  onProcessesChange: (processes: Process[]) => void;
  needsPriority: boolean;
}

export const ProcessForm = ({ processes, onProcessesChange, needsPriority }: ProcessFormProps) => {
  const [nextId, setNextId] = useState(1);

  const addProcess = () => {
    const usedNumbers = processes
      .map((p) => parseInt(p.id.replace('P', '')))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    let newId = 1;
    for (let i = 0; i < usedNumbers.length; i++) {
      if (usedNumbers[i] !== i + 1) {
        newId = i + 1;
        break;
      }
      newId = usedNumbers.length + 1;
    }

    const newProcess: Process = {
      id: `P${newId}`,
      arrivalTime: 0,
      burstTime: 1,
      priority: needsPriority ? 1 : undefined,
    };

    onProcessesChange([...processes, newProcess]);
  };


  const removeProcess = (index: number) => {
    const updatedProcesses = processes.filter((_, i) => i !== index);
    onProcessesChange(updatedProcesses);
  };

  const updateProcess = (index: number, field: keyof Process, value: string | number) => {
    const updatedProcesses = processes.map((process, i) => {
      if (i === index) {
        return { ...process, [field]: value };
      }
      return process;
    });
    onProcessesChange(updatedProcesses);
  };

  return (
    <Card className="border border-border/60 shadow-md bg-background/90 backdrop-blur-md bg-gradient-to-br from-card to-muted/20 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          Process Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {processes.map((process, index) => (
          <div
            key={index}
            className={`grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/10 rounded-lg border border-primary/10 items-end ${needsPriority ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
              }`}
          >
            <div>
              <Label htmlFor={`id-${index}`} className="text-xs sm:text-sm">Process ID</Label>
              <Input
                id={`id-${index}`}
                value={process.id}
                onChange={(e) => updateProcess(index, 'id', e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div>
              <Label htmlFor={`arrival-${index}`} className="text-xs sm:text-sm">Arrival</Label>
              <NumberField
                id={`arrival-${index}`}
                min={0}
                value={process.arrivalTime}
                onChange={(value) => updateProcess(index, 'arrivalTime', value)}
                className="bg-background/50"
              />
            </div>
            <div>
              <Label htmlFor={`burst-${index}`} className="text-xs sm:text-sm">Burst</Label>
              <NumberField
                id={`burst-${index}`}
                min={1}
                value={process.burstTime}
                onChange={(value) => updateProcess(index, 'burstTime', value)}
                className="bg-background/50"
              />
            </div>
            {needsPriority && (
              <div>
                <Label htmlFor={`priority-${index}`} className="text-xs sm:text-sm">Priority</Label>
                <NumberField
                  id={`priority-${index}`}
                  min={1}
                  value={process.priority ?? 1}
                  onChange={(value) => updateProcess(index, 'priority', value)}
                  className="bg-background/50"
                />
              </div>
            )}
            <div className={`flex flex-col ${needsPriority ? 'col-span-2 lg:col-span-1' : ''}`}>
              <Label className="mb-1 text-xs sm:text-sm">Remove</Label>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeProcess(index)}
                aria-label={`Remove ${process.id}`}
                className="w-full h-10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button onClick={addProcess} className="w-full bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Process
        </Button>
      </CardContent>
    </Card>
  );
};