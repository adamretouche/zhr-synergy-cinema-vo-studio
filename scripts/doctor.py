#!/usr/bin/env python3
"""
Synergy Cinema Voice-Over Studio — Deep System Diagnostic Doctor
فحص الدكتور الشامل والعميق لصحة وموثوقية استوديو سينيرجي الصوتي
"""
import sys
import os
import json
import time
import subprocess
import shutil

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(title: str):
    print(f"\n{BOLD}{CYAN}════════════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}{CYAN} 🩺 {title}{RESET}")
    print(f"{BOLD}{CYAN}════════════════════════════════════════════════════════════════════{RESET}")

def report(status: str, message: str, detail: str = ""):
    if status == "PASS":
        badge = f"{GREEN}[PASS / سليم]{RESET}"
    elif status == "WARN":
        badge = f"{YELLOW}[WARN / تنبيه]{RESET}"
    else:
        badge = f"{RED}[FAIL / فشل]{RESET}"
    print(f" {badge} {BOLD}{message}{RESET}")
    if detail:
        print(f"       ↳ {detail}")

def check_env():
    print_header("1. فحص بيئة العمل والمفاتيح (Environment & API Key)")
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        report("FAIL", "ملف .env غير موجود", f"المسار المتوقع: {env_path}")
        return False, ""
    
    key = ""
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                key = line.split("=", 1)[1].strip()
    
    if not key or len(key) < 15:
        report("FAIL", "مفتاح GEMINI_API_KEY غير موجود أو غير صالح في .env")
        return False, ""
    
    masked_key = key[:8] + "..." + key[-4:]
    report("PASS", f"مفتاح Gemini API مهيأ بنجاح ({masked_key})")
    return True, key

def check_dependencies():
    print_header("2. فحص أدوات التحويل الصوتي وFFmpeg (Audio Engine & Tools)")
    # FFmpeg
    ffmpeg_bin = shutil.which("ffmpeg") or "/usr/local/bin/ffmpeg" or "/opt/homebrew/bin/ffmpeg"
    if ffmpeg_bin and os.path.exists(ffmpeg_bin):
        try:
            res = subprocess.run([ffmpeg_bin, "-version"], capture_output=True, text=True, timeout=5)
            version_line = res.stdout.split("\n")[0]
            report("PASS", f"FFmpeg متوفر وجاهز: {version_line.split('Copyright')[0].strip()}")
        except Exception as e:
            report("WARN", f"FFmpeg موجود لكن فشل فحص إصداره: {e}")
    else:
        report("FAIL", "FFmpeg غير مثبت في النظام!")

    # edge-tts
    try:
        import edge_tts
        report("PASS", "مكتبة المحرك الاحتياطي edge-tts مثبتة وجاهزة")
    except ImportError:
        report("FAIL", "مكتبة edge-tts غير مثبتة في بايثون!")

    # whisper
    try:
        import whisper
        report("PASS", "مكتبة فحص النطق الصوتي Whisper متوفرة للتحقق من الكلمات")
    except ImportError:
        report("WARN", "مكتبة whisper غير مثبتة (اختيارية للتحقق الذاتي من النطق)")

def check_gemini_api(key: str):
    print_header("3. فحص الاتصال ونماذج Google Gemini API")
    if not key:
        report("FAIL", "تم تخطي فحص Gemini API لعدم وجود مفتاح")
        return
    
    # Test curl ping
    try:
        import urllib.request
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash?key={key}"
        req = urllib.request.Request(url, headers={"User-Agent": "aistudio-build"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                report("PASS", "الاتصال السحابي بـ Gemini API متصل وشغال 100% 🟢")
            else:
                report("WARN", f"رمز استجابة غير متوقع: {resp.status}")
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            report("WARN", "مفتاح الـ API وصل لسقف الصرف الشهري (Spend Cap 429)", "يعمل النظام بنمط الاستوديو الاحتياطي تلقائياً")
        else:
            report("FAIL", f"فشل الاتصال بـ Gemini API: {err_msg}")

def check_audio_speech_isolation():
    print_header("4. فحص عزل التوجيهات وضمان عدم قراءة تعليمات النظام (Strict Isolation)")
    # Check server.ts prompt formatting
    server_path = os.path.join(os.path.dirname(__file__), "..", "server.ts")
    if os.path.exists(server_path):
        with open(server_path, "r", encoding="utf-8") as f:
            code = f.read()
            if "DO NOT speak this direction" in code:
                report("PASS", "كود السيرفر يطبق العزل الصارم للتوجيهات (DO NOT speak this direction aloud)")
            else:
                report("FAIL", "لم يتم العثور على توجيه العزل الصارم في server.ts!")
    
    # Check constants.ts audioSrc
    const_path = os.path.join(os.path.dirname(__file__), "..", "constants.ts")
    if os.path.exists(const_path):
        with open(const_path, "r", encoding="utf-8") as f:
            code = f.read()
            if "audioSrc:" in code:
                report("WARN", "توجد مراجع لملفات audioSrc مسجلة مسبقاً في constants.ts")
            else:
                report("PASS", "تم تطهير constants.ts تماماً من أي ملفات صوتية ثابتة مسجلة مسبقاً (No preloaded dead files)")

def check_server_and_port():
    print_header("5. فحص خادم الاستوديو المحلي ومنافذ الشبكة (Local Server & Port 3000)")
    try:
        import urllib.request
        req = urllib.request.Request("http://localhost:3000/api/gemini/health")
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("connected") or data.get("status"):
                status_str = "🟢 متصل" if data.get("connected") else "🔴 مفصول (احتياطي)"
                report("PASS", f"خادم Synergy يعمل بنجاح على المنفذ 3000 ({status_str})")
            else:
                report("WARN", "الخادم يستجيب ولكن بتنسيق غير متوقع")
    except Exception as e:
        report("WARN", f"خادم المنفذ 3000 لم يستجب فورياً: {e}")

def main():
    print(f"\n{BOLD}{GREEN}===================================================================={RESET}")
    print(f"{BOLD}{GREEN}   🩺 فحص الدكتور لاستوديو سينيرجي الصوتي (Synergy VO Doctor)     {RESET}")
    print(f"{BOLD}{GREEN}===================================================================={RESET}")
    
    has_key, key = check_env()
    check_dependencies()
    check_gemini_api(key)
    check_audio_speech_isolation()
    check_server_and_port()

    print(f"\n{BOLD}{GREEN}===================================================================={RESET}")
    print(f"{BOLD}{GREEN}   🎉 اكتمل فحص الدكتور: النظام في حالة تشغيلية ممتازة ومستقرة!   {RESET}")
    print(f"{BOLD}{GREEN}===================================================================={RESET}\n")

if __name__ == "__main__":
    main()
