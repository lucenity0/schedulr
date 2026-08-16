import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from '@/components/ui/navigation-menu';
import { CATEGORY_BLURB, MODULES, modulesByCategory } from '@/lib/modules';
import { swift } from '@/lib/motion';
import { Home, Menu, X } from 'lucide-react';

const groups = modulesByCategory();

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close the mobile sheet whenever navigation happens.
  useEffect(() => setIsOpen(false), [location.pathname]);

  const activeModule = MODULES.find(module => module.path === location.pathname);

  return (
    <>
      <nav className="fixed top-4 left-0 right-0 z-50 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-background/85 shadow-2xl py-2.5 px-3 sm:px-5 flex items-center justify-between backdrop-blur-lg border border-border/40 supports-[backdrop-filter]:bg-background/75">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsOpen(v => !v)}
                className="lg:hidden flex items-center justify-center rounded-md p-2 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link
                to="/"
                className="text-xl font-bold text-primary whitespace-nowrap select-none shrink-0"
              >
                Schedulr
              </Link>

              {/* Where you are, on small screens where the menu is collapsed */}
              {activeModule && (
                <span className="lg:hidden text-sm text-muted-foreground truncate border-l border-border/60 pl-3">
                  {activeModule.name}
                </span>
              )}
            </div>

            {/* Grouped menu - a flat bar cannot hold eight modules */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      to="/"
                      className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium transition-colors hover:bg-muted/50 ${location.pathname === '/' ? 'text-primary' : ''
                        }`}
                    >
                      <Home className="h-4 w-4" />
                      Home
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {groups.map(group => {
                  const hasActive = group.modules.some(m => m.path === location.pathname);
                  return (
                    <NavigationMenuItem key={group.category}>
                      <NavigationMenuTrigger
                        className={`bg-transparent text-sm ${hasActive ? 'text-primary' : ''}`}
                      >
                        {group.category}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-[420px] p-3">
                          <p className="px-3 pb-2 text-xs text-muted-foreground border-b border-border/60 mb-2">
                            {CATEGORY_BLURB[group.category]}
                          </p>
                          <ul className="space-y-1">
                            {group.modules.map(module => {
                              const isActive = module.path === location.pathname;
                              return (
                                <li key={module.path}>
                                  <NavigationMenuLink asChild>
                                    <Link
                                      to={module.path}
                                      className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                      <module.icon
                                        className={`h-5 w-5 mt-0.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'
                                          }`}
                                      />
                                      <div className="min-w-0">
                                        <div
                                          className={`text-sm font-medium ${isActive ? 'text-primary' : ''
                                            }`}
                                        >
                                          {module.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                          {module.topics.slice(0, 4).join(', ')}
                                        </div>
                                      </div>
                                    </Link>
                                  </NavigationMenuLink>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </nav>

      {/* Mobile sheet - same grouping as the desktop menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={swift}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={swift}
              className="mt-20 w-[92vw] max-w-sm max-h-[75vh] overflow-y-auto rounded-2xl bg-background shadow-2xl border border-border/40 p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Modules</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-2 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <Link
                to="/"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 mb-3 ${location.pathname === '/' ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                  }`}
              >
                <Home className="h-5 w-5" />
                <span className="font-medium">Home</span>
              </Link>

              {groups.map(group => (
                <div key={group.category} className="mb-3">
                  <div className="px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {group.category}
                  </div>
                  {group.modules.map(module => {
                    const isActive = module.path === location.pathname;
                    return (
                      <Link
                        key={module.path}
                        to={module.path}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                          }`}
                      >
                        <module.icon className="h-5 w-5 shrink-0" />
                        <span className="font-medium text-sm">{module.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
