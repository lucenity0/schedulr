import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

/**
 * The banner at the top of every module.
 *
 * Every page used to repeat this markup with desktop-only sizes baked in, so
 * a phone got a 30px heading and a 2rem icon eating a third of the viewport.
 * One component means the type scale is defined once and stays in step across
 * all fifteen modules.
 */
export const PageHeader = ({ icon: Icon, title, children }: PageHeaderProps) => (
  <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30">
    <CardHeader className="gap-1">
      <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-xl sm:text-2xl md:text-3xl">
        <span className="p-1.5 sm:p-2 bg-primary/20 rounded-lg shrink-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary" />
        </span>
        <span className="min-w-0">{title}</span>
      </CardTitle>
      <p className="text-sm sm:text-base lg:text-lg text-muted-foreground text-pretty">
        {children}
      </p>
    </CardHeader>
  </Card>
);
