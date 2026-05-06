---
name: github
description: Interact with GitHub using the MCP server to manage repositories, branches, commits, pull requests, and issues for the hlavrencic account.
license: MIT
compatibility: opencode
metadata:
  owner: hlavrencic
  mcp-server: github
---

## What I do

Use the `github` MCP server to interact with GitHub on behalf of the user `hlavrencic`.

Available operations:
- **Repositories**: create, search, fork
- **Files**: create or update files, push multiple files in one commit, read file contents
- **Branches**: create branches from any base
- **Pull Requests**: create, list, review, merge, update branch, get comments/reviews/files/status
- **Issues**: create, list, update, comment
- **Search**: search repositories, code, issues, users

---

## When to use me

Load this skill when the user asks to:
- Create or publish a GitHub repository
- Push code or files to GitHub
- Create branches or pull requests
- Open, update or comment on issues
- Search repos or code on GitHub

---

## Workflow

### Publish a new repository

1. Use `create_repository` to create the repo under `hlavrencic`.
2. Use `push_files` to push all project files to `master` in a single commit.
3. Confirm the repo URL to the user.

```
create_repository({ name: "repo-name", description: "...", private: false })
push_files({ owner: "hlavrencic", repo: "repo-name", branch: "master", message: "initial commit", files: [...] })
```

### Push changes to an existing repo

1. Use `push_files` with all modified files.
2. Always include a descriptive commit message.

```
push_files({ owner: "hlavrencic", repo: "repo-name", branch: "master", message: "feat: ...", files: [...] })
```

### Create a pull request

1. Use `create_branch` to create a feature branch.
2. Use `push_files` to push changes to that branch.
3. Use `create_pull_request` targeting `master` as base.

```
create_branch({ owner: "hlavrencic", repo: "repo-name", branch: "feat/my-feature", from_branch: "master" })
push_files({ owner: "hlavrencic", repo: "repo-name", branch: "feat/my-feature", message: "...", files: [...] })
create_pull_request({ owner: "hlavrencic", repo: "repo-name", title: "...", head: "feat/my-feature", base: "master" })
```

### Create an issue

```
create_issue({ owner: "hlavrencic", repo: "repo-name", title: "...", body: "..." })
```

---

## Rules

- Always use `hlavrencic` as the owner unless the user specifies otherwise.
- Default branch is `master`.
- Prefer `push_files` over multiple `create_or_update_file` calls to minimize API calls.
- Always confirm destructive operations (merge, close issue) with the user before executing.
- Never expose the PAT in any output or file.
