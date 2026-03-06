import { Link } from 'react-router-dom';
import { SplineRobot } from './SplineRobot';
import './cvLanding.css';

const CV_PDF_PATH = '/QA_Oleksander_Pyavchik_CV.pdf';

const SKILLS = [
  'Java',
  'Automated Testing',
  'Test Framework Development',
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
    location: 'Remote',
    highlights: [
      'Team of 5 QA automation engineers.',
      'Maintained 1500+ automated tests across multiple environments.',
      'Used AI tools to accelerate test generation and maintenance.',
    ],
  },
  {
    role: 'AQA Engineer',
    company: 'Digicode',
    period: '2019 — 2021',
    location: 'Kiev',
    highlights: [
      'Built UI and API automation frameworks from scratch.',
      'Designed JMeter load testing scenarios independently.',
    ],
  },
  {
    role: 'QA Engineer',
    company: 'Innovation Group',
    period: '2014 — 2019',
    location: 'Odesa',
    highlights: [
      'Java-based automated test suites for web and mobile.',
      'Manual testing, detailed test cases and documentation.',
    ],
  },
];

const LINKS = [
  { href: '/requirements.html', label: 'Requirements', testId: 'cv-requirements' },
  { href: '/test-cases.html', label: 'Test Cases', testId: 'cv-test-cases' },
  { href: '/postman-tests.html', label: 'Postman' },
  { href: '/api-docs', label: 'Swagger' },
  { href: '/sql.html', label: 'SQL', testId: 'cv-sql' },
  { href: '/bug-report.html', label: 'Bug Report' },
];

export function CVLanding() {
  return (
    <div className="layout">
      {/* ── RIGHT — 3D robot, fixed, interactive ── */}
      <SplineRobot />

      {/* ── LEFT — scrollable sidebar ─────────── */}
      <aside className="sidebar">
        {/* Identity */}
        <header className="id-block">
          <figure className="avatar-ring">
            <img src="/cv-photo.png" alt="Oleksander Pyavchik" />
          </figure>
          <div className="id-text">
            <span className="label" data-testid="cv-title">
              Oleksander Pyavchik
            </span>
            <span className="role">Automated QA Engineer</span>
            <span className="location">
              Odesa, Ukraine · <span className="avail">Available</span>
            </span>
          </div>
        </header>

        {/* CTA row */}
        <div className="cta-row">
          <Link to="/slots" className="cta-primary" data-testid="cv-open-slots">
            Live Demo
          </Link>
          <a href={CV_PDF_PATH} target="_blank" rel="noreferrer" className="cta-ghost">
            Download CV
          </a>
        </div>

        {/* Contact */}
        <div className="contact-row">
          <a href="mailto:pyavchik@gmail.com" className="contact-item">
            pyavchik@gmail.com
          </a>
          <a href="tel:+380639977874" className="contact-item">
            +380 63 997 7874
          </a>
        </div>

        <div className="divider" />

        {/* Summary */}
        <section className="section">
          <h2 className="section-label">About</h2>
          <p className="body-text">
            7+ years shipping quality at scale — building automation frameworks from zero,
            maintaining 1500+ tests, integrating CI/CD pipelines, and proving software works before
            users ever see it.
          </p>
        </section>

        <div className="divider" />

        {/* Experience */}
        <section className="section">
          <h2 className="section-label">Experience</h2>
          <div className="timeline">
            {EXPERIENCE.map((job) => (
              <div key={job.company} className="job">
                <div className="job-meta">
                  <div>
                    <span className="job-role">{job.role}</span>
                    <span className="job-company">{job.company}</span>
                  </div>
                  <span className="job-period">{job.period}</span>
                </div>
                <ul className="job-list">
                  {job.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Skills */}
        <section className="section">
          <h2 className="section-label">Skills</h2>
          <div className="chips">
            {SKILLS.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Portfolio links */}
        <section className="section">
          <h2 className="section-label">QA Portfolio</h2>
          <div className="link-grid">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="portfolio-link"
                data-testid={l.testId}
              >
                {l.label}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path
                    d="M2 8L8 2M8 2H3M8 2V7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </div>
        </section>

        <footer className="sidebar-footer">
          <span>Ukrainian · English</span>
          <span>© 2025</span>
        </footer>
      </aside>
    </div>
  );
}
