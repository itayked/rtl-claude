<div dir="rtl">

# Claude RTL Auto-Detect

<p align="center">
  <img src="icon128.png" alt="Claude RTL Auto-Detect" width="128" height="128">
</p>

<p align="center">
  <strong>תוסף כרום שמזהה אוטומטית טקסט בעברית באתר claude.ai ומתאים את כיוון הכתיבה מימין לשמאל.</strong>
</p>

<p align="center">
  <a href="https://github.com/itayked/rtl-claude/releases">Releases</a> · 
  <a href="https://github.com/itayked/rtl-claude/issues">דיווח באגים</a> · 
  <a href="#תרומה">תרומה</a>
</p>

---

## מה זה עושה?

באתר claude.ai אין תמיכה מובנית בכיוון כתיבה מימין לשמאל. כשכותבים בעברית, הטקסט מופיע בכיוון הלא נכון — משמאל לימין.

התוסף הזה מתקן את זה **אוטומטית**:

- **זיהוי לפי רוב תווים** — אם רוב התווים בפסקה הם בעברית, היא תוצג מימין לשמאל, גם אם מתחילה באנגלית
- **תמיכה דו-כיוונית (BiDi)** — אנגלית בתוך פסקה עברית זורמת בצורה טבעית
- **זיהוי פר-פסקה** — כל פסקה, פריט ברשימה, כותרת או תא בטבלה מזוהים בנפרד
- **תיבת הקלט** — גם מה שאתם כותבים מוצג בכיוון הנכון
- **אפס הרשאות** — התוסף לא דורש הרשאות מיוחדות ולא שולח מידע לשום מקום

## התקנה

### מחנות האינטרנט של Chrome (בקרוב)

<!-- קישור יתעדכן לאחר פרסום -->

### התקנה ידנית

1. הורידו את הקוד — `Code → Download ZIP` או:
   ```bash
   git clone https://github.com/itayked/rtl-claude.git
   ```
2. פתחו את `chrome://extensions/` בדפדפן
3. הפעילו **מצב מפתח** (Developer mode) בפינה הימנית העליונה
4. לחצו על **Load unpacked** ובחרו את תיקיית הפרויקט

## איך זה עובד?

התוסף מורכב מקובץ יחיד (`content.js`, ~60 שורות) שעושה שני דברים:

1. **MutationObserver** — עוקב אחרי שינויים ב-DOM ומזהה אלמנטים חדשים (פסקאות, רשימות, כותרות וכו׳)
2. **זיהוי כיוון** — סופר תווים עבריים מול לטיניים בכל אלמנט ומגדיר `dir="rtl"` או `dir="ltr"` בהתאם

הביצועים מבוססים על `requestAnimationFrame` — כל השינויים נצברים ומיושמים בבת אחת, בלי לתקוע את הדף.

## צילום מסך

<p align="center">
  <img src="screenshot1.png" alt="צילום מסך" width="640">
</p>

## תרומה

אם התוסף עוזר לכם, אפשר לתמוך בפיתוח:

| | קישור |
|---|---|
| **Bit** | [bit.co.il](https://www.bitpay.co.il/app/me/5F5FA07A-A91B-0294-AF13-82F9898D0BE60CBF) |
| **PayBox** | [payboxapp.com](https://links.payboxapp.com/Q7PKvP2xp2b) |

## רישיון

[MIT](LICENSE)

</div>
