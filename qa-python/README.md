# qa-python — Python automation framework

Pytest + Playwright + Requests + JSON Schema framework targeting the SlotsOne
RGS backend and frontend. Built as a portfolio piece mapped 1:1 to the
GlobalLogic *Middle Python Automation Test Engineer* job description
([IRC291469](https://djinni.co/jobs/812733-middle-python-automation-test-engineer-irc291/)).

## Stack ↔ JD mapping

| Job requirement                                  | Where to look in this folder                                  |
|--------------------------------------------------|---------------------------------------------------------------|
| Python proficiency for test automation           | `framework/`, `tests/api/`, `tests/ui/`, `tests/aws/`         |
| Pytest                                           | `pyproject.toml` markers, `tests/**`                          |
| Playwright                                       | `tests/ui/**` with Page Object pattern (`tests/ui/pages/`)    |
| RESTful API testing & microservices              | `tests/api/test_auth.py`, `test_game_flow.py`, `test_health.py` |
| **AWS** (CloudWatch, S3, SQS)                    | `framework/aws/`, `tests/aws/` — boto3 against moto/LocalStack/real AWS |
| JSON / data formats                              | `framework/schemas.py` validates every response against `backend/openapi.json` |
| CI/CD pipelines (GitLab CI, Jenkins, GH Actions) | `.github/workflows/qa-python.yml`, `qa-python-aws.yml`        |
| Monitoring / structured logs                     | CloudWatch Logs assertions in `framework/aws/cloudwatch_assertions.py`; Allure artifact upload |
| BDD / TDD methodology                            | tests follow Arrange/Act/Assert; markers gate smoke vs regression |
| Provably-fair / cryptographic verification       | `framework/provably_fair.py`, `tests/api/test_provably_fair.py` |

## Layout

```
qa-python/
├── framework/
│   ├── api_client.py        # Requests wrapper: timing, JSON, bearer auth
│   ├── config.py            # Env-driven settings (.env / CI vars)
│   ├── data_factory.py      # Faker-backed credential / payload factories
│   ├── provably_fair.py     # HMAC-SHA256 round-seed re-derivation
│   └── schemas.py           # Loads backend/openapi.json, validates responses
├── tests/
│   ├── api/                 # Pytest API suite (auth, game flow, fairness)
│   └── ui/                  # Playwright UI suite + Page Objects
├── conftest.py              # api / authed_api / credentials fixtures
└── pyproject.toml           # deps + pytest config + markers
```

## Quick start

```bash
cd qa-python
python -m venv .venv && source .venv/bin/activate
pip install -e .
playwright install chromium

# API base URL defaults to http://localhost:3001 — override via env or .env
export API_BASE_URL=http://localhost:3001
export UI_BASE_URL=http://localhost:5173

# Smoke tier (fast, gated path)
pytest -m smoke

# Full regression in parallel with retries
pytest -n auto --reruns 1

# API only / UI only
pytest tests/api
pytest tests/ui

# Allure report
pytest --alluredir=allure-results
allure serve allure-results
```

## Markers

```
smoke           critical path; runs on every PR
regression      full coverage; runs nightly / on-demand
api             REST API tests
ui              Playwright tests
aws             AWS-integrated tests (boto3 + moto/LocalStack/real AWS)
negative        error-path / validation tests
provably_fair   HMAC-SHA256 fairness verification
```

## Running AWS-integrated tests

The `tests/aws/` suite uses boto3 and auto-selects a backend in this priority:

1. **`CI_AWS_REAL=1`** → real AWS using ambient credentials.
2. **`AWS_ENDPOINT_URL` set** → LocalStack (or any boto3-compatible endpoint).
3. **Neither** → in-process `moto.server.ThreadedMotoServer` on a free port. Zero infra.

```bash
# Zero-infra (default — uses moto):
pytest tests/aws -m aws

# With LocalStack (more production-like):
docker compose -f docker-compose.localstack.yml up -d
AWS_ENDPOINT_URL=http://localhost:4566 \
  AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
  pytest tests/aws -m aws

# Against real AWS:
CI_AWS_REAL=1 pytest tests/aws -m aws
```

To run everything *except* AWS-tagged tests: `pytest -m "not aws"`.

Combine with `-m`: `pytest -m "smoke and api"`, `pytest -m "regression and not ui"`.

## What the suite actually proves

- **Contract conformance.** Every successful response is validated against the
  live `backend/openapi.json` via `jsonschema`. Drift between code and contract
  fails CI before it can reach the frontend or partners.
- **Authoritative state transitions.** A spin debits the wallet exactly once,
  the resulting `spin_id` shows up in `/history`, and `/history/{id}` returns
  matching financials. This catches optimistic-locking regressions.
- **Cryptographic fairness.** After seed rotation we hash the revealed
  `server_seed` and assert it equals the previously-published commitment.
  We also re-derive the per-round RNG seed via HMAC-SHA256 locally — the
  operator cannot have post-hoc tampered with the outcome without breaking
  this check.
- **Negative auth paths.** Short passwords, malformed emails, duplicate
  registrations, wrong logins, and unauthenticated spins all return the
  documented `ErrorResponse` shape.

## CI

`.github/workflows/qa-python.yml` boots a Postgres service, builds and starts
the backend, installs the framework editable, and runs `pytest tests/api -n
auto --reruns 1 --alluredir=allure-results`. Allure results upload as an
artifact for inspection.

The same workflow can be adapted to GitLab CI / Jenkins by replacing the
`uses:` blocks with equivalent install steps — the test runner itself is
driver-agnostic.

## Notes for reviewers

- The framework deliberately has **no business-logic mocks**. All tests hit a
  real backend with a real Postgres — same as the existing TS suite in `qa/`
  and Postman collection in `postman/`. Mocked tests passing while a migration
  silently breaks production is a failure mode this codebase has chosen to
  avoid.
- New users seed at $1,000 (100,000 cents) per `backend/src/migrations/002_game_history.sql`,
  which sets the upper bound for post-spin balance assertions.
- For healthcare contexts (FHIR / HL7v2 / DICOM), the same architecture applies:
  swap `framework/schemas.py` over to FHIR StructureDefinition JSON, and
  `framework/api_client.py` already speaks Bearer auth — the only addition
  needed is an OAuth2 token-exchange step and a `pytest-bdd` layer for
  scenario-driven compliance documentation.
