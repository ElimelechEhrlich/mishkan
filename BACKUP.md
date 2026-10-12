# גיבוי ושחזור

## מה נשמר

כל לילה (בערך ב-03:15–04:15 שעון ישראל) רץ ב-GitHub Actions התהליך `Backup`
(`.github/workflows/backup.yml`). הוא שומר:

- `public.dump` – כל הטבלאות של האפליקציה: מבנה, נתונים והרשאות.
- `auth.dump` – החשבונות ודרכי הכניסה (`auth.users`, `auth.identities`), נתונים בלבד.
- `storage.dump` – רשימת הקבצים המצורפים (`storage.buckets`, `storage.objects`).
- `files/` – הקבצים המצורפים עצמם, רק אם הוגדרו `SUPABASE_URL` ו-`SUPABASE_SERVICE_ROLE_KEY`.

הכול נארז ומוצפן (AES-256) בסיסמה `BACKUP_PASSPHRASE`, ונשמר 30 יום בדף הריצה
(Actions ← Backup ← ריצה ← Artifacts). בלי הסיסמה אי אפשר לפתוח את הגיבוי, ולכן
היא שמורה גם מחוץ ל-GitHub (במנהל סיסמאות).

אפשר להריץ גיבוי מיידי: Actions ← Backup ← Run workflow.

## הסודות (Settings ← Secrets and variables ← Actions)

| שם | מה |
| --- | --- |
| `SUPABASE_DB_URL` | כתובת Session pooler מ-Supabase ← Connect, עם סיסמת המסד |
| `BACKUP_PASSPHRASE` | סיסמת ההצפנה של הגיבוי |
| `SUPABASE_URL` | רשות, לגיבוי הקבצים: כתובת הפרויקט |
| `SUPABASE_SERVICE_ROLE_KEY` | רשות, לגיבוי הקבצים: מפתח service_role |

## שחזור

צריך במחשב: `gpg`, ו-`pg_restore` גרסה 17 ומעלה (חבילת PostgreSQL client).

1. **להוריד** את הגיבוי מדף הריצה (קובץ zip) ולחלץ ממנו את `mishkan-<תאריך>.tar.gz.gpg`.
2. **לפענח ולפתוח:**
   ```
   gpg --decrypt mishkan-<תאריך>.tar.gz.gpg > backup.tar.gz
   mkdir backup && tar -xzf backup.tar.gz -C backup
   ```
3. **פרויקט Supabase ריק** (חדש, או הקיים אחרי תקלה): להעתיק את כתובת ה-Session pooler
   שלו, ולשמור אותה במשתנה:
   ```
   export DB='postgresql://...'
   ```
4. **קודם החשבונות, אחר כך האפליקציה** (ההורים בטבלאות מצביעים על החשבונות):
   ```
   pg_restore --data-only -d "$DB" backup/auth.dump
   pg_restore --no-owner -d "$DB" backup/public.dump
   ```
   הודעה `schema "public" already exists` צפויה ואינה בעיה.
5. **רשימת הקבצים**, אם יש קבצים מצורפים:
   ```
   pg_restore --data-only -d "$DB" backup/storage.dump
   ```
   ואז להעלות את התוכן של `backup/files/` לאותם נתיבים ב-Storage (לכל תיקייה
   ראשונה יש bucket באותו שם).
6. **פונקציית ההתראות:** ליצור מחדש את `send-reminders` (Edge Functions), עם הסודות
   שלה (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) ואת התזמון שלה כל
   כמה דקות.
7. **באפליקציה:** אם הפרויקט חדש, לעדכן ב-Vercel את `VITE_SUPABASE_URL`
   ו-`VITE_SUPABASE_ANON_KEY` ולפרוס מחדש.

בדיקה מהירה אחרי שחזור: להיכנס לאפליקציה ולראות שהישויות, הפריטים וההורים במקומם.
