#!/usr/bin/env bash
#
# Prepare a machine to develop absqir.
#
# The script checks every tool first and installs only what is missing, so it
# is safe to run again. It supports macOS and Linux.
#
#   ./setup.sh          Ask before each install.
#   ./setup.sh --yes    Install everything without questions.
#   ./setup.sh --check  Report only. The script changes nothing.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ---------------------------------------------------------------- options ---

ASSUME_YES=0
CHECK_ONLY=0

usage() {
  cat <<'USAGE'
Usage: ./setup.sh [options]

Set up the absqir development environment: Node, pnpm, a local Postgres,
the environment files, the dependencies, and the database schema.

Options:
  -y, --yes     Install everything without questions.
  -c, --check   Report what is missing. Change nothing.
  -h, --help    Print this text.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    -y | --yes) ASSUME_YES=1 ;;
    -c | --check | --dry-run) CHECK_ONLY=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

# ---------------------------------------------------------------- output ----

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'
  DIM=$'\033[2m'
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  BLUE=$'\033[34m'
  RESET=$'\033[0m'
else
  BOLD="" DIM="" RED="" GREEN="" YELLOW="" BLUE="" RESET=""
fi

step() { printf '\n%s▸ %s%s\n' "$BOLD" "$1" "$RESET"; }
ok() { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
miss() { printf '  %s✗%s %s\n' "$YELLOW" "$RESET" "$1"; }
act() { printf '  %s→%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s•%s %s\n' "$DIM" "$RESET" "$1"; }
bad() { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; }

TODO=()
add_todo() { TODO+=("$1"); }

have() { command -v "$1" >/dev/null 2>&1; }

run() {
  printf '    %s$ %s%s\n' "$DIM" "$*" "$RESET" >&2
  "$@"
}

sudo_run() {
  if [ -n "$SUDO" ]; then
    run "$SUDO" "$@"
  else
    run "$@"
  fi
}

confirm() {
  if [ "$CHECK_ONLY" -eq 1 ]; then
    note "Check only. Nothing installed."
    return 1
  fi
  if [ "$ASSUME_YES" -eq 1 ]; then return 0; fi
  if [ ! -t 0 ]; then
    note "No terminal to ask on. Skipped. Run with --yes to install."
    return 1
  fi
  printf '  %s?%s %s [Y/n] ' "$YELLOW" "$RESET" "$1"
  local reply
  read -r reply
  case "$reply" in
    "" | y | Y | yes | YES | Yes) return 0 ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------- system ----

case "$(uname -s)" in
  Darwin) PLATFORM="mac" ;;
  Linux) PLATFORM="linux" ;;
  *)
    printf 'absqir setup runs on macOS and Linux. This system reports %s.\n' "$(uname -s)" >&2
    exit 1
    ;;
esac

SUDO=""
if [ "$(id -u)" -ne 0 ] && have sudo; then SUDO="sudo"; fi

detect_pkg() {
  if [ "$PLATFORM" = "mac" ]; then
    if have brew; then echo brew; else echo none; fi
    return
  fi
  local manager
  for manager in apt-get dnf pacman zypper apk; do
    if have "$manager"; then
      echo "$manager"
      return
    fi
  done
  echo none
}

PKG="$(detect_pkg)"

if [ ! -f package.json ] || ! grep -q '"name": "absqir"' package.json; then
  printf 'Run this script from the absqir repository root.\n' >&2
  exit 1
fi

NODE_MIN="$(sed -n 's/.*"node": *">=\([0-9][0-9]*\)".*/\1/p' package.json | head -1)"
[ -n "$NODE_MIN" ] || NODE_MIN=22
PNPM_VERSION="$(sed -n 's/.*"packageManager": *"pnpm@\([0-9.]*\)".*/\1/p' package.json | head -1)"
[ -n "$PNPM_VERSION" ] || PNPM_VERSION=10

ME="${USER:-$(id -un)}"
DB_NAME="absqir"
DB_URL=""
DB_CONTAINER="absqir-postgres"
DB_VOLUME="absqir-db-data"

printf '%sabsqir setup%s\n' "$BOLD" "$RESET"
note "system: $PLATFORM, package manager: $PKG"
if [ "$CHECK_ONLY" -eq 1 ]; then note "check only: the script reports and changes nothing"; fi

# -------------------------------------------------------------- homebrew ----

setup_homebrew() {
  [ "$PLATFORM" = "mac" ] || return 0
  step "Homebrew"
  if have brew; then
    ok "brew $(brew --version | head -1 | awk '{print $2}') is installed"
    return 0
  fi
  miss "brew is not installed, and the macOS steps need it"
  if ! confirm "Install Homebrew from brew.sh?"; then
    add_todo "Install Homebrew: https://brew.sh"
    return 1
  fi
  act "installing Homebrew"
  if ! run /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
    bad "Homebrew did not install"
    add_todo "Install Homebrew: https://brew.sh"
    return 1
  fi
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  PKG="$(detect_pkg)"
  ok "Homebrew is installed"
}

# ------------------------------------------------------------------ node ----

node_major() { node -v 2>/dev/null | sed 's/^v//; s/\..*//'; }

install_node() {
  case "$PKG" in
    brew)
      confirm "Install Node with brew install node?" || return 1
      act "installing Node"
      run brew install node
      ;;
    apt-get)
      confirm "Add the NodeSource repository and install Node $NODE_MIN? The step needs sudo." || return 1
      act "installing Node from NodeSource"
      if [ -n "$SUDO" ]; then
        run bash -c "curl -fsSL https://deb.nodesource.com/setup_${NODE_MIN}.x | $SUDO -E bash -"
      else
        run bash -c "curl -fsSL https://deb.nodesource.com/setup_${NODE_MIN}.x | bash -"
      fi
      sudo_run apt-get install -y nodejs
      ;;
    dnf)
      confirm "Install Node with dnf? The step needs sudo." || return 1
      act "installing Node"
      sudo_run dnf install -y nodejs npm
      ;;
    pacman)
      confirm "Install Node with pacman? The step needs sudo." || return 1
      act "installing Node"
      sudo_run pacman -S --needed --noconfirm nodejs npm
      ;;
    zypper)
      confirm "Install Node with zypper? The step needs sudo." || return 1
      act "installing Node"
      sudo_run zypper install -y "nodejs${NODE_MIN}"
      ;;
    apk)
      confirm "Install Node with apk? The step needs sudo." || return 1
      act "installing Node"
      sudo_run apk add --no-cache nodejs npm
      ;;
    *)
      note "No known package manager here."
      return 1
      ;;
  esac
}

setup_node() {
  step "Node $NODE_MIN or newer"
  local major
  if have node; then
    major="$(node_major)"
    if [ -n "$major" ] && [ "$major" -ge "$NODE_MIN" ]; then
      ok "node $(node -v) is installed"
      return 0
    fi
    miss "node $(node -v) is too old. absqir needs $NODE_MIN or newer."
  else
    miss "node is not installed"
  fi

  if ! install_node; then
    add_todo "Install Node $NODE_MIN or newer: https://nodejs.org"
    return 1
  fi

  hash -r
  major="$(node_major)"
  if [ -n "$major" ] && [ "$major" -ge "$NODE_MIN" ]; then
    ok "node $(node -v) is installed"
    return 0
  fi
  bad "node is still older than $NODE_MIN"
  add_todo "Install Node $NODE_MIN or newer: https://nodejs.org"
  return 1
}

# ------------------------------------------------------------------ pnpm ----

setup_pnpm() {
  step "pnpm $PNPM_VERSION"
  if have pnpm; then
    ok "pnpm $(pnpm --version) is installed"
    return 0
  fi
  miss "pnpm is not installed"
  if ! confirm "Install pnpm $PNPM_VERSION?"; then
    add_todo "Install pnpm: npm install -g pnpm@$PNPM_VERSION"
    return 1
  fi

  act "installing pnpm $PNPM_VERSION"
  if have npm && run npm install -g "pnpm@$PNPM_VERSION"; then
    hash -r
    ok "pnpm $(pnpm --version) is installed"
    return 0
  fi

  note "npm could not write the global folder. The script tries the pnpm installer."
  if run bash -c "curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION SHELL=$SHELL sh -"; then
    PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
    export PNPM_HOME
    PATH="$PNPM_HOME:$PATH"
    hash -r
    if have pnpm; then
      ok "pnpm $(pnpm --version) is installed"
      note "Open a new terminal later, so pnpm stays on your PATH."
      return 0
    fi
  fi

  bad "pnpm did not install"
  add_todo "Install pnpm: https://pnpm.io/installation"
  return 1
}

# ---------------------------------------------------------------- docker ----

install_docker() {
  case "$PKG" in
    brew)
      confirm "Install Docker Desktop with brew? The download is near 1 GB." || return 1
      act "installing Docker Desktop"
      run brew install --cask docker
      ;;
    apt-get)
      confirm "Install Docker with apt-get? The step needs sudo." || return 1
      act "installing Docker"
      sudo_run apt-get update
      sudo_run apt-get install -y docker.io
      ;;
    dnf)
      confirm "Install Docker with dnf? The step needs sudo." || return 1
      act "installing Docker"
      sudo_run dnf install -y docker
      ;;
    pacman)
      confirm "Install Docker with pacman? The step needs sudo." || return 1
      act "installing Docker"
      sudo_run pacman -S --needed --noconfirm docker
      ;;
    zypper)
      confirm "Install Docker with zypper? The step needs sudo." || return 1
      act "installing Docker"
      sudo_run zypper install -y docker
      ;;
    apk)
      confirm "Install Docker with apk? The step needs sudo." || return 1
      act "installing Docker"
      sudo_run apk add --no-cache docker
      ;;
    *)
      note "No known package manager here."
      return 1
      ;;
  esac
}

start_docker_daemon() {
  if docker info >/dev/null 2>&1; then return 0; fi

  # A socket the account cannot open never gets better with a restart.
  # Read the message into a variable: pipefail hides a grep hit behind the
  # failing docker exit code.
  local why
  why="$(docker info 2>&1 || true)"
  case "$why" in
    *"permission denied"* | *"Permission denied"*)
      bad "your account cannot open the Docker socket"
      add_todo "Run: sudo usermod -aG docker $ME, then log in again"
      return 1
      ;;
  esac

  miss "the Docker engine is not running"
  if [ "$PLATFORM" = "mac" ]; then
    if [ -d /Applications/Docker.app ]; then
      confirm "Start Docker Desktop?" || return 1
      act "starting Docker Desktop"
      run open -a Docker || return 1
    elif have colima; then
      confirm "Start the engine with colima start?" || return 1
      act "starting colima"
      run colima start || return 1
    else
      note "Neither Docker Desktop nor colima is on this Mac."
      return 1
    fi
  else
    confirm "Start the Docker service? The step needs sudo." || return 1
    act "starting the Docker service"
    sudo_run systemctl start docker || return 1
  fi
  local tries=0
  while [ "$tries" -lt 60 ]; do
    if docker info >/dev/null 2>&1; then
      ok "the Docker engine is running"
      return 0
    fi
    sleep 2
    tries=$((tries + 1))
  done
  bad "the Docker engine did not answer in two minutes"
  return 1
}

setup_docker() {
  if have docker; then
    ok "docker $(docker --version | sed 's/Docker version //; s/,.*//') is installed"
  else
    miss "docker is not installed"
    if ! install_docker; then
      add_todo "Install Docker: https://docs.docker.com/get-started/get-docker/"
      return 1
    fi
    hash -r
    if ! have docker; then
      bad "docker did not install"
      add_todo "Install Docker: https://docs.docker.com/get-started/get-docker/"
      return 1
    fi
    ok "docker is installed"
    if [ "$PLATFORM" = "linux" ]; then
      note "To use docker without sudo: sudo usermod -aG docker $ME, then log in again."
    fi
  fi
  start_docker_daemon
}

# -------------------------------------------------------------- database ----

psql_ok() {
  have psql || return 1
  PGCONNECT_TIMEOUT=3 psql "$1" -Atqc 'select 1' >/dev/null 2>&1
}

port_open() {
  if have pg_isready; then
    PGCONNECT_TIMEOUT=3 pg_isready -h 127.0.0.1 -p 5432 -q >/dev/null 2>&1 && return 0
    return 1
  fi
  (exec 3<>/dev/tcp/127.0.0.1/5432) >/dev/null 2>&1 || return 1
  exec 3>&-
  return 0
}

env_database_url() {
  [ -f .env ] || return 1
  sed -n 's/^DATABASE_URL=//p' .env | head -1 | tr -d '"'"'"
}

# Try the URLs a local Postgres usually answers on, newest guess first.
find_database() {
  local candidates=() url from_env
  from_env="$(env_database_url || true)"
  if [ -n "$from_env" ]; then candidates+=("$from_env"); fi
  candidates+=(
    "postgresql://$ME@localhost:5432/$DB_NAME"
    "postgresql://$ME:postgres@localhost:5432/$DB_NAME"
    "postgresql://postgres:postgres@localhost:5432/$DB_NAME"
    "postgresql://absqir:absqir@localhost:5432/$DB_NAME"
  )
  for url in "${candidates[@]}"; do
    if psql_ok "$url"; then
      DB_URL="$url"
      return 0
    fi
  done
  return 1
}

# The server answers but the absqir database is absent. Create it through the
# maintenance database, with whichever account accepts the connection.
create_database() {
  local admins url
  admins=(
    "postgresql://$ME@localhost:5432/postgres"
    "postgresql://$ME:postgres@localhost:5432/postgres"
    "postgresql://postgres:postgres@localhost:5432/postgres"
    "postgresql://absqir:absqir@localhost:5432/postgres"
  )
  for url in "${admins[@]}"; do
    if psql_ok "$url"; then
      act "creating the $DB_NAME database"
      if run psql "$url" -q -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null 2>&1; then
        DB_URL="${url%/postgres}/$DB_NAME"
        return 0
      fi
    fi
  done
  return 1
}

start_native_postgres() {
  if [ "$PLATFORM" = "mac" ]; then
    have brew || return 1
    local formula
    formula="$(brew list --formula 2>/dev/null | grep '^postgresql' | head -1 || true)"
    [ -n "$formula" ] || return 1
    miss "$formula is installed but it does not answer on port 5432"
    confirm "Start it with brew services start $formula?" || return 1
    run brew services start "$formula" || return 1
  else
    have systemctl || return 1
    systemctl list-unit-files 2>/dev/null | grep -q '^postgresql' || return 1
    miss "postgresql is installed but it does not answer on port 5432"
    confirm "Start it with systemctl start postgresql? The step needs sudo." || return 1
    sudo_run systemctl start postgresql || return 1
  fi
  local tries=0
  while [ "$tries" -lt 15 ]; do
    port_open && return 0
    sleep 1
    tries=$((tries + 1))
  done
  return 1
}

container_state() {
  docker inspect -f '{{.State.Status}}' "$DB_CONTAINER" 2>/dev/null
}

wait_for_container() {
  local tries=0
  while [ "$tries" -lt 30 ]; do
    if docker exec "$DB_CONTAINER" pg_isready -U absqir -d "$DB_NAME" -q >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    tries=$((tries + 1))
  done
  return 1
}

start_container_postgres() {
  setup_docker || return 1

  local state
  state="$(container_state || true)"
  case "$state" in
    running)
      ok "the $DB_CONTAINER container is running"
      ;;
    "")
      confirm "Run Postgres 16 in a container named $DB_CONTAINER on port 5432?" || return 1
      act "starting the $DB_CONTAINER container"
      run docker run --detach \
        --name "$DB_CONTAINER" \
        --restart unless-stopped \
        --env POSTGRES_USER=absqir \
        --env POSTGRES_PASSWORD=absqir \
        --env POSTGRES_DB="$DB_NAME" \
        --publish 5432:5432 \
        --volume "$DB_VOLUME:/var/lib/postgresql/data" \
        postgres:16-alpine >/dev/null || return 1
      ;;
    *)
      miss "the $DB_CONTAINER container is $state"
      confirm "Start it?" || return 1
      act "starting the $DB_CONTAINER container"
      run docker start "$DB_CONTAINER" >/dev/null || return 1
      ;;
  esac

  if ! wait_for_container; then
    bad "the container did not accept connections in one minute"
    note "Read the log with: docker logs $DB_CONTAINER"
    return 1
  fi
  DB_URL="postgresql://absqir:absqir@localhost:5432/$DB_NAME"
  ok "Postgres answers in the container"
}

setup_database() {
  step "Postgres on port 5432"

  if find_database; then
    ok "the $DB_NAME database answers already"
    return 0
  fi

  # The host may carry no psql, so ask the container itself.
  if have docker && [ "$(container_state || true)" = "running" ]; then
    if docker exec "$DB_CONTAINER" pg_isready -U absqir -d "$DB_NAME" -q >/dev/null 2>&1; then
      DB_URL="postgresql://absqir:absqir@localhost:5432/$DB_NAME"
      ok "the $DB_CONTAINER container serves the $DB_NAME database"
      return 0
    fi
  fi

  if port_open || start_native_postgres; then
    if find_database; then
      ok "the $DB_NAME database answers already"
      return 0
    fi
    if have psql; then
      miss "Postgres answers, but it has no $DB_NAME database"
      if create_database; then
        ok "the $DB_NAME database is ready"
        return 0
      fi
      note "The script could not log in to create the database."
    else
      miss "Postgres answers on 5432, but psql is absent, so the script cannot check the database"
    fi
    add_todo "Create the database yourself: createdb $DB_NAME"
    add_todo "Then put its URL in .env as DATABASE_URL"
    return 1
  fi

  miss "nothing answers on port 5432"
  if start_container_postgres; then
    return 0
  fi

  add_todo "Start a Postgres 16 server on port 5432, then run ./setup.sh again"
  return 1
}

# ------------------------------------------------------------ env files -----

write_file() {
  local target="$1" tmp
  tmp="$(mktemp)"
  cat >"$tmp"
  mv "$tmp" "$target"
}

set_env_var() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file"; then
    sed "s|^${key}=.*|${key}=\"${value}\"|" "$file" | write_file "$file"
  else
    printf '%s="%s"\n' "$key" "$value" >>"$file"
  fi
}

read_env_var() {
  sed -n "s/^$2=//p" "$1" | head -1 | tr -d '"'"'"
}

random_secret() {
  if have openssl; then
    openssl rand -base64 32
    return
  fi
  LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 44
  printf '\n'
}

# Miniflare rejects a connection string without a password, even when the
# server trusts the account.
url_with_password() {
  case "$1" in
    *://*:*@*) printf '%s' "$1" ;;
    *://*@*) printf '%s' "$1" | sed 's|://\([^@/]*\)@|://\1:postgres@|' ;;
    *) printf '%s' "$1" ;;
  esac
}

setup_env_files() {
  step "Environment files"
  if [ "$CHECK_ONLY" -eq 1 ]; then
    note "Check only. The script writes no file."
    return 0
  fi

  if [ -f .env ]; then
    ok ".env is there"
  else
    act "copying .env.example to .env"
    cp .env.example .env
    ok ".env is written"
  fi

  if [ -n "$DB_URL" ]; then
    local current
    current="$(read_env_var .env DATABASE_URL)"
    if [ "$current" = "$DB_URL" ]; then
      ok "DATABASE_URL points at the database"
    else
      act "writing DATABASE_URL into .env"
      set_env_var .env DATABASE_URL "$DB_URL"
      ok "DATABASE_URL points at the database"
    fi
  fi

  local vars="apps/web/.dev.vars"
  if [ -f "$vars" ]; then
    ok "$vars is there"
  else
    act "copying the example to $vars"
    cp apps/web/.dev.vars.example "$vars"
    ok "$vars is written"
  fi

  local secret
  secret="$(read_env_var "$vars" BETTER_AUTH_SECRET)"
  case "$secret" in
    "" | replace-me*)
      act "writing a new BETTER_AUTH_SECRET"
      set_env_var "$vars" BETTER_AUTH_SECRET "$(random_secret)"
      ok "BETTER_AUTH_SECRET is set"
      ;;
    *)
      if [ "${#secret}" -lt 32 ]; then
        act "the secret is shorter than 32 characters, writing a new one"
        set_env_var "$vars" BETTER_AUTH_SECRET "$(random_secret)"
        ok "BETTER_AUTH_SECRET is set"
      else
        ok "BETTER_AUTH_SECRET is set"
      fi
      ;;
  esac
}

setup_wrangler_connection() {
  step "The Worker connection string"
  local file="apps/web/wrangler.jsonc" wanted current
  if [ -z "$DB_URL" ]; then
    note "No database yet, so the script leaves $file alone."
    add_todo "Set localConnectionString in $file to your Postgres URL"
    return 1
  fi

  wanted="$(url_with_password "$DB_URL")"
  current="$(sed -n 's/.*"localConnectionString": *"\([^"]*\)".*/\1/p' "$file" | head -1)"
  if [ "$current" = "$wanted" ]; then
    ok "localConnectionString points at the database"
    return 0
  fi

  miss "localConnectionString reads $current"
  note "It needs to read $wanted"
  if ! confirm "Update $file? Git tracks the file, so the edit shows in git status."; then
    add_todo "Set localConnectionString in $file to $wanted"
    return 1
  fi
  act "updating $file"
  sed "s|\"localConnectionString\": *\"[^\"]*\"|\"localConnectionString\": \"$wanted\"|" "$file" | write_file "$file"
  ok "localConnectionString points at the database"
}

# ---------------------------------------------------------- dependencies ----

setup_dependencies() {
  step "Workspace dependencies"
  if [ "$CHECK_ONLY" -eq 1 ]; then
    note "Check only. The script runs no install."
    return 0
  fi
  if ! have pnpm; then
    note "pnpm is absent, so the script cannot install the dependencies."
    add_todo "Run pnpm install"
    return 1
  fi
  act "running pnpm install"
  if run pnpm install; then
    ok "the dependencies are installed"
    return 0
  fi
  bad "pnpm install failed"
  add_todo "Run pnpm install and read the error"
  return 1
}

setup_schema() {
  step "Database schema"
  if [ "$CHECK_ONLY" -eq 1 ]; then
    note "Check only. The script pushes no schema."
    return 0
  fi
  if [ -z "$DB_URL" ] || ! have pnpm; then
    note "The script skips the schema until the database and pnpm are ready."
    add_todo "Run pnpm db:push"
    return 1
  fi
  if ! confirm "Push the schema into $DB_NAME with pnpm db:push?"; then
    add_todo "Run pnpm db:push"
    return 1
  fi
  act "pushing the schema"
  if run pnpm db:push; then
    ok "the schema is in the database"
    return 0
  fi
  bad "pnpm db:push failed"
  add_todo "Run pnpm db:push and read the error"
  return 1
}

# ------------------------------------------------------------------ main ----

setup_homebrew || true
setup_node || true
setup_pnpm || true
setup_database || true
setup_env_files || true
setup_wrangler_connection || true
setup_dependencies || true
setup_schema || true

printf '\n%s%s%s\n' "$BOLD" "────────────────────────────────────────" "$RESET"

if [ "${#TODO[@]}" -gt 0 ]; then
  printf '%sSetup stopped short. Finish these steps:%s\n' "$YELLOW" "$RESET"
  for item in "${TODO[@]}"; do
    printf '  %s-%s %s\n' "$YELLOW" "$RESET" "$item"
  done
  printf '\nRun ./setup.sh again after that.\n'
  exit 1
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
  printf '%sEvery tool is in place.%s Run ./setup.sh to finish the setup.\n' "$GREEN" "$RESET"
  exit 0
fi

printf '%sabsqir is ready.%s\n\n' "$GREEN" "$RESET"
printf '  pnpm dev        the site and the API on http://localhost:4321\n'
printf '  pnpm dev:all    the same, plus the package type watchers\n'
printf '  pnpm dev:email  the email preview on http://localhost:3001\n\n'
printf 'Without RESEND_API_KEY the server prints every sign-in code to its log.\n'
