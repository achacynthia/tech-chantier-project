import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="landing-page">
      <section className="page-card hero-card professional-hero">
        <div className="hero-copy">
          <h1>Confidently Manage Your Production & Inventory</h1>
          <h2>
            Track stock, record production, and make data-driven decisions in one workspace.
          </h2>

          <div className="inline-actions">
            <Link to="/login" className="cta-link">
              Sign Up and Start Tracking
            </Link>
            <Link to="/login" className="cta-link button-secondary hero-secondary-cta">
              I Already Have an Account
            </Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual-card">
            <h3>Today Overview</h3>
            <p>Stock health: Strong</p>
            <p>Production logs: Updated</p>
            <p>Low-stock alerts: 2 items</p>
          </div>
        </div>
      </section>

      <section className="features-grid">
        <article className="feature-card page-card">
          <span className="feature-icon">📦</span>
          <h3>Smart Stock Tracking</h3>
          <p>Monitor raw materials in real time and avoid inventory guesswork.</p>
        </article>
        <article className="feature-card page-card">
          <span className="feature-icon">📝</span>
          <h3>Daily Production Records</h3>
          <p>Capture production activity quickly and keep clean historical logs.</p>
        </article>
        <article className="feature-card page-card">
          <span className="feature-icon">⚠️</span>
          <h3>Low-Stock Alerts</h3>
          <p>Get notified before materials run out so operations stay uninterrupted.</p>
        </article>
        <article className="feature-card page-card">
          <span className="feature-icon">📊</span>
          <h3>Operational Reporting</h3>
          <p>Review performance metrics to improve planning and decision-making.</p>
        </article>
      </section>

      <section className="page-card value-section">
        <div>
          <h2>Stay Organized. Avoid Shortages. Make Faster Decisions.</h2>
          <p>
            Production Tracker helps businesses save time and reduce costly errors by keeping
            production, stock levels, and reports in one consistent system.
          </p>
        </div>
        <div className="value-visual" aria-hidden="true">
          <div className="value-pill">Team + Data = Better Outcomes</div>
        </div>
      </section>

      <section className="testimonials-grid">
        <article className="page-card testimonial-card">
          <p>“We reduced manual stock errors and improved planning in just one week.”</p>
          <span>— Operations Manager</span>
        </article>
        <article className="page-card testimonial-card">
          <p>“Our team now tracks production consistently and catches shortages earlier.”</p>
          <span>— Production Lead</span>
        </article>
      </section>

      <footer className="page-card landing-footer">
        <div className="footer-links">
          <Link to="/">About</Link>
          <Link to="/">Contact</Link>
          <Link to="/">Privacy Policy</Link>
          <Link to="/">Terms of Service</Link>
        </div>
        <div className="footer-social" aria-label="social links">
          <span>ⓕ</span>
          <span>ⓧ</span>
          <span>ⓛ</span>
        </div>
        <p className="muted-text">© 2026 Production Tracker. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Home