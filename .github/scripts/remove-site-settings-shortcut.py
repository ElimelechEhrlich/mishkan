"""Has the Android app remove the "Site Settings" shortcut as it starts.

Google's browser helper adds that shortcut on every start, and needs its screen to exist (the
app does not open without it), so the screen stays and the app removes only the shortcut,
right after the helper adds it. That leaves the launcher's four places to the app's own.
Run in the generated project, after `bubblewrap update`.
"""
import pathlib
import sys

REMOVE = """
        // Leave the launcher's places to the app's own shortcuts (see the script that adds this).
        if (Build.VERSION.SDK_INT >= 25) {
            android.content.pm.ShortcutManager shortcuts =
                    getSystemService(android.content.pm.ShortcutManager.class);
            if (shortcuts != null) {
                shortcuts.removeDynamicShortcuts(java.util.Collections.singletonList(
                        "android.support.customtabs.action.SITE_SETTINGS_SHORTCUT"));
            }
        }
"""

ANCHOR = "super.onCreate(savedInstanceState);"

sources = list(pathlib.Path("app/src/main/java").rglob("LauncherActivity.java"))
if len(sources) != 1:
    sys.exit(f"expected one LauncherActivity.java, found {len(sources)}")
source = sources[0]
text = source.read_text(encoding="utf-8")
if text.count(ANCHOR) != 1:
    sys.exit("super.onCreate not found once in LauncherActivity.java")
source.write_text(text.replace(ANCHOR, ANCHOR + REMOVE), encoding="utf-8")
print(f"patched {source}")
