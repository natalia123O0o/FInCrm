import { Users, CalendarClock, FileText, Sparkles, MailCheck } from 'lucide-react';
import './commercial-flow.css';

const STEPS = [
  { no:'01', icon:Users, title:'Conoce a tus clientes', text:'Centraliza datos, necesidades e historial comercial de cada empresa.' },
  { no:'02', icon:CalendarClock, title:'Organiza el seguimiento', text:'Asigna actividades, reuniones y oportunidades para tu equipo.' },
  { no:'03', icon:FileText, title:'Cotiza con apoyo de IA', text:'Prepara cotizaciones claras y consulta al asistente cuando necesites ideas.' },
  { no:'04', icon:MailCheck, title:'Mantén la relación', text:'Planifica campañas personalizadas y acompaña los próximos pasos.' },
];

export default function CommercialFlowSection(){
  return <section className="commercial section" id="funciones" data-bg="light" data-nav-theme="light">
    <div className="container">
      <div className="commercial__heading">
        <div><span className="section-label">UNA NUEVA FORMA DE VENDER</span><h2>Del primer «hola»<br/>a una relación que crece.</h2></div>
        <p>FinCRM conecta tus procesos comerciales con inteligencia artificial, sin abandonar el control financiero.</p>
      </div>
      <div className="commercial__steps">
        {STEPS.map(({no,icon:Icon,title,text})=><article className="commercial__step" key={no}>
          <div className="commercial__step-head"><span className="commercial__number">{no}</span><Icon aria-hidden="true" size={22}/></div>
          <h3>{title}</h3><p>{text}</p>
        </article>)}
      </div>
      <div className="commercial__spotlight">
        <div className="commercial__spotlight-icon"><Sparkles size={24} aria-hidden="true"/></div>
        <div><strong>La IA acompaña al equipo comercial.</strong><p>Asistente empresarial y cotizaciones inteligentes, con funciones y cupos que varían según el plan.</p></div>
        <a href="#planes" className="commercial__link">Ver planes <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section>;
}
