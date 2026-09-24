export type ReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max";

// The classifier receives data and returns JSON. It has no reason to discover tools or local instructions.
export function classifierProfile(instructionsFile: string, effort: ReasoningEffort) {
  const disabled = [
    "apps", "plugins", "remote_plugin", "browser_use", "computer_use",
    "in_app_browser", "image_generation", "view_image", "shell_tool",
    "unified_exec", "multi_agent", "multi_agent_v2", "memories", "goals",
    "sleep_tool", "tool_suggest", "skill_search", "skill_mcp_dependency_install",
    "shell_snapshot", "workspace_dependencies", "code_mode", "code_mode_only",
    "code_mode_host", "hooks",
  ];
  return [
    "--strict-config",
    "-c", `model_instructions_file=${JSON.stringify(instructionsFile)}`,
    "-c", `model_reasoning_effort=${JSON.stringify(effort)}`,
    "-c", "project_doc_max_bytes=0",
    "-c", "skills.max_context_tokens=1",
    "-c", 'web_search="disabled"',
    "-c", 'personality="none"',
    "-c", 'developer_instructions=""',
    "-c", "features.skip_host_skill_discovery=true",
    "-c", "suppress_unstable_features_warning=true",
    ...disabled.flatMap((feature) => ["--disable", feature]),
  ];
}

export function classifierEnvironment(environment: NodeJS.ProcessEnv) {
  const isolated = { ...environment };
  // These identify the launching desktop task, rather than this classification request.
  for (const key of [
    "CODEX_APP_TOOLS_PIPE_PATH", "CODEX_INTERNAL_ORIGINATOR_OVERRIDE",
    "CODEX_SESSION_ID", "CODEX_THREAD_ID",
  ]) delete isolated[key];
  return isolated;
}
