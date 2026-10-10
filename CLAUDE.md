# משכן (mishkan)

Hebrew RTL home-management PWA for two parents. React + Vite + TypeScript + Tailwind v4 + react-router v7 + Supabase.

## Structure

```
supabase/migrations/   SQL schema (source of truth for the database)
src/lib/               Supabase client and pure helpers
src/types/             database.ts mirrors the schema; domain.ts derives app types from it
src/services/          All database access. No React.
src/hooks/             State and loading. Call services.
src/components/        ui/ is generic; other folders are grouped by topic
src/pages/             One page per route. Wires hooks to components, no logic of its own.
src/routes/            Router and route guards
src/constants/         labels.ts holds every user-facing string
```

Do not add folders or change this structure without the owner's approval.

## Rules

- Dependency direction: pages -> components -> hooks -> services -> lib. A component never calls Supabase directly.
- Strict TypeScript, no shortcuts: no `any`, no `as` assertions (`as const` is fine), no non-null `!`, no `@ts-ignore`. ESLint enforces this.
- Services return a value or throw. Hooks surface errors in state. Nothing is swallowed silently.
- Components are PascalCase, one component per file. Everything else is camelCase.
- No Hebrew strings inside components; add them to `src/constants/labels.ts`.
- No rounded corners anywhere in the UI.
- `npm run typecheck`, `npm run lint` and `npm run build` must pass before a change is done.
