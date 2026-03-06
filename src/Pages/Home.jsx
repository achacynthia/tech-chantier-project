import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <section className="page-card hero-card">
      <h1>Production Tracker</h1>
      <p>
        A simple stock and production system for bakeries, restaurants, and small factories.
        Record what you produce and let the app update raw materials automatically.
      </p>

      <div className="hero-highlights">
        <span>Track raw materials</span>
        <span>Record production</span>
        <span>Get low-stock alerts</span>
      </div>

      <div className="inline-actions">
        <Link to="/login" className="cta-link">
          Start Managing Stock
        </Link>
      </div>
    </section>
  )
}

export default Home