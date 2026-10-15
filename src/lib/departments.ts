import type { ShoppingDepartment } from '../types/domain';

/**
 * Common products and the built-in department each is found in, by the department's key.
 * Names of more than one word are tried before single words, so "פלפל שחור" is a spice and
 * not a vegetable; otherwise the first word of the item that is known decides, as the head
 * of a Hebrew name comes first ("שוקולד חלב" is a sweet).
 */
const dictionary: Readonly<Record<string, readonly string[]>> = {
  produce: [
    'עגבניות',
    'עגבנייה',
    'עגבניה',
    'שרי',
    'מלפפונים',
    'מלפפון',
    'פלפל',
    'פלפלים',
    'בצל',
    'בצלים',
    'שום',
    'תפוחי אדמה',
    'תפו"א',
    'תפוחים',
    'תפוח',
    'בננות',
    'בננה',
    'גזר',
    'חסה',
    'כרוב',
    'קישואים',
    'קישוא',
    'חציל',
    'חצילים',
    'לימון',
    'לימונים',
    'תפוזים',
    'תפוז',
    'קלמנטינות',
    'אבוקדו',
    'פטרוזיליה',
    'כוסברה',
    'שמיר',
    'נענע',
    'בטטה',
    'בטטות',
    'ענבים',
    'אבטיח',
    'מלון',
    'אגסים',
    'אגס',
    'תותים',
    'אפרסקים',
    'שזיפים',
    'מנגו',
    'כרובית',
    'ברוקולי',
    'סלרי',
    'סלק',
    'צנון',
    'פטריות',
    'ג׳ינג׳ר',
    "ג'ינג'ר",
    'ירקות',
    'פירות',
    'ירק',
  ],
  bakery: [
    'לחם',
    'לחמים',
    'לחמניות',
    'לחמניה',
    'לחמנייה',
    'פיתות',
    'פיתה',
    'חלה',
    'חלות',
    'בגט',
    'באגט',
    'קרואסון',
    'קרואסונים',
    'מאפים',
    'מאפה',
    'טורטיות',
    'טורטיה',
    'עוגה',
    'עוגות',
  ],
  dairy: [
    'חלב',
    'גבינה',
    'גבינות',
    'קוטג׳',
    "קוטג'",
    'קוטג',
    'יוגורט',
    'יוגורטים',
    'שמנת',
    'חמאה',
    'ביצים',
    'ביצה',
    'לבן',
    'לבנה',
    'אשל',
    'מעדנים',
    'מעדן',
    'בולגרית',
    'צפתית',
    'מוצרלה',
    'פרמזן',
    'שוקו',
  ],
  meat: [
    'עוף',
    'חזה',
    'שניצל',
    'שניצלים',
    'בשר',
    'טחון',
    'כבד',
    'פרגיות',
    'כרעיים',
    'שוקיים',
    'כנפיים',
    'נקניק',
    'נקניקיות',
    'דג',
    'דגים',
    'סלמון',
    'אמנון',
    'המבורגר',
    'קציצות',
    'הודו',
  ],
  frozen: [
    'קפוא',
    'קפואה',
    'קפואים',
    'קפואות',
    'גלידה',
    'גלידות',
    'קרטיבים',
    'בצק עלים',
    'אפונה',
    'בורקס',
  ],
  dry: [
    'פלפל שחור',
    'מלפפונים חמוצים',
    'רסק עגבניות',
    'פירורי לחם',
    'אבקת מרק',
    'ממרח שוקולד',
    'שמן זית',
    'דגני בוקר',
    'שיבולת שועל',
    'אורז',
    'פסטה',
    'ספגטי',
    'פתיתים',
    'קוסקוס',
    'קמח',
    'סוכר',
    'מלח',
    'שמן',
    'קטשופ',
    'מיונז',
    'חרדל',
    'חומוס',
    'טחינה',
    'טונה',
    'שימורים',
    'תירס',
    'קפה',
    'תה',
    'דבש',
    'ריבה',
    'קורנפלקס',
    'גרנולה',
    'עדשים',
    'שעועית',
    'תבלינים',
    'פפריקה',
    'כמון',
    'כורכום',
    'אגוזים',
    'שקדים',
    'זיתים',
    'חמוצים',
    'ממרח',
    'אטריות',
    'קרקרים',
    'פריכיות',
    'שמרים',
    'אבקת אפייה',
    'וניל',
  ],
  drinks: [
    'מים מינרליים',
    'מים',
    'סודה',
    'מיץ',
    'מיצים',
    'קולה',
    'ספרייט',
    'בירה',
    'יין',
    'משקה',
    'משקאות',
    'שתייה',
    'פטל',
    'תירוש',
  ],
  snacks: [
    'במבה',
    'ביסלי',
    'חטיף',
    'חטיפים',
    'שוקולד',
    'עוגיות',
    'וופלים',
    'צ׳יפס',
    "צ'יפס",
    'ביסקוויטים',
    'סוכריות',
    'גומי',
    'מסטיק',
    'פופקורן',
    'בייגלה',
    'תפוצ׳יפס',
    "תפוצ'יפס",
  ],
  cleaning: [
    'סבון כלים',
    'נוזל כלים',
    'אבקת כביסה',
    'ג׳ל כביסה',
    "ג'ל כביסה",
    'מרכך כביסה',
    'שקיות זבל',
    'שקיות אשפה',
    'נייר טואלט',
    'נייר מגבת',
    'נייר כסף',
    'נייר אפייה',
    'ניילון נצמד',
    'מסיר שומנים',
    'אקונומיקה',
    'ספוגים',
    'ספוג',
    'מטליות',
    'סמרטוט',
    'כביסה',
    'מפיות',
    'כוסות חד פעמיות',
    'צלחות חד פעמיות',
    'חד פעמי',
    'טואלט',
  ],
  hygiene: [
    'מרכך שיער',
    'משחת שיניים',
    'מברשת שיניים',
    'מברשות שיניים',
    'סבון ידיים',
    'סבון גוף',
    'ג׳ל רחצה',
    "ג'ל רחצה",
    'קרם גילוח',
    'סכיני גילוח',
    'צמר גפן',
    'מקלוני אוזניים',
    'שמפו',
    'סבון',
    'דאודורנט',
    'תחבושות',
    'טמפונים',
    'קרם',
    'ממחטות',
  ],
  baby: [
    'חיתולים',
    'טיטולים',
    'מגבונים',
    'מטרנה',
    'סימילאק',
    'תמ"ל',
    'דייסה',
    'מוצצים',
    'מוצץ',
    'בקבוק',
  ],
};

/** The name as it is matched and remembered: trimmed, in lower case, single spaces. */
export function titleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The words of a name, without numbers, amounts and marks around them. */
function wordsOf(title: string): string[] {
  return titleKey(title)
    .split(/[\s,.;:()/\\\-+*%!?]+/)
    .map((word) => word.replace(/^["'׳״]+|["'׳״]+$/g, ''))
    .filter((word) => word !== '' && !/^\d/.test(word));
}

/** A word as written, and without a leading ו or ה ("והחלב" is "חלב"). */
function forms(word: string): string[] {
  const shapes = [word];
  let rest = word;
  while (rest.length > 3 && (rest.startsWith('ו') || rest.startsWith('ה'))) {
    rest = rest.slice(1);
    shapes.push(rest);
  }
  return shapes;
}

const phrases = Object.entries(dictionary).flatMap(([key, names]) =>
  names.filter((name) => name.includes(' ')).map((name) => ({ key, name })),
);
const singles = new Map(
  Object.entries(dictionary).flatMap(([key, names]) =>
    names.filter((name) => !name.includes(' ')).map((name) => [name, key] as const),
  ),
);

/** The built-in department a name belongs to, by its key; null when it is not known. */
export function builtInDepartment(title: string): string | null {
  const words = wordsOf(title);
  const joined = ` ${words.join(' ')} `;
  const phrase = phrases.find(({ name }) => joined.includes(` ${name} `));
  if (phrase !== undefined) {
    return phrase.key;
  }
  for (const word of words) {
    for (const shape of forms(word)) {
      const key = singles.get(shape);
      if (key !== undefined) {
        return key;
      }
    }
  }
  return null;
}

/**
 * The department an item goes to: the one chosen for its name before, or else the household's
 * department that started as the built-in one; null for "other".
 */
export function departmentFor(
  title: string,
  departments: readonly ShoppingDepartment[],
  /** Name (as `titleKey`) to the department chosen for it. */
  chosen: ReadonlyMap<string, string>,
): ShoppingDepartment | null {
  const chosenId = chosen.get(titleKey(title));
  const byChoice = departments.find((department) => department.id === chosenId);
  if (byChoice !== undefined) {
    return byChoice;
  }
  const key = builtInDepartment(title);
  return key === null ? null : (departments.find((department) => department.key === key) ?? null);
}

export type DepartmentGroup<T> = {
  /** Null for the items of no department, which come last. */
  readonly department: ShoppingDepartment | null;
  readonly items: readonly T[];
};

/** Items by department, in the order the shop is walked; each group keeps the items' order. */
export function byDepartment<T extends { readonly title: string }>(
  items: readonly T[],
  departments: readonly ShoppingDepartment[],
  chosen: ReadonlyMap<string, string>,
): DepartmentGroup<T>[] {
  const ordered = [...departments].sort((a, b) => a.position - b.position);
  const found = new Map<string | null, T[]>();
  for (const item of items) {
    const id = departmentFor(item.title, ordered, chosen)?.id ?? null;
    found.set(id, [...(found.get(id) ?? []), item]);
  }
  const groups: DepartmentGroup<T>[] = ordered
    .map((department) => ({ department, items: found.get(department.id) ?? [] }))
    .filter((group) => group.items.length > 0);
  const rest = found.get(null);
  return rest === undefined ? groups : [...groups, { department: null, items: rest }];
}
