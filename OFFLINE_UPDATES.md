# Offline operation and software releases — v2.8.0

Open https://sca-system.netlify.app/ while online and wait for “Ready for offline use on this device.” The complete production app is cached. Use the same browser/device (or install it from the browser's Install/Add to Home Screen menu). A first visit, another device, or browser data deletion requires internet again. External fonts may use their built-in fallback offline.

Student and school records migrate once from the previous browser storage to IndexedDB. The original storage is retained as a recovery copy. Browser storage is device-specific; clearing site data removes local records. Available capacity depends on the device and browser quota. The app requests persistent storage where supported and displays saving errors with a retry button. One editing tab per browser profile prevents competing whole-roster writes.

Admissions permit up to 100,000 active students across campuses in each session. Archived transfers do not count toward the active limit. Admissions use unique IDs and unused campus roll numbers; incoming transfers check destination capacity. The student table displays 50 records at a time while search and CSV export use the complete list. This is an application-side limit, not a Firestore rules quota across simultaneous devices.

With Firebase configured and permissions granted, normal record writes queue in Firestore's persistent offline cache and synchronize on reconnection. Standalone mode stores records on this device only. Cloud session transfers require internet because moving students and dues is a multi-record transaction; they are not silently performed only locally. Firebase production rules and real multi-device offline synchronization still require testing with an authorized school account.

## Creator release workflow

1. Edit the source and commit changes to a GitHub branch.
2. Run `npm ci` and `npm test`, then merge the reviewed change into `main`.
3. The existing Netlify GitHub integration builds and publishes `main` using `netlify.toml`.
4. Online apps check for updates on connection, focus, and every five minutes. Complete releases are downloaded before activation. Open/edited forms delay a refresh; close the form or reopen the app after saving. Device records are never cleared by the updater.

Software changes must be committed to GitHub; editing school records inside the app does not modify source code or upload student data to GitHub. No GitHub credentials are embedded in the app. Netlify deployment still depends on the connected repository integration remaining enabled.

## Validation

`npm test` builds the production app and checks legacy session isolation, dues transfers, admission/transfer limits, campus-safe fee indexing, complete precache coverage, offline HTML navigation, failed-install protection, and migration/reopening of 100,000 records exceeding 70 MB using fake-indexeddb. Browser quotas and production Firebase permission behavior require actual-device verification.
