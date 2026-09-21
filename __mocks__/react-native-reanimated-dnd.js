// Manual Jest mock for react-native-reanimated-dnd.
//
// Real drag gestures aren't unit-testable; the ordering logic they trigger
// lives in pure domain helpers instead (see domain/models.ts). This mock
// renders rows in plain Views and exposes drag completion as an `onDrop`
// prop on a testID-addressable host view per row, so screen tests can
// drive it with `fireEvent(getByTestId('sortable-item-<id>'), 'drop', { to })`.
//
// `currentOrder` is module-level state populated by the most recent
// `Sortable` render — safe because tests run one render pass at a time and
// always re-render (updating this) before firing a drop.
const React = require('react');
const { View } = require('react-native');

let currentOrder = [];

function Sortable({
  data,
  renderItem,
  itemKeyExtractor = item => item.id,
  keyboardShouldPersistTaps,
}) {
  currentOrder = data.map((item, index) => itemKeyExtractor(item, index));

  return React.createElement(
    View,
    { testID: 'sortable-list', keyboardShouldPersistTaps },
    data.map((item, index) => {
      const id = itemKeyExtractor(item, index);
      return React.createElement(
        React.Fragment,
        { key: id },
        renderItem({
          item,
          index,
          id,
          positions: { value: {} },
          lowerBound: { value: 0 },
          autoScrollDirection: { value: 'none' },
          itemsCount: data.length,
          itemHeight: 50,
        }),
      );
    }),
  );
}

function SortableItem({ id, onDrop, children, style }) {
  const handleDrop = ({ to }) => {
    const from = currentOrder.indexOf(id);
    if (from === -1 || to === from) {
      return;
    }
    const reordered = currentOrder.slice();
    reordered.splice(from, 1);
    reordered.splice(to, 0, id);
    const allPositions = Object.fromEntries(
      reordered.map((rowId, i) => [rowId, i]),
    );
    onDrop?.(id, to, allPositions);
  };

  return React.createElement(
    View,
    { testID: `sortable-item-${id}`, onDrop: handleDrop, style },
    children,
  );
}

SortableItem.Handle = function Handle({ children, style }) {
  return React.createElement(View, { style }, children);
};

module.exports = {
  __esModule: true,
  Sortable,
  SortableItem,
};
