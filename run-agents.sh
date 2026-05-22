#!/usr/bin/env bash
# run-agents.sh
# Launches the full Claude Code brainstorm team (product manager,
# software-architect, security-architect, frontend, backend, devops,
# code-reviewer, autotester)
# each in its own terminal window, wired together via brainstorm-mcp.
#
# Prerequisites:
#   • brainstorm-mcp installed and registered (run install-brainstorm.sh first)
#   • Claude Code CLI available as `claude`
#   • A terminal emulator: gnome-terminal, xterm, kitty, wezterm, or macOS Terminal/iTerm2
#
# Usage:
#   bash run-agents.sh [--project myproject]

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
PROJECT_NAME="ticket-manager"

role_to_filename() {
  local role="$1"
  case "$role" in
    product-manager) echo "product-manager.md" ;;
    software-architect) echo "software-architect.md" ;;
    security-architect) echo "security-architect.md" ;;
    frontend) echo "frontend-developer-react.md" ;;
    backend) echo "backend-developer-python.md" ;;
    devops) echo "devops.md" ;;
    code-reviewer) echo "code-reviewer.md" ;;
    autotester) echo "autotester.md" ;;
    *) echo "${role}.md" ;;
  esac
}

role_dir() {
  local role="$1"
  case "$role" in
    product-manager) echo "./product-manager" ;;
    software-architect) echo "./software-architect" ;;
    security-architect) echo "./security-architect" ;;
    frontend) echo "./frontend" ;;
    backend) echo "./backend" ;;
    devops) echo "./devops" ;;
    code-reviewer) echo "./code-reviewer" ;;
    autotester) echo "./autotester" ;;
    *) echo "./$role" ;;
  esac
}

role_title() {
  local role="$1"
  case "$role" in
    product-manager) echo "Product Manager" ;;
    software-architect) echo "Software Architect" ;;
    security-architect) echo "Security Architect" ;;
    frontend) echo "Frontend Developer" ;;
    backend) echo "Backend Developer" ;;
    devops) echo "DevOps" ;;
    code-reviewer) echo "Code Reviewer" ;;
    autotester) echo "Autotester" ;;
    *) echo "$role" ;;
  esac
}

# Extract Mission section from agent skill file
role_mission() {
  local role="$1"
  local skillfile="./agents/$(role_to_filename "$role")"

  if [[ -f "$skillfile" ]]; then
    # Extract text between "## Mission" and the next "##"
    sed -n '/^## Mission$/,/^## /p' "$skillfile" | sed '1d;$d' | head -n 5
  else
    echo "Agent skill file not found: $skillfile"
  fi
}

# Extract brief description from Operating Principles
role_description() {
  local role="$1"
  local skillfile="./agents/$(role_to_filename "$role")"

  if [[ -f "$skillfile" ]]; then
    # Extract first principle line as a quick descriptor
    sed -n '/^## Operating Principles$/,/^## /p' "$skillfile" | sed -n '3,3p' | sed 's/^[0-9]*\. //'
  else
    echo "Agent skill file not found: $skillfile"
  fi
}

# Extract Core Responsibilities summary
role_extra_instruction() {
  local role="$1"
  local skillfile="./agents/$(role_to_filename "$role")"

  if [[ -f "$skillfile" ]]; then
    # Extract text from "## Core Responsibilities" or "## [...] Responsibilities"
    sed -n '/^## .*Responsibilities$/,/^## /p' "$skillfile" | sed '1d;$d' | head -n 10
  else
    echo "Agent skill file not found: $skillfile"
  fi
}

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)      PROJECT_NAME="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ── Validate ──────────────────────────────────────────────────────────────────
if ! command -v claude &>/dev/null; then
  echo "ERROR: 'claude' CLI not found. Install Claude Code first." >&2
  exit 1
fi

# Create project dirs if they don't exist
for dir in ./product-manager ./software-architect ./security-architect ./frontend ./backend ./devops ./code-reviewer ./autotester; do
  mkdir -p "$dir"
done

# ── Agent prompt factory ──────────────────────────────────────────────────────
# Each agent:
#   1. Initialises its Brainstorm session (status tool)
#   2. Creates (or joins) the shared project as coordinator/contributor
#   3. Sends a greeting to the shared channel
#   4. Polls for messages and stands by for collaborative work

agent_prompt() {
  local role="$1"        # product-manager | software-architect | security-architect | frontend | backend | devops | code-reviewer | autotester
  local project="$2"
  local coordinator="$3" # "true" or "false"

  local skillfile="./agents/$(role_to_filename "$role")"
  local display_role
  display_role="$(role_title "$role")"

  # Extract Mission section from skill file for context
  local mission=""
  if [[ -f "$skillfile" ]]; then
    mission=$(sed -n '/^## Mission$/,/^## /p' "$skillfile" | sed '1d;$d' | head -c 300)
  fi

  if [[ "$coordinator" == "true" ]]; then
    cat <<PROMPT
You are the $(role_title "$role") agent named "$role" in a multi-agent collaboration.

Your skill description:
$mission

STEP 1 – Initialise your Brainstorm session:
  Call mcp__brainstorm__status with working_directory set to your current working directory.

STEP 2 – Create and join the shared project as coordinator:
  Call mcp__brainstorm__create_project with:
    project_id: "$project"
    name: "$project"
    description: "Eight-agent collaboration demo (product manager + software architect + security architect + frontend + backend + devops + code reviewer + autotester)"
  Then call mcp__brainstorm__join_project with:
    project_id: "$project"
    agent_name: "$role"
    role: "coordinator"

STEP 3 – Announce yourself:
  Send a message to the "$project" channel:
    "Hi team! I'm the $display_role agent. Project '$project' is initialised. Waiting for the rest of the team to join."

STEP 4 – Wait for the rest of the team to join, then:
  • Poll mcp__brainstorm__receive_messages periodically
  • Once all eight agents are present (check with mcp__brainstorm__get_project_info),
    broadcast a task breakdown:
      - product-manager: define scope, priorities, acceptance criteria, and milestone order
      - software-architect: define system boundaries, API contracts, and architecture decisions
      - security-architect: define security supervision, threat prevention, and secure-by-design guardrails
      - frontend: design and implement the UI and client integration flow
      - backend: implement the API, data model, and auth/business logic
      - devops: set up CI/CD, infrastructure, and deployment pipeline
      - code-reviewer: review design/code/test output and publish findings
      - autotester: build and run automated tests, regressions, and verification evidence
  • Coordinate the handoff of shared resources such as the spec, architecture notes, and test results.

Stay interactive: read incoming messages, respond to your teammates, and share
any resources (API specs, config snippets) via mcp__brainstorm__store_resource.

Read the full skill at: ./agents/$(role_to_filename "$role")
PROMPT
  else
    cat <<PROMPT
You are the $(role_title "$role") agent named "$role" in a multi-agent collaboration.

Your skill description:
$mission

STEP 1 – Initialise your Brainstorm session:
  Call mcp__brainstorm__status with working_directory set to your current working directory.

STEP 2 – Join the shared project as a contributor:
  Call mcp__brainstorm__join_project with:
    project_id: "$project"
    agent_name: "$role"
    role: "contributor"
  (If the project doesn't exist yet, wait 5 seconds and retry up to 3 times.)

STEP 3 – Announce yourself:
  Send a message to the "$project" channel:
    "Hi team! I'm the $display_role agent. Ready to contribute."

STEP 4 – Begin your work:
  • Poll mcp__brainstorm__receive_messages regularly
  • Respond to coordinator task assignments
  • Share work products via mcp__brainstorm__store_resource with:
      permissions: { "read": ["*"], "write": ["$role"] }
  • Notify teammates when resources are ready

Stay interactive: read incoming messages, respond to your teammates, and collaborate
to complete the overall project goal.

Read the full skill at: ./agents/$(role_to_filename "$role")
PROMPT
  fi
}

# ── Terminal launcher ─────────────────────────────────────────────────────────
# Tries several terminal emulators in order of preference.
open_terminal() {
   local title="$1"
   local work_dir="$2"
   local prompt="$3"
   local role="$4"  # Add role to ensure unique temp files

   # Write prompt to a temp file so we can pass it cleanly
   local tmp
   tmp=$(mktemp /tmp/brainstorm-agent-${role}-XXXXXX)
   printf '%s' "$prompt" > "$tmp"

  local cmd="cd $(printf '%q' "$work_dir") && claude \"\$(cat $(printf '%q' "$tmp"))\"; rm -f $(printf '%q' "$tmp"); exec \$SHELL"

  if [[ "$OSTYPE" == darwin* ]]; then
    # macOS: prefer iTerm2, fall back to Terminal.app
    if command -v osascript &>/dev/null; then
      osascript - "$title" "$work_dir" "$cmd" <<'APPLESCRIPT'
on run argv
  set winTitle to item 1 of argv
  set workDir  to item 2 of argv
  set shellCmd to item 3 of argv
  tell application "Terminal"
    activate
    set newTab to do script shellCmd
    set custom title of front window to winTitle
  end tell
end run
APPLESCRIPT
      return
    fi
  fi

  # Linux / other: try common terminals
  if command -v gnome-terminal &>/dev/null; then
    gnome-terminal --title="$title" -- bash -c "$cmd" &
  elif command -v kitty &>/dev/null; then
    kitty --title "$title" bash -c "$cmd" &
  elif command -v wezterm &>/dev/null; then
    wezterm start --cwd "$work_dir" -- bash -c "$cmd" &
  elif command -v xterm &>/dev/null; then
    xterm -title "$title" -e bash -c "$cmd" &
  elif command -v tmux &>/dev/null; then
    # Fallback: tmux panes in current session
    if ! tmux has-session -t brainstorm 2>/dev/null; then
      tmux new-session -d -s brainstorm -c "$work_dir" -x 220 -y 50 "bash -c '$cmd'"
      tmux rename-window -t brainstorm:0 "$title"
    else
      tmux new-window -t brainstorm -c "$work_dir" -n "$title" "bash -c '$cmd'"
    fi
  else
    echo "ERROR: No supported terminal emulator found." >&2
    echo "       Install one of: gnome-terminal, kitty, wezterm, xterm, tmux" >&2
    rm -f "$tmp"
    exit 1
  fi
}

# ── Launch agents ─────────────────────────────────────────────────────────────
echo "==> Launching eight-agent brainstorm demo (project: $PROJECT_NAME)"
echo ""

launch_role() {
   local role="$1"
   local coordinator="$2"
   local index="$3"
   local total="$4"

   local work_dir
   work_dir="$(role_dir "$role")"
   # Convert to absolute path so Terminal.app can find it
   work_dir="$(cd "$work_dir" 2>/dev/null && pwd)" || work_dir="$(pwd)/$(role_dir "$role")"

   local prompt
   prompt="$(agent_prompt "$role" "$PROJECT_NAME" "$coordinator")"

   local title
   title="Brainstorm: $(role_title "$role" | tr '[:upper:]' '[:lower:]')"

   echo "  [$index/$total] $(role_title "$role") → $work_dir"
   open_terminal "$title" "$work_dir" "$prompt" "$role"
}

launch_role "product-manager" "true" 1 8
sleep 1   # small stagger so the coordinator creates the project first

launch_role "software-architect" "false" 2 8
sleep 1

launch_role "security-architect" "false" 3 8
sleep 1

launch_role "frontend" "false" 4 8
sleep 1

launch_role "backend" "false" 5 8
sleep 1

launch_role "devops" "false" 6 8
sleep 1

launch_role "code-reviewer" "false" 7 8
sleep 1

launch_role "autotester" "false" 8 8

echo ""
echo "✅  All eight agents launched!"
echo ""
echo "  • product-manager (coordinator) creates the project and drives the workflow"
echo "  • software-architect (contributor) shapes architecture and system boundaries"
echo "  • security-architect (contributor) supervises security and threat prevention"
echo "  • frontend       (contributor) builds the UI"
echo "  • backend        (contributor) implements the server/API"
echo "  • devops         (contributor) handles CI/CD and deployment"
echo "  • reviewer       (contributor) reviews work and flags issues"
echo "  • autotester     (contributor) runs and expands automated tests"
echo ""
echo "  Shared storage: ~/.brainstorm/"
echo "  Project ID    : $PROJECT_NAME"
echo ""
echo "  To clean up the project when done:"
echo "    npx --prefix ~/.local/share/brainstorm-mcp brainstorm-cleanup $PROJECT_NAME"
echo "  Or from the install dir:"
echo "    npm run cleanup -- $PROJECT_NAME"

# If we used tmux, attach automatically
if command -v tmux &>/dev/null && tmux has-session -t brainstorm 2>/dev/null; then
  echo ""
  echo "  Attaching to tmux session 'brainstorm'..."
  sleep 1
  tmux attach-session -t brainstorm
fi

