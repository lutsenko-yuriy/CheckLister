Check `skill_router.toml`'s `[llm]` `router_enabled` flag.
- If `true`: run via Bash: `python3 scripts/skill_router skills/configure/style/SKILL.md --args '$ARGUMENTS'`. If the script exits non-zero (LM Studio unavailable or model not loaded), fall back to reading `skills/configure/style/SKILL.md` and executing it yourself.
- If `false` or unset: skip the router — read `skills/configure/style/SKILL.md` and execute it yourself directly.

$ARGUMENTS
