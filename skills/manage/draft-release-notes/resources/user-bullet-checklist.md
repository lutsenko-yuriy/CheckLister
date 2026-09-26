Every drafted `[user]` bullet must pass all seven items below before it is shown. A bullet
failing any item is rewritten, not presented with a caveat.

1. **Understandable** — would a user with no background in app development understand this
   sentence on its own?
2. **Cared about** — would they actually notice or care, or is this invisible to them?
3. **No jargon** — no class/component names, file paths, remote-config/feature-flag key names,
   ticket or PR numbers, WU markers, or internal engineering terms ("UX", "flow", "surface",
   "refactor", "migration", "parameter", "flag", "state", "repository", "schema").
4. **Plain language** — reads like something a friend would say, not a changelog written by an
   engineer or a product manager.
5. **Right altitude of detail** — describes the observable *what changed for the user*, not the
   underlying mechanism or edge-case plumbing that produced it.
6. **Currently true** — describes what the user experiences today, not an intermediate state a
   later work unit changed or reverted.
7. **No promotional/CTA language** — states what changed, doesn't sell it or ask the user to do
   anything. Release-note fields exist to inform, not to market (Google Play policy explicitly
   bans this: "shouldn't be used for promotional purposes or to solicit actions from your users").

**Common drift patterns to reject:**
- ❌ Too technical: "Fixed `resolveLanguage` locale-matching off-by-one for region-only tags" → ✅ "Fixed the app occasionally picking the wrong language on first launch"
- ❌ Too designer-y: "Improved UX of the run-history swipe interaction" → ✅ "Run history is easier to scroll through"
- ❌ Too much detail: "Unified 'Run' terminology to Lauf (DE), Session (FR), Прогон (RU); fixed Erledigt→Fertig (DE)" → ✅ "Improved translation consistency in German, French, and Russian"
- ❌ Too product-manager-y: "Introduced external-link checklist-selection callback flow variant" → ✅ "Other apps can now ask CheckLister to pick a checklist and hand the result back"
- ❌ Too promotional: "Check out our brand-new dark mode — try it today!" → ✅ "CheckLister now follows your device's light/dark appearance setting."
