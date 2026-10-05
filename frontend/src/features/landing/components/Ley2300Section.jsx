import { useEffect, useRef, useState } from 'react';
import ModuleDetailModal from '../../catalog/components/ModuleDetailModal.jsx';
import './ley2300-section.css';

const LEY_MODULE = {
  title: 'Algoritmo de Control Preventivo (Ley 2300)',
  detail: {
    technical:
      'Motor de reglas determinista que evalúa RNE, horarios (L–V 7:00–19:00, Sáb 8:00–15:00), frecuencia (máx. 1 contacto semanal) y festivos colombianos. Cada intento se registra en la bitácora con estado Permitido, Encolado o Bloqueado.',
    interop:
      'Bitácora por tenant exportable a CSV. Job programado reevalúa encolados cada minuto en zona America/Bogota.',
    impact:
      'Cero sanciones, cero llamadas fuera de horario y una operación de cobranza sostenida que acelera el recaudo.',
  },
};

export default function Ley2300Section() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return undefined;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduced) {
      root.classList.add('ley--visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            entry.intersectionRatio > 0.12
          ) {
            root.classList.add('ley--visible');
          }
        });
      },
      {
        threshold: [0.12, 0.3],
      }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="ley-2300"
      ref={rootRef}
      className="ley section"
      data-bg="navy"
      data-nav-theme="dark"
    >
      <div
        className="ley__wedge"
        aria-hidden="true"
      />

      <div
        className="ley__big-totem"
        aria-hidden="true"
      >
        <span className="ley__big-square ley__big-square--navy" />
        <span className="ley__big-circle" />
        <span className="ley__big-square ley__big-square--orange" />
      </div>

      <div className="container ley__intro">
        <span
          className="section-label"
          style={{ color: 'var(--cyan)' }}
        >
          Cumplimiento
        </span>

        <h2 className="ley__title">
          Ley 2300, aplicada sin fricción.
        </h2>

        <p className="ley__lead">
          Todo contacto de cobranza pasa por un motor
          de reglas que verifica horarios, frecuencia
          y RNE antes de ejecutarse.
        </p>
      </div>

      <div className="container ley__stack">
        <article className="ley-card ley-card--horarios">
          <div className="ley-card__head">
            <span className="ley-card__num">01</span>
            <h3>Horarios</h3>
          </div>

          <p>
            Lunes a viernes 7:00–19:00, sábados
            8:00–15:00. Domingos y festivos:
            prohibido contactar.
          </p>

          <div className="ley__schedule">
            <div className="ley__schedule-row">
              <span>L–V</span>

              <div className="ley__schedule-bar">
                <div
                  className="ley__schedule-fill"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="ley__schedule-row">
              <span>Sáb</span>

              <div className="ley__schedule-bar">
                <div
                  className="ley__schedule-fill"
                  style={{ width: '58%' }}
                />
              </div>
            </div>
          </div>

          <div
            className="ley-card__mini-totem"
            aria-hidden="true"
          >
            <span className="mini mini--navy" />
            <span className="mini mini--cyan" />
          </div>
        </article>

        <article className="ley-card ley-card--frecuencia">
          <div className="ley-card__head">
            <span className="ley-card__num">02</span>
            <h3>Frecuencia</h3>
          </div>

          <p>
            Máximo un contacto semanal por deudor.
          </p>

          <div className="ley__week">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(
              (day, index) => (
                <span
                  key={index}
                  className={`ley__day ${
                    index === 2
                      ? 'ley__day--active'
                      : ''
                  }`}
                >
                  {day}
                </span>
              )
            )}
          </div>

          <div
            className="ley-card__mini-totem"
            aria-hidden="true"
          >
            <span className="mini mini--cyan" />
            <span className="mini mini--orange" />
          </div>
        </article>

        <article className="ley-card ley-card--bitacora">
          <div className="ley-card__head">
            <span className="ley-card__num">03</span>
            <h3>Bitácora auditable</h3>
          </div>

          <p>
            Cada intento queda registrado con estado
            y motivo.
          </p>

          <div className="ley__table">
            <div className="ley__row">
              <span className="ley__badge ley__badge--ok">
                Permitido
              </span>

              <span>
                Factura #1042 · 10:15
              </span>
            </div>

            <div className="ley__row">
              <span className="ley__badge ley__badge--warn">
                Encolado
              </span>

              <span>
                Factura #1043 · 19:30
              </span>
            </div>

            <div className="ley__row">
              <span className="ley__badge ley__badge--danger">
                Bloqueado
              </span>

              <span>
                Factura #1044 · 20:05
              </span>
            </div>
          </div>

          <button
            className="btn btn--onDark"
            onClick={() => setOpen(true)}
            aria-label="Conocer el módulo de Ley 2300"
          >
            Conocer el módulo
          </button>
        </article>
      </div>

      <ModuleDetailModal
        open={open}
        module={LEY_MODULE}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}