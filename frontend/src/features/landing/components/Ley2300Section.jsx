import { ShieldCheck, CalendarClock, MessageSquareMore } from 'lucide-react';
import './ley2300-compact.css';

// Esta seccion informa sobre la Ley 2300, sin asegurar cumplimiento automatico.
export default function Ley2300Section() {
  return (
    <section id="ley-2300" className="ley-mini section" data-bg="navy" data-nav-theme="dark" aria-labelledby="ley-mini-title">
      <div className="container ley-mini__content">
        <div className="ley-mini__icon" aria-hidden="true"><ShieldCheck size={34} strokeWidth={1.7}/></div>
        <div className="ley-mini__copy">
          <span className="section-label ley-mini__eyebrow">Cobranza responsable</span>
          <h2 id="ley-mini-title">Ley 2300: contactos con respeto.</h2>
          <p>La Ley 2300 de 2023 protege la privacidad y establece condiciones para contactar a los consumidores. FinCRM ayuda a organizar la cobranza considerando horarios, frecuencia y canales autorizados.</p>
        </div>
        <div className="ley-mini__facts" aria-label="Aspectos importantes">
          <span><CalendarClock size={17} aria-hidden="true"/> Horarios y frecuencia</span>
          <span><MessageSquareMore size={17} aria-hidden="true"/> Canales autorizados</span>
        </div>
      </div>
    </section>
  );
}
