import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Player, SPEEDS } from '@/hooks/useSimulationPlayer';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

interface SimulationControlsProps<T> {
  player: Player<T>;
  /** shown above the scrubber, e.g. "Step 4 of 12" */
  label?: string;
  className?: string;
}

/**
 * One control bar for every module. Playback, stepping and scrubbing behave
 * identically everywhere, so learning the controls once is enough.
 */
export const SimulationControls = <T,>({
  player,
  label,
  className = ''
}: SimulationControlsProps<T>) => {
  const { current, steps, isPlaying, hasSteps, speed } = player;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={player.toggle}
          disabled={!hasSteps}
          size="sm"
          className="min-w-[92px]"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4 mr-2" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" /> Play
            </>
          )}
        </Button>

        <Button
          onClick={player.previous}
          disabled={!hasSteps || current === 0}
          size="sm"
          variant="outline"
          aria-label="Previous step"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          onClick={player.next}
          disabled={!hasSteps || player.isComplete}
          size="sm"
          variant="outline"
          aria-label="Next step"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          onClick={player.skipToEnd}
          disabled={!hasSteps || player.isComplete}
          size="sm"
          variant="outline"
        >
          <SkipForward className="h-4 w-4 mr-2" /> Skip to result
        </Button>

        <Button onClick={player.reset} disabled={!hasSteps || current === 0} size="sm" variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" /> Restart
        </Button>

        <div className="flex items-center gap-1 ml-auto">
          {SPEEDS.map(value => (
            <Button
              key={value}
              onClick={() => player.setSpeed(value)}
              size="sm"
              variant={speed === value ? 'default' : 'ghost'}
              className="px-2 h-8 text-xs font-mono"
              aria-pressed={speed === value}
            >
              {value}x
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono shrink-0">
          {label ?? `Step ${current} / ${steps.length}`}
        </Badge>
        <Slider
          value={[current]}
          min={0}
          max={Math.max(steps.length, 1)}
          step={1}
          onValueChange={([value]) => player.seek(value)}
          disabled={!hasSteps}
          aria-label="Scrub through the simulation"
          className="flex-1"
        />
      </div>
    </div>
  );
};
