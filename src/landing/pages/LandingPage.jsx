import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import AboutSection from '../components/AboutSection'
import FeaturesSection from '../components/FeaturesSection'
import PricingPreviewSection from '../components/PricingPreviewSection'
import IndustriesSection from '../components/IndustriesSection'
import TestimonialsSection from '../components/TestimonialsSection'
import FAQSection from '../components/FAQSection'
import SecuritySection from '../components/SecuritySection'
import AISection from '../components/AISection'
import ContactSection from '../components/ContactSection'
import Footer from '../components/Footer'
import FloatingDemoButton from '../components/FloatingDemoButton'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <PricingPreviewSection />
        <IndustriesSection />
        <TestimonialsSection />
        <FAQSection />
        <AISection />
        <SecuritySection />
        <ContactSection />
      </main>
      <Footer />
      <FloatingDemoButton />
    </div>
  )
}
