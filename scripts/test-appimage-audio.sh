#!/bin/sh
set -eu

appimage="${1:-}"
if [ -z "$appimage" ]; then
  appimage="$(find src-tauri/target/release/bundle/appimage -maxdepth 1 -type f -name '*.AppImage' -print -quit)"
fi
[ -f "$appimage" ] || { printf '%s\n' "No AppImage was found for the audio smoke test." >&2; exit 1; }
command -v xvfb-run >/dev/null 2>&1 || { printf '%s\n' "xvfb-run is required for the AppImage audio smoke test." >&2; exit 1; }
command -v dbus-run-session >/dev/null 2>&1 || { printf '%s\n' "dbus-run-session is required for the AppImage audio smoke test." >&2; exit 1; }
command -v pulseaudio >/dev/null 2>&1 || { printf '%s\n' "pulseaudio is required for the AppImage audio smoke test." >&2; exit 1; }
command -v pactl >/dev/null 2>&1 || { printf '%s\n' "pactl is required for the AppImage audio smoke test." >&2; exit 1; }
command -v xdotool >/dev/null 2>&1 || { printf '%s\n' "xdotool is required for the AppImage audio smoke test." >&2; exit 1; }

test_root="$(mktemp -d)"
marker="$test_root/audio-ready"
log="$test_root/appimage.log"
runtime_dir="$test_root/runtime"
mkdir -m 700 "$runtime_dir"
audio_margin_pid=""
cleanup() {
  if [ -n "$audio_margin_pid" ] && kill -0 "$audio_margin_pid" 2>/dev/null; then kill "$audio_margin_pid" 2>/dev/null || true; fi
  XDG_RUNTIME_DIR="$runtime_dir" pulseaudio -k >/dev/null 2>&1 || true
  # xdg-document-portal can leave a runner-owned FUSE mount below
  # XDG_RUNTIME_DIR. Cleanup must not turn a successful playback assertion
  # into a failed CI job; the isolated runner removes its temporary tree.
  rm -rf "$test_root" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

XDG_RUNTIME_DIR="$runtime_dir" pulseaudio --daemonize=yes --exit-idle-time=-1 --load="module-null-sink sink_name=audio_margin_smoke" >/dev/null 2>&1
XDG_RUNTIME_DIR="$runtime_dir" pactl info >/dev/null

AUDIO_MARGIN_AUDIO_SMOKE=1 AUDIO_MARGIN_AUDIO_SMOKE_MARKER="$marker" APPIMAGE_EXTRACT_AND_RUN=1 XDG_RUNTIME_DIR="$runtime_dir" \
  xvfb-run -a dbus-run-session -- sh scripts/appimage-audio-driver.sh "$appimage" >"$log" 2>&1 &
audio_margin_pid=$!

attempt=0
while [ "$attempt" -lt 30 ] && ! grep -qx "playing" "$marker" 2>/dev/null; do
  if ! kill -0 "$audio_margin_pid" 2>/dev/null; then break; fi
  attempt=$((attempt + 1))
  sleep 1
done

if ! grep -qx "playing" "$marker" 2>/dev/null; then
  sed -n '1,240p' "$log" >&2
  printf '%s\n' "AppImage did not keep its WebKit audio process alive long enough to initialize the sample." >&2
  exit 1
fi
if grep -E "WebKitWebProcess.*(CRITICAL|Segmentation fault)|autoaudiosink not found" "$log" >/dev/null 2>&1; then
  sed -n '1,240p' "$log" >&2
  printf '%s\n' "AppImage logged an audio-framework failure." >&2
  exit 1
fi
printf '%s\n' "@claim:linux-audio-playback AppImage initialized and played the bundled sample without a WebKit audio crash"
