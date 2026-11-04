const { readScenarioBuildFlag } = require('./scenarioBuildFlag');

// Replaces the free identifier __SCENARIO_BUILD__ with a boolean literal so Metro's
// constant folding drops the guarded branches and their require() calls, like __DEV__.
module.exports = function scenarioBuildPlugin({ types: t }, options = {}) {
  const enabled =
    options.enabled === undefined ? readScenarioBuildFlag() : options.enabled;
  return {
    name: 'checklister-scenario-build',
    visitor: {
      ReferencedIdentifier(path) {
        if (
          path.node.name === '__SCENARIO_BUILD__' &&
          !path.scope.hasBinding('__SCENARIO_BUILD__')
        ) {
          path.replaceWith(t.booleanLiteral(enabled));
        }
      },
    },
  };
};
