/* eslint-env jest */
const babel = require('@babel/core');
const { readScenarioBuildFlag } = require('./scenarioBuildFlag');
const scenarioBuildPlugin = require('./scenarioBuildPlugin');

describe('readScenarioBuildFlag', () => {
  it.each([
    [{}, false],
    [{ CHECKLISTER_SCENARIO_BUILD: '' }, false],
    [{ CHECKLISTER_SCENARIO_BUILD: '0' }, false],
    [{ CHECKLISTER_SCENARIO_BUILD: '1' }, true],
  ])('reads %j as %s', (env, expected) => {
    expect(readScenarioBuildFlag(env)).toBe(expected);
  });

  it.each(['true', 'yes', '2', 'on'])('rejects %s so a typo cannot silently build a normal app', value => {
    expect(() =>
      readScenarioBuildFlag({ CHECKLISTER_SCENARIO_BUILD: value }),
    ).toThrow(/CHECKLISTER_SCENARIO_BUILD/);
  });
});

describe('scenarioBuildPlugin', () => {
  const transform = (code, enabled) =>
    babel.transformSync(code, {
      babelrc: false,
      configFile: false,
      plugins: [[scenarioBuildPlugin, { enabled }]],
    }).code;

  it('replaces the flag with true when enabled', () => {
    expect(transform('if (__SCENARIO_BUILD__) { go(); }', true)).toContain(
      'if (true)',
    );
  });

  it('replaces the flag with false when disabled', () => {
    expect(transform('if (__SCENARIO_BUILD__) { go(); }', false)).toContain(
      'if (false)',
    );
  });

  it('leaves no reference to the flag behind', () => {
    expect(transform('x(__SCENARIO_BUILD__ && y);', true)).not.toContain(
      '__SCENARIO_BUILD__',
    );
  });

  it('does not touch a property or a local binding with the same name', () => {
    const out = transform('o.__SCENARIO_BUILD__; { const __SCENARIO_BUILD__ = 1; use(__SCENARIO_BUILD__); }', true);
    expect(out).toContain('o.__SCENARIO_BUILD__');
    expect(out).toContain('use(__SCENARIO_BUILD__)');
  });

  it('reads the environment when no option is given', () => {
    const previous = process.env.CHECKLISTER_SCENARIO_BUILD;
    process.env.CHECKLISTER_SCENARIO_BUILD = '1';
    try {
      const out = babel.transformSync('f(__SCENARIO_BUILD__);', {
        babelrc: false,
        configFile: false,
        plugins: [scenarioBuildPlugin],
      }).code;
      expect(out).toContain('f(true)');
    } finally {
      if (previous === undefined) {
        delete process.env.CHECKLISTER_SCENARIO_BUILD;
      } else {
        process.env.CHECKLISTER_SCENARIO_BUILD = previous;
      }
    }
  });
});
