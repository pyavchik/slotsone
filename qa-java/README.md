# SlotsOne — Java QA Automation Suite

End-to-end test automation framework for the SlotsOne iGaming platform, covering UI, API, and BDD layers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Automation | **Selenide** 7.x (Selenium wrapper) |
| Remote Browsers | **Selenoid** (Docker-based Selenium grid) |
| API Testing | **Rest Assured** 5.x |
| Test Runner | **TestNG** 7.x |
| BDD | **Cucumber** 7.x (Gherkin `.feature` files) |
| Build Tool | **Maven** 3.9+ |
| Reporting | **Allure** 2.x (TestNG + Selenide + Rest Assured + Cucumber integrations) |
| CI/CD | **Jenkins** (Jenkinsfile) + **GitLab CI** (.gitlab-ci.yml) |
| Language | **Java 17** |

## Project Structure

```
qa-java/
├── pom.xml                          # Maven build with profiles: api, ui, bdd, all
├── Jenkinsfile                      # Multi-stage Jenkins pipeline
├── .gitlab-ci.yml                   # GitLab CI with Selenoid service
├── docker-compose.selenoid.yml      # Selenoid + Selenoid UI
├── selenoid/
│   └── browsers.json                # Chrome & Firefox container images
└── src/test/
    ├── java/com/slotsone/qa/
    │   ├── config/
    │   │   └── TestConfig.java      # Owner-based typed config
    │   ├── api/
    │   │   ├── BaseApiTest.java     # Rest Assured base (auth helpers, logging, Allure)
    │   │   ├── AuthApiTest.java     # Registration, login, token validation (9 tests)
    │   │   ├── SpinApiTest.java     # Spin execution, balance, idempotency (7 tests)
    │   │   ├── HistoryApiTest.java  # History, pagination, filters, summary (8 tests)
    │   │   └── dto/                 # Jackson DTOs: AuthResponse, SpinResponse, etc.
    │   ├── ui/
    │   │   ├── BaseUiTest.java      # Selenide config + Selenoid remote setup
    │   │   ├── LoginUiTest.java     # Auth UI flows (5 tests)
    │   │   ├── GameUiTest.java      # Canvas, spin, HUD, bet controls (6 tests)
    │   │   ├── HistoryUiTest.java   # History table, filters, round detail (5 tests)
    │   │   └── pages/               # Page Objects: LoginPage, LobbyPage, GamePage, HistoryPage
    │   └── bdd/
    │       ├── CucumberRunner.java  # TestNG + Cucumber integration
    │       └── steps/               # Step definitions: AuthSteps, SpinSteps, HistorySteps
    └── resources/
        ├── features/                # Gherkin: auth.feature, spin.feature, history.feature
        ├── schemas/                 # JSON Schema for response validation
        ├── testng-api.xml           # API-only suite
        ├── testng-ui.xml            # UI-only suite
        ├── testng-bdd.xml           # BDD-only suite
        ├── testng-all.xml           # Full suite (API → UI → BDD)
        └── test.properties          # Environment config
```

## Quick Start

### Prerequisites
- Java 17+
- Maven 3.9+
- Docker (for Selenoid)
- SlotsOne backend running on `http://localhost:3000`

### Run API tests
```bash
mvn clean test -Papi
```

### Run UI tests (headless Chrome)
```bash
mvn clean test -Pui -Dbrowser.headless=true
```

### Run UI tests via Selenoid
```bash
# Start Selenoid
docker compose -f docker-compose.selenoid.yml up -d

# Run tests pointing to Selenoid
mvn clean test -Pui \
  -Dselenoid.enabled=true \
  -Dselenoid.url=http://localhost:4444/wd/hub

# Watch live at http://localhost:8080 (Selenoid UI)
```

### Run BDD scenarios
```bash
mvn clean test -Pbdd
```

### Run everything
```bash
mvn clean test -Pall
```

### Generate Allure report
```bash
mvn allure:serve
```

### Target a different environment
```bash
mvn clean test -Papi -Dbase.url=https://pyavchik.space
```

## Test Coverage

| Area | Tests | Key Scenarios |
|------|-------|---------------|
| Auth API | 9 | Register, login, duplicate email, invalid input, token validation |
| Spin API | 7 | Valid spin, balance deduction, idempotency, invalid session/bet |
| History API | 8 | Listing, pagination, filtering, round detail, summary stats |
| Login UI | 5 | Page render, registration, login, error display, tab switching |
| Game UI | 6 | Canvas load, spin button, balance HUD, bet controls, navigation |
| History UI | 5 | Table display, round count, summary cards, filters, round detail |
| BDD Scenarios | 19 | Full user journeys via Cucumber Gherkin |

## CI/CD

**Jenkins** — `Jenkinsfile` with parameterized build:
- Stages: Checkout → Selenoid → API Tests → UI Tests → BDD Tests → Allure Report
- Parameters: `BASE_URL`, `TEST_SUITE` (all/api/ui/bdd), `USE_SELENOID`

**GitLab CI** — `.gitlab-ci.yml` with parallel stages:
- API tests, UI tests (Selenoid service), BDD tests run in parallel
- Allure report aggregated from all stages
- Artifacts retained for 30 days
