import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProducerConsumer } from '@/components/sync/ProducerConsumer';
import { ReadersWriters } from '@/components/sync/ReadersWriters';
import { DiningPhilosophers } from '@/components/sync/DiningPhilosophers';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

const TABS = [
  { value: 'producer-consumer', label: 'Producer-Consumer' },
  { value: 'readers-writers', label: 'Readers-Writers' },
  { value: 'dining-philosophers', label: 'Dining Philosophers' }
];

const Synchronization = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    <PageHeader icon={Lock} title="Process Synchronization">
        Three classic problems, each running on a real semaphore machine. Step one process at a
          time to control the interleaving — and reach the deadlocks yourself.
      </PageHeader>

    <Tabs defaultValue="producer-consumer" className="space-y-6">
      <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto gap-1.5 sm:gap-2 bg-background/90 border border-border/60 shadow-md rounded-xl p-1.5 sm:p-2">
        {TABS.map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="py-2 sm:py-2.5 px-2 text-xs sm:text-sm md:text-base font-semibold whitespace-normal leading-tight data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg"
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
