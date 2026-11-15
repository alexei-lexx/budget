#!/usr/bin/env bash
# Stop the containers of a worktree in .worktrees/<name> and remove the worktree.
# The branch stays. See docs/worktrees.md
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <branch>" >&2
  echo "Removes the worktree in .worktrees/<name>, where <name> is <branch> with '/' replaced by '-'" >&2
  exit 1
fi

branch="$1"

# The main checkout is the parent of the common git folder.
# This works from the main checkout and from a worktree.
main_dir="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
name="${branch//\//-}"
worktree_dir="$main_dir/.worktrees/$name"

if [ ! -d "$worktree_dir" ]; then
  echo "Error: $worktree_dir does not exist" >&2
  exit 1
fi

# Without COMPOSE_PROJECT_NAME, Docker Compose uses the project of the main checkout
if ! grep -q "^COMPOSE_PROJECT_NAME=" "$worktree_dir/backend/.env" 2>/dev/null; then
  echo "Error: $worktree_dir/backend/.env has no COMPOSE_PROJECT_NAME" >&2
  exit 1
fi

# Docker Compose reads COMPOSE_PROJECT_NAME from the .env file of the worktree
(cd "$worktree_dir/backend" && docker compose --profile db --profile phoenix down)

# Without --force, git stops if the worktree has changes or untracked files
git -C "$main_dir" worktree remove "$worktree_dir"

echo "Removed $worktree_dir. The branch $branch stays."
