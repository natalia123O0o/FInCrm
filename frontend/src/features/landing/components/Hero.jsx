import { useEffect, useRef } from 'react';
import { scrollToSection } from '../../../hooks/useLenis.js';
import './hero.css';
import heroVideo from '../../../assets/videos/video_Fondo_Pantalla_Hero.mp4'

import logo from '../../../assets/images/logo-fin-crm.svg';
import Navbar from '../../../components/common/Navbar.jsx';

export default function Hero({ ready }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!ready) return;

    const root = rootRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReduced) {
      root.classList.add('hero--visible');
      return;
    }

    requestAnimationFrame(() => {
      root.classList.add('hero--visible');
    });

    // Contadores de los KPI
    const counters = root.querySelectorAll('[data-count]');

    const counterTimers = [];

    counters.forEach((el, index) => {
      const target = Number(el.dataset.count);
      const isCOP = el.dataset.format === 'cop';

      const duration = 1200;
      const delay = 500 + index * 120;
      const startTime = performance.now() + delay;

      const formatValue = (value) => {
        return isCOP
          ? `$${Math.round(value).toLocaleString('es-CO')}`
          : Math.round(value).toLocaleString('es-CO');
      };

      const animateCounter = (now) => {
        if (now < startTime) {
          counterTimers[index] = requestAnimationFrame(animateCounter);
          return;
        }

        const progress = Math.min(
          (now - startTime) / duration,
          1
        );

        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;

        el.textContent = formatValue(value);

        if (progress < 1) {
          counterTimers[index] = requestAnimationFrame(animateCounter);
        } else {
          el.textContent = formatValue(target);
        }
      };

      counterTimers[index] = requestAnimationFrame(animateCounter);
    });

    return () => {
      counterTimers.forEach((timer) => {
        if (timer) {
          cancelAnimationFrame(timer);
        }
      });
    };
  }, [ready]);

  return (
    <section
      id="inicio"
      ref={rootRef}
      className="hero section"
      data-bg="light"
      data-nav-theme="light"
    >
      <Navbar />
      {/* =========================================================
          VIDEO DE FONDO
          ========================================================= */}
      <div className="hero__video-wrap" aria-hidden="true">
        <video
          className="hero__video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        <div className="hero__video-overlay" />
      </div>

      {/* =========================================================
          CONTENIDO PRINCIPAL
          ========================================================= */}
      
      <div className="container hero__grid">

        {/* Columna izquierda */}
        <div className="hero__text">

          <div className="hero__logo-big">
            <img src={logo} alt="FinCRM" />
          </div>

          <h1 className="hero__h1">
            <span className="hero__line">
              <span className="hero__line-inner">
                Optimiza tu flujo de caja
              </span>
            </span>

            <span className="hero__line">
              <span className="hero__line-inner">
                y cumple la Ley 2300.
              </span>
            </span>
          </h1>

          <p className="hero__sub">
            CRM SaaS de cobranza para PYMES colombianas. Facturación
            electrónica simulada, control preventivo y un chatbot que
            negocia acuerdos de pago sin salirse de la norma.
          </p>

          <div className="hero__actions">
            <button
              className="btn btn--primary hero__cta"
              onClick={() => scrollToSection('#contacto')}
              aria-label="Solicitar demo"
            >
              Solicitar demo
            </button>

            <button
              className="btn btn--ghost hero__cta"
              onClick={() => scrollToSection('#modulos')}
              aria-label="Ver módulos"
            >
              Ver módulos
            </button>
          </div>
        </div>

        {/* =========================================================
            MOCKUP DEL DASHBOARD
            ========================================================= */}
        <div className="hero__mockup" aria-hidden="true">

          <div className="hero__kpi-row">

            <div className="hero__kpi">
              <span className="hero__kpi-label">
                Cartera total
              </span>

              <strong
                data-count="128450000"
                data-format="cop"
              >
                $0
              </strong>
            </div>

            <div className="hero__kpi">
              <span className="hero__kpi-label">
                Facturas pendientes
              </span>

              <strong data-count="42">
                0
              </strong>
            </div>

            <div className="hero__kpi">
              <span className="hero__kpi-label">
                Contactos permitidos hoy
              </span>

              <strong data-count="7">
                0
              </strong>
            </div>

          </div>

          <div className="hero__chart">

            <div className="hero__chart-title">
              Recaudo últimos 8 meses
            </div>

            <div className="hero__bars">
              {[30, 42, 55, 48, 70, 82, 95, 110].map(
                (height, index) => (
                  <span
                    key={index}
                    className="hero__bar"
                    style={{ height: `${height}px` }}
                  />
                )
              )}
            </div>

          </div>

          {/* Formas geométricas */}
          <span
            className="hero__shape hero__shape--circle"
          />

          <span
            className="hero__shape hero__shape--square"
          />

          <span
            className="hero__shape hero__shape--dot"
          />

        </div>
      </div>
    </section>
  );
}