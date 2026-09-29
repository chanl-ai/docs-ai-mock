import type { McpToken } from "@/lib/mock/types"

export type McpScope = McpToken["scopes"][number]

export const mcpBase = (slug: string) => `https://mcp.docs-ai.example/w/${slug}`
export const mcpHttpUrl = (slug: string) => `${mcpBase(slug)}/mcp`
export const mcpSseUrl = (slug: string) => `${mcpBase(slug)}/sse`

export const SCOPES: { id: McpScope; description: string }[] = [
  { id: "knowledge:read", description: "Search and read the knowledge bases the token can reach." },
  { id: "knowledge:write", description: "Propose document changes; they go to review before publishing." },
  { id: "tools:run", description: "Run active tools, asking first when a tool requires confirmation." },
  { id: "tools:read", description: "List tools and their input schemas without running them." },
]

export const FIXED_PROMPTS = [
  { name: "answer_with_citations", description: "Answer a question from the knowledge bases and cite every claim." },
  { name: "summarise_policy", description: "Summarise one policy document in plain language with its effective date." },
]

export type ClientId = "claude" | "chatgpt" | "cursor" | "fastmcp" | "cli" | "custom"
export type AuthMethod = "token" | "oauth"

export interface ClientDef {
  id: ClientId
  name: string
  blurb: string
  seen?: { ago: string; agent: string }
  oauthOnly?: boolean
  configFile?: string
}

export const CLIENTS: ClientDef[] = [
  { id: "claude", name: "Claude (desktop and web)", blurb: "Add the workspace as a custom connector or a desktop MCP server.", seen: { ago: "2 s ago", agent: "claude-desktop/1.4.2" }, configFile: "claude_desktop_config.json" },
  { id: "chatgpt", name: "ChatGPT", blurb: "Register a connector in ChatGPT settings; users sign in with OAuth.", oauthOnly: true },
  { id: "cursor", name: "Cursor", blurb: "Point Cursor's MCP settings at the workspace server.", seen: { ago: "26 h ago", agent: "cursor/0.51" }, configFile: ".cursor/mcp.json" },
  { id: "fastmcp", name: "Generic MCP client (FastMCP)", blurb: "Connect from your own Python agent with the FastMCP client.", configFile: "client.py" },
  { id: "cli", name: "Terminal (MCP CLI)", blurb: "List tools and call them from a shell for quick checks.", configFile: "connect.sh" },
  { id: "custom", name: "Custom integration", blurb: "Speak streamable HTTP directly from any language.", configFile: "request.http" },
]

export const TOKEN_PLACEHOLDER = "<TOKEN>"

export function clientSteps(id: ClientId, auth: AuthMethod): string[] {
  const tokenStep = auth === "token" ? "Create a token below, or paste an existing one in place of <TOKEN>." : "No token is needed; the first request opens the sign-in and consent screen."
  switch (id) {
    case "claude":
      return auth === "oauth"
        ? ["In Claude, open Settings → Connectors → Add custom connector.", "Paste the server URL and choose OAuth.", tokenStep, "Approve the consent screen for this workspace."]
        : ["Open Claude desktop → Settings → Developer → Edit config.", tokenStep, "Paste the snippet into claude_desktop_config.json and save.", "Restart Claude desktop; the tools appear under the hammer icon."]
    case "chatgpt":
      return ["In ChatGPT, open Settings → Connectors → Create.", "Paste the connector URL below and choose OAuth.", "Save, then start a chat and pick the connector.", "Approve the consent screen for this workspace."]
    case "cursor":
      return ["Open Cursor → Settings → MCP → Add new server.", tokenStep, "Paste the snippet into .cursor/mcp.json.", "Toggle the server on; a green dot means it listed tools."]
    case "fastmcp":
      return ["pip install fastmcp", tokenStep, "Save the snippet as client.py and run it.", "It prints the tool list, then calls one search."]
    case "cli":
      return ["Node 20 or later is required.", tokenStep, "Run the command; it opens an interactive tool prompt."]
    case "custom":
      return ["Send JSON-RPC over POST to the server URL.", tokenStep, "Call initialize, then tools/list, then tools/call."]
  }
}

export function clientSnippet(id: ClientId, slug: string, auth: AuthMethod, token: string): string {
  const url = mcpHttpUrl(slug)
  const bearer = auth === "token"
  switch (id) {
    case "claude":
      return JSON.stringify({ mcpServers: { "docs-ai": bearer ? { url, headers: { Authorization: `Bearer ${token}` } } : { url } } }, null, 2)
    case "cursor":
      return JSON.stringify({ mcpServers: { "docs-ai": bearer ? { url, transport: "streamable-http", headers: { Authorization: `Bearer ${token}` } } : { url, transport: "streamable-http", auth: "oauth" } } }, null, 2)
    case "chatgpt":
      return `Connector URL\n${url}\n\nAuthentication\nOAuth (dynamic client: ChatGPT)\n\n# ChatGPT connectors sign each user in over OAuth.\n# A shared token cannot be pasted here.`
    case "fastmcp":
      return `import asyncio\nfrom fastmcp import Client\n${bearer ? "from fastmcp.client.auth import BearerAuth\n" : ""}\nasync def main():\n    async with Client("${url}"${bearer ? `, auth=BearerAuth("${token}")` : `, auth="oauth"`}) as client:\n        tools = await client.list_tools()\n        print([t.name for t in tools])\n        result = await client.call_tool("search_all_knowledge", {"query": "parental leave"})\n        print(result)\n\nasyncio.run(main())`
    case "cli":
      return bearer ? `npx mcp-cli connect ${url} \\\n  --header "Authorization: Bearer ${token}"` : `npx mcp-cli connect ${url} --oauth`
    case "custom":
      return `POST ${url}\nContent-Type: application/json\nAccept: application/json, text/event-stream\n${bearer ? `Authorization: Bearer ${token}\n` : ""}\n{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
  }
}
