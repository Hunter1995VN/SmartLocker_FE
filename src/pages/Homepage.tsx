/**
 * Homepage Component - Trang chủ SmartLocker
 * Hiển thị toàn bộ nội dung trang landing page
 */
import Header from '../components/layout/Header';
import Hero from '../components/home/Hero';
import Stations from '../components/home/Stations';
import HowItWorks from '../components/home/HowItWorks';
import Pricing from '../components/home/Pricing';
import Security from '../components/home/Security';
import CTABanner from '../components/home/CTABanner';
import Footer from '../components/layout/Footer';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

interface HomepageProps {
    onNavigate: (mode: ViewMode) => void;
}

const Homepage = ({ onNavigate }: HomepageProps) => {
  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col">
      {/* Header Navigation */}
      <Header onNavigate={onNavigate} />
      
      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section với Booking Widget */}
        <Hero />
        
        {/* Stations Map & List */}
        <Stations />
        
        {/* How It Works - 3 Steps */}
        <HowItWorks />
        
        {/* Pricing Section */}
        <Pricing />
        
        {/* Security Features */}
        <Security />
        
        {/* CTA Banner */}
        <CTABanner onNavigate={onNavigate} />
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Homepage;
