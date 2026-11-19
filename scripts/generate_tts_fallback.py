#!/usr/bin/env python3
"""
Synergy Cinema Fallback TTS Engine (Pure 24kHz Linear PCM)
Converts edge-tts output to genuine 24000Hz 16-bit Mono Linear PCM via FFmpeg.
Features tailored voice mapping, deep sub-bass cinematic resonance, and precise pitch/speed tuning.
"""
import sys
import json
import asyncio
import subprocess
import base64
import os
import re

# Resolve FFmpeg binary
FFMPEG_CANDIDATES = [
    "/Users/zhr/.gemini/antigravity/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "ffmpeg",
]
FFMPEG_PATH = "ffmpeg"
for candidate in FFMPEG_CANDIDATES:
    if os.path.exists(candidate) and os.access(candidate, os.X_OK):
        FFMPEG_PATH = candidate
        break

# Map Gemini voice names to neural voices with tailored tonal profiles
VOICE_MAP_AR = {
    # Deep, gravelly "Voice of God" / Movie Trailer
    "Algenib": "ar-EG-ShakirNeural",
    # Deep, warm, authoritative
    "Charon": "ar-SA-HamedNeural",
    # Deep baritone
    "Sadachbia": "ar-SA-HamedNeural",
    # Fast, energetic radio
    "Fenrir": "ar-EG-ShakirNeural",
    # Smooth, balanced
    "Algieba": "ar-OM-AbdullahNeural",
    # Animated, youthful
    "Puck": "ar-OM-AbdullahNeural",
    # Firm, composed female
    "Kore": "ar-SA-ZariyahNeural",
    # Warm, lyrical female
    "Aoede": "ar-OM-AyshaNeural",
    # Bright, youthful female
    "Leda": "ar-AE-FatimaNeural",
    # Soft, whispery
    "Enceladus": "ar-OM-AbdullahNeural",
    "default": "ar-EG-ShakirNeural",
}

VOICE_MAP_EN = {
    # Deep, gravelly "Voice of God" / Movie Trailer
    "Algenib": "en-US-ChristopherNeural",
    # Deep, warm, authoritative
    "Charon": "en-US-ChristopherNeural",
    # Deep baritone
    "Sadachbia": "en-US-ChristopherNeural",
    # Fast, energetic radio
    "Fenrir": "en-US-GuyNeural",
    # Smooth, balanced
    "Algieba": "en-US-AndrewNeural",
    # Casual, youthful
    "Puck": "en-US-BrianNeural",
    # Composed female
    "Kore": "en-US-JennyNeural",
    # Expressive female
    "Aoede": "en-US-AriaNeural",
    # Bright female
    "Leda": "en-US-MichelleNeural",
    # Soft, breathy
    "Enceladus": "en-US-EricNeural",
    "default": "en-US-ChristopherNeural",
}

def detect_language(text: str) -> str:
    if re.search(r'[\u0600-\u06FF]', text):
        return "ar"
    return "en"

def pick_voice(text: str, requested_voice: str) -> str:
    lang = detect_language(text)
    mapping = VOICE_MAP_AR if lang == "ar" else VOICE_MAP_EN
    return mapping.get(requested_voice, mapping["default"])

async def generate_pcm(text: str, voice_name: str, rate: str = "+0%", pitch: str = "+0Hz"):
    import edge_tts

    selected_voice = pick_voice(text, voice_name)
    mp3_data = bytearray()

    # Resilient stream fetching with 1 automatic retry on transient websocket dropout
    for attempt in range(2):
        try:
            communicate = edge_tts.Communicate(text, selected_voice, rate=rate, pitch=pitch)
            temp_data = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    temp_data.extend(chunk["data"])
            if temp_data:
                mp3_data = temp_data
                break
        except Exception as stream_err:
            if attempt == 1:
                raise stream_err
            await asyncio.sleep(0.4)

    if not mp3_data:
        raise RuntimeError("No audio data received from edge-tts fallback.")

    # Pure, unadulterated high-fidelity transcode: MP3 directly to 24000Hz 16-bit Mono Linear PCM
    # Strictly avoids artificial phase-vocoder or excessive bass boosts that cause robotic artifacts
    ffmpeg_args = [
        FFMPEG_PATH,
        "-hide_banner",
        "-loglevel", "error",
        "-i", "pipe:0",
        "-f", "s16le",
        "-ar", "24000",
        "-ac", "1",
        "pipe:1"
    ]

    proc = subprocess.Popen(
        ffmpeg_args,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    pcm_bytes, err = proc.communicate(input=mp3_data)
    if proc.returncode != 0 or not pcm_bytes:
        raise RuntimeError(f"FFmpeg PCM transcoding failed: {err.decode('utf-8', errors='ignore')}")

    duration = (len(pcm_bytes) // 2) / 24000.0
    return pcm_bytes, duration, selected_voice

async def main():
    try:
        input_data = json.loads(sys.stdin.read())
        text = input_data.get("text", "").strip()
        voice_name = input_data.get("voiceName", "Algenib")
        
        speed = input_data.get("speed")
        if speed is not None:
            try:
                spd_val = float(speed)
                rate_pct = int(round((spd_val - 1.0) * 100))
                rate = f"{rate_pct:+d}%"
            except Exception:
                rate = input_data.get("rate", "+0%")
        else:
            rate = input_data.get("rate", "+0%")

        pitch_val = input_data.get("pitch")
        if pitch_val is not None:
            try:
                p_num = int(pitch_val)
                # Scale pitch into natural human vocal register (-4 becomes -10Hz, -5 becomes -12Hz)
                hz_shift = int(round(p_num * 2.5))
                pitch = f"{hz_shift:+d}Hz"
            except Exception:
                pitch = "+0Hz"
        else:
            pitch = input_data.get("pitch", "+0Hz")

        if not text:
            print(json.dumps({"error": "Empty text provided"}), file=sys.stderr)
            sys.exit(1)

        pcm_bytes, duration, chosen_voice = await generate_pcm(
            text, voice_name, rate, pitch
        )
        base64_audio = base64.b64encode(pcm_bytes).decode("utf-8")

        result = {
            "success": True,
            "audioData": base64_audio,
            "durationSeconds": round(duration, 2),
            "sampleRate": 24000,
            "voice": chosen_voice,
            "engine": "fallback-pcm24k-deep"
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
