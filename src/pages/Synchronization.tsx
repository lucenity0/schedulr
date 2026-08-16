import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProducerConsumer } from '@/components/sync/ProducerConsumer';
import { ReadersWriters } from '@/components/sync/ReadersWriters';
import { DiningPhilosophers } from '@/components/sync/DiningPhilosophers';
import { Lock } from 'lucide-react';

const TABS = [
  { value: 'producer-consumer', label: 'Producer-Consumer' },
  { value: 'readers-writers', label: 'Readers-Writers' },
  { value: 'dining-philosophers', label: 'Dining Philosophers' }
];

const Synchronization = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30 mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          Process Synchronization
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          Three classic problems, each running on a real semaphore machine. Step one process at a
          time to control the interleaving — and reach the deadlocks yourself.
        </p>
      </CardHeader>
    </Card>

    <Tabs defaultValue="producer-consumer" className="space-y-6">
      <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-2">
        {TABS.map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="py-2.5 text-sm sm:text-base font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Each problem is a top-level component, so its DOM - and therefore its
          animation state - survives a re-render of this page. */}
      <TabsContent value="producer-consumer">
        <ProducerConsumer />
      </TabsContent>
      <TabsContent value="readers-writers">
        <ReadersWriters />
      </TabsContent>
      <TabsContent value="dining-philosophers">
        <DiningPhilosophers />
      </TabsContent>
    </Tabs>
  </div>
);

export default Synchronization;
