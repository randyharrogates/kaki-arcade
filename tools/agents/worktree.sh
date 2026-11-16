#!/bin/sh
# Create (or reuse) the git worktree for one backlog issue and print its ports.
# Usage: tools/agents/worktree.sh <ISSUE-ID> <slug>      e.g. tools/agents/worktree.sh C-04 netcode
# Rules for working in it: docs/PLAN.md section 5.
set -e
id="$1"; slug="$2"
[ -z "$id" ] || [ -z "$slug" ] && { echo "usage: $0 <ISSUE-ID> <slug>" >&2; exit 2; }
root=$(git rev-parse --show-toplevel)
dir="$(dirname "$root")/kaki-arcade-wt/$id"
branch="issue/$id-$slug"
if [ ! -d "$dir" ]; then git -C "$root" worktree add -q -b "$branch" "$dir" main; fi
# Ports: a stable block of 10 per issue, derived from the track letter and number, so parallel
# dev servers, pairing servers and UAT runs never clash. Range 4100 to 6990.
letter=$(printf '%s' "$id" | cut -c1); num=$(printf '%s' "$id" | sed 's/[^0-9]//g')
idx=$(printf '%s' "GSFCKRPTAX" | awk -v l="$letter" '{print index($0,l)}')
[ "$idx" -eq 0 ] && idx=11
base=$(( 4000 + idx * 270 + (10#$num % 27) * 10 ))
echo "worktree: $dir"
echo "branch:   $branch"
echo "ports:    web=$base signal=$((base+1)) uat=$((base+2)) spare=$((base+3))-$((base+9))"
echo "export KAKI_PORT_WEB=$base KAKI_PORT_SIGNAL=$((base+1)) KAKI_PORT_UAT=$((base+2))"
