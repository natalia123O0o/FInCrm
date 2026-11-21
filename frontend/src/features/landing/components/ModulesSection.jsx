import { useEffect, useRef, useState } from 'react';
import ModuleGrid from '../../catalog/components/ModuleGrid.jsx';
import ModuleDetailModal from '../../catalog/components/ModuleDetailModal.jsx';
import { MODULES } from '../../catalog/data/modules.data.js';
import './modules-section.css';

export default function ModulesSection() {
  const rootRef = useRef(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return undefined;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduced) {
      root.classList.add('modules--visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          root.classList.add('modules--visible');
          observer.disconnect();
        }
      },
      {
        threshold: 0.18,
      }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="modulos"
      ref={rootRef}
      className="modules section"
      data-bg="gray"
      data-nav-theme="light"
    >
      <div className="container">
        <span className="section-label">
          Módulos
        </span>

        <h2 className="modules__title">
          <span className="modules__title-line">
            <span className="modules__title-line-inner">
              Todo tu negocio,
            </span>
          </span>

          <span className="modules__title-line">
            <span className="modules__title-line-inner">
              conectado en FinCRM.
            </span>
          </span>
        </h2>

        <p className="modules__lead">Del primer contacto a la cotización, la venta y la cobranza. Explora lo que puedes gestionar desde FinCRM.</p>
        <ModuleGrid onOpen={setOpenId} />
        <p className="modules__disclaimer">Algunas herramientas están en desarrollo o dependen del plan contratado. La disponibilidad y los cupos se configuran por empresa.</p>
      </div>

      <ModuleDetailModal
        open={openId !== null}
        module={MODULES.find(
          (module) => module.id === openId
        )}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
}