// Manual Jest mock for react-native-draggable-flatlist.
//
// Real drag gestures aren't unit-testable; the ordering logic they trigger
// lives in pure domain helpers instead (see domain/models.ts). This mock
// renders rows with a plain FlatList and exposes drag completion as an
// `onDragEnd` prop on a testID-addressable host view, so screen tests can
// drive it with `fireEvent(getByTestId(...), 'dragEnd', { from, to })`.
const React = require('react');
const { View, FlatList } = require('react-native');

function DraggableFlatList({
  data,
  renderItem,
  keyExtractor,
  onDragEnd,
  testID,
}) {
  const handleDragEnd = ({ from, to }) => {
    if (from === to) {
      return;
    }
    const reordered = data.slice();
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onDragEnd({ data: reordered, from, to });
  };

  return React.createElement(
    View,
    { testID: testID ?? 'draggable-flatlist', onDragEnd: handleDragEnd },
    React.createElement(FlatList, {
      data,
      keyExtractor,
      renderItem: ({ item, index }) =>
        renderItem({ item, index, drag: () => {}, isActive: false }),
    }),
  );
}

module.exports = {
  __esModule: true,
  default: DraggableFlatList,
};
