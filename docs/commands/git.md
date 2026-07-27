# Git Commands

Practical Git commands for the TEED repository. Examples use PowerShell.

## Inspect before changing anything

```powershell
git status
git branch --show-current
git remote -v
git log --oneline -10
```

`git status` should be checked before switching branches, pulling, committing,
or resolving a conflict.

## Fetch remote information

```powershell
git fetch origin
```

Fetch downloads branch and commit information without changing working files.
VS Code `Git: Autofetch` may run this periodically.

## Pull the checked-out branch

```powershell
git pull
```

Explicit form:

```powershell
git pull origin agent/documentation-cleanup
```

Pull only after checking `git status`. Uncommitted changes may conflict with
incoming changes.

## List branches

```powershell
git branch
git branch -r
git branch -a
```

- `git branch`: local branches;
- `git branch -r`: remote-tracking branches;
- `git branch -a`: both.

## Switch branches

Existing local branch:

```powershell
git switch main
git switch agent/documentation-cleanup
```

First local checkout of a remote branch:

```powershell
git fetch origin
git switch --track origin/agent/documentation-cleanup
```

Verify:

```powershell
git branch --show-current
git status
```

## Create a branch

First update the base:

```powershell
git switch main
git pull origin main
git switch -c feature/short-description
```

Publish it:

```powershell
git push -u origin feature/short-description
```

TEED branch categories may include:

```text
feature/...
fix/...
docs/...
refactor/...
test/...
agent/...
```

## See changes

Unstaged changes:

```powershell
git diff
```

Staged changes:

```powershell
git diff --staged
```

One file:

```powershell
git diff -- .\path\to\file
```

Summary:

```powershell
git diff --stat
```

## Stage intentionally

One file:

```powershell
git add .\docs\README.md
```

Selected files:

```powershell
git add .\docs\backend\architecture\principles.md `
        .\docs\backend\structure\project-organization.md
```

Review:

```powershell
git diff --staged
```

Avoid `git add .` when unrelated or untracked files are present.

## Commit

```powershell
git commit -m "Document backend architecture"
```

A commit should contain one coherent change and an imperative, specific
message.

## Push

Tracking branch already configured:

```powershell
git push
```

First push:

```powershell
git push -u origin branch-name
```

## Update local `main` after a pull request merge

```powershell
git switch main
git pull origin main
```

After confirming the merged branch is no longer needed locally:

```powershell
git branch -d branch-name
```

Deleting the local branch does not delete `main` or its merged changes.

## Untracked files

Show concise status:

```powershell
git status --short
```

Do not remove an unknown untracked file. Inspect it first:

```powershell
Get-ChildItem -Force .\folder -Recurse |
  Select-Object FullName, Length, LastWriteTime
```

## Temporarily store local work

Tracked changes:

```powershell
git stash push -m "Temporary work"
```

Include untracked files:

```powershell
git stash push -u -m "Temporary work"
```

List and restore:

```powershell
git stash list
git stash pop
```

Inspect before popping if the branch has changed.

## Restore an unstaged file

```powershell
git restore .\path\to\file
```

This discards local unstaged edits. Inspect `git diff` first.

Unstage without discarding file content:

```powershell
git restore --staged .\path\to\file
```

## Resolve a pull conflict

1. Run `git status`.
2. Open each file marked `both modified`.
3. Resolve conflict markers deliberately.
4. Test the resolved result.
5. Stage resolved files.
6. Commit the resolution.

```powershell
git status
git add .\resolved-file
git commit
```

Do not use destructive reset commands as a routine conflict solution.

## Useful history

```powershell
git log --oneline --graph --decorate --all -20
git show commit-sha
git blame .\path\to\file
```

## Daily TEED sequence

```powershell
git status
git branch --show-current
git pull
# edit and test
git diff
git add .\specific-files
git diff --staged
git commit -m "Describe the change"
git push
```
