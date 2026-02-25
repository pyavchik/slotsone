#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/safe-pr.sh [options]

Options:
  --base <branch>       Base branch name (default: main)
  --remote <name>       Git remote name (default: origin)
  --no-fetch            Skip git fetch of base branch
  --allow-untracked     Do not fail on untracked files
  --push                Push current branch to remote after checks pass
  --create-pr           Create PR with GitHub CLI after checks pass
  --draft               Create PR as draft (only with --create-pr)
  --title <text>        PR title (only with --create-pr)
  --body <text>         PR body text (only with --create-pr)
  --body-file <path>    PR body from file (only with --create-pr)
  --help                Show this help

Examples:
  scripts/safe-pr.sh
  scripts/safe-pr.sh --allow-untracked --push
  scripts/safe-pr.sh --push --create-pr --title "Fix RNG seed source" --body "Remove Math.random fallback."
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

BASE_BRANCH="main"
REMOTE_NAME="origin"
DO_FETCH=1
ALLOW_UNTRACKED=0
DO_PUSH=0
DO_CREATE_PR=0
DRAFT=0
PR_TITLE=""
PR_BODY=""
PR_BODY_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      [[ $# -ge 2 ]] || fail "--base requires a value"
      BASE_BRANCH="$2"
      shift 2
      ;;
    --remote)
      [[ $# -ge 2 ]] || fail "--remote requires a value"
      REMOTE_NAME="$2"
      shift 2
      ;;
    --no-fetch)
      DO_FETCH=0
      shift
      ;;
    --allow-untracked)
      ALLOW_UNTRACKED=1
      shift
      ;;
    --push)
      DO_PUSH=1
      shift
      ;;
    --create-pr)
      DO_CREATE_PR=1
      shift
      ;;
    --draft)
      DRAFT=1
      shift
      ;;
    --title)
      [[ $# -ge 2 ]] || fail "--title requires a value"
      PR_TITLE="$2"
      shift 2
      ;;
    --body)
      [[ $# -ge 2 ]] || fail "--body requires a value"
      PR_BODY="$2"
      shift 2
      ;;
    --body-file)
      [[ $# -ge 2 ]] || fail "--body-file requires a value"
      PR_BODY_FILE="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

require_cmd git
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Run this inside a git repository"

GIT_DIR="$(git rev-parse --git-dir)"
if [[ -f "${GIT_DIR}/MERGE_HEAD" || -d "${GIT_DIR}/rebase-merge" || -d "${GIT_DIR}/rebase-apply" || -f "${GIT_DIR}/CHERRY_PICK_HEAD" ]]; then
  fail "Git operation in progress (merge/rebase/cherry-pick). Finish it first."
fi

CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
[[ -n "${CURRENT_BRANCH}" ]] || fail "Detached HEAD is not supported for PR flow"

if [[ "${CURRENT_BRANCH}" == "main" || "${CURRENT_BRANCH}" == "master" || "${CURRENT_BRANCH}" == "${BASE_BRANCH}" ]]; then
  fail "You are on '${CURRENT_BRANCH}'. Create/switch to a feature branch first."
fi

if [[ "${DO_FETCH}" -eq 1 ]]; then
  git fetch "${REMOTE_NAME}" "${BASE_BRANCH}"
fi

BASE_REF="refs/remotes/${REMOTE_NAME}/${BASE_BRANCH}"
git show-ref --verify --quiet "${BASE_REF}" || fail "Base ref not found: ${REMOTE_NAME}/${BASE_BRANCH}"
BASE_REMOTE="${REMOTE_NAME}/${BASE_BRANCH}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  git status --short
  fail "Working tree has tracked changes. Commit or stash before opening PR."
fi

if [[ "${ALLOW_UNTRACKED}" -eq 0 ]]; then
  UNTRACKED="$(git ls-files --others --exclude-standard)"
  if [[ -n "${UNTRACKED}" ]]; then
    echo "${UNTRACKED}"
    fail "Untracked files found. Commit/remove them or run with --allow-untracked."
  fi
fi

AHEAD_COUNT="$(git rev-list --count "${BASE_REMOTE}..HEAD")"
BEHIND_COUNT="$(git rev-list --count "HEAD..${BASE_REMOTE}")"
if [[ "${AHEAD_COUNT}" -eq 0 ]]; then
  fail "No commits ahead of ${BASE_REMOTE}. Nothing to open as a PR."
fi

echo "Branch: ${CURRENT_BRANCH}"
echo "Base:   ${BASE_REMOTE}"
echo "Ahead:  ${AHEAD_COUNT} commit(s)"
echo "Behind: ${BEHIND_COUNT} commit(s)"

if [[ "${BEHIND_COUNT}" -gt 0 ]]; then
  echo "WARNING: branch is behind ${BASE_REMOTE}. Consider rebasing before PR."
fi

echo
echo "Commits to be included:"
git log --oneline "${BASE_REMOTE}..HEAD"

echo
echo "Files to be changed:"
git diff --name-status "${BASE_REMOTE}...HEAD"

if [[ "${DO_PUSH}" -eq 1 || "${DO_CREATE_PR}" -eq 1 ]]; then
  if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
    git push
  else
    git push -u "${REMOTE_NAME}" "${CURRENT_BRANCH}"
  fi
fi

if [[ "${DO_CREATE_PR}" -eq 1 ]]; then
  require_cmd gh

  if [[ -n "${PR_BODY}" && -n "${PR_BODY_FILE}" ]]; then
    fail "Use only one of --body or --body-file"
  fi

  PR_CMD=(gh pr create --base "${BASE_BRANCH}" --head "${CURRENT_BRANCH}")
  if [[ "${DRAFT}" -eq 1 ]]; then
    PR_CMD+=(--draft)
  fi
  if [[ -n "${PR_TITLE}" ]]; then
    PR_CMD+=(--title "${PR_TITLE}")
  fi
  if [[ -n "${PR_BODY}" ]]; then
    PR_CMD+=(--body "${PR_BODY}")
  elif [[ -n "${PR_BODY_FILE}" ]]; then
    PR_CMD+=(--body-file "${PR_BODY_FILE}")
  else
    PR_CMD+=(--fill)
  fi

  "${PR_CMD[@]}"
fi

echo
echo "Safe PR checks passed."
