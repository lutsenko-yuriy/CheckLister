// Build-time switch for the scenario build (CheL-147). `1` = on, unset/empty/`0` = off;
// anything else throws so a typo cannot silently produce the wrong kind of build.
function readScenarioBuildFlag(env = process.env) {
  const raw = env.CHECKLISTER_SCENARIO_BUILD;
  if (raw === undefined || raw === '' || raw === '0') {
    return false;
  }
  if (raw === '1') {
    return true;
  }
  throw new Error(
    `CHECKLISTER_SCENARIO_BUILD must be 1, 0 or unset (got "${raw}")`,
  );
}

module.exports = { readScenarioBuildFlag };
