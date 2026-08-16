import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EventLogProps {
  entries: string[];
  title?: string;
  className?: string;
}

export const EventLog = ({ entries, title = 'Event log', className = '' }: EventLogProps) => {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the newest entry visible without yanking the page around.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries]);

  return (
    <Card className={`border-border/60 shadow-md bg-background/90 ${className}`}>
      <CardHeader className="py-3 border-b border-border/60 bg-muted/20">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={scroller} className="max-h-48 overflow-y-auto p-3 space-y-1 font-mono text-[11px]">
          {entries.map((entry, index) => (
            <div
              key={`${index}-${entry}`}
              className={
                entry.includes('DEADLOCK') || entry.includes('blocks')
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }
            >
              <span className="text-primary/60 mr-1.5">
                {index.toString().padStart(2, '0')}
              </span>
              {entry}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
