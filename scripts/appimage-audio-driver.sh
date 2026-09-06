#!/bin/sh
set -eu

appimage="$1"
marker="${AUDIO_MARGIN_AUDIO_SMOKE_MARKER:?missing audio smoke marker}"
"$appimage" &
app_pid=$!
cleanup() {
  if kill -0 "$app_pid" 2>/dev/null; then kill "$app_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

attempt=0
while [ "$attempt" -lt 20 ] && ! grep -qx "metadata" "$marker" 2>/dev/null; do
  if ! kill -0 "$app_pid" 2>/dev/null; then exit 1; fi
  attempt=$((attempt + 1))
  sleep 1
done
grep -qx "metadata" "$marker"
window_id="$(xdotool search --sync --onlyvisible --name "Audio Margin" | head -n 1)"
# The first transport control is stable at this point in the fixed 1280×820
# smoke window. A real X11 pointer click gives WebKit the user gesture that
# media playback requires.
xdotool mousemove --window "$window_id" 295 297 click 1
wait "$app_pid"
