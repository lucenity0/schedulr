import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom implements neither of these, and both are used by shadcn/Radix
// components and by the reduced-motion guard.
window.matchMedia = window.matchMedia || (
  (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })
) as typeof window.matchMedia;

window.ResizeObserver = window.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// framer-motion's whileInView needs this; jsdom has no implementation.
window.IntersectionObserver = window.IntersectionObserver || class {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as unknown as typeof window.IntersectionObserver;

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn();
