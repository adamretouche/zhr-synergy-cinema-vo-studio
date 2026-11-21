# 🌐 دليل الاستضافة السحابية 24/7 — ZHR Synergy Cinema VO Studio
### تشغيل الاستوديو على الإنترنت طوال الوقت من أي هاتف أو كمبيوتر في العالم

يوضح هذا الدليل كيفية رفع وتشغيل استوديو **ZHR Synergy Cinema VO Studio** على الإنترنت بشكل دائم مجاناً أو بتكلفة شبه معدومة، ليصبح لديك رابط خاص يعمل 24/7 دون الحاجة لأن يكون جهاز الماك لديك قيد التشغيل.

---

## 🚀 الطريقة الأولى: النشر بنقرة واحدة عبر Render (مجاناً 100%) — الخيار الموصى به

منصة **Render.com** توفر خطة مجانية (Free Web Service) متوافقة تماماً مع Node.js و Express و React، ومدمج في المشروع ملف الإعداد التلقائي `render.yaml`.

### الخطوات:
1. اذهب إلى موقع [Render.com](https://render.com) وسجّل الدخول بحسابك في **GitHub**.
2. اضغط على زر **New +** ثم اختر **Web Service**.
3. اختر مستودع المشروع:
   `https://github.com/adamretouche/zhr-synergy-cinema-vo-studio`
4. ستجد الإعدادات مجهزة تلقائياً:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
5. في قسم **Environment Variables (المتغيرات)**، أضف متغيراً واحداً فقط:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** مفتاح الـ API الخاص بك من Google AI Studio (`AIzaSy...`).
6. اضغط **Deploy Web Service**.

🎉 خلال دقيقتين سيعطيك Render رابطاً دائماً مثل:
`https://zhr-synergy-cinema-vo-studio.onrender.com`
يمكنك فتحه من هاتفك الذكي أو من جهاز صديقك والعمل عليه بكامل المميزات وبسرعة فائقة.

---

## ⚡ الطريقة الثانية: النشر عبر Railway.app

1. ادخل إلى [Railway.app](https://railway.app) وسجل الدخول بحساب GitHub.
2. اضغط **New Project** -> **Deploy from GitHub repo**.
3. اختر `adamretouche/zhr-synergy-cinema-vo-studio`.
4. أضف متغير البيئة `GEMINI_API_KEY`.
5. سيتم استخدام ملف `Dockerfile` تلقائياً مع تثبيت FFmpeg وكافة الأدوات.

---

## ☁️ الطريقة الثالثة: النشر على Google Cloud Run

إذا أردت الاستضافة السحابية المباشرة على بنية قوقل التحتية:
1. يتم بناء الحاوية باستخدام ملف `Dockerfile` المرفق في المشروع.
2. تشغيل الأمر عبر Google Cloud SDK:
   ```bash
   gcloud run deploy synergy-vo-studio \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY=AIzaSy...
   ```
3. ستحصل على رابط رسمي سريع ومحمي على نطاق قوقل: `https://synergy-vo-studio-xxx.a.run.app`.

---

## 🔒 الأمان وحماية المفاتيح:
- الاستوديو يدعم إدخال المفتاح مباشرة من واجهة الاستوديو (`Configuration System -> API Key`) وتخزينه في متصفحك بشكل آمن وخاص، أو إعداده كمتغير بيئة عام على السيرفر.
