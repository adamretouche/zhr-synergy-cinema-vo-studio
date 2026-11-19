#!/usr/bin/env bash
# ==============================================================================
# Synergy Cinema VO Studio — Desktop App Launcher
# ==============================================================================

PROJECT_DIR="/Users/zhr/antigravity/03--ORIGNAL--Synergy-Intro-للافلام-تعليق-صوتي-"
PORT=3000
URL="http://localhost:$PORT"

export PATH="/Library/Frameworks/Python.framework/Versions/3.14/bin:$HOME/.local/bin:$PATH"
export GEMINI_API_KEY="${GEMINI_API_KEY:-AIzaSyDw5V4eAoOe2Uf0OCkVGBckoZlXLB6acU0}"

if lsof -i :$PORT >/dev/null 2>&1; then
    open "$URL"
    exit 0
fi

cd "$PROJECT_DIR" || exit 1
nohup npx tsx server.ts > /tmp/synergy_studio.log 2>&1 &
disown

for i in {1..25}; do
    if curl -s -I "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
        break
    fi
    sleep 0.3
done

open "$URL"
