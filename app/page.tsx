import LandingNavbar from '@/components/landing/LandingNavbar';
import Hero from '@/components/landing/Hero';
import ProtocolSnapshot from '@/components/landing/ProtocolSnapshot';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import SmartMoneySection from '@/components/landing/SmartMoneySection';
import WhyMonad from '@/components/landing/WhyMonad';
import LivePreview from '@/components/landing/LivePreview';
import FinalCTA from '@/components/landing/FinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';

/**
 * LANDING — the marketing home for Perplex at "/". The analytics
 * workspace lives at "/app/*" with its own shell.
 */
export default function LandingPage() {
  return (
    <main className="bg-background min-h-screen">
      <LandingNavbar />
      <Hero />
      <ProtocolSnapshot />
      <Features />
      <HowItWorks />
      <SmartMoneySection />
      <WhyMonad />
      <LivePreview />
      <FinalCTA />
      <LandingFooter />
    </main>
  );
}
