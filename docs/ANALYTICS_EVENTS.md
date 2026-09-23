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

<!-- Added for N/A-2: Checklist items -->

### `item_added`

Fired when the user submits new item text on the checklist detail screen.

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the item was added to |
| `item_count` | `number` | Total item count on the checklist after the add |

### `item_edited`

Fired when the user saves an edit to an existing item's text.

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the item belongs to |

### `item_deleted`

Fired when the user deletes an item.

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the item belonged to |

<!-- Added for CheL-3: Reordering & sections; section_id property removed
     and section_added/section_reordered/item_moved_to_section events
     removed for CheL-20 (sections feature removed). -->

### `item_reordered`

Fired when the user drags an item into a new position within a checklist (drop completes).

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the item belongs to |
| `from_index` | `number` | Item's index before the move |
| `to_index` | `number` | Item's index after the move |

<!-- Added for CheL-4: Checklist runs -->

### `run_started`

Fired when the user starts a new run from a checklist.

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the run was started from |
| `item_count` | `number` | Number of items snapshotted into the run |

### `run_item_toggled`

Fired when the user checks or unchecks an item within a run.

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the run belongs to |
| `checked` | `boolean` | Whether the item is now checked (`true`) or unchecked (`false`) |
| `checked_count` | `number` | Number of items checked in the run after this toggle |
| `item_count` | `number` | Total number of items in the run |

### `run_completed`

Fired when the user presses "Complete the checklist" (only possible once every item in the run is checked).

| Property | Type | Description |
|---|---|---|
| `checklist_id` | `string` | The checklist the run belongs to |
| `item_count` | `number` | Total number of items in the completed run |

<!-- Added for CheL-36: Externally started checklist runs -->

### `external_run_request_handled`

Fired after CheckLister evaluates an incoming request to start a checklist run.

| Property | Type | Description |
|---|---|---|
| `outcome` | `string` | Request result: `started`, `error`, or `invalid_callback` |
| `replaced_active_run` | `boolean` | Whether the request discarded and replaced an active run |

### `external_run_callback_finished`

Fired after CheckLister attempts to return an externally started run result to the calling app. The callback URL, callback scheme, and query values must never be logged because they may contain app identifiers, user information, or authentication tokens.

| Property | Type | Description |
|---|---|---|
| `status` | `string` | Returned run result: `completed`, `cancelled`, or `error` |
| `delivered` | `boolean` | Whether the callback app opened successfully |

<!-- Added for CheL-40: Externally requested checklist selection -->

### `external_select_request_handled`

Fired after CheckLister evaluates an incoming request to select a checklist.

| Property | Type | Description |
|---|---|---|
| `outcome` | `string` | Request result: `opened`, `error`, or `invalid_callback` |

### `external_select_callback_finished`

Fired after CheckLister attempts to return a checklist selection result to the calling app. The callback URL, callback scheme, and query values must never be logged because they may contain app identifiers, user information, or authentication tokens. The selected checklist's ID and name are also never logged — the `status` outcome alone is what matters for product understanding.

| Property | Type | Description |
|---|---|---|
| `status` | `string` | Returned selection result: `selected`, `cancelled`, or `error` |
| `delivered` | `boolean` | Whether the callback app opened successfully |

<!-- Added for N/A-70: Night mode -->

### `color_scheme_resolved`

Fired once per app session when the app resolves the OS appearance setting at launch, and again if it changes while the app is foregrounded.

| Property | Type | Description |
|---|---|---|
| `color_scheme` | `string` | Resolved OS appearance: `light` or `dark` |

---

## Screen Views

<!-- Document screen views tracked via the analytics service. Example format: -->

<!--
| Screen name | When tracked |
|---|---|
| `screen_name` | When the screen opens |
-->

<!-- Added for N/A-2: Checklist items; screen_checklist_run row added for CheL-4 -->

<!-- Added for CheL-5: Checklist run history -->

| Screen name | When tracked |
|---|---|
| `screen_checklist_detail` | When `ChecklistDetailScreen` mounts for a valid checklist, with `item_count: number` |
| `screen_checklist_run` | When the run screen mounts, with `checklist_id: string`, `item_count: number` |
| `screen_run_history` | When the run history screen mounts, with `scope: string` (`all` or `checklist`), `entry_count: number`, and `checklist_id: string` when filtered to one checklist |
| `screen_checklist_select` | When the external "Select checklist" picker mounts, with `checklist_count: number` (CheL-40) |
