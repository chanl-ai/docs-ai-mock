# Docs AI handoff: what is built and what is needed

Status: current as of 2026-10-01. Update the status columns as work lands.

Two apps make up this handoff. The mock is the target product UI. The Python app is the
working reference backend and its old dashboard. Neither one is the finished product: the
build is the mock's screens wired to a backend built from the Python one.

| App | Repo | Local URL | What it is | Backend |
|---|---|---|---|---|
| Docs AI mock | `chanl-ai/docs-ai-mock` (this repo) | <http://localhost:3020> | Clickable target UI. Next.js 15, shadcn/ui, typed mock data in a local store | None. Syncs are timers; playground answers are canned |
| Python reference app | `chanl-ai/protobox-python` | <http://localhost:3010> (API on :8090) | Older dashboard over a real FastAPI + MongoDB backend with an MCP endpoint | Real, with the gaps listed below |

The screen-by-screen target is [`ui-spec.html`](ui-spec.html) (50 screens, open it in a
browser). Section numbers below refer to it.

## Run them

Mock: `pnpm install && pnpm dev`, then open `/login` (any email and password work) and go to
`/w/northwind`. Add `?state=empty|loading|error` to any page to see that state.

Python app: follow its README (`make setup && make up && make web`). Sign up with any email and
password; auth runs on the Firebase emulator. Set `OPENAI_API_KEY` in `.env` for the knowledge
base and chat, then run `make up` again.

## Status by area

Mock column: **done** means built and clickable; **partial** means built but rough or
incomplete; **missing** means no route. Python column describes the old dashboard page and
whether its backend works.

| Area | Spec | Mock (:3020) | Python app (:3010) | Needed |
|---|---|---|---|---|
| Sign in, sign up, onboarding, workspaces | 5.1–5.6 | done | Working | Wire to real auth |
| OAuth consent for AI clients | 5.7 | done | Working; consent is bound to a workspace the user belongs to | Wire |
| Home | 5.8 | done | Working; Export and "View analytics" do nothing | Wire; home KPIs need an aggregate endpoint |
| Knowledge bases (list, create, overview) | 6.1–6.3 | done | One knowledge base per workspace; no KB-versus-source split | **Backend:** multiple KBs per workspace, each indexed from several sources |
| KB documents, chunks, retrieval settings, playground | 6.5–6.7 | done | Upload, chunk viewer and semantic, keyword and hybrid search work | Per-KB retrieval settings; playground over the real query endpoint |
| KB query API, analytics, access, proposals | 6.8–6.11 | done | Not present | **Backend:** all four |
| KB evals and curation | not in spec yet | done | Not present | Write the spec section first, then build |
| Sources (list, add, detail, items, sync history, settings) | 7.1–7.6 | done | Only file, URL and text sources; processing is an in-process task with no retries | **Backend:** a source-connector interface (SharePoint, Confluence, GitHub and so on), scheduled syncs, run history, retries |
| Files (library, upload, preview, storage) | 8.1–8.4 | done | Upload only, no library | **Backend:** file library and storage endpoints. Uploads need S3-compatible storage |
| Chat and conversations | 9.1–9.2 | done | Assistant chat with streaming works | Wire to KB-grounded answers with citations |
| Tools (list, create, detail, import) | 10.1–10.4 | partial (not polished) | Working: CRUD, REST and code editors, OpenAPI and cURL import, test. REST calls need the egress worker | Polish the mock screens; wire |
| Executions and execution detail | 10.5–10.6 | partial (not polished) | Tool calls made over MCP are not recorded | **Backend:** record MCP tool calls, with args, result, error, latency and a retention policy |
| AI clients (connection guides) | 11.1 | done | Working | Wire |
| MCP servers and tokens | 11.2 | done | Tokens tab is broken: the API works, but the dashboard calls client methods that do not exist | Wire. MCP needs Streamable HTTP; only SSE works today |
| OAuth clients | 11.3 | done | Broken in the same way as tokens | Wire |
| Secrets | 11.4 | missing (components built, no route) | Create, list and delete work; revoke, rotate and test show a toast and do nothing | Add the route; backend for rotate and test |
| Integrations | 11.5 | missing (components built, no route) | Browse, connect, configure and test work; Disconnect calls the wrong method | Add the route; fix disconnect |
| Team and invitations | 12.1 | partial (not polished) | Broken: the API works, but the dashboard calls client methods that do not exist | Wire |
| Audit log | 12.2 | partial (not polished) | List works; detail and export do nothing | Wire; export endpoint |
| Analytics | 12.3 | partial (not polished) | Placeholder that redirects to home | **Backend:** aggregate endpoints |
| Settings: general | 13.1 | partial | Delete works; Save fails (dashboard sends PUT, API accepts only PATCH) | Wire; fix the method |
| Settings: security, appearance, notifications, advanced | 13.2–13.5 | missing (nav entries only) | Placeholders; no 2FA or session backend | Build screens; **backend** for API keys and token policy. 2FA and session revocation have no backend anywhere |

### Not specced yet

These areas were in older dashboards but have no section in `ui-spec.html`. Each needs a
product decision before anyone builds it.

| Area | Python app | Open question |
|---|---|---|
| Toolsets (named groups of tools, each with its own MCP URL) | Not present | Use toolsets to scope which tools a token can see? Recommended |
| Approvals (hold a tool call or KB write until a person approves) | Not present | Fold into KB proposals (6.11) rather than a separate page? Recommended |
| Prompts and skills | List and create work; edit, delete and export do nothing | Keep for v1? |
| Memory | Placeholder, no backend | Keep for v1? |
| Workflows and triggers | Placeholder, local state only | Defer; no source app has a working create flow |
| Users (end users and agent identities, separate from team members) | Placeholder | Defer |
| Tool playground (run tools without an assistant) | Redirects to chat | Merge into the tool test tab (10.3)? |

## Backend gaps that block wiring

These are in the Python backend and affect several screens at once. Its README lists them in
full under "Known limitations".

| Gap | Affects |
|---|---|
| No KB-versus-source model; one knowledge base per workspace | All of 6 and 7 |
| No source connectors and no scheduled sync | 7, flow 14.1, flow 14.5 |
| KB processing runs in-process with no retries or job queue | 6.3 index health, 7.5 sync history |
| Vector search fetches global top results, then filters by workspace | Retrieval quality as tenants grow |
| Only the SSE MCP transport works; sessions live in process memory | 11.2, running more than one API instance |
| MCP tool calls are not recorded | 10.5, 10.6, 12.3 |
| Workspace access is checked in three places with slightly different rules | Every authenticated screen; consolidate before adding more routes |

## Mock code notes

- All state lives in `lib/mock/store.ts` (Zustand, persisted to localStorage). Each mutation
  there is a stand-in for one API call, so it doubles as a list of the endpoints the screens
  need.
- Playground answers come from `lib/mock/answer.ts` by keyword match.
- `scripts/flow.mjs` drives the main flows headless; `scripts/shoot.mjs` regenerates the
  screenshots in `docs/screens/`.
- The product name in the UI is "Docs AI". Keep reference-platform and vendor names out of
  anything visible.
