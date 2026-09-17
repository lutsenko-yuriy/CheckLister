Check `skill_router.toml`'s `[llm]` `router_enabled` flag.
- If `true`: run via Bash: `python3 scripts/skill_router skills/design/brief/SKILL.md --args '$ARGUMENTS'`. If the script exits non-zero (LM Studio unavailable or model not loaded), fall back to reading `skills/design/brief/SKILL.md` and executing it yourself.
- If `false` or unset: skip the router — read `skills/design/brief/SKILL.md` and execute it yourself directly.

$ARGUMENTS
