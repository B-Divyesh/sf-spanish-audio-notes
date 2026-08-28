#!/bin/sh
set -eu

manifest_url="https://github.com/B-Divyesh/sf-spanish-audio-notes/releases/latest/download/latest.json"
manifest="$(curl -fsSL "$manifest_url")"
os="$(uname -s)"
arch="$(uname -m)"
case "$os:$arch" in
  Linux:x86_64|Linux:amd64) key="linux" ;;
  Darwin:arm64|Darwin:aarch64) key="macos_arm64" ;;
  Darwin:x86_64) key="macos_x64" ;;
  *) printf '%s\n' "Audio Margin does not publish an installer for $os/$arch." >&2; exit 1 ;;
esac

block="$(printf '%s' "$manifest" | tr -d '\n' | sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*{\([^}]*\)}.*/\1/p")"
url="$(printf '%s' "$block" | sed -n 's/.*"url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
expected="$(printf '%s' "$block" | sed -n 's/.*"sha256"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -n "$url" ] && [ -n "$expected" ] || { printf '%s\n' "Release manifest is incomplete." >&2; exit 1; }

filename="${url##*/}"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM
curl -fL "$url" -o "$tmp_dir/$filename"
if command -v sha256sum >/dev/null 2>&1; then actual="$(sha256sum "$tmp_dir/$filename" | awk '{print $1}')"; else actual="$(shasum -a 256 "$tmp_dir/$filename" | awk '{print $1}')"; fi
[ "$actual" = "$expected" ] || { printf '%s\n' "SHA-256 mismatch; refusing to install." >&2; exit 1; }

if [ "$os" = "Linux" ]; then
  destination="${XDG_BIN_HOME:-$HOME/.local/bin}"
  mkdir -p "$destination"
  install -m 755 "$tmp_dir/$filename" "$destination/audio-margin"
  printf '%s\n' "Verified and installed Audio Margin at $destination/audio-margin"
  printf '%s\n' "If needed, add $destination to PATH. Run: audio-margin"
else
  destination="$HOME/Downloads/$filename"
  cp "$tmp_dir/$filename" "$destination"
  printf '%s\n' "Verified Audio Margin and saved $destination"
  printf '%s\n' "Open the DMG, then right-click Audio Margin → Open (the first release is unsigned)."
  open "$destination"
fi
