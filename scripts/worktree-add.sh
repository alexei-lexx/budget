#!/usr/bin/env bash
# Create a git worktree in .worktrees/<name> with its own ports and DynamoDB.
# See docs/worktrees.md.

# Stop on a failed command, an unset variable, or a failed command in a pipe.
set -euo pipefail

# Require exactly one argument.
if [ $# -ne 1 ]; then
  echo "Usage: $0 <branch>" >&2
  echo "Creates the worktree in .worktrees/<name>, where <name> is <branch> with '/' replaced by '-'" >&2
  exit 1
fi

branch="$1"

# The main checkout is the parent of the common git folder.
# This works from the main checkout and from a worktree.
main_dir="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"

# Replace each '/' with '-', for example feature/x becomes feature-x.
name="${branch//\//-}"
worktree_dir="$main_dir/.worktrees/$name"

# Make a valid Docker Compose project name:
# lowercase letters, digits, '_' and '-' only.
compose_project="budget-$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/-/g')"

# Stop if the worktree folder already exists.
if [ -e "$worktree_dir" ]; then
  echo "Error: $worktree_dir already exists" >&2
  exit 1
fi

# The worktree gets a copy of each env file from the main checkout.
env_files=(backend/.env backend/.env.test frontend/.env)

# Stop if an env file is missing in the main checkout.
for env_file in "${env_files[@]}"; do
  if [ ! -f "$main_dir/$env_file" ]; then
    echo "Error: $main_dir/$env_file does not exist" >&2
    exit 1
  fi
done

# The used slots are the .worktree-slot values of the existing worktrees.
# Each slot has a space before and after it, for example " 1 3 ".
used_slots=" "
for existing_slot_file in "$main_dir"/.worktrees/*/.worktree-slot; do
  # Without a match, the loop gets the pattern itself, so skip it.
  [ -f "$existing_slot_file" ] || continue
  used_slots+="$(cat "$existing_slot_file") "
done

# Find the first free slot from 1 to 9.
slot=""
for candidate in 1 2 3 4 5 6 7 8 9; do
  # The spaces around the candidate prevent a partial match.
  if [[ "$used_slots" != *" $candidate "* ]]; then
    slot="$candidate"
    break
  fi
done

# Stop if no slot is free.
if [ -z "$slot" ]; then
  echo "Error: all slots (1 to 9) are used" >&2
  exit 1
fi

# Each slot gets 5 ports, from 41<slot>0 to 41<slot>4.
# For example, slot 1 gets the ports 4110 to 4114.
backend_port="41${slot}0"
frontend_port="41${slot}1"
dynamodb_port="41${slot}2"
dynamodb_admin_port="41${slot}3"
phoenix_port="41${slot}4"

# Return 0 if a process listens on the port on IPv4 or IPv6 localhost.
is_port_busy() {
  local port="$1"
  local host
  for host in 127.0.0.1 ::1; do
    # Bash opens a TCP connection through /dev/tcp.
    # A connection means the port is busy.
    # The subshell closes the connection when it exits.
    if (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; then
      return 0
    fi
  done
  return 1
}

# Stop if another process already uses a port of the slot.
for port in "$backend_port" "$frontend_port" "$dynamodb_port" "$dynamodb_admin_port" "$phoenix_port"; do
  if is_port_busy "$port"; then
    echo "Error: port $port of slot $slot is busy" >&2
    exit 1
  fi
done

# Check out the branch if it exists locally or on a remote.
# Otherwise, create a new branch from main.
if git -C "$main_dir" show-ref --verify --quiet "refs/heads/$branch" ||
  [ -n "$(git -C "$main_dir" for-each-ref --format='%(refname)' "refs/remotes/*/$branch")" ]; then
  git -C "$main_dir" worktree add "$worktree_dir" "$branch"
else
  git -C "$main_dir" worktree add -b "$branch" "$worktree_dir" main
fi

# Copy the env files from the main checkout to the worktree.
for env_file in "${env_files[@]}"; do
  cp "$main_dir/$env_file" "$worktree_dir/$env_file"
done

# Replace the line of the variable, or add the line if it does not exist.
set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  if grep -q "^$key=" "$file"; then
    sed -i "s|^$key=.*|$key=$value|" "$file"
  else
    # Add a newline first if the file does not end with one.
    if [ -n "$(tail -c 1 "$file")" ]; then
      echo >>"$file"
    fi
    echo "$key=$value" >>"$file"
  fi
}

# Set the backend to use the ports of the slot.
# COMPOSE_PROJECT_NAME gives the worktree its own Docker containers.
backend_env="$worktree_dir/backend/.env"
set_env_var "$backend_env" COMPOSE_PROJECT_NAME "$compose_project"
set_env_var "$backend_env" BACKEND_PORT "$backend_port"
set_env_var "$backend_env" DYNAMODB_PORT "$dynamodb_port"
set_env_var "$backend_env" DYNAMODB_ADMIN_PORT "$dynamodb_admin_port"
set_env_var "$backend_env" PHOENIX_PORT "$phoenix_port"
set_env_var "$backend_env" DYNAMODB_ENDPOINT "http://localhost:$dynamodb_port"
set_env_var "$backend_env" API_BASE_URL "http://localhost:$backend_port"

# Set the backend tests to use the ports of the slot.
backend_test_env="$worktree_dir/backend/.env.test"
set_env_var "$backend_test_env" DYNAMODB_ENDPOINT "http://localhost:$dynamodb_port"
set_env_var "$backend_test_env" API_BASE_URL "http://localhost:$backend_port"
set_env_var "$backend_test_env" PHOENIX_ENDPOINT "http://localhost:$phoenix_port"

# Set the frontend to use the ports of the slot.
frontend_env="$worktree_dir/frontend/.env"
set_env_var "$frontend_env" FRONTEND_PORT "$frontend_port"
set_env_var "$frontend_env" VITE_GRAPHQL_ENDPOINT "http://localhost:$backend_port/graphql"
set_env_var "$frontend_env" VITE_MCP_ENDPOINT "http://localhost:$backend_port/mcp"

# Record the slot, so that the next worktree does not use it.
echo "$slot" >"$worktree_dir/.worktree-slot"

# Install the dependencies of the backend and the frontend.
(cd "$worktree_dir/backend" && npm ci)
(cd "$worktree_dir/frontend" && npm ci)

# Start the DynamoDB and DynamoDB admin containers of the worktree.
(cd "$worktree_dir/backend" && npm run db:start)

# A new DynamoDB container needs a few seconds to start.
# Try one time each second, for 30 seconds at most.
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

# Create the tables of the development database and the test database.
(cd "$worktree_dir/backend" && npm run db:create && npm run test:db:create)

# Show a summary of the new worktree.
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
