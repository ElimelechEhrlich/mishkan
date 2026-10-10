# משכן

אפליקציית PWA לניהול הבית: משימות, יעדים, סוגיות וחובות, לפי אב תחום ותחום.

## הפעלה

1. להריץ את `supabase/migrations/0001_initial_schema.sql` ב-SQL Editor של פרויקט Supabase חדש.
2. להעתיק את `.env.example` ל-`.env.local` ולמלא את כתובת הפרויקט ואת מפתח ה-anon.
3. `npm install`
4. `npm run dev`

## פקודות

- `npm run typecheck` בדיקת טיפוסים
- `npm run lint` בדיקת ESLint
- `npm run build` בנייה לפרודקשן

## טיפוסי המסד

`src/types/database.ts` נכתב ידנית לפי המיגרציה. אחרי שינוי בסכמה אפשר לייצר אותו מחדש:

```
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```
