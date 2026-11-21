#!/usr/bin/env python3
"""
Synergy Cinema Voice-Over Studio — Whisper Word-Level Timestamps & SRT Generator
توليد ملفات الترجمة والتوقيت المتزامن كلمة بكلمة عبر Whisper
"""
import sys
import os
import json
import warnings
warnings.filterwarnings("ignore")

import whisper

def format_timestamp(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

def transcribe(audio_path: str, model_name: str = "base", language: str = "ar"):
    try:
        model = whisper.load_model(model_name)
        result = model.transcribe(
            audio_path,
            word_timestamps=True,
            language=language if language and language != "auto" else None
        )
        
        srt_lines = []
        words_list = []
        
        for i, seg in enumerate(result.get("segments", []), start=1):
            start_str = format_timestamp(seg["start"])
            end_str = format_timestamp(seg["end"])
            text = seg["text"].strip()
            srt_lines.append(f"{i}\n{start_str} --> {end_str}\n{text}\n")
            
            for w in seg.get("words", []):
                cleaned_word = w.get("word", "").strip()
                if cleaned_word:
                    words_list.append({
                        "word": cleaned_word,
                        "start": round(w.get("start", 0), 3),
                        "end": round(w.get("end", 0), 3),
                        "probability": round(w.get("probability", 1.0), 3)
                    })
                
        print(json.dumps({
            "success": True,
            "text": result.get("text", "").strip(),
            "srt": "\n".join(srt_lines),
            "words": words_list
        }, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Audio path required"}))
        sys.exit(1)
    audio_file = sys.argv[1]
    model_choice = sys.argv[2] if len(sys.argv) > 2 else "base"
    lang = sys.argv[3] if len(sys.argv) > 3 else "ar"
    transcribe(audio_file, model_choice, lang)
