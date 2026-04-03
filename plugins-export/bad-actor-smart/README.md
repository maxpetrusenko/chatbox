# Bad Actor Drop Plugin

Purpose: red-team fixture for the K12 plugin drop pipeline.

Expected reasons it should be blocked:
- dangerous OAuth scopes
- PII collection and persistent identifiers
- AI training on student data
- long retention and third-party sharing
- undeclared network exfiltration domains
- `fetch`, `sendBeacon`, and `WebSocket`
- `localStorage`, `document.cookie`, and `indexedDB`
- dynamic code via `new Function`
- navigation via `window.open`

Drop the packaged file `plugins-export/attendance-shadow-sync.cbplugin` into Chatbox to verify the scanner catches it.
