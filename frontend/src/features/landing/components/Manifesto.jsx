import { useEffect, useRef } from 'react';
import './manifesto.css';

const TEXT =
  'Cobrar con tranquilidad: cada contacto cumple la Ley 2300 y cada decisión queda registrada.';

export default function Manifesto() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return undefined;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduced) {
      root.classList.add('mf--visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          root.classList.add('mf--visible');
          observer.disconnect();
        }
      },
      {
        threshold: 0.3,
      }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, []);

  const words = TEXT.split(' ');

  return (
    <section
      className="mf"
      ref={rootRef}
      data-bg="light"
      data-nav-theme="light"
    >
      <div className="container mf__grid">
        <p className="mf__text">
          {words.map((word, index) => (
            <span
              className="mf__word"
              key={`${word}-${index}`}
              style={{
                '--word-delay': `${index * 0.035}s`,
              }}
            >
              {word}
            </span>
          ))}
        </p>

        <div
          className="mf__totem"
          aria-hidden="true"
        >
          <span className="mf__shape mf__shape--navy" />
          <span className="mf__shape mf__shape--circle" />
          <span className="mf__shape mf__shape--orange" />
        </div>
      </div>
    </section>
  );
}