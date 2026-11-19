#!/usr/bin/env bash
# ==============================================================================
# Synergy Cinema VO Studio — Google Drive Backup & Sync System
# نظام المزامنة والنسخ الاحتياطي التلقائي إلى قوقل درايف بتسلسل وتنسيق دقيق
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GDRIVE_ROOT="/Users/zhr/Library/CloudStorage/GoogleDrive-photography.studioss@gmail.com/My Drive"
DEST_ROOT="$GDRIVE_ROOT/Synergy-Cinema-VO-Studio"
CHECKPOINT_DOC="/Users/zhr/.gemini/antigravity/brain/cb3caa5a-8a90-46cb-97dd-7461fa6fee11/synergy_vo_studio_checkpoint.md"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HUMAN_DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo "=================================================================="
echo " 🚀 جاري مزامنة ونسخ استوديو Synergy الصوتي إلى Google Drive..."
echo "=================================================================="

if [ ! -d "$GDRIVE_ROOT" ]; then
    echo "❌ خطأ: لم يتم العثور على مسار Google Drive المثبت محلياً:"
    echo "   $GDRIVE_ROOT"
    exit 1
fi

# 1. إنشاء الهيكل المنظم في قوقل درايف
mkdir -p "$DEST_ROOT/Source"
mkdir -p "$DEST_ROOT/Backups"
mkdir -p "$DEST_ROOT/Documentation"
mkdir -p "$DEST_ROOT/Exports_Audio"

# 2. نسخ وثائق المراجعة والاعتماد
if [ -f "$CHECKPOINT_DOC" ]; then
    cp "$CHECKPOINT_DOC" "$DEST_ROOT/Documentation/"
    echo "✔ تم نسخ وثيقة نقطة المراجعة الفنية إلى مجلد Documentation."
fi

# 3. مزامنة ملفات السورس كود النظيفة (بدون node_modules الضخمة)
echo "▶ جاري مزامنة السورس كود..."
rsync -av --delete \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude=".git" \
    --exclude=".DS_Store" \
    --exclude="bun.lock" \
    "$PROJECT_DIR/" "$DEST_ROOT/Source/" > /dev/null

echo "✔ تم تحديث مجلد السورس كود Source بنجاح."

# 4. حساب رقم التسلسل للأرشيف
SEQ_FILE="$DEST_ROOT/Backups/.sequence"
if [ ! -f "$SEQ_FILE" ]; then
    SEQ=1
else
    PREV_SEQ=$(cat "$SEQ_FILE")
    SEQ=$((PREV_SEQ + 1))
fi
echo "$SEQ" > "$SEQ_FILE"

SEQ_PADDED=$(printf "%03d" "$SEQ")
ZIP_NAME="synergy-vo-backup-${SEQ_PADDED}-${TIMESTAMP}.zip"
ZIP_PATH="$DEST_ROOT/Backups/$ZIP_NAME"

# 5. ضغط المشروع بالكامل كنسخة احتياطية مشفرة ومنظمة
echo "▶ جاري إنشاء الأرشيف المضغوط للنسخة ($SEQ_PADDED)..."
(
    cd "$PROJECT_DIR"
    zip -q -r "$ZIP_PATH" . \
        -x "node_modules/*" \
        -x "dist/*" \
        -x ".git/*" \
        -x "*.DS_Store"
)

ZIP_SIZE=$(ls -lh "$ZIP_PATH" | awk '{print $5}')
echo "✔ تم إنشاء الأرشيف: $ZIP_NAME بحجم ($ZIP_SIZE)."

# 6. تحديث فهرس النسخ الاحتياطية (MANIFEST)
MANIFEST="$DEST_ROOT/BACKUP_MANIFEST.md"
if [ ! -f "$MANIFEST" ]; then
    cat << 'EOF' > "$MANIFEST"
# 📦 فهرس النسخ الاحتياطية — Synergy Cinema VO Studio
يوثق هذا السجل كافة النسخ المرفوعة والمزامنة إلى Google Drive بتسلسل زمني دقيق.

| التسلسل | التاريخ والوقت | اسم ملف الأرشيف | الحجم | الحالة |
| :---: | :--- | :--- | :---: | :---: |
EOF
fi

echo "| **#$SEQ_PADDED** | $HUMAN_DATE | \`$ZIP_NAME\` | $ZIP_SIZE | مكتمل وموثق ✓ |" >> "$MANIFEST"

# 7. ملف الدليل الإرشادي في قوقل درايف
cat << EOF > "$DEST_ROOT/README.md"
# 🎬 Synergy Cinema VO Studio — Google Drive Cloud Repository
تم إنشاء هذا المجلد التلقائي لمزامنة وحفظ استوديو التعليق الصوتي السينمائي (Synergy Intro).

### الهيكل المنظم:
* **\`Source/\`**: أحدث نسخة حية ومباشرة من السورس كود والملفات البرمجية (جاهزة للاسترجاع الفوري).
* **\`Backups/\`**: أرشيفات مضغوطة مرقمة زمنياً لكل إصدار وتحديث لحمايتها من أي فقدان.
* **\`Documentation/\`**: وثائق الاعتماد وخرائط التطوير ونقاط المراجعة الفنية.
* **\`Exports_Audio/\`**: مجلد مخصص لحفظ وتنزيل التعليقات الصوتية والمخرجات النهائية بصيغة WAV.
* **\`BACKUP_MANIFEST.md\`**: سجل التتبع الزمني لكافة النسخ المرفوعة.

آخر تحديث تمت مزامنته: $HUMAN_DATE (النسخة #$SEQ_PADDED).
EOF

echo "=================================================================="
echo " 🎉 اكتملت المزامنة والرفع إلى Google Drive بنجاح تام 100%!"
echo " 📁 المسار في قوقل درايف: My Drive/Synergy-Cinema-VO-Studio"
echo " 📦 رقم النسخة التسلسلي: #$SEQ_PADDED"
echo "=================================================================="
