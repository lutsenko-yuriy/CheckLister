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

---

## Screen Views

<!-- Document screen views tracked via the analytics service. Example format: -->

<!--
| Screen name | When tracked |
|---|---|
| `screen_name` | When the screen opens |
-->

<!-- Added for N/A-2: Checklist items -->

| Screen name | When tracked |
|---|---|
| `screen_checklist_detail` | When `ChecklistDetailScreen` mounts for a valid checklist, with `item_count: number` |
