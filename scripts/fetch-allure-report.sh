#!/usr/bin/env bash
# Download the latest Allure report from Jenkins and extract it
# into the allure-report volume directory.
#
# Usage: JENKINS_USER=admin JENKINS_TOKEN=... ./scripts/fetch-allure-report.sh
#
# Environment variables:
#   JENKINS_URL       — Jenkins base URL (default: http://70.34.251.44:8080)
#   JENKINS_JOB       — Job name (default: slotsone-playwright)
#   JENKINS_USER      — Jenkins username (required)
#   JENKINS_TOKEN     — Jenkins API token or password (required)
#   ALLURE_REPORT_DIR — Destination directory (default: ./allure-report/html)

set -euo pipefail

JENKINS_URL="${JENKINS_URL:-http://70.34.251.44:8080}"
JENKINS_JOB="${JENKINS_JOB:-slotsone-playwright}"
ALLURE_REPORT_DIR="${ALLURE_REPORT_DIR:-./allure-report/html}"

if [ -z "${JENKINS_USER:-}" ] || [ -z "${JENKINS_TOKEN:-}" ]; then
  echo "Error: JENKINS_USER and JENKINS_TOKEN are required"
  exit 1
fi

AUTH="${JENKINS_USER}:${JENKINS_TOKEN}"

# Find the latest build number
BUILD_NUM=$(curl -sf -u "$AUTH" \
  "${JENKINS_URL}/job/${JENKINS_JOB}/lastBuild/api/json" \
  | grep -o '"number" *: *[0-9]*' | head -1 | grep -o '[0-9]*')

echo "Latest build: #${BUILD_NUM}"

# Download the allure-report.zip artifact
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading allure-report.zip..."
curl -sf -u "$AUTH" \
  "${JENKINS_URL}/job/${JENKINS_JOB}/${BUILD_NUM}/artifact/allure-report.zip" \
  -o "${TMP_DIR}/allure-report.zip"

echo "Extracting to ${ALLURE_REPORT_DIR}..."
mkdir -p "$ALLURE_REPORT_DIR"
rm -rf "${ALLURE_REPORT_DIR:?}"/*
unzip -qo "${TMP_DIR}/allure-report.zip" -d "$TMP_DIR"

# The zip contains an allure-report/ directory; move its contents
if [ -d "${TMP_DIR}/allure-report" ]; then
  cp -a "${TMP_DIR}/allure-report/." "$ALLURE_REPORT_DIR/"
else
  cp -a "${TMP_DIR}/." "$ALLURE_REPORT_DIR/"
fi

echo "Done! Allure report available at ${ALLURE_REPORT_DIR}/"
