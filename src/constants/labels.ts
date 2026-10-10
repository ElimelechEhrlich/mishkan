import type {
  ActiveSection,
  DebtDirection,
  ItemKind,
  MissingField,
  OpenSegment,
  Recurrence,
  TimeMode,
} from '../types/domain';

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

const recurrence = {
  daily: 'כל יום',
  weekly: 'כל שבוע',
  monthly: 'כל חודש',
} as const satisfies Record<Recurrence, string>;

const segment = {
  active: 'פעילות',
  waiting: 'ממתינות',
  someday: 'על המדף',
  notes: 'פתקים',
} as const satisfies Record<OpenSegment, string>;

const section = {
  overdue: 'באיחור',
  today: 'היום',
  upcoming: 'בהמשך',
  undated: 'ללא מועד',
} as const satisfies Record<ActiveSection, string>;

const debtDirection = {
  owed_to_us: 'חייבים לנו',
  we_owe: 'אנחנו חייבים',
} as const satisfies Record<DebtDirection, string>;

export const labels = {
  app: {
    name: 'משכן',
    tagline: 'כל ענייני הבית במקום אחד',
  },
  pages: {
    open: 'משימות',
    goals: 'יעדים וסוגיות',
    debts: 'חובות',
    incomplete: 'להשלמה',
    settings: 'הגדרות',
    done: 'בוצעו',
    item: 'פריט',
    onboarding: 'הקמת הבית',
  },
  nav: {
    open: 'משימות',
    goals: 'יעדים',
    debts: 'חובות',
    incomplete: 'להשלמה',
  },
  status: {
    loading: 'טוען…',
    emptySegment: 'אין כאן פריטים',
    nothingMissing: 'כל הפריטים משויכים',
    noGoals: 'עוד לא הוגדרו יעדים או סוגיות',
    noDebts: 'אין חובות פתוחים',
    itemNotFound: 'הפריט לא נמצא. ייתכן שהוא נסגר או נמחק.',
    done: 'בוצע',
    noDoneItems: 'עוד לא סומנו פריטים כבוצעו',
  },
  actions: {
    save: 'שמירה',
    close: 'סגירה',
    confirm: 'אישור',
    add: 'הוספה',
    edit: 'עריכה',
    change: 'שינוי',
    back: 'חזרה',
    newItem: 'פריט חדש',
    signIn: 'כניסה',
    signOut: 'יציאה מהחשבון',
    createHousehold: 'הקמת הבית',
    joinHousehold: 'הצטרפות',
    addChild: '+ ילד',
    markDone: 'סימון כבוצע',
    markOpen: 'החזרה לפתוח',
    delete: 'מחיקה',
    confirmDelete: 'לחיצה נוספת למחיקה',
    attachFile: 'צירוף קובץ',
    closeDebt: 'סגירת החוב',
    settings: 'הגדרות',
    showDone: 'פריטים שבוצעו',
    makePrivate: 'פרטי',
  },
  fields: {
    email: 'אימייל',
    password: 'סיסמה',
    itemTitle: 'מה צריך לזכור?',
    title: 'כותרת',
    notes: 'הערות',
    householdName: 'שם הבית',
    yourName: 'השם שלך',
    inviteCode: 'קוד הזמנה',
    childName: 'שם הילד',
    dueDate: 'תאריך',
    startDate: 'החל מתאריך',
    counterparty: 'מי',
    amount: 'סכום בשקלים',
    newStep: 'צעד חדש',
    newCondition: 'תנאי חדש, למשל: לדעת את מידות החדר',
    newDomain: 'תחום חדש',
    newArea: 'אב תחום חדש',
    noParent: 'לא משויך ליעד',
    chooseItem: 'בחירת פריט',
  },
  onboarding: {
    createTab: 'בית חדש',
    joinTab: 'בית קיים',
    inviteHint: 'את קוד ההזמנה רואה ההורה שהקים את הבית, במסך ההגדרות.',
  },
  capture: {
    area: 'אב תחום',
    domain: 'תחום',
    kind: 'סוג',
    privateMark: 'פרטי',
    noDomainHint: 'בלי תחום, הפריט נשמר רק אצלך עד שתשייך אותו.',
  },
  filter: {
    all: 'הכול',
  },
  item: {
    separator: ' · ',
    today: 'היום',
    tomorrow: 'מחר',
    noDomain: 'בלי תחום',
    inheritedDomain: 'התחום נקבע לפי היעד',
    stepOf: 'צעד ביעד',
  },
  sections: {
    details: 'פרטים',
    kind: 'סוג',
    domain: 'תחום',
    member: 'של מי',
    time: 'זמן',
    prerequisites: 'במה זה תלוי',
    dependsOnItem: 'תלוי בפריט אחר',
    steps: 'צעדים',
    parent: 'שיוך ליעד',
    attachments: 'קבצים מצורפים',
    debt: 'פרטי החוב',
    children: 'ילדים',
    areas: 'אבות תחום ותחומים',
    invite: 'הזמנת ההורה השני',
    account: 'חשבון',
  },
  prerequisites: {
    hint: 'כשכל התנאים מתקיימים, הפריט חוזר ל"להשלמה" כדי לקבוע לו זמן.',
    waitingFor: 'ממתין ל:',
  },
  goals: {
    progressOf: 'מתוך',
    noSteps: 'אין צעדים עדיין',
  },
  debts: {
    total: 'סה"כ',
    domainHint: 'חוב',
  },
  settings: {
    inviteHint:
      'שלחו את הקישור לבן או בת הזוג. אחרי כניסה עם האימייל והסיסמה שלהם, הקוד כבר ממולא ונשאר רק ללחוץ "הצטרפות".',
    inviteMessage: 'הזמנה להצטרף לבית שלנו במשכן:',
    shareInvite: 'שליחה בוואטסאפ',
    inviteCodeLabel: 'או להזין ידנית את הקוד:',
    privateAreaHint: 'אב תחום פרטי: כל התחומים שלו גלויים רק לך.',
  },
  timeMode,
  kind,
  missing,
  recurrence,
  segment,
  section,
  debtDirection,
} as const;
