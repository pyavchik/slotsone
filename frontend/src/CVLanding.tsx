import { Link } from 'react-router-dom';
import { SplineRobot } from './SplineRobot';
import './cvLanding.css';

const CV_PDF_PATH = '/QA_Oleksander_Pyavchik_CV.pdf';

const SKILLS = [
  'Java',
  'Automated Testing',
  'Test Framework Dev',
  'API Testing',
  'E2E Testing',
  'CI/CD',
  'JMeter',
  'Test Plans & Cases',
  'Bug Reporting',
  'Automated Reports',
];

const EXPERIENCE = [
  {
    role: 'AQA Engineer',
    company: 'EG',
    period: '2021 — 2025',
    highlights: [
      'Team of 5 QA automation engineers',
      'Maintained 1500+ automated tests',
      'AI-accelerated test generation',
    ],
  },
  {
    role: 'AQA Engineer',
    company: 'Digicode',
    period: '2019 — 2021',
    highlights: ['UI & API automation from scratch', 'JMeter load testing scenarios'],
  },
  {
    role: 'QA Engineer',
    company: 'Innovation Group',
    period: '2014 — 2019',
    highlights: ['Java test suites for web & mobile', 'Manual testing & documentation'],
  },
];

const PORTFOLIO = [
  { href: '/requirements.html', label: 'Requirements', testId: 'cv-requirements' },
  { href: '/test-cases.html', label: 'Test Cases', testId: 'cv-test-cases' },
  { href: '/postman-tests.html', label: 'Postman' },
  { href: '/api-docs', label: 'Swagger' },
  { href: '/sql.html', label: 'SQL', testId: 'cv-sql' },
  { href: '/bug-report.html', label: 'Bug Report' },
];

export function CVLanding() {
  return (
    <div className="hud-root">
      {/* ── Full-bleed 3D robot — z-index 0 ── */}
      <SplineRobot />

      {/* ── HUD overlay — pointer-events: none on all wrappers ── */}
      <div className="hud-overlay">
        {/* TOP BAR */}
        <header className="hud-topbar hud-inert">
          <div className="hud-brand hud-inert">
            <span className="hud-name" data-testid="cv-title">
              Oleksander Pyavchik
            </span>
            <span className="hud-role">Automated QA Engineer</span>
          </div>
          <nav className="hud-topnav hud-inert">
            <Link
              to="/slots"
              className="hud-btn hud-btn--primary hud-active"
              data-testid="cv-open-slots"
            >
              Live Demo
            </Link>
            <a
              href={CV_PDF_PATH}
              target="_blank"
              rel="noreferrer"
              className="hud-btn hud-btn--ghost hud-active"
            >
              Download CV
            </a>
          </nav>
        </header>

        {/* MAIN COLUMNS */}
        <div className="hud-columns">
          {/* LEFT PANEL — Identity + Contact */}
          <aside className="hud-panel hud-panel--left hud-inert">
            <figure className="hud-avatar hud-inert">
              <img src="/cv-photo.png" alt="Oleksander Pyavchik" />
            </figure>

            <div className="hud-id hud-inert">
              <span className="hud-location hud-inert">
                Odesa, Ukraine &nbsp;·&nbsp; <span className="hud-avail">Available</span>
              </span>
            </div>

            <div className="hud-divider" />

            <div className="hud-contacts hud-inert">
              <a href="mailto:pyavchik@gmail.com" className="hud-contact hud-active">
                pyavchik@gmail.com
              </a>
              <a href="tel:+380639977874" className="hud-contact hud-active">
                +380 63 997 7874
              </a>
            </div>

            <div className="hud-divider" />

            <p className="hud-about hud-inert">
              7+ years shipping quality at scale — building automation frameworks from zero,
              maintaining 1500+ tests, and integrating CI/CD pipelines.
            </p>
          </aside>

          {/* CENTER — intentionally empty so robot is visible */}
          <div className="hud-center" />

          {/* RIGHT PANEL — Experience */}
          <aside className="hud-panel hud-panel--right hud-inert">
            <h2 className="hud-section-label hud-inert">Experience</h2>
            <div className="hud-timeline hud-inert">
              {EXPERIENCE.map((job) => (
                <div key={job.company} className="hud-job hud-inert">
                  <div className="hud-job-head hud-inert">
                    <span className="hud-job-role hud-inert">{job.role}</span>
                    <span className="hud-job-co hud-inert">{job.company}</span>
                    <span className="hud-job-period hud-inert">{job.period}</span>
                  </div>
                  <ul className="hud-job-list hud-inert">
                    {job.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* BOTTOM BAR — Skills + Portfolio */}
        <footer className="hud-bottom hud-inert">
          <div className="hud-skills hud-inert">
            {SKILLS.map((s) => (
              <span key={s} className="hud-chip hud-inert">
                {s}
              </span>
            ))}
          </div>

          <div className="hud-portfolio hud-inert">
            <span className="hud-section-label hud-inert">Portfolio</span>
            <div className="hud-portlinks hud-inert">
              {PORTFOLIO.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hud-portlink hud-active"
                  data-testid={l.testId}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div className="hud-foot hud-inert">
            <span>Ukrainian · English</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
