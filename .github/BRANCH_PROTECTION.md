# Main branch protection

The planning run attempted to enable protection for `main`, but GitHub returned:

> Upgrade to GitHub Pro or make this repository public to enable this feature.

The repository must remain private, so protection is documented here until the account supports private-repository branch protection.

## Required settings when available

- Require a pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require a linear history.
- Require the branch to be up to date before merging.
- Require the CI checks created by issue #5: lint, strict typecheck, tests, and production build.
- Do not allow force pushes.
- Do not allow deletion of `main`.
- Apply the rule to administrators after initial setup is complete.

Until protection can be enabled, implementation agents must follow the repository workflow:

- no direct implementation commits to `main`;
- branch name `issue-<issue-number>-<short-description>`;
- linked pull request with passing CI;
- no merge without explicit instruction.
