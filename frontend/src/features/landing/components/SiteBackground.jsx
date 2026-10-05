import { useEffect, useRef } from 'react';
import { SECTION_BG } from '../../../utils/constants.js';

export default function SiteBackground() {
  const bgRef = useRef(null);

  useEffect(() => {
    const bg = bgRef.current;

    if (!bg) return undefined;

    const sections = Array.from(
      document.querySelectorAll('[data-bg]')
    );

    if (!sections.length) return undefined;

    const updateBackground = (section) => {
      const color =
        SECTION_BG[section.dataset.bg] ||
        SECTION_BG.light;

      bg.style.backgroundColor = color;
    };

    updateBackground(sections[0]);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio
          );

        if (visible[0]) {
          updateBackground(visible[0].target);
        }
      },
      {
        threshold: [0.25, 0.5, 0.75],
      }
    );

    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={bgRef}
      className="site-bg"
      aria-hidden="true"
    />
  );
}