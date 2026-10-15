# Development checks

Tools for checking changes before they reach the owner. Not part of the app or its build.
The full routine is in `CURRENT_CONTEXT.md` (section 2).

## Screens with mock data

`screens.cjs` opens the app in Chromium against a mock Supabase, serving the rows of
`fixtures.cjs`, and saves a screenshot per route.

```
VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon npx vite --port 5179   # in the background
node scripts/dev/screens.cjs http://localhost:5179 <outDir> "/today=today" "/item/<id>=item@text=תזכורות|center:text=הוספת תזכורת"
pkill -f "vite --port 5179"   # on its own; exit code 144 is normal
```

Each argument is `<path>=<name>@<step>|<step>…` (`==` when the path holds `=`). Steps: a
selector or `text=…` to click, `wait:ms`, `snap:name`, `center:sel`, `bottom`, `quick:sel`,
`fill:sel=>value`, `xprobe`, `scroll:y`, `wheel:sel` (scrolls over it and prints both scroll positions), `swipe:sel=>dx,dy[,holdMs]` (a real finger, with `TOUCH=1`; `CANCEL=1` ends it as cut off), `drag:sel=>dy` (drags it down by dy pixels, up when negative; `HOLD=1` saves `holding.png` before letting go), `back` (the browser's back), `y` (prints the scroll position). `TOUR=1` shows the tour, `HEIGHT=500` a shorter screen (as with the keyboard open), `TEXT=1` prints the page text.

When the schema changes, add the new columns and tables to `fixtures.cjs`, with rows that
show every state of the new feature.

## SQL on a local Postgres

`seed_*.sql` hold rows that stand for the data as it is before a migration, so the migration's
moving of existing data can be checked. See `CURRENT_CONTEXT.md` for starting the local
database and copying the clean template.

## Shortcut icons

`shortcut-icons.cjs` draws the icons of the app's shortcuts (long-pressing its icon) from the
symbols in `Icon.tsx`, white on the app's green:

```
node scripts/dev/shortcut-icons.cjs src/components/ui/Icon.tsx public/icons
```
