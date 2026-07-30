# מאגר ותובנות ראיונות באמרל

PWA (Progressive Web App) לשיתוף תובנות, סיטואציות ומקרים מראיונות גיוס בין מנהלים מגייסים ב-Amarel.

## יכולות

- **טופס הזנה** (מובייל-פרסט, RTL): שם מנהל, תפקיד, מחלקה, משרה, מרואיין + תובנות / סיטואציות / מקרים
- **קטגוריות דינמיות**: שם משרה במלל חופשי נשמר למאגר משרות; ניתן להוסיף מחלקות חדשות
- **חיפוש** לפי מילת מפתח + סינון מחלקה / משרה / תפקיד מנהל
- **ייצוא PDF** (הדפסה / שמירה כ-PDF מהדפדפן)
- **ייצוא ל-Outlook** (פתיחת מייל עם תוכן הרשומה)
- **PWA**: התקנה למסך הבית, עבודה אופליין בסיסית (Service Worker)
- **שמירה מקומית** ב-`localStorage`, עם נקודת חיבור עתידית לשרת (`API_BASE` ב-`js/storage.js`)

## הרצה מקומית

PWA ו-Service Worker דורשים הגשה דרך HTTP (לא `file://`).

### אפשרות 1 – VS Code Live Server / Preview

פתחו את `index.html` עם Live Server.

### אפשרות 2 – Python

```bash
cd interview-alon
python -m http.server 5500
```

ואז בדפדפן: `http://localhost:5500`

### אפשרות 3 – Node

```bash
npx --yes serve -l 5500
```

## מבנה

```
interview-alon/
  index.html
  manifest.json
  sw.js
  css/styles.css
  js/app.js
  js/storage.js
  js/export.js
  icons/logo.svg
  icons/icon-192.png
  icons/icon-512.png
  README.md
```

## חיבור לשרת בעתיד

ב-`js/storage.js` הגדירו:

```js
const API_BASE = "https://your-api.example.com";
```

הפונקציות `saveInsight` / `deleteInsight` כבר כוללות קריאות `fetch` מוכנות.

## הלוגו

החליפו את `icons/logo.svg` (ואופציונלית את קבצי ה-PNG) בלוגו הרשמי של Amarel.  
הלוגו מוצג בצד ימין למעלה (ב-RTL זה תחילת השורה הויזואלית הימנית של הכותרת).

## דפדפנים

- Chrome / Edge (אנדרואיד + דסקטופ) – התקנת PWA מלאה
- Safari iOS – "הוסף למסך הבית"
