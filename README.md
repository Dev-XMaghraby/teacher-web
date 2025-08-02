# منصة فارس اللغة العربية

**فارس اللغة العربية** هي منصة تعليمية متكاملة عبر الإنترنت، تم تطويرها باستخدام Next.js و Firebase. تهدف المنصة إلى خدمة طلاب اللغة العربية في جميع المراحل التعليمية من خلال توفير امتحانات تفاعلية، شروحات فيديو، مكتبة رقمية، وتدريبات متنوعة، كل ذلك تحت إشراف وتأسيس **دكتور سيد حشمت ابوفرغل**.

---

## الميزات الرئيسية

### للطلاب
- **لوحة تحكم شخصية:** عرض شامل لإحصائيات الطالب، مثل متوسط الدرجات وعدد الامتحانات المتاحة.
- **نظام امتحانات متكامل:** أداء امتحانات إلكترونية (MCQ) مع تصحيح فوري وعرض للنتائج التفصيلية، بالإضافة إلى امتحانات تتطلب رفع ملفات.
- **تدريبات تفاعلية:** تمارين للمراجعة الذاتية مع إظهار الإجابات الصحيحة وتوضيحاتها.
- **شروحات بالفيديو:** مكتبة من مقاطع الفيديو التعليمية مقسمة حسب الصف الدراسي.
- **مكتبة ومؤلفات:** الوصول إلى مؤلفات وملفات PDF من إعداد الدكتور.
- **المعلم الذكي:** مساعد ذكاء اصطناعي (AI Tutor) للإجابة على أسئلة الطلاب في اللغة العربية.
- **ملف شخصي:** إمكانية تعديل البيانات الشخصية وتغيير كلمة المرور.

### للأدمن (لوحة تحكم منفصلة)
- **إدارة الطلاب:** عرض جميع الطلاب المسجلين، تفعيل الحسابات الجديدة، وحذف المستخدمين.
- **إدارة المحتوى:** إضافة وحذف الشروحات (فيديو) وملفات المكتبة (PDF).
- **إدارة الامتحانات والتدريبات:** إنشاء امتحانات وتدريبات بنوعيها (MCQ أو ملف)، وإضافة أسئلة وخيارات وإجابات صحيحة لكل منها.
- **عرض النتائج:** تصفية وعرض جميع نتائج الطلاب مع إمكانية الاطلاع على تفاصيل إجابات كل طالب.
- **إحصائيات عامة:** نظرة سريعة على أعداد الطلاب، الامتحانات، والمحتوى المتاح.

---

## التقنيات المستخدمة
- **الواجهة الأمامية:** Next.js, React, TypeScript, Tailwind CSS, ShadCN/UI
- **الواجهة الخلفية والخدمات:** Firebase (Authentication, Firestore, Storage)
- **الذكاء الاصطناعي:** Genkit (Google AI - Gemini)
- **إدارة النماذج:** React Hook Form, Zod
- **الاستضافة:** Vercel (موصى به) أو Firebase Hosting

لمزيد من التفاصيل، راجع ملف `TECH_STACK.md`.

---

## كيفية تشغيل المشروع ونشره

يمكنك نشر هذا المشروع باستخدام **Vercel** (الطريقة الموصى بها والأسهل) أو **Firebase**.

### الطريقة الأولى (الموصى بها): النشر على Vercel

Vercel هي أفضل منصة لنشر تطبيقات Next.js. يمكنك النشر مباشرة من جهازك بدون الحاجة إلى GitHub.

**الخطوة 1: تثبيت Vercel CLI (يُفعل مرة واحدة)**
```bash
npm install -g vercel
```

**الخطوة 2: تسجيل الدخول إلى Vercel**
```bash
vercel login
```
(سيطلب منك اختيار طريقة تسجيل الدخول، اختر "Continue with Email" أو "Continue with GitHub").

**الخطوة 3: ربط المشروع**
في المرة الأولى فقط، قم بتشغيل هذا الأمر من داخل مجلد المشروع:
```bash
vercel link
```
سيتم طرح بعض الأسئلة:
- `Set up and deploy ...?` -> اضغط `Y` ثم `Enter`.
- `Which scope do you want to deploy to?` -> اختر حسابك الشخصي (عادةً الخيار الأول).
- `Link to existing project?` -> اضغط `N` ثم `Enter` (لأنك تنشئ مشروعًا جديدًا).
- `What’s your project’s name?` -> اكتب اسمًا لمشروعك (مثل `fares-al-lugha`) ثم `Enter`.
- `In which directory is your code located?` -> اضغط `Enter` (للقيمة الافتراضية `./`).

**الخطوة 4: إضافة متغيرات البيئة (الأسرار) - أهم خطوة**
هذه هي أهم خطوة لحل مشكلة `auth/invalid-api-key`. يجب أن تخبر Vercel بمفاتيح API الخاصة بك. نفّذ الأوامر التالية واحدًا تلو الآخر، واستبدل `YOUR_KEY_HERE` بقيمك الحقيقية من Firebase و Google AI Studio.

```bash
vercel env add GEMINI_API_KEY YOUR_GEMINI_API_KEY_HERE
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY YOUR_FIREBASE_API_KEY_HERE
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN your-project-id.firebaseapp.com
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID your-project-id
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET your-project-id.appspot.com
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID YOUR_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID YOUR_APP_ID
vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID YOUR_MEASUREMENT_ID
```
**ملاحظة:** عند تشغيل كل أمر، سيسألك Vercel عن البيئات التي تريد إضافة المتغير إليها (Production, Preview, Development). يمكنك الضغط على `Enter` لاختيار الخيار الافتراضي (جميع البيئات).

**الخطوة 5: النشر النهائي!**
الآن، لنشر موقعك على الإنترنت، كل ما عليك فعله هو تشغيل هذا الأمر:
```bash
vercel --prod
```
بعد انتهاء الأمر، سيظهر لك رابط الموقع المباشر. في كل مرة تقوم فيها بتعديل الكود وتريد نشر التحديثات، ما عليك سوى تشغيل هذا الأمر الأخير مرة أخرى.

---

### الطريقة الثانية: النشر على Firebase

**الخطوة 1: المتطلبات الأساسية**
- **[Node.js](https://nodejs.org/) (إصدار 20)**
- **حساب Firebase ومشروع جديد:**
    - **مهم جدًا:** قم بترقية مشروعك إلى خطة **Blaze (Pay-as-you-go)**. هذا ضروري لتشغيل الصفحات الديناميكية.
- **Firebase CLI:**
    ```bash
    npm install -g firebase-tools
    ```

**الخطوة 2: إعداد المشروع محليًا**
- **تثبيت الاعتماديات:**
    ```bash
    npm install
    ```
- **إعداد ملف `.env.local`:**
    ```
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    # ... باقي المتغيرات
    ```

**الخطوة 3: نشر المشروع**
```bash
firebase deploy --only hosting
```

---

## **هام: حل مشكلة فشل الرفع على GitHub (Large files detected)**

إذا واجهت خطأ `GH001: Large files detected` عند محاولة رفع الكود باستخدام `git push`، فهذا يعني أن Git لا يزال يتتبع مجلد `.firebase` الذي يحتوي على ملفات كبيرة. لحل هذه المشكلة، اتبع الخطوات التالية **بالترتيب** في الطرفية (Terminal):

1.  **تأكد من وجود ملف `.gitignore`:** يجب أن يكون هذا الملف موجودًا في المجلد الرئيسي للمشروع. لقد قمت بإضافته لك.

2.  **قم بتنفيذ هذا الأمر لإزالة المجلد من ذاكرة Git:**
    ```bash
    git rm -r --cached .firebase
    ```
    (إذا ظهر خطأ `fatal: pathspec '.firebase' did not match any files`، فهذا يعني أنك قمت بحذف المجلد يدويًا بالفعل، وهو أمر جيد. انتقل إلى الخطوة التالية).

3.  **قم بتنفيذ هذا الأمر لتسجيل التغيير:**
    ```bash
    git commit -m "Stop tracking .firebase folder"
    ```

4.  **قم الآن برفع الكود مرة أخرى. هذه المرة ستنجح العملية:**
    ```bash
    git push
    ```
