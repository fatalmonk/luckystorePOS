# Git Branch Strategy for Lucky Store POS

## Branch Structure

### Production Branch
- `main` - Production-ready code, tagged releases only
- Deployed to production environments
- Requires code review and testing before merge

### Staging Branch
- `develop` - Integration branch for testing and staging
- Active development happens here
- Feature branches branch off from develop

### Feature Branches
- Format: `feature/description` (e.g., `feature/pos-quick-checkout`)
- Purpose: New features and enhancements
- Create from: `develop`
- Merge to: `develop`

### Hotfix Branches
- Format: `hotfix/description` (e.g., `hotfix/login-bug-fix`)
- Purpose: Urgent production bugs
- Create from: `main`
- Merge to: `main` AND `develop`

### Release Branches (Optional)
- Format: `release/version` (e.g., `release/1.0.0`)
- Purpose: Prepare for production release
- Create from: `develop`
- Merge to: `main` AND `develop`

## Workflow Guidelines

### 1. Creating Feature Branches
```bash
# From develop branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. Naming Conventions
- Use lowercase letters
- Separate words with hyphens
- Keep names descriptive but concise
- Examples:
  - `feature/inventory-stock-deduction`
  - `feature/offline-sale-support`
  - `bugfix/printer-connection-timeout`

### 3. Commit Messages
- Use present tense: "Add feature" not "Added feature"
- Be concise and descriptive
- Reference ticket/issue numbers
- Example: `feat: Add offline sale sync engine #123`

### 4. Pull Request Process
1. Create PR from feature branch to develop
2. Request review from code owners
3. Run all tests and ensure CI passes
4. Address review feedback
5. Merge to develop after approval

### 5. Production Deployment
1. Create release branch from develop
2. Tag release version
3. Create PR from release to main
4. Deploy main to production after merge

## Branch Protection Rules

### main
- No direct pushes
- PR required
- At least 1 approval required
- CI/CD pipeline must pass

### develop
- No direct pushes
- PR required
- At least 1 approval required
- CI/CD pipeline must pass

## Conventional Commits

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks

### Examples
```bash
# Feature commit
git commit -m "feat: implement stock deduction RPC

- Add deduct_stock stored procedure
- Create stock ledger migration
- Implement audit trail logging

Closes #45"

# Bug fix commit
git commit -m "fix: resolve printer connection timeout

- Increase timeout from 10s to 30s
- Add retry mechanism for failed prints

Fixes #67"

# Documentation commit
git commit -m "docs: update inventory management guide

- Add stock ledger explanation
- Include audit trail examples"
```

## Branch Cleanup

### Delete After Merge
- Delete feature branches after merging to develop
- Delete release branches after merging to main and develop
- Delete hotfix branches after merging to both main and develop

### Regular Cleanup
- Remove old merged branches from local repo
- Run `git fetch -p` weekly to clean up stale remote branches

## Emergency Procedures

### Critical Production Issue
1. Create hotfix branch from `main`
2. Make urgent fix
3. Merge to `main` and deploy immediately
4. Merge to `develop` in following sync

### Hotfix to Staging
1. Create hotfix branch from `develop`
2. Make fix and test thoroughly
3. Merge to `develop`
4. Deploy to staging environment
