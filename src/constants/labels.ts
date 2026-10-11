import type {
  ActiveSection,
  DebtDirection,
  EntityKind,
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

const entityKind = {
  parent: 'הורה',
  personal: 'אישי, גלוי רק לך',
  child: 'ילד/ה',
  home: 'הבית',
  couple: 'זוגי',
} as const satisfies Record<EntityKind, string>;

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
    notSet: 'לא נבחר',
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
    markDone: 'סימון כבוצע',
    markOpen: 'החזרה לפתוח',
    delete: 'מחיקה',
    confirmDelete: 'לחיצה נוספת למחיקה',
    attachFile: 'צירוף קובץ',
    closeDebt: 'סגירת החוב',
    newDebt: 'חוב חדש',
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
    childName: 'ילד/ה חדש/ה',
    parentName: 'הורה שעוד לא הצטרף',
    dueDate: 'תאריך',
    startDate: 'החל מתאריך',
    counterparty: 'מי',
    amount: 'סכום בשקלים',
    newStep: 'צעד חדש',
    newCondition: 'תנאי חדש, למשל: לדעת את מידות החדר',
    newDomain: 'תחום חדש',
    noParent: 'לא משויך ליעד',
    chooseItem: 'בחירת פריט',
  },
  onboarding: {
    createTab: 'בית חדש',
    joinTab: 'בית קיים',
    inviteHint: 'את קוד ההזמנה רואה ההורה שהקים את הבית, במסך ההגדרות.',
    whoAreYou: 'כבר פתחו לך מקום? בחר/י את עצמך:',
  },
  capture: {
    entity: 'ישות',
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
    previouslyIn: 'היה ב:',
  },
  sections: {
    details: 'פרטים',
    kind: 'סוג',
    domain: 'תחום',
    time: 'זמן',
    prerequisites: 'במה זה תלוי',
    dependsOnItem: 'תלוי בפריט אחר',
    steps: 'צעדים',
    parent: 'שיוך ליעד',
    attachments: 'קבצים מצורפים',
    debt: 'פרטי החוב',
    properties: 'שיוך',
    entities: 'ישויות ותחומים',
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
    domainsCount: 'תחומים',
    privateEntityHint: 'ישות אישית: כל התחומים שלה גלויים רק לך.',
    confirmDeleteWithItems: 'לחיצה נוספת למחיקה. הפריטים יעברו ל"להשלמה".',
    addParentHint:
      'הורה שעוד לא הצטרף לאפליקציה מקבל ישות משותפת כבר עכשיו. כשיצטרף, יבחר בה ויקבל גם ישות אישית.',
    addDebtsDomain: '+ תחום חובות',
    debtsDomainName: 'חובות',
  },
  timeMode,
  kind,
  missing,
  recurrence,
  segment,
  section,
  debtDirection,
  entityKind,
} as const;
