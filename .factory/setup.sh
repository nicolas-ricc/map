#!/usr/bin/env bash
# Prepares a fresh clone of this repository for the factory agent.
# Runs as root inside the factory container, in the repository root, before
# the agent starts. If it fails, the run fails.
set -euo pipefail

# The runner image has node 22 and npm; the lockfile pins everything else.
npm ci --no-audit --no-fund

# content/blog.generated.json is gitignored and imported by src/main.ts, so
# tsc and vite need it. The feed script writes an empty list if the blog RSS
# is unreachable, so this never fails on network alone.
npm run feed
