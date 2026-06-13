/**
 * useScrollReveal
 *
 * A lightweight IntersectionObserver-based hook that adds a CSS class to
 * elements when they enter the viewport.  No external animation library
 * required — works purely with Tailwind transition utilities.
 *
 * Usage:
 *   const ref = useScrollReveal<HTMLDivElement>();
 *   <div ref={ref} className="opacity-0 translate-y-8 transition-all duration-700">…</div>
 *
 * When the element enters the viewport the hook adds the class
 * `scroll-revealed` which you can target in index.css:
 *   .scroll-revealed { opacity: 1 !important; transform: none !important; }
 *
 * Options:
 *   threshold  – fraction of element visible before triggering (default 0.15)
 *   rootMargin – IntersectionObserver rootMargin (default '0px')
 *   once       – only trigger once (default true)
 */

import { useEffect, useRef } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

function useScrollReveal<T extends Element>(options: ScrollRevealOptions = {}) {
  const { threshold = 0.15, rootMargin = '0px', once = true } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('scroll-revealed');
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('scroll-revealed');
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

export default useScrollReveal;
