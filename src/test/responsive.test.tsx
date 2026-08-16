import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const files = execSync('ls src/pages/*.tsx src/components/*.tsx src/components/sync/*.tsx')
  .toString()
  .trim()
  .split('\n');

const read = (path: string) => readFileSync(path, 'utf8');

/**
 * Static guards, not render tests. jsdom has no layout engine, so it cannot
 * tell you a grid is too narrow - but the patterns that caused the mobile
 * breakage are visible in the source, and they are worth pinning.
 */
describe('responsive layout', () => {
  it('never uses a multi-column grid without a single-column base', () => {
    const offenders: string[] = [];

    for (const file of files) {
      read(file)
        .split('\n')
        .forEach((line, index) => {
          // A grid that starts at 2+ columns with no responsive prefix will be
          // that many columns on a 375px phone too.
          const match = line.match(/(?<![:-])grid-cols-([3-9]|1[0-9])\b/);
          if (!match) return;
          if (/(sm|md|lg|xl):grid-cols-/.test(line)) return;
          // Fixed grids inside a horizontal scroller are deliberate.
          if (/overflow-x-auto|min-w-max|w-max/.test(line)) return;
          offenders.push(`${file}:${index + 1} ${match[0]}`);
        });
    }

    expect(offenders).toEqual([]);
  });

  it('scales card padding and page headers down on small screens', () => {
    const card = read('src/components/ui/card.tsx');
    expect(card).toContain('p-4 sm:p-6');
    expect(card).toMatch(/text-lg sm:text-xl/);

    const header = read('src/components/PageHeader.tsx');
    expect(header).toMatch(/text-xl sm:text-2xl md:text-3xl/);
  });

  it('routes every page banner through PageHeader so the type scale stays in step', () => {
    const pages = files.filter(f => f.startsWith('src/pages/') && !/NotFound|Index|CPUScheduling\.tsx/.test(f));
    const withOwnBanner = pages.filter(f =>
      read(f).includes('from-primary/20 via-primary/10 to-transparent')
    );
    expect(withOwnBanner).toEqual([]);
  });
});
