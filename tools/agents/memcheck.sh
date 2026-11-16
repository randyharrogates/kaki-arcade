#!/bin/sh
# Check free memory before starting an agent, a UAT run, a render or a performance run
# (docs/PLAN.md section 5, D-039). Usage: tools/agents/memcheck.sh [agent|uat|render|perf]
# Exit 0 = room to start, exit 1 = wait for a running job to finish.
kind="${1:-agent}"
case "$kind" in agent) need=2 ;; uat) need=3 ;; render) need=4 ;; perf) need=4 ;; *) echo "unknown job kind: $kind" >&2; exit 2 ;; esac
total_gb=$(( $(sysctl -n hw.memsize) / 1073741824 ))
free_pct=$(memory_pressure 2>/dev/null | awk -F': ' '/free percentage/ {gsub("%","",$2); print $2}')
[ -z "$free_pct" ] && { echo "could not read memory pressure" >&2; exit 2; }
free_gb=$(( total_gb * free_pct / 100 ))
level=$(sysctl -n kern.memorystatus_vm_pressure_level 2>/dev/null || echo 1)   # 1 normal, 2 warn, 4 critical
echo "memory: ${free_pct}% free (about ${free_gb} of ${total_gb} GB), pressure level ${level}; ${kind} needs ${need} GB"
if [ "$level" -gt 1 ] || [ "$free_gb" -lt "$need" ]; then echo "NOT ENOUGH MEMORY: wait"; exit 1; fi
echo "ok to start"
