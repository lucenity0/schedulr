import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MODULES, OsModule, modulesByCategory } from '@/lib/modules';
import { fadeUp, stagger } from '@/lib/motion';
import { ArrowRight, GraduationCap, Play, SlidersHorizontal } from 'lucide-react';

const groups = modulesByCategory();

const LEVEL_STYLES: Record<OsModule['level'], string> = {
  'Start here': 'border-green-500/40 text-green-400',
  Core: 'border-primary/40 text-primary',
  Advanced: 'border-amber-500/40 text-amber-400'
};

const ModuleCard = ({ module }: { module: OsModule }) => (
  <motion.div variants={fadeUp} className="h-full">
    <Card className="group h-full flex flex-col border border-border/60 shadow-md bg-background/90 backdrop-blur-md transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 hover:border-primary">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <module.icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base leading-tight">{module.title}</CardTitle>
          </div>
          <Badge variant="outline" className={`shrink-0 text-[10px] ${LEVEL_STYLES[module.level]}`}>
            {module.level}
          </Badge>
        </div>
        <CardDescription className="text-sm leading-relaxed">{module.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 mt-auto">
        <div className="flex flex-wrap gap-1.5">
          {module.topics.map(topic => (
            <span
              key={topic}
              className="px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 text-[11px] text-muted-foreground"
            >
              {topic}
            </span>
          ))}
        </div>

        {module.prerequisite && (
          <p className="text-[11px] text-muted-foreground">
            Best after <span className="text-foreground">{module.prerequisite}</span>
          </p>
        )}

        <Link to={module.path} className="mt-auto">
          <Button className="w-full">
            Open module
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  </motion.div>
);

const Home = () => (
  <div className="max-w-7xl mx-auto space-y-14 pb-8">
    {/* Hero */}
    <motion.section
      variants={stagger(0.08)}
      initial="hidden"
      animate="visible"
      className="text-center space-y-5 pt-12"
    >
      <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold">
        <span className="text-primary">Schedulr</span>
        <span className="block text-2xl md:text-3xl mt-2 text-foreground">
          Operating system concepts you can actually watch
        </span>
      </motion.h1>

      <motion.p
        variants={fadeUp}
        className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
      >
        Eight modules covering {MODULES.reduce((sum, m) => sum + m.topics.length, 0)} algorithms and
        problems. Every simulation runs step by step, in your browser, and explains each decision as
        it makes it.
      </motion.p>

      <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 pt-2">
        <Link to="/cpu-scheduling">
          <Button size="lg">
            <Play className="mr-2 h-4 w-4" />
            Start with CPU scheduling
          </Button>
        </Link>
        <Link to="/synchronization">
          <Button size="lg" variant="outline">
            See a deadlock happen
          </Button>
        </Link>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex flex-wrap justify-center gap-6 pt-6 text-sm text-muted-foreground"
      >
        {[
          { icon: SlidersHorizontal, text: 'Play, pause, rewind and scrub every simulation' },
          { icon: GraduationCap, text: 'Plain-English narration beside the pseudocode' }
        ].map(item => (
          <span key={item.text} className="flex items-center gap-2">
            <item.icon className="h-4 w-4 text-primary" />
            {item.text}
          </span>
        ))}
      </motion.div>
    </motion.section>

    {/* Modules by category */}
    {groups.map(group => (
      <section key={group.category} className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 border-b border-border/60 pb-3">
          <h2 className="text-2xl font-semibold shrink-0">{group.category}</h2>
          <p className="text-sm text-muted-foreground">{group.blurb}</p>
        </div>

        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {group.modules.map(module => (
            <ModuleCard key={module.path} module={module} />
          ))}
        </motion.div>
      </section>
    ))}

    {/* About */}
    <section className="rounded-2xl border border-border/60 shadow-md bg-background/90 backdrop-blur-md p-8 text-center space-y-3">
      <h2 className="text-2xl font-semibold">Built to be checked</h2>
      <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
        Every algorithm here is a pure function covered by unit tests pinned to worked textbook
        examples — the Silberschatz disk and Banker&rsquo;s exercises, the standard page reference
        strings, and the Liu &amp; Layland bound. If a simulation disagrees with your lecture notes,
        one of us has a bug worth finding.
      </p>
    </section>
  </div>
);

export default Home;
