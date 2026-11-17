#!/usr/bin/env bash
# Create a git worktree in .worktrees/<name> with its own ports and DynamoDB.
# See docs/worktrees.md
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <branch>" >&2
  echo "Creates the worktree in .worktrees/<name>, where <name> is <branch> with '/' replaced by '-'" >&2
  exit 1
fi

branch="$1"

# The main checkout is the parent of the common git folder.
# This works from the main checkout and from a worktree.
main_dir="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
name="${branch//\//-}"
worktree_dir="$main_dir/.worktrees/$name"
compose_project="budget-$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/-/g')"

if [ -e "$worktree_dir" ]; then
  echo "Error: $worktree_dir already exists" >&2
  exit 1
fi

env_files=(backend/.env backend/.env.test frontend/.env)
for env_file in "${env_files[@]}"; do
  if [ ! -f "$main_dir/$env_file" ]; then
    echo "Error: $main_dir/$env_file does not exist" >&2
    exit 1
  fi
done

# The used slots are the .worktree-slot values of the existing worktrees
used_slots=" "
for existing_slot_file in "$main_dir"/.worktrees/*/.worktree-slot; do
  [ -f "$existing_slot_file" ] || continue
  used_slots+="$(cat "$existing_slot_file") "
done

slot=""
for candidate in 1 2 3 4 5 6 7 8 9; do
  if [[ "$used_slots" != *" $candidate "* ]]; then
    slot="$candidate"
    break
  fi
done

if [ -z "$slot" ]; then
  echo "Error: all slots (1 to 9) are used" >&2
  exit 1
fi

backend_port="41${slot}0"
frontend_port="41${slot}1"
dynamodb_port="41${slot}2"
dynamodb_admin_port="41${slot}3"
phoenix_port="41${slot}4"

is_port_busy() {
  local port="$1"
  local host
  for host in 127.0.0.1 ::1; do
    if (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; then
      return 0
    fi
  done
  return 1
}

for port in "$backend_port" "$frontend_port" "$dynamodb_port" "$dynamodb_admin_port" "$phoenix_port"; do
  if is_port_busy "$port"; then
    echo "Error: port $port of slot $slot is busy" >&2
    exit 1
  fi
done

if git -C "$main_dir" show-ref --verify --quiet "refs/heads/$branch" ||
  [ -n "$(git -C "$main_dir" for-each-ref --format='%(refname)' "refs/remotes/*/$branch")" ]; then
  git -C "$main_dir" worktree add "$worktree_dir" "$branch"
else
  git -C "$main_dir" worktree add -b "$branch" "$worktree_dir" main
fi

for env_file in "${env_files[@]}"; do
  cp "$main_dir/$env_file" "$worktree_dir/$env_file"
done

# Replace the line of the variable, or add the line if it does not exist
set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^$key=" "$file"; then
    sed -i "s|^$key=.*|$key=$value|" "$file"
  else
    if [ -n "$(tail -c 1 "$file")" ]; then
      echo >>"$file"
    fi
    echo "$key=$value" >>"$file"
  fi
}

backend_env="$worktree_dir/backend/.env"
set_env_var "$backend_env" COMPOSE_PROJECT_NAME "$compose_project"
set_env_var "$backend_env" BACKEND_PORT "$backend_port"
set_env_var "$backend_env" DYNAMODB_PORT "$dynamodb_port"
set_env_var "$backend_env" DYNAMODB_ADMIN_PORT "$dynamodb_admin_port"
set_env_var "$backend_env" PHOENIX_PORT "$phoenix_port"
set_env_var "$backend_env" DYNAMODB_ENDPOINT "http://localhost:$dynamodb_port"
set_env_var "$backend_env" API_BASE_URL "http://localhost:$backend_port"

backend_test_env="$worktree_dir/backend/.env.test"
set_env_var "$backend_test_env" DYNAMODB_ENDPOINT "http://localhost:$dynamodb_port"
set_env_var "$backend_test_env" API_BASE_URL "http://localhost:$backend_port"
set_env_var "$backend_test_env" PHOENIX_ENDPOINT "http://localhost:$phoenix_port"

frontend_env="$worktree_dir/frontend/.env"
set_env_var "$frontend_env" FRONTEND_PORT "$frontend_port"
set_env_var "$frontend_env" VITE_GRAPHQL_ENDPOINT "http://localhost:$backend_port/graphql"
set_env_var "$frontend_env" VITE_MCP_ENDPOINT "http://localhost:$backend_port/mcp"

echo "$slot" >"$worktree_dir/.worktree-slot"

(cd "$worktree_dir/backend" && npm ci)
(cd "$worktree_dir/frontend" && npm ci)
(cd "$worktree_dir/backend" && npm run db:start)

# A new DynamoDB container needs a few seconds to start
for attempt in $(seq 1 30); do
  if curl -s "http://localhost:$dynamodb_port" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Error: DynamoDB does not answer on port $dynamodb_port" >&2
    exit 1
  fi
  sleep 1
done

(cd "$worktree_dir/backend" && npm run db:create && npm run test:db:create)

cat <<EOF

Worktree ready: $worktree_dir
Branch:         $branch
Slot:           $slot
Compose:        $compose_project

Backend:        http://localhost:$backend_port
Frontend:       http://localhost:$frontend_port
DynamoDB:       http://localhost:$dynamodb_port
DynamoDB admin: http://localhost:$dynamodb_admin_port
Phoenix:        http://localhost:$phoenix_port
EOF
