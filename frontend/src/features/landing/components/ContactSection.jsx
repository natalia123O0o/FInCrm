import { useEffect, useRef, useState } from 'react';
import ContactForm from '../../contact/components/ContactForm.jsx';
import './contact-section.css';

export default function ContactSection() {
  const rootRef = useRef(null);
  const formWrapRef = useRef(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return undefined;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduced) {
      root.classList.add('contact--visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          root.classList.add('contact--visible');
          observer.disconnect();
        }
      },
      {
        threshold: 0.2,
      }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleSuccess = () => {
    setSuccess(true);
  };

  return (
    <section
      id="contacto"
      ref={rootRef}
      className="contact section"
      data-bg="light"
      data-nav-theme="light"
    >
      <div className="container contact__grid">
        {!success ? (
          <div
            className="contact__form-wrap"
            ref={formWrapRef}
          >
            <span className="section-label">
              Contacto
            </span>

            <h2 className="contact__title">
              Solicita tu demo.
            </h2>

            <p className="contact__lead">
              Cuéntanos sobre tu PYME y te mostramos
              FinCRM en una sesión de 20 minutos.
            </p>

            <ContactForm onSuccess={handleSuccess} />
          </div>
        ) : (
          <div className="cf-success">
            <div className="cf-success__circle">
              <svg
                viewBox="0 0 60 60"
                width="60"
                height="60"
              >
                <path
                  className="cf-success__check"
                  d="M14 32 L26 44 L46 20"
                  fill="none"
                  stroke="#F8FAFC"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>
              ¡Gracias! Recibimos tu solicitud.
            </h3>

            <p>
              Nuestro equipo te contactará en las
              próximas 24 horas hábiles.
            </p>
          </div>
        )}

        <div
          className="cf-illustration"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 400 320"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              className="cf-illustration__bar"
              x="40"
              y="200"
              width="40"
              height="90"
              rx="10"
              fill="#0F172A"
              style={{ '--bar-delay': '0.15s' }}
            />

            <rect
              className="cf-illustration__bar"
              x="100"
              y="150"
              width="40"
              height="140"
              rx="10"
              fill="#F97316"
              style={{ '--bar-delay': '0.25s' }}
            />

            <rect
              className="cf-illustration__bar"
              x="160"
              y="100"
              width="40"
              height="190"
              rx="10"
              fill="#0F172A"
              style={{ '--bar-delay': '0.35s' }}
            />

            <rect
              className="cf-illustration__bar"
              x="220"
              y="60"
              width="40"
              height="230"
              rx="10"
              fill="#F97316"
              style={{ '--bar-delay': '0.45s' }}
            />

            <rect
              className="cf-illustration__bar"
              x="280"
              y="20"
              width="40"
              height="270"
              rx="10"
              fill="#06B6D4"
              style={{ '--bar-delay': '0.55s' }}
            />

            <path
              className="cf-illustration__arrow"
              d="M30 260 Q140 180 210 120 T380 30"
              fill="none"
              stroke="#06B6D4"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}