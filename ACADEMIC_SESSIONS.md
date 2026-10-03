# Yearly academic sessions

The existing interface and modules are retained. The sidebar now selects an academic session. Users with Students or Settings permission can create a year from the sidebar or Settings → General. A destination session can also be created inside Convert to Session. Sessions run April to March; January–March belong to the ending year.

Existing records stay in 2026–2027 at their original local-storage keys and Firestore collection paths. No existing records are moved or deleted. New years start empty, with separate students, staff, families, fee slips/payment histories, ledger/salary entries and attendance. School branding, campuses, users and the sibling discount policy remain shared. Selecting a session asks the user to save unfinished forms and reloads the application; selection is per browser tab and survives refresh. The switch waits for pending cloud writes before reloading. Students are never added to another session automatically. In Students, Convert to Session lets users explicitly select up to 100 students and move their profiles to a chosen session. It does not promote classes or carry balances automatically.

For standalone use, records persist in the same browser and origin as before. For configured Firebase installations, session names are read from `academicSessions`, and new-year records use `academicSessions/{YYYY-YYYY}/{collection}/{id}`. Existing 2026–2027 records still use root collections. The session selector does not grant additional access; existing Firestore security rules must authorize the new paths for the same intended school administrators. No production rules or authentication configuration are changed by this update. Cloud behavior has not been exercised against the school's live database.

The source has no exam/results module, so no new unrelated module is introduced. All existing modules continue to use the current year's data through the central context. Reports, fee generation, printed yearly ledgers and session labels use the selected academic year. Multi-month bills stop at March rather than silently wrapping into another session.

## Verification

- `node tests/academicSession.test.js`: five checks cover legacy preservation, independent student/payment IDs, shared settings, Firestore path isolation, registry validation and January–March dates.
- `npm run build`: production Vite build.
- Server rendering was checked for 2026–2027, 2027–2028 and 2030–2031: correct context selection, empty new-year records, year-specific ledger dates and sign-in label.

## Release

Deploy the merged source through the site's existing Netlify process. This branch does not change hosting or publish a separate copy. Verify with a test account that the Firestore rules permit session creation/read/write before entering a new year's real records. Existing browser-only data remains on its original site origin.

## Convert to Session (v2.6.0)

Use the Students page filters, click Convert to Session, select students, choose (or create) a destination, and click Move Students. Converted students no longer appear in the source roster. Identity, parent/contact details, class and fee rates move. Each year's fee slips, payments, ledger, balances and attendance remain in that year; sibling groups are not copied. Link siblings in the destination as needed.

Source student snapshots are retained internally with a transfer marker for historical integrity, but excluded from all active rosters and sibling generation. Moving the student back restores that session's own balance, fee history and family links. Duplicate active student IDs or campus roll numbers are rejected. No session is automatically created except the existing legacy 2026–2027 record used to retain original data.

Local transfers commit both rosters in one storage write. A quota error leaves both unchanged. Later local edits use that same session-scoped store. Where supported, a browser lock serializes local transfers; other tabs refresh on the storage event. Firebase transfers use an atomic transaction reading both student documents before writing, so denied writes or a changed source do not half-transfer a student. Live Firebase permissions were not changed or exercised.

Verification for this update: production build passed; the five original academic-session checks and seven transfer checks passed. A server-render/context integration check verified that an Admin with Students permission can create a session, sees Create Session / Convert to Session, moves a student through the actual context action, and reopens separate source/destination rosters with no fee or attendance data copied.

## Convert student with dues (v2.7.0)

Each Students row now has a Convert Session icon that preselects that student and opens the destination picker. Bulk conversion remains available. The confirmation displays recorded outstanding dues before moving. The destination receives a separate Opening dues voucher, collectible through the existing payment counter and included as its own row in the yearly ledger. Unpaid issued fees and recorded opening balances are carried; future unbilled monthly estimates are not charged by the transfer. Original payment history stays in the original year. Source unpaid vouchers retain audit markers and are removed from collectible dues so the same balance cannot be collected in both sessions. Historical source collection totals still include payments received before transfer.

Students and fee vouchers are committed together using one local-storage write or one Firestore transaction. A changed dues amount requires refreshing/reviewing before confirmation. Returning students carry only the remaining unpaid amount; the original transferred debt does not reactivate. Fee payment updates now calculate their changes before scheduling React state updates, ensuring partial payments on carried dues update the student's balance and receipt/ledger records.

Validation: production build, the existing 12 checks, and six new dues tests passed. Dues tests cover partial/paid bills, opening-balance reconciliation, zero dues, transfers back, same roll numbers in separate campuses and atomic scoped storage. Firebase live transactions still require the school's existing rules to allow both sessions; no security rules or live student records were modified during development.
