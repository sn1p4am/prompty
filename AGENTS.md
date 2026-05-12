# Agent Notes

## Release Workflow

- After making code changes, update the in-app release notes surface (`src/components/VersionBadge.jsx`) and any relevant release notes documentation.
- Run verification before shipping: `npm run lint`, `npm test`, `npm run build`, and `npm audit --registry=https://registry.npmjs.org --audit-level=moderate`.
- If the changelog is updated and verification passes, proactively commit the work, push to GitHub, and let the GitHub Pages workflow deploy the latest `main` build.
- Keep generated artifacts and local agent state out of commits unless they are intentionally part of the product.
