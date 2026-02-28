import './cvLanding.css';

const CV_PDF_PATH = '/QA_Oleksander_Pyavchik_CV.pdf';
const REQUIREMENTS_PATH = '/requirements.html';
const TEST_CASES_PATH = '/test-cases.html';
const POSTMAN_TESTS_PATH = '/postman-tests.html';
const SWAGER_PATH = '/api-docs';

const SKILLS = [
  'Java',
  'Automated Testing',
  'Test Framework Development',
  'API Testing',
  'End-to-End (E2E) Testing',
  'CI/CD',
  'JMeter (Load Testing)',
  'Test Plans & Test Cases',
  'Bug Reporting',
  'Automated Reports',
];

const EXPERIENCE = [
  {
    role: 'AQA Engineer',
    company: 'EG',
    period: '2021 - 2025',
    location: 'Remote',
    highlights: [
      'Worked in a team of 5 QA automation engineers.',
      'Wrote automated tests for an existing automation framework.',
      'Maintained and updated over 1500 automated tests.',
      'Ensured test stability and reliability across multiple environments.',
      'Used AI tools to accelerate automated test generation and maintenance.',
    ],
  },
  {
    role: 'AQA Engineer',
    company: 'Digicode',
    period: '2019 - 2021',
    location: 'Kiev',
    highlights: [
      'Created comprehensive test plans from scratch.',
      'Built UI end-to-end automation framework from the ground up.',
      'Developed API automation test framework independently.',
      'Designed and implemented JMeter tests for load testing scenarios.',
    ],
  },
  {
    role: 'Manual/Automation QA',
    company: 'Innovation Group',
    period: '2014 - 2019',
    location: 'Odesa',
    highlights: [
      'Supported and enhanced automated tests using Java.',
      'Performed manual testing of web and mobile applications.',
      'Wrote detailed test cases and test documentation.',
      'Collaborated with developers to resolve issues quickly.',
    ],
  },
];

export function CVLanding({ onOpenSlots }: { onOpenSlots: () => void }) {
  return (
    <main className="cv-page">
      <header className="cv-header-card">
        <div className="cv-header-main">
          <figure className="cv-avatar-wrap">
            <img src="/cv-photo.png" alt="Oleksander Pyavchik" className="cv-avatar" />
          </figure>

          <div className="cv-identity">
            <p className="cv-kicker">Automated QA Engineer</p>
            <h1 className="cv-title" data-testid="cv-title">
              Oleksander Pyavchik
            </h1>
            <p className="cv-subtitle">
              Experienced QA engineer with 7+ years in automation, API/E2E testing, CI/CD, and
              performance testing.
            </p>

            <ul className="cv-contact-list" aria-label="Contact information">
              <li>
                <a href="mailto:pyavchik@gmail.com">pyavchik@gmail.com</a>
              </li>
              <li>
                <a href="tel:+380639977874">+380 63 997 7874</a>
              </li>
              <li>Odesa, Ukraine</li>
            </ul>
          </div>
        </div>

        <div className="cv-actions">
          <button
            type="button"
            className="cv-open-slots"
            onClick={onOpenSlots}
            data-testid="cv-open-slots"
          >
            slots
          </button>
          <a
            className="cv-link"
            href={REQUIREMENTS_PATH}
            target="_blank"
            rel="noreferrer"
            data-testid="cv-requirements"
          >
            requirements
          </a>
          <a
            className="cv-link"
            href={TEST_CASES_PATH}
            target="_blank"
            rel="noreferrer"
            data-testid="cv-test-cases"
          >
            test cases
          </a>
          <a className="cv-link" href={POSTMAN_TESTS_PATH} target="_blank" rel="noreferrer">
            postman
          </a>
          <a className="cv-link" href={SWAGER_PATH} target="_blank" rel="noreferrer">
            swager
          </a>
          <a className="cv-link" href={CV_PDF_PATH} target="_blank" rel="noreferrer">
            Download PDF CV
          </a>
        </div>
      </header>

      <section className="cv-section">
        <h2>Professional Summary</h2>
        <p>
          Experienced Automated QA Engineer with 7+ years of expertise in test automation, CI/CD,
          and test framework development. Strong background in building automation frameworks from
          scratch and maintaining large test suites, with deep hands-on experience in Java, API,
          end-to-end, and performance testing using JMeter.
        </p>
      </section>

      <section className="cv-section">
        <h2>Work Experience</h2>
        <div className="cv-experience-list">
          {EXPERIENCE.map((item) => (
            <article key={`${item.company}-${item.period}`} className="cv-experience-item">
              <div className="cv-experience-head">
                <h3>
                  {item.role} at {item.company}
                </h3>
                <p>
                  {item.period} • {item.location}
                </p>
              </div>
              <ul>
                {item.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="cv-section">
        <h2>Core Skills</h2>
        <div className="cv-skills-grid">
          {SKILLS.map((skill) => (
            <span key={skill} className="cv-skill-pill">
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section className="cv-section cv-languages">
        <h2>Languages</h2>
        <p>Ukrainian, English</p>
      </section>

      <section className="cv-section cv-final-cta">
        <h2>Project Demo</h2>
        <p>Use the button below to launch the interactive slots application.</p>
        <button
          type="button"
          className="cv-open-slots"
          onClick={onOpenSlots}
          data-testid="cv-open-slots"
        >
          slots
        </button>
      </section>
    </main>
  );
}
