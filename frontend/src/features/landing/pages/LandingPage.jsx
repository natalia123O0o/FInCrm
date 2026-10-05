import { useCallback, useState } from 'react';

import Preloader from '../components/Preloader.jsx';
import Hero from '../components/Hero.jsx';
import Marquee from '../components/Marquee.jsx';
import Manifesto from '../components/Manifesto.jsx';
import ModulesSection from '../components/ModulesSection.jsx';
import Ley2300Section from '../components/Ley2300Section.jsx';
import ContactSection from '../components/ContactSection.jsx';
import SiteBackground from '../components/SiteBackground.jsx';

import '../landing.css';
import Footer from '../../../components/common/Footer.jsx';

export default function LandingPage() {
  const [ready, setReady] = useState(false);

  const handlePreloaderFinish = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <>
      <SiteBackground />

      <Preloader onFinish={handlePreloaderFinish} />

      <Hero ready={ready} />

      <Marquee />

      <Manifesto />

      <ModulesSection />

      <Ley2300Section />

      <ContactSection />

      <Footer />
    </>
  );
}