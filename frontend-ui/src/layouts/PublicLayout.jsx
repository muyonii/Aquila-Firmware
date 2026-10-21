import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Droplets, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore();

  const portalTarget =
    isAuthenticated && user
      ? user.role === 'admin'
        ? '/dashboard'
        : user.role === 'technician'
        ? '/tasks'
        : '/usage'
      : '/login';

  return (
    <div className="public-shell min-h-screen flex flex-col bg-white">
      <header className="public-header">
        <div className="landing-container public-header-inner">
          <Link to="/" className="brand-mark" aria-label="AQUILA home">
            <Droplets className="w-5 h-5 text-[#38bdf8]" />
            <span>AQUILA</span>
          </Link>

          <nav className="public-nav" aria-label="Main navigation">
            <a href="/#home">Home</a>
            <a href="/#about">About</a>
            <a href="/#how-it-works">How it Works</a>
            <a href="/#features">Features</a>
          </nav>

          <div className="header-actions">
            <span
              className="header-status"
              aria-label="System status indicator"
            />

            <Link to={portalTarget} className="header-login">
              <span>
                {isAuthenticated ? 'Open Dashboard' : 'Open Portal'}
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main flex-1">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="landing-container">
          <div className="footer-main">
            <div className="footer-brand">
              <Link to="/" className="footer-logo">
                AQUILA
              </Link>

              <p>
                Smart Water Management Platform
                <br />
                for Barangay Water and Sanitation
                <br />
                Associations.
              </p>

              <strong>RA 10173 Data Privacy Compliant</strong>
            </div>

            <div className="footer-column">
              <h3>Navigation</h3>
              <a href="/#home">Home</a>
              <a href="/#about">About</a>
              <a href="/#how-it-works">How it Works</a>
              <a href="/#features">Features</a>
              <Link to="/login">Portal Login</Link>
            </div>

            <div className="footer-column footer-contact">
              <h3>Contact &amp; Support</h3>

              <strong>LOCATION</strong>
              <p>Barangay Hall Annex, Bataan</p>

              <strong>HOTLINE</strong>
              <p>(046) 555-0192</p>

              <strong>EMERGENCY</strong>
              <p>0917 888 2340</p>

              <strong>OFFICE HOURS</strong>
              <p>Mon–Sat, 7AM–5PM</p>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © 2026 AQUILA Project Team. College of Computer Studies.
            </span>
            <span>
              Data Privacy Act RA 10173 · All household data is private.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}