# Environment & Branching Setup

## Environments
- **dev**: local docker-compose, testing APIs
- **staging**: deploys from `develop` branch
- **prod**: deploys from `main` branch

## Branch Strategy
- `main`: production-ready code
- `develop`: staging/pre-production
- `feature/*`: new features
- `hotfix/*`: urgent fixes
🧭 Branching Strategy

This document explains the standard Git branching lifecycle used in most professional software teams.
Each branch type has a clear purpose and lifecycle to maintain a clean, stable development flow.

🟢 main

Lifetime: Permanent

Purpose: Always contains production-ready code.

Usage: Only merge into main after full testing and approval.

Deployments: Code from main is deployed to production.

🧪 develop

Lifetime: Permanent

Purpose: Serves as the integration or staging branch.

Usage: Developers branch off from develop to create new features or fixes.

Merging: Periodically merged into main during releases.

✨ feature/*

Lifetime: Temporary

Created From: develop

Merged Into: develop

Purpose: Used to develop new features or enhancements.

Naming Example: feature/add-playlist-api

Deletion: Deleted after being merged.

🐞 fix/*

Lifetime: Temporary

Created From: develop

Merged Into: develop

Purpose: Used for bug fixes related to code not yet in production.

Naming Example: fix/song-duration-validation

🔥 hotfix/*

Lifetime: Temporary

Created From: main

Merged Into: main and develop

Purpose: Used for urgent production issues that must be fixed immediately.

Naming Example: hotfix/fix-stripe-webhook-error

🚀 release/* (optional)

Lifetime: Temporary

Created From: develop

Merged Into: main and develop

Purpose: Used to prepare for a new release — includes testing, polishing, and minor tweaks.

Naming Example: release/v1.0.0

## 🔧 Example Workflows

### ➕ Creating a new feature

```bash
# Start from the latest develop branch
git checkout develop
git pull origin develop

# Create a new feature branch
git checkout -b feature/add-playlist-api


## Local Setup
1. Copy `.env.dev` → `.env`
2. Run `docker-compose up --build`
3. Visit `http://localhost:4000`
