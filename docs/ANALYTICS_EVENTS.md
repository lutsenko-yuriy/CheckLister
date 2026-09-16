# Analytics Events

All events are sent via the analytics service abstraction
(`src/shared/analytics/AnalyticsService.ts`). Currently backed by
`NoopAnalyticsService` — no real SDK is wired up, and no events are being
collected. Swap in an SDK-backed implementation behind the same
`AnalyticsService` interface if/when analytics is actually needed; the
catalogue below must be kept up to date as events are added, regardless of
which implementation is active.

---

## Events

<!-- Document each event below. Example format: -->

<!--
### `event_name`

Fired when <trigger condition>.

| Property | Type | Description |
|---|---|---|
| `property_name` | `string` | Description |
-->

_(no events tracked yet)_

---

## Screen Views

<!-- Document screen views tracked via the analytics service. Example format: -->

<!--
| Screen name | When tracked |
|---|---|
| `screen_name` | When the screen opens |
-->

_(no screen views tracked yet)_
