#!/usr/bin/env bash
# ==============================================================================
# تشغيل استوديو Gemini Speech Studio بنقرة واحدة
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "⚡ جاري تشغيل Gemini Speech Studio..."

# فحص المنفذ 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✓ المنصة تعمل بالفعل على المنفذ 3000!"
else
    echo "🚀 بدء تشغيل السيرفر..."
    npm start &
    sleep 2
fi

# فتح المتصفح على المنصة
echo "🌐 فتح المنصة في المتصفح..."
open "http://localhost:3000"

echo "✅ تم التشغيل بنجاح! الرابط: http://localhost:3000"
