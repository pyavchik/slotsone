import { Link } from 'react-router-dom';
import { SplineRobot } from './SplineRobot';
import './cvLanding.css';

const CV_PDF_PATH = '/QA_Oleksander_Pyavchik_CV.pdf';
const REQUIREMENTS_PATH = '/requirements.html';
const TEST_CASES_PATH = '/test-cases.html';
const POSTMAN_TESTS_PATH = '/postman-tests.html';
const SWAGER_PATH = '/api-docs';
const SQL_PATH = '/sql.html';
const BUG_REPORT_PATH = '/bug-report.html';
const TEST_DESIGN_PATH = '/test-design.html';
const ALLURE_REPORT_PATH = 'https://pyavchik.github.io/slotsone-playwright/';
const PLAYWRIGHT_PATH = '/playwright.html';
const JMETER_RTP_PATH = '/jmeter-rtp.html';
const JMETER_LOAD_PATH = '/jmeter-load.html';
const EXPLORATORY_PATH = '/exploratory-testing.html';
const QA_STRATEGY_PATH = '/qa-strategy.html';
const GAME_MATH_PATH = '/game-math.html';
const TM_REQUIREMENTS_PATH = '/time-machine-requirements.html';
const TM_TEST_CASES_PATH = '/time-machine-test-cases.html';
const LOCALIZATION_TESTING_PATH = '/localization-testing.html';
const RESPONSIVE_TESTING_PATH = '/responsive-testing.html';
const VISUAL_REGRESSION_PATH = '/visual-regression.html';
const NETWORK_TESTING_PATH = '/network-testing.html';
const GRAPHQL_TESTING_PATH = '/graphql-testing.html';
const JAVA_AUTOMATION_PATH = '/java-automation.html';

const SKILLS = [
  'Java',
  'Selenide',
  'Selenoid',
  'Rest Assured',
  'TestNG',
  'Cucumber / BDD',
  'Maven',
  'CI/CD (Jenkins, GitLab CI)',
  'JMeter (Load Testing)',
  'Postman',
  'SQL',
  'Docker',
  'Allure Reporting',
  'Git / GitHub',
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

export function CVLanding() {
  return (
    <>
      <SplineRobot />
      <main className="cv-page">
        <header className="cv-header-card">
          <div className="cv-header-main">
            <div className="cv-name-row">
              <figure className="cv-avatar-wrap">
                <img src="/cv-photo.png" alt="Oleksander Pyavchik" className="cv-avatar" />
              </figure>
              <div className="cv-identity">
                <p className="cv-kicker">Automation QA Engineer</p>
                <h1 className="cv-title" data-testid="cv-title">
                  Oleksander Pyavchik
                </h1>
              </div>
            </div>
            <p className="cv-subtitle">
              7+ years in automation, API/E2E testing, CI/CD, and performance testing.
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

          <div className="cv-actions">
            <Link to="/slots" className="cv-link cv-link--slots" data-testid="cv-open-slots">
              slots
            </Link>
            <a
              className="cv-link"
              href={JAVA_AUTOMATION_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-java-automation"
            >
              java automation
            </a>
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
            <a
              className="cv-link"
              href={SQL_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-sql"
            >
              sql
            </a>
            <a
              className="cv-link"
              href={TEST_DESIGN_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-test-design"
            >
              test design
            </a>
            <a className="cv-link" href={BUG_REPORT_PATH} target="_blank" rel="noreferrer">
              bug report
            </a>
            <a
              className="cv-link"
              href={ALLURE_REPORT_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-allure-report"
            >
              allure report
            </a>
            <a
              className="cv-link"
              href={JMETER_RTP_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-jmeter-rtp"
            >
              jmeter RTP
            </a>
            <a
              className="cv-link"
              href={JMETER_LOAD_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-jmeter-load"
            >
              jmeter load test
            </a>
            <a
              className="cv-link"
              href={GAME_MATH_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-game-math"
            >
              game math
            </a>
            <a
              className="cv-link"
              href={EXPLORATORY_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-exploratory"
            >
              exploratory testing
            </a>
            <a
              className="cv-link"
              href={QA_STRATEGY_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-qa-strategy"
            >
              QA strategy
            </a>
            <a
              className="cv-link"
              href={TM_REQUIREMENTS_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-tm-requirements"
            >
              time machine SRS
            </a>
            <a
              className="cv-link"
              href={TM_TEST_CASES_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-tm-test-cases"
            >
              time machine tests
            </a>
            <a
              className="cv-link"
              href={LOCALIZATION_TESTING_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-localization"
            >
              i18n testing
            </a>
            <a
              className="cv-link"
              href={RESPONSIVE_TESTING_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-responsive"
            >
              responsive testing
            </a>
            <a
              className="cv-link"
              href={VISUAL_REGRESSION_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-visual-regression"
            >
              visual regression
            </a>
            <a
              className="cv-link"
              href={NETWORK_TESTING_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-network-testing"
            >
              network testing
            </a>
            <a
              className="cv-link"
              href={GRAPHQL_TESTING_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-graphql"
            >
              GraphQL testing
            </a>
            <a
              className="cv-link"
              href={PLAYWRIGHT_PATH}
              target="_blank"
              rel="noreferrer"
              data-testid="cv-playwright"
            >
              playwright typescript
            </a>
          </div>
          <a className="cv-pdf-link" href={CV_PDF_PATH} target="_blank" rel="noreferrer">
            Download PDF CV
          </a>
        </header>

        <section className="cv-section cv-summary">
          <h2>Professional Summary</h2>
          <ul>
            <li>7+ years in QA automation — Java, Selenide, Rest Assured, TestNG, Cucumber</li>
            <li>Built UI and API automation frameworks from scratch</li>
            <li>Maintained and scaled 1500+ automated tests across multiple projects</li>
            <li>CI/CD pipeline design — Jenkins, GitLab CI, Selenoid</li>
            <li>Performance and load testing with JMeter</li>
          </ul>
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
          <Link to="/slots" className="cv-link cv-link--slots" data-testid="cv-open-slots-cta">
            slots
          </Link>
        </section>
      </main>
    </>
  );
}
