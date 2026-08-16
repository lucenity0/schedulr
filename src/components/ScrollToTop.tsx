import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll to the top when navigating to a new route.
 *
 * A single-page app keeps the window scroll position across navigations, so
 * clicking a module card half-way down the home page opens that module
 * already scrolled past its heading. Browsers only restore scroll for real
 * history entries, which is why this has to be done by hand.
 *
 * Back and forward are left alone (navigation type POP) - the browser
 * restores those positions itself, and returning to where you were is the
 * behaviour people expect there.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return;

    // 'instant' rather than smooth: a long scroll animation on every
    // navigation reads as sluggish, and it fights reduced-motion settings.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navigationType]);

  return null;
};
