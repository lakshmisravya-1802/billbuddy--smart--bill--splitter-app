import React, { useRef } from 'react';
import BillBuddyLogo from './BillBuddyLogo';

export default function LandingPage({
  onStart,
  appMode,
  setAppMode,
  lang,
  setLang,
  currency,
  setCurrency
}) {
  const howItWorksRef = useRef(null);
  const featuresRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-container scroll-fade-in">
      {/* Background Orbs */}
      <div className="landing-bg-glow orb-1"></div>
      <div className="landing-bg-glow orb-2"></div>

      {/* Top Navbar */}
      <header className="landing-navbar flex-row justify-between align-center">
        <BillBuddyLogo size={42} showText={true} />

        <div className="flex-row gap-2 align-center">
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)} 
            className="preference-select"
          >
            <option value="$">USD ($)</option>
            <option value="₹">INR (₹)</option>
            <option value="€">EUR (€)</option>
            <option value="£">GBP (£)</option>
          </select>

          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)} 
            className="preference-select"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </header>

      {/* Hero Header */}
      <main className="landing-hero text-center">
        <div className="hero-badge animate-pop-in">
          ✨ Soft Glassmorphism Splitter
        </div>

        {/* 1. Tagline Quote */}
        <h1 className="hero-title mt-3">
          "Split bills, <span className="brand-gradient-text">not friendships.</span>"
        </h1>

        <p className="hero-subtitle mt-3">
          Track shared group costs, assign unit-based items, and settle payments effortlessly.
        </p>

        {/* Action Buttons Row */}
        <div className="landing-cta-row flex-row justify-center gap-3 flex-wrap mt-4">
          <button className="btn-gradient-hero" onClick={onStart}>
            🚀 Get Started
          </button>

          <button 
            className="btn-gradient-secondary" 
            onClick={() => scrollToSection(howItWorksRef)}
          >
            📖 See How It Works
          </button>

          <button 
            className="btn-outline-gradient" 
            onClick={() => scrollToSection(featuresRef)}
          >
            ✨ See Features
          </button>
        </div>
      </main>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="card shadow-card mt-5 p-4">
        <div className="text-center mb-4">
          <h2 className="section-heading">📖 How BillBuddy Works</h2>
        </div>

        <div className="how-it-works-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>Add Participants</h4>
            <p>Enter group names vertically and manage participants with ease.</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h4>Log Expenses & Units</h4>
            <p>Input total bills or assign precise slices/drinks per person.</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h4>Settle Debts</h4>
            <p>Visualize direct debt transfers with minimal payment transactions.</p>
          </div>
        </div>
      </section>

      {/* 8. FLOATING BLOCKS OF KEY FEATURES */}
      <section ref={featuresRef} className="card shadow-card mt-5 mb-5 p-4">
        <div className="text-center mb-4">
          <h2 className="section-heading">✨ Key Features</h2>
          <p className="text-muted">Designed for fair, clear, and frictionless splitting</p>
        </div>

        <div className="floating-features-grid">
          <div className="floating-block block-float-1">
            <div className="block-icon">🧾</div>
            <h4>Itemized Unit Splitter</h4>
            <p>Assign quantities per item so everyone pays strictly for what they consumed.</p>
          </div>

          <div className="floating-block block-float-2">
            <div className="block-icon">📊</div>
            <h4>Weekly Chart Analysis</h4>
            <p>View real-time pending charts and weekly spending breakdowns.</p>
          </div>

          <div className="floating-block block-float-3">
            <div className="block-icon">⚖️</div>
            <h4>Smart Debt Minimization</h4>
            <p>Algorithmic calculation that minimizes redundant group transactions.</p>
          </div>

          <div className="floating-block block-float-4">
            <div className="block-icon">🔔</div>
            <h4>Animated Notifications</h4>
            <p>Receive immediate animated alerts upon logging bills or updating balances.</p>
          </div>
        </div>
      </section>
    </div>
  );
}