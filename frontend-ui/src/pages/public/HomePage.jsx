import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Sample data arrays for 24-hour flow and repair verification
const heroFlowData = [
  { hour: '00:00', flow: 0.3 },
  { hour: '02:00', flow: 0.1, leakFlow: 3.9 },
  { hour: '04:00', flow: 0.2, leakFlow: 4.0 },
  { hour: '06:00', flow: 4.8 },
  { hour: '08:00', flow: 8.4 },
  { hour: '12:00', flow: 3.6 },
  { hour: '16:00', flow: 3.5 },
  { hour: '18:00', flow: 10.4 },
  { hour: '20:00', flow: 5.1 },
  { hour: '24:00', flow: 0.3 },
];

const repairVerificationData = [
  { min: 0, flow: 5.0, status: 'elevated' },
  { min: 10, flow: 4.9, status: 'elevated' },
  { min: 20, flow: 4.8, status: 'repair' },
  { min: 21, flow: 0.05, status: 'verified' },
  { min: 36, flow: 0.02, status: 'verified' },
];

const problems = [
  {
    title: 'Hidden Underground Leaks',
    text: 'Pipes crack beneath the ground and run unnoticed for days, silently wasting thousands of liters before anyone notices.',
  },
  {
    title: 'Uneven Water Pressure',
    text: 'Homes near the tank get strong flow while families at the end of the line are left with dry taps.',
  },
  {
    title: 'Slow, Guesswork Repairs',
    text: 'Plumbers only hear about breaks after frustrated residents call — then spend hours hunting for the leak’s location.',
  },
];

const processSteps = [
  {
    title: 'Smart Readers Read the Flow',
    text: 'Digital flow sensors at pipe junctions report water velocity every 15 seconds — day and night, continuously.',
  },
  {
    title: 'System Spots Anomalies',
    text: 'Background analyzers compare real-time water draw against normal routines to catch sudden bursts or continuous night flows.',
  },
  {
    title: 'Advises the Right Action',
    text: 'The dashboard shows technicians the exact pipe branch to inspect — avoiding unnecessary digging or guesswork.',
  },
  {
    title: 'Human Fixes & Auto Verification',
    text: 'A plumber repairs the pipe. The system then automatically watches the flow for 15 minutes to verify the leak has stopped.',
  },
];

const features = [
  {
    title: 'Water Flow Monitoring',
    text: 'Real-time, continuous tracking of neighborhood pipe velocity and IoT sensor battery health across all 9 nodes.',
  },
  {
    title: 'Underground Leak Detection',
    text: 'Distinguishes legitimate daytime use (showers, laundry) from continuous underground pipe cracks using flow pattern analysis.',
  },
  {
    title: 'Fair-Share Assessment',
    text: 'Monitors if uphill or terminal homes are being starved of their fair share of community water and flags the deficit.',
  },
  {
    title: 'Root-Cause Analysis',
    text: 'Traces connected pipe branches so downstream homes don’t trigger false alarms when an upstream pipe breaks.',
  },
  {
    title: 'Repair Outcome Verification',
    text: 'Automatically observes the pipe for 15 minutes after a plumber finishes work to verify the leak has completely stopped.',
  },
  {
    title: 'Transparent Reports & History',
    text: 'Generates clean records of water saved, repair response times, and daily community volume for accountability.',
  },
];

function HeroFlowChart() {
  return (
    <div className="flow-chart-panel">
      <div className="chart-header">
        <h3 className="chart-title">24-hour flow at one node</h3>
      </div>
      <div className="chart-svg-wrap">
        <svg
          viewBox="0 0 540 240"
          className="chart-svg"
          role="img"
          aria-label="24-hour flow at one node showing normal daytime peaks and continuous underground leak signature at night"
        >
          {/* Y Axis Gridlines and Ticks */}
          <line x1="55" y1="45" x2="510" y2="45" stroke="var(--border-subtle)" strokeDasharray="3 3" strokeWidth="1" />
          <text x="48" y="49" textAnchor="end" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">10</text>

          <line x1="55" y1="112" x2="510" y2="112" stroke="var(--border-subtle)" strokeDasharray="3 3" strokeWidth="1" />
          <text x="48" y="116" textAnchor="end" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">5</text>

          {/* Dashed baseline line labeled inline */}
          <line x1="55" y1="180" x2="510" y2="180" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="48" y="184" textAnchor="end" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">0</text>
          <line x1="160" y1="172" x2="210" y2="172" stroke="var(--aquila-text-muted)" strokeDasharray="4 3" strokeWidth="1.5" />
          <text x="216" y="176" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">Baseline (0 L/min)</text>

          {/* Y-axis label */}
          <text
            x="-112"
            y="18"
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="14"
            fill="var(--aquila-text-muted)"
            fontWeight="600"
          >
            Flow (L/min)
          </text>

          {/* X Axis ticks every 6h */}
          <line x1="55" y1="180" x2="55" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="55" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">00:00</text>

          <line x1="168" y1="180" x2="168" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="168" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">06:00</text>

          <line x1="282" y1="180" x2="282" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="282" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">12:00</text>

          <line x1="396" y1="180" x2="396" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="396" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">18:00</text>

          <line x1="510" y1="180" x2="510" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="510" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">24:00</text>

          {/* Normal 24h Flow Curve: 2 daytime peaks (morning at 7-8 AM, evening at 6 PM), near zero 1-4 AM */}
          <path
            d="M 55 176
               C 65 178, 70 179, 74 179
               L 131 179
               C 145 178, 155 160, 168 118
               C 180 80, 192 48, 202 52
               C 215 56, 225 120, 245 150
               C 260 148, 270 135, 282 135
               C 295 135, 305 152, 320 152
               C 340 152, 355 130, 370 95
               C 382 60, 396 42, 408 50
               C 420 58, 435 110, 452 145
               C 470 165, 490 174, 510 176"
            fill="none"
            stroke="var(--aquila-blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Elevated Night Flow (Continuous Underground Leak Signature: 1-4 AM) */}
          <path
            d="M 74 179
               C 78 135, 82 128, 93 128
               L 125 128
               C 133 128, 137 145, 142 176"
            fill="none"
            stroke="var(--aquila-danger)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Danger Callout & Pointer */}
          <circle cx="109" cy="128" r="4" fill="var(--aquila-danger)" />
          <line x1="109" y1="128" x2="109" y2="92" stroke="var(--aquila-danger)" strokeWidth="1.5" strokeDasharray="2 2" />
          <rect x="52" y="68" width="155" height="22" rx="4" fill="var(--aquila-danger-bg)" stroke="var(--aquila-danger)" strokeWidth="1" />
          <text x="129" y="83" textAnchor="middle" fontSize="14" fill="var(--aquila-danger)" fontWeight="600">
            Continuous night flow
          </text>
        </svg>
      </div>
      <p className="chart-caption">Illustrative example</p>

      {/* Hero Stats */}
      <div className="hero-stats-grid">
        <div className="hero-stat-item">
          <strong className="stat-number">9</strong>
          <span className="stat-label">Sensor nodes</span>
        </div>
        <div className="hero-stat-item">
          <strong className="stat-number">15 s</strong>
          <span className="stat-label">Reading interval</span>
        </div>
        <div className="hero-stat-item">
          <strong className="stat-number">15 min</strong>
          <span className="stat-label">Repair verification</span>
        </div>
      </div>
    </div>
  );
}

function RepairVerificationChart() {
  return (
    <div className="flow-chart-panel">
      <div className="chart-header">
        <h3 className="chart-title">Repair verification</h3>
      </div>
      <div className="chart-svg-wrap">
        <svg
          viewBox="0 0 540 240"
          className="chart-svg"
          role="img"
          aria-label="Water flow drops to baseline following plumber repair and remains steady during 15-minute auto-verification window"
        >
          {/* Shaded 15-minute verification window */}
          <rect
            x="250"
            y="35"
            width="200"
            height="145"
            fill="var(--aquila-emerald-light)"
            stroke="var(--aquila-emerald)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            rx="6"
          />
          <text x="350" y="58" textAnchor="middle" fontSize="14" fill="var(--aquila-emerald-dark)" fontWeight="600">
            Auto-verification: leak stopped
          </text>
          <text x="350" y="78" textAnchor="middle" fontSize="14" fill="var(--aquila-emerald-dark)" fontWeight="500">
            (15 min steady baseline)
          </text>

          {/* Y Axis Gridlines and Ticks */}
          <line x1="55" y1="45" x2="510" y2="45" stroke="var(--border-subtle)" strokeDasharray="3 3" strokeWidth="1" />
          <text x="48" y="49" textAnchor="end" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">10</text>

          <line x1="55" y1="112" x2="510" y2="112" stroke="var(--border-subtle)" strokeDasharray="3 3" strokeWidth="1" />
          <text x="48" y="116" textAnchor="end" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">5</text>

          <line x1="55" y1="180" x2="510" y2="180" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="48" y="184" textAnchor="end" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">0</text>

          {/* Y-axis label */}
          <text
            x="-112"
            y="18"
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="14"
            fill="var(--aquila-text-muted)"
            fontWeight="600"
          >
            Flow (L/min)
          </text>

          {/* X Axis Time Ticks (Minutes) */}
          <line x1="55" y1="180" x2="55" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="55" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">0 min</text>

          <line x1="160" y1="180" x2="160" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="160" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">10 min</text>

          <line x1="245" y1="180" x2="245" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="245" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">20 min</text>

          <line x1="450" y1="180" x2="450" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="450" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">35 min</text>

          <line x1="510" y1="180" x2="510" y2="187" stroke="var(--border-default)" strokeWidth="1.5" />
          <text x="510" y="206" textAnchor="middle" fontSize="14" fill="var(--aquila-text-muted)" fontWeight="500">40 min</text>

          {/* Elevated Flow before repair (~4.8 L/min at y=114) */}
          <path
            d="M 55 114
               L 235 114
               C 242 114, 246 150, 250 178
               L 510 178"
            fill="none"
            stroke="var(--aquila-blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Plumber Repairs Vertical Marker */}
          <line x1="235" y1="35" x2="235" y2="180" stroke="var(--aquila-navy)" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="235" cy="114" r="5" fill="var(--aquila-navy)" />
          <rect x="170" y="16" width="130" height="24" rx="4" fill="var(--bg-surface)" stroke="var(--aquila-navy)" strokeWidth="1.5" />
          <text x="235" y="32" textAnchor="middle" fontSize="14" fill="var(--aquila-navy)" fontWeight="600">
            Plumber repairs
          </text>
        </svg>
      </div>
      <p className="chart-caption">Illustrative example</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="aquila-home">
      {/* HERO SECTION */}
      <section className="hero-background" id="home">
        <div className="landing-container">
          <div className="hero-section">
            <div className="hero-copy">
              <h1>
                Smart, Fair Water <strong>Monitoring</strong> for your <i>community.</i>
              </h1>

              <p className="hero-description">
                The device and dashboard dedicated to making your community's
                water management accessible, smart, and intuitive. Join AQUILA today.
              </p>

              <div className="hero-actions">
                <Link to="/login" className="button button-dark">
                  Access Portal <ArrowRight size={16} />
                </Link>

                <a href="#how-it-works" className="button button-light">
                  See How it Works
                </a>
              </div>
            </div>

            <div className="hero-visual">
              <HeroFlowChart />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="about-section wave-top" id="about">
        <div className="landing-container">
          <div className="section-heading about-heading">
            <div>
              <h2>AQUILA's Driving Purpose is to address</h2>
            </div>
          </div>

          <div className="problem-grid">
            {problems.map(({ title, text }) => (
              <article className="problem-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="about-detail-grid">
            <article className="detail-card">
              <div className="detail-title">
                <h3>Purpose Built For</h3>
              </div>

              <ul className="audience-list">
                <li>
                  <strong>BAWASA Admins</strong>
                  <span>
                    Full network oversight, incident management, and audit
                    reports
                  </span>
                </li>
                <li>
                  <strong>Community Plumbers</strong>
                  <span>Precise location data to find and fix leaks fast</span>
                </li>
                <li>
                  <strong>Local Residents</strong>
                  <span>
                    Transparent view of your own water usage and connection
                    status
                  </span>
                </li>
              </ul>
            </article>

            <article className="detail-card privacy-card">
              <div className="detail-title">
                <h3>RA 10173 COMPLIANT</h3>
              </div>

              <h3 className="privacy-title">Your Privacy Is Protected</h3>

              <p>
                Household water usage data stays private and is never shared
                publicly. Only aggregate network metrics are visible to the
                community.
              </p>

              <p className="privacy-note">
                Compliant with the Republic Act 10173 — Data Privacy Act of
                2012.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / PROCESS SECTION */}
      <section className="process-background">
        <div className="landing-container">
          <div className="process-section" id="how-it-works">
            <div className="process-title">
              <div>
                <h2>One centralized system to monitor, maintain, and manage.</h2>
              </div>
            </div>

            <div className="process-content">
              <div className="process-visual">
                <RepairVerificationChart />

                <div className="process-caption">
                  <span>THE AQUILA PROCESS</span>
                  <strong>MONITOR → ANALYZE → IDENTIFY → VERIFY</strong>
                </div>
              </div>

              <div className="step-list">
                {processSteps.map((step, index) => (
                  <article className="step-card" key={step.title}>
                    <div className="step-body">
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>

                    <span className="step-number">
                      0{index + 1}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section wave-top" id="features">
        <div className="landing-container">
          <div className="section-heading features-heading">
            <div>
              <h2>AQUILA's Community-Oriented Solutions</h2>
            </div>
          </div>

          <div className="feature-grid">
            {features.map(({ title, text }) => (
              <article className="feature-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="closing-cta">
            <div>
              <h2>Ready to Protect your Community’s Water?</h2>
              <p>
                Log in to the AQUILA admin portal or contact your BAWASA
                representative.
              </p>
            </div>

            <Link to="/login" className="button button-light">
              Access Portal <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}