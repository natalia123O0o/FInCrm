import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, CalendarClock, Check, ChevronRight,
  FileText, MailCheck, Menu, Radar, ShieldCheck, ShoppingBasket,
  Sparkles, Users, X,
} from 'lucide-react';

// Este componente reemplaza SOLO la página pública: los paneles no cambian.
import heroVideo from '../../../assets/videos/video_Fondo_Pantalla_Hero.mp4';
import ContactForm from '../../contact/components/ContactForm.jsx';
import { MODULES } from '../../catalog/data/modules.data.js';
import '../commercial-redesign.css';
import '../plans-contact-layout.css';
import '../about-modules-redesign.css';

const EXAMPLE_PLANS = [
  { code: 'ESSENTIAL', name: 'Esencial', monthlyPriceCOP: 39900,
    description: 'CRM comercial, cotizaciones y asistente IA para empezar.',
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'messaging', 'ai'],
    limits: { maxActiveUsers: 3, aiRequestsPerMonth: 50, quotesPerMonth: 30 } },
  { code: 'BUSINESS', name: 'Negocio', monthlyPriceCOP: 79900,
    description: 'Campañas personalizadas y mayor capacidad comercial.',
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'campaigns', 'messaging', 'ai'],
    limits: { maxActiveUsers: 10, aiRequestsPerMonth: 200, quotesPerMonth: 200 } },
  { code: 'INTELLIGENT', name: 'Inteligente', monthlyPriceCOP: 129900,
    description: 'CRM, campañas, IA y FinPOS con inventario.',
    modules: ['crm', 'activities', 'opportunities', 'quotes', 'campaigns', 'messaging', 'ai', 'pos'],
    limits: { maxActiveUsers: 25, aiRequestsPerMonth: 600, quotesPerMonth: 1000 } },
];
const money = value => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(value) || 0);
const MODULE_ICONS = { crm: Users, quotes: FileText, assistant: Sparkles,
  campaigns: MailCheck, pos: ShoppingBasket, radar: Radar };
const PLAN_LABELS = { crm: 'Clientes y cartera', activities: 'Actividades y tareas',
  opportunities: 'Oportunidades comerciales', quotes: 'Cotizaciones inteligentes',
  campaigns: 'Campañas', messaging: 'Mensajería', ai: 'Asistente con IA',
  pos: 'FinPOS e inventario', radar: 'FinRadar' };
const NAV_LINKS = [
  ['#que-es', 'Qué es'], ['#funciones', 'Cómo funciona'],
  ['#productos', 'Módulos'], ['#planes', 'Planes'], ['#ley-2300', 'Ley 2300'],
  ['#contacto', 'Contacto'],
];

function Brand({ compact = false }) {
  return <span className={compact ? 'dash__logo fincrm-brand' : 'logo fincrm-brand'} aria-label="FinCRM">
    <span className="fincrm-brand__bars" aria-hidden="true"><i/><i/><i/></span>FinCRM
  </span>;
}

function Reveal({ children, as: Element = 'div', className = '', delay = 0, ...props }) {
  const root = useRef(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-revealed'); return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('is-revealed'); io.disconnect(); }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Element ref={root} className={`fincrm-reveal ${className}`} style={{ '--reveal-delay': `${delay}s` }} {...props}>{children}</Element>;
}

function Navigation() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 70);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <header id="nav" className={`nav ${compact ? 'is-compact' : ''}`}>
    <div className="container nav__inner">
      <a href="#inicio" onClick={() => setOpen(false)} aria-label="FinCRM - Inicio"><Brand /></a>
      <nav className={`nav__links ${open ? 'is-open' : ''}`} id="commercial-nav-links" aria-label="Navegación principal">
        {NAV_LINKS.map(([href, text]) => <a href={href} key={href} onClick={() => setOpen(false)}>{text}</a>)}
        <a href="/login" className="btn btn-primary nav__cta">Iniciar sesión</a>
      </nav>
      <button type="button" className="nav__toggle fincrm-mobile-menu" aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open} aria-controls="commercial-nav-links" onClick={() => setOpen(value => !value)}>
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>
  </header>;
}

const MOCK_METRICS = [
  ['Oportunidades', '42', '+8 %'], ['Cotizaciones', '7', '+3'],
  ['Cartera estimada', '$12,4 M', 'Ejemplo'], ['Actividades', '18', '+5'],
];
function DemoDashboard() {
  return <div className="dash" aria-label="Vista de demostración con datos ficticios de FinCRM">
    <div className="dash__topbar"><Brand compact />
      <div className="dash__tabs" aria-hidden="true"><span className="dash__tab is-active">Resumen</span><span className="dash__tab">Comercial</span></div>
    </div>
    <div className="dash__body">
      <div className="kpi-grid">{MOCK_METRICS.map(([label, value, badge]) => <div className="kpi-card" key={label}>
        <span className="kpi-label">{label}</span><div className="kpi-value-row"><span className="kpi-value">{value}</span><span className="kpi-badge kpi-badge--up">{badge}</span></div>
      </div>)}</div>
      <div className="dash__chart"><div className="chart-header"><span className="chart-title">Actividad comercial · ejemplo ilustrativo</span></div>
        <svg viewBox="0 0 400 100" className="chart-svg" role="img" aria-label="Línea ascendente de demostración">
          <defs><linearGradient id="crmPromoGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#FF7A1A" stopOpacity=".32"/><stop offset="100%" stopColor="#FF7A1A" stopOpacity="0"/></linearGradient></defs>
          <path d="M0 88 L40 76 L80 82 L120 64 L160 66 L200 49 L240 54 L280 39 L320 28 L360 30 L400 8 L400 100 L0 100 Z" fill="url(#crmPromoGrad)"/>
          <path d="M0 88 L40 76 L80 82 L120 64 L160 66 L200 49 L240 54 L280 39 L320 28 L360 30 L400 8" stroke="#FF7A1A" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="fincrm-dash-steps"><div><Check size={15}/> Clientes</div><div><Check size={15}/> Cotizaciones</div><div><Check size={15}/> Campañas</div></div>
    </div><p className="dash-demo-label">VISTA ILUSTRATIVA · CIFRAS FICTICIAS</p>
  </div>;
}

function Hero() {
  return <section id="inicio" className="hero fincrm-video-hero">
    <div className="fincrm-video-hero__media" aria-hidden="true"><video autoPlay muted loop playsInline preload="metadata" poster="">
      <source src={heroVideo} type="video/mp4" />
    </video></div>
    <div className="fincrm-video-hero__scrim" aria-hidden="true"/>
    <div className="hero__grid-bg" aria-hidden="true" />
    <div className="container hero__inner">
      <div className="hero__content">
        <Reveal as="p" className="eyebrow">PLATAFORMA COMERCIAL · HECHA EN COLOMBIA</Reveal>
        <Reveal as="h1" className="hero__h1" delay={0.08}>Convierte relaciones en ventas con inteligencia a tu lado.</Reveal>
        <Reveal as="p" className="hero__sub" delay={0.14}>Clientes, oportunidades, actividades, cotizaciones y campañas en una sola plataforma. Tu asistente con IA te ayuda a preparar propuestas, dar seguimiento y tomar decisiones con información de tu negocio.</Reveal>
        <Reveal className="hero__actions" delay={0.22}>
          <a href="#contacto" className="btn btn-primary">Solicitar demostración <ArrowRight size={18}/></a>
          <a href="#productos" className="btn btn-secondary">Explorar funcionalidades</a>
        </Reveal>
        <Reveal className="hero__trust" delay={0.29}>
          <span>COTIZACIONES + IA</span><span className="sep">·</span><span>CAMPAÑAS PERSONALIZADAS</span><span className="sep">·</span><span>CARTERA Y PAGOS</span>
        </Reveal>
      </div>
      <Reveal className="hero__dashboard" delay={0.23}><DemoDashboard /></Reveal>
    </div>
  </section>;
}

const CONNECTED_JOURNEY = [
  { number: '01', label: 'Conoce', title: 'Clientes y oportunidades', icon: Users },
  { number: '02', label: 'Propón', title: 'Cotizaciones con IA', icon: FileText },
  { number: '03', label: 'Acompaña', title: 'Actividades y campañas', icon: CalendarClock },
  { number: '04', label: 'Organiza', title: 'Cartera y pagos', icon: BarChart3 },
];
function About() {
  return <section className="section section--light fincrm-about" id="que-es">
    <div className="container fincrm-about__layout">
      <Reveal className="fincrm-about__copy">
        <span className="fincrm-about__overline"><span aria-hidden="true" /> QUÉ ES FINCRM</span>
        <h2>Una sola plataforma para toda tu <em>operación comercial.</em></h2>
        <p>Vende con contexto, cotiza con inteligencia y cuida cada relación. FinCRM también te ayuda a organizar tu cartera y dar seguimiento responsable.</p>
        <p>Conecta clientes, oportunidades, actividades, cotizaciones, campañas y pagos, con acceso por roles y datos separados para cada empresa.</p>
        <div className="chips fincrm-about__chips">
          {['Gestión comercial', 'Cotizaciones + IA', 'Campañas', 'Cobranza'].map(label => <span className="chip" key={label}>{label}</span>)}
        </div>
      </Reveal>
      <Reveal className="fincrm-about__panel" delay={0.12}>
        <div className="fincrm-about__panel-head">
          <div>
            <span className="fincrm-about__panel-kicker">UN SOLO FLUJO</span>
            <h3>Todo conectado, sin perder el contexto.</h3>
          </div>
          <span className="fincrm-about__panel-mark" aria-hidden="true"><Sparkles size={22}/></span>
        </div>
        <ol className="fincrm-about__journey" aria-label="Etapas comerciales que conecta FinCRM">
          {CONNECTED_JOURNEY.map(({ number, label, title, icon: Icon }) =>
            <li key={number} className="fincrm-about__step">
              <span className="fincrm-about__step-icon"><Icon size={20} aria-hidden="true"/></span>
              <div className="fincrm-about__step-copy"><span>{label}</span><strong>{title}</strong></div>
              <span className="fincrm-about__step-no">{number}</span>
            </li>
          )}
        </ol>
        <div className="fincrm-about__panel-footer"><ShieldCheck size={17} aria-hidden="true"/> Accesos por roles · Datos independientes por empresa</div>
      </Reveal>
    </div>
  </section>;
}

const STEPS = [
  { no: '01', icon: Users, title: 'Conoce a tus clientes', text: 'Centraliza datos, necesidades e historial comercial de cada empresa.' },
  { no: '02', icon: CalendarClock, title: 'Organiza el seguimiento', text: 'Asigna actividades, reuniones y oportunidades para tu equipo.' },
  { no: '03', icon: FileText, title: 'Cotiza con apoyo de IA', text: 'Prepara cotizaciones claras y consulta al asistente cuando necesites ideas.' },
  { no: '04', icon: MailCheck, title: 'Mantén la relación', text: 'Planifica campañas personalizadas y acompaña los próximos pasos.' },
];
function CommercialFlow() {
  return <section className="section section--dark" id="funciones"><div className="section--dark__grid-bg" aria-hidden="true"/><div className="container problem-split">
    <Reveal><p className="eyebrow">ASÍ FUNCIONA</p><h2 className="problem-title">Del primer «hola» a una relación que crece.</h2>
      <div className="problem-list">{STEPS.map(({ no, icon: Icon, title, text }) => <article className="problem-card" key={no}>
        <Icon size={22} aria-hidden="true"/><div><h4>{title}</h4><p>{text}</p></div>
      </article>)}</div>
    </Reveal>
    <Reveal delay={0.16}><p className="eyebrow">CON FINCRM</p><h3 className="solution-title">La IA acompaña al equipo comercial.</h3>
      <div className="solution-panel fincrm-solution-panel">
        <div className="fincrm-solution-icon"><Sparkles size={32}/></div>
        <h3>Cotizaciones inteligentes y asistente empresarial</h3>
        <p>La inteligencia artificial ayuda a preparar propuestas, consultar información autorizada y sugerir próximos pasos. Las funciones y los cupos dependen del plan contratado.</p>
        <div className="fincrm-flow-tags"><span>Oportunidades</span><span>Actividades</span><span>Seguimiento</span></div>
        <a href="#planes" className="btn btn-primary">Ver planes <ChevronRight size={17}/></a>
      </div>
    </Reveal>
  </div></section>;
}

function Products() {
  return <section className="section section--alt" id="productos"><div className="container">
    <Reveal className="section__head"><p className="eyebrow">MÓDULOS FINCRM</p><h2>Todo lo que necesita tu negocio.</h2>
      <p>Una plataforma para gestionar relaciones comerciales, cotizar, comunicarse, vender y tomar decisiones con información.</p>
    </Reveal>
    <div className="products-grid">{MODULES.map((mod, i) => {
      const Icon = MODULE_ICONS[mod.id] || BarChart3;
      return <Reveal as="article" className={`module-card fincrm-module-card module-card--${mod.id === 'quotes' || mod.id === 'pos' ? 'pos' : mod.id === 'assistant' || mod.id === 'radar' ? 'radar' : 'crm'}`} delay={(i % 3) * 0.08} key={mod.id}>
        <div className="fincrm-module-card__top"><div className="module-icon"><Icon size={25} aria-hidden="true"/></div><span className="fincrm-module-card__index">MÓDULO {String(i + 1).padStart(2, '0')}</span></div>
        <h3>{mod.title}{mod.id === 'assistant' && <span className="module-badge">IA</span>}</h3>
        <p className="module-tag">{mod.short}</p>
        <details className="fincrm-module-details"><summary>Más información <ChevronRight size={16}/></summary>
          <p>{mod.detail.technical}</p><p>{mod.detail.interop}</p><p>{mod.detail.impact}</p>
        </details>
        <a href="#contacto" className="module-link">Solicitar información <ArrowRight size={16}/></a>
      </Reveal>;
    })}</div>
    <p className="availability-note">La disponibilidad de cada módulo depende del plan y del avance del desarrollo.</p>
  </div></section>;
}

// Conjunto de funciones comparable entre los tres planes. FinRadar se deja fuera
// porque todavia no forma parte del catalogo comercial disponible.
const COMPARISON_FEATURES = [
  { key: 'crm', label: 'Clientes, cartera y pagos' },
  { key: 'activities', label: 'Tareas y actividades' },
  { key: 'opportunities', label: 'Oportunidades comerciales' },
  { key: 'quotes', label: 'Cotizaciones inteligentes' },
  { key: 'ai', label: 'Asistente con IA' },
  { key: 'messaging', label: 'Mensajería empresarial' },
  { key: 'campaigns', label: 'Campañas personalizadas' },
  { key: 'pos', label: 'FinPOS e inventario' },
];

function Pricing({ onChoosePlan }) {
  const [publishedPlans, setPublishedPlans] = useState([]);
  const [catalogChecked, setCatalogChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') ||
      (import.meta.env.DEV ? 'http://localhost:4000' : '');
    fetch(`${apiBase}/api/public/plans`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('No fue posible consultar los planes');
        return response.json();
      })
      .then(data => {
        setPublishedPlans(Array.isArray(data?.plans) ? data.plans : []);
        setCatalogChecked(true);
      })
      .catch(error => {
        if (error.name !== 'AbortError') setCatalogChecked(true);
      });
    return () => controller.abort();
  }, []);

  // No se ocultan las otras dos tarjetas cuando la API solo devuelve un plan.
  // Cada plan NO publicado se etiqueta como referencia para no confundir al cliente.
  const realByCode = new Map(publishedPlans.map(plan => [plan.code, plan]));
  const visiblePlans = EXAMPLE_PLANS.map(example => {
    const published = realByCode.get(example.code);
    return { ...(published || example), isReference: !published };
  });

  return <section className="section section--light fincrm-plans-section" id="planes">
    <div className="container fincrm-wide-container">
      <Reveal className="section__head fincrm-plans-head">
        <p className="eyebrow">PLANES FINCRM</p>
        <h2>Un plan para cada etapa de tu negocio.</h2>
        <p>Los tres planes incluyen gestión comercial, cotizaciones y asistente con IA. Compara los módulos y cupos de cada opción.</p>
      </Reveal>
      <ul className="product-plans fincrm-product-plans" aria-label="Comparación de planes FinCRM">
        {visiblePlans.map((plan, i) => {
          const isRecommended = plan.code === 'BUSINESS';
          const activeModules = new Set(plan.modules || []);
          const quota = plan.limits || {};
          return <Reveal as="li" className={`product-plan product-plan--${String(plan.code).toLowerCase()} ${isRecommended ? 'product-plan--recommended' : ''}`} key={plan.code} delay={i * 0.08}>
            {isRecommended && <span className="product-plan__badge">MÁS ELEGIDO</span>}
            <div className="product-plan__intro">
              <h3 className="product-plan__title">{plan.name}</h3>
              <p>{plan.description || 'Soluciones comerciales para tu empresa.'}</p>
            </div>
            <div className="product-plan__price" aria-label={`${money(plan.monthlyPriceCOP)} por mes`}>
              <strong>{money(plan.monthlyPriceCOP)}</strong>
              <small>/ mes</small>
            </div>
            <p className="product-plan__source">{plan.isReference ? 'Precio de referencia' : 'Plan publicado por SUPER_ADMIN'}</p>
            <ul className="product-plan__features" aria-label={`Características de ${plan.name}`}>
              {COMPARISON_FEATURES.map(feature => {
                const included = activeModules.has(feature.key);
                return <li key={feature.key} className={included ? 'check' : 'cross'}>
                  {included ? <Check size={17} aria-hidden="true"/> : <X size={17} aria-hidden="true"/>}
                  <span className="product-plan__visually-hidden">{included ? 'Incluido: ' : 'No incluido: '}</span>
                  <span>{feature.label}</span>
                </li>;
              })}
            </ul>
            <div className="product-plan__limits">
              <strong>Cupos mensuales</strong>
              <span>Hasta {quota.maxActiveUsers ?? '—'} usuarios</span>
              <span>{quota.aiRequestsPerMonth ?? '—'} consultas de IA</span>
              <span>{quota.quotesPerMonth ?? '—'} cotizaciones</span>
            </div>
            <button type="button" className="product-plan__select" onClick={() => onChoosePlan(plan.code)}>
              {plan.isReference ? 'Consultar disponibilidad' : 'Solicitar este plan'} <ArrowRight size={17} aria-hidden="true"/>
            </button>
          </Reveal>;
        })}
      </ul>
      <p className="fincrm-plans-note">
        {visiblePlans.some(plan => plan.isReference)
          ? 'Los precios marcados como referencia son ejemplos comerciales y pueden cambiar. Confirma su disponibilidad con FinCRM.'
          : 'Precios y beneficios consultados del catálogo activo del SUPER_ADMIN.'}
        {!catalogChecked && ' Consultando el catálogo...'}
      </p>
    </div>
  </section>;
}

function Ley2300() {
  return <section className="section section--dark fincrm-ley" id="ley-2300"><div className="section--dark__grid-bg" aria-hidden="true"/>
    <div className="container fincrm-ley__inner"><ShieldCheck size={42}/><div><p className="eyebrow">COBRANZA RESPONSABLE</p><h2>Ley 2300: contactos con respeto.</h2>
      <p>La Ley 2300 de 2023 protege la privacidad y establece condiciones para contactar a los consumidores. FinCRM ayuda a organizar la cobranza considerando horarios, frecuencia y canales autorizados.</p>
    </div><div className="fincrm-ley__facts"><span><CalendarClock size={17}/> Horarios y frecuencia</span><span><MailCheck size={17}/> Canales autorizados</span></div></div>
  </section>;
}

function Contact({ selectedPlan }) {
  const [success, setSuccess] = useState(false);
  return <section className="cta-final" id="contacto"><div className="cta-final__grid-bg" aria-hidden="true"/>
    <div className="container contact-layout"><Reveal className="contact-copy"><p className="eyebrow">CONTÁCTANOS</p>
      <h2><span>Haz que la información de tu</span><span>negocio trabaje a tu favor.</span></h2>
      <p>Cuéntanos qué necesita tu empresa. Podemos orientarte sobre planes, cotizaciones inteligentes, campañas y el asistente con IA.</p>
      <span className="ledger ledger--light">SOLICITUD REAL · CORREO GESTIONADO CON BREVO</span>
    </Reveal><Reveal className="contact-card" delay={0.13}>
      {success ? <div className="fincrm-contact-success" role="status"><span className="fincrm-contact-success__icon"><Check size={32}/></span><h3>Solicitud enviada</h3><p>Recibimos tu solicitud para envío. Revisaremos tu información y te responderemos.</p><button type="button" className="btn btn-outline" onClick={() => setSuccess(false)}>Enviar otra solicitud</button></div> : <>
        <h3>Solicitar información</h3><ContactForm selectedPlan={selectedPlan} onSuccess={() => setSuccess(true)}/>
      </>}
    </Reveal></div>
  </section>;
}

function Footer() {
  return <footer className="footer"><div className="container"><div className="footer__grid">
    <div className="footer__brand"><a href="#inicio" aria-label="Inicio FinCRM"><Brand/></a><p>FinCRM — relaciones comerciales, cobranza y decisiones con inteligencia.</p></div>
    <div className="footer__col"><h4>Plataforma</h4><a href="#productos">FinCRM</a><a href="#productos">FinPOS</a><a href="#productos">FinRadar</a></div>
    <div className="footer__col"><h4>Funciones</h4><a href="#productos">Cotizaciones con IA</a><a href="#funciones">Oportunidades</a><a href="#productos">Campañas</a></div>
    <div className="footer__col"><h4>Conoce más</h4><a href="#planes">Planes</a><a href="#ley-2300">Ley 2300</a><a href="#contacto">Contacto</a></div>
    </div><div className="footer__bottom"><p>© {new Date().getFullYear()} FinCRM. Hecho en Colombia.</p><div className="footer__bottom-links"><a href="#inicio">Inicio</a><a href="/login">Iniciar sesión</a><a href="#contacto">Contacto</a></div></div>
  </div></footer>;
}

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState('BUSINESS');
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(h > 0 ? window.scrollY / h : 0);
    };
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  const selectPlan = code => {
    setSelectedPlan(code || '');
    document.querySelector('#contacto')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <div className="fincrm-public">
    <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true"/>
    <Navigation/><main><Hero/><About/><CommercialFlow/><Products/><Pricing onChoosePlan={selectPlan}/><Ley2300/><Contact selectedPlan={selectedPlan}/></main><Footer/>
  </div>;
}
