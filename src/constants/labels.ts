import type { ItemKind, MissingField, TimeMode } from '../types/domain';

const timeMode = {
  scheduled: 'בתאריך',
  recurring: 'חוזרת',
  anytime: 'ללא מועד',
  waiting: 'ממתינה',
  someday: 'על המדף',
} as const satisfies Record<TimeMode, string>;

const kind = {
  task: 'משימה',
  goal: 'יעד',
  issue: 'סוגיה',
  note: 'פתק',
  debt: 'חוב',
} as const satisfies Record<ItemKind, string>;

const missing = {
  domain: 'תחום',
  member: 'של מי',
  time: 'זמן',
} as const satisfies Record<MissingField, string>;

export const labels = {
  app: {
    name: 'משכן',
  },
  pages: {
    open: 'פתוחות',
    incomplete: 'דורש השלמה',
    login: 'כניסה',
    onboarding: 'הקמת הבית',
  },
  status: {
    loading: 'טוען…',
    noOpenItems: 'אין פריטים פתוחים',
    nothingMissing: 'כל הפריטים משויכים',
  },
  actions: {
    save: 'שמירה',
    close: 'סגירה',
    confirm: 'אישור',
    add: 'הוספה',
    newItem: 'פריט חדש',
    signIn: 'כניסה',
    signOut: 'יציאה',
    createHousehold: 'הקמת הבית',
    joinHousehold: 'הצטרפות',
    addChild: '+ ילד',
    showInviteCode: 'קוד הזמנה',
    markDone: 'סימון כבוצע',
  },
  fields: {
    email: 'אימייל',
    password: 'סיסמה',
    itemTitle: 'מה צריך לזכור?',
    householdName: 'שם הבית',
    yourName: 'השם שלך',
    inviteCode: 'קוד הזמנה',
    childName: 'שם הילד',
    dueDate: 'תאריך',
  },
  onboarding: {
    createTab: 'בית חדש',
    joinTab: 'בית קיים',
    inviteHint: 'את קוד ההזמנה רואה ההורה שהקים את הבית, בתפריט שבראש המסך.',
  },
  capture: {
    area: 'אב תחום',
    domain: 'תחום',
    privateMark: 'פרטי',
    noDomainHint: 'בלי תחום, הפריט נשמר רק אצלך עד שתשייך אותו.',
  },
  filter: {
    all: 'הכול',
  },
  item: {
    overdue: 'באיחור',
    separator: ' · ',
  },
  timeMode,
  kind,
  missing,
} as const;
