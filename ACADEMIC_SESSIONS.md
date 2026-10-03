# Yearly academic sessions

The existing interface and modules are retained. The sidebar now selects an academic session. Super Admins can add a year under Settings → General / Academic Session Configuration. Sessions run April to March; January–March belong to the ending year.

Existing records stay in 2026–2027 at their original local-storage keys and Firestore collection paths. No existing records are moved or deleted. New years start empty, with separate students, staff, families, fee slips/payment histories, ledger/salary entries and attendance. School branding, campuses, users and the sibling discount policy remain shared. Selecting a session asks the user to save unfinished forms and reloads the application; selection is per browser tab and survives refresh. The switch waits for pending cloud writes before reloading. It does not copy students, promote classes or carry balances automatically.

For standalone use, records persist in the same browser and origin as before. For configured Firebase installations, session names are read from `academicSessions`, and new-year records use `academicSessions/{YYYY-YYYY}/{collection}/{id}`. Existing 2026–2027 records still use root collections. The session selector does not grant additional access; existing Firestore security rules must authorize the new paths for the same intended school administrators. No production rules or authentication configuration are changed by this update. Cloud behavior has not been exercised against the school's live database.

The source has no exam/results module, so no new unrelated module is introduced. All existing modules continue to use the current year's data through the central context. Reports, fee generation, printed yearly ledgers and session labels use the selected academic year. Multi-month bills stop at March rather than silently wrapping into another session.

## Verification

- `node tests/academicSession.test.js`: five checks cover legacy preservation, independent student/payment IDs, shared settings, Firestore path isolation, registry validation and January–March dates.
- `npm run build`: production Vite build.
- Server rendering was checked for 2026–2027, 2027–2028 and 2030–2031: correct context selection, empty new-year records, year-specific ledger dates and sign-in label.

## Release

Deploy the merged source through the site's existing Netlify process. This branch does not change hosting or publish a separate copy. Verify with a test account that the Firestore rules permit session creation/read/write before entering a new year's real records. Existing browser-only data remains on its original site origin.
