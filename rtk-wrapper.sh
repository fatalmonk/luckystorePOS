#!/usr/bin/env bash
# rtk-wrapper.sh – log each rtk command with a timestamp
# Usage: rtk-wrapper <rtk subcommand> [args...]

# Log file (user‑specific, hidden)
LOG_FILE="$HOME/.rtk/session.log"
# Ensure the directory exists before writing logs
mkdir -p "${HOME}/.rtk"

time=$(date --iso-8601=seconds)
cmd="rtk $*"

# Record start
printf "%s | START | %s\n" "$time" "$cmd" >> "$LOG_FILE"

# Run the actual rtk command, preserving exit code
"rtk" "$@"
exit_code=$?

# Record end
time_end=$(date --iso-8601=seconds)
printf "%s | END   | %s | exit=%d\n" "$time_end" "$cmd" $exit_code >> "$LOG_FILE"

exit $exit_code
