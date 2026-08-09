# Main branch protection

The public repository protects `main` with the following configuration:

- Require a pull request before merging.
- Do not require a separate approval while Christopher is the only maintainer.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require a linear history.
- Require the branch to be up to date before merging.
- Require the `quality` CI check created by issue #5; it runs lint, strict typecheck, tests, production build, and browser smoke tests.
- Do not allow force pushes.
- Do not allow deletion of `main`.
- Apply the rule to administrators.

Implementation agents must continue to follow the repository workflow:

- no direct implementation commits to `main`;
- one focused, descriptive branch per change; include the issue number when the work is tied to an issue;
- linked pull request with passing CI;
- no merge without explicit instruction.
