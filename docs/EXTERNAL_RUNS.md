# External checklist runs

Another mobile app can open a specific CheckLister checklist as a fresh run and
receive the outcome through a callback URL.

## Start a run

Open this URL:

```text
checklister://run?checklistId=<encoded-checklist-id>&callbackUrl=<encoded-callback-url>
```

Both parameters are required:

- `checklistId` is the exact CheckLister checklist ID, not its displayed name.
  The caller must already know this ID; this endpoint does not provide checklist
  discovery.
- `callbackUrl` is where CheckLister returns the result.

Percent-encode each parameter value separately. In JavaScript:

```ts
const runUrl = `checklister://run?checklistId=${encodeURIComponent(
  checklistId,
)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
```

For example, a callback of
`caller-app://run-result?source=widget` produces:

```text
checklister://run?checklistId=groceries-123&callbackUrl=caller-app%3A%2F%2Frun-result%3Fsource%3Dwidget
```

## Callback URLs

CheckLister accepts:

- a custom app URL with a scheme and host, such as
  `caller-app://run-result`;
- an HTTPS universal/app link, such as
  `https://caller.example/run-result`.

The URL may already contain query parameters. CheckLister preserves them, but
owns and replaces the reserved parameters `status`, `checklistId`, and `runId`.

The callback must use `://` and contain a host. CheckLister rejects its own
scheme, plain HTTP, URLs without a host, and unsafe or non-return schemes such
as `javascript`, `data`, `file`, `intent`, `tel`, `sms`, and `mailto`.

## Results

### Completed

When the user completes every item and finishes the run:

```text
caller-app://run-result?status=completed&checklistId=groceries-123&runId=<run-id>
```

`runId` identifies the saved history entry and is present only for a completed
run.

### Cancelled

When the user confirms that the run should be discarded:

```text
caller-app://run-result?status=cancelled&checklistId=groceries-123
```

### Error

When the checklist does not exist or cannot be run, CheckLister returns one
public error result without exposing the internal reason:

```text
caller-app://run-result?status=error&checklistId=groceries-123
```

Cancelled and error callbacks never contain `runId`. Query values are
percent-encoded when CheckLister constructs the result.

## Active runs and failures

Every valid request starts a fresh run. If any run is already active—whether it
belongs to the same checklist or another one—CheckLister discards it and starts
the requested run. A displaced external run does not receive a callback.

If the incoming callback URL is invalid, CheckLister does not replace the
active run and shows “We do not know which app to return to.”

If the result URL is valid but the operating system cannot open it, the run
outcome remains committed. CheckLister shows “Could not return the result to
the calling app.” and does not retry automatically.

## Invocation examples

The callback URL below uses a deliberately illustrative caller scheme. Replace
the checklist ID and callback with values owned by the integrating app.

### iOS Simulator

```bash
xcrun simctl openurl booted \
  'checklister://run?checklistId=groceries-123&callbackUrl=caller-app%3A%2F%2Frun-result'
```

### Android emulator or device

```bash
adb shell 'am start -W -a android.intent.action.VIEW -d \
  "checklister://run?checklistId=groceries-123&callbackUrl=caller-app%3A%2F%2Frun-result" \
  com.checklister'
```

## Lifecycle limitations

- Incoming links work when CheckLister is closed, backgrounded, or already in
  the foreground. Opening the link brings CheckLister to the foreground.
- Returning a result opens the callback URL, so the operating system switches
  to the caller app (or to the browser for an HTTPS URL not claimed as an app
  link). CheckLister cannot deliver the result silently in the background.
- The callback URL and unfinished run live only in memory. If CheckLister
  crashes or is force-quit before it returns a result, no callback is sent and
  the run cannot resume.
- Callback delivery is best-effort and is not persisted or retried. Callers
  should handle timeouts and duplicate-safe result processing.
