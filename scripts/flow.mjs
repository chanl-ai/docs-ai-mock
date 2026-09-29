// Drive a few interactive flows and screenshot the result. Usage: node scripts/flow.mjs <outDir>
import puppeteer from "puppeteer-core"
import { mkdirSync } from "node:fs"
const [outDir] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox", "--hide-scrollbars"] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })
await page.evaluateOnNewDocument(() => { try { if (!localStorage.getItem("docs-ai-mock-v3")) localStorage.setItem("docs-ai-mock-v3", JSON.stringify({ state: { authed: true, role: "owner", lastWorkspaceSlug: "northwind", onboardingDone: true }, version: 0 })) } catch {} })
const errs = []
page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (n) => page.screenshot({ path: `${outDir}/${n}.png` })
const go = async (u) => { await page.goto(`http://localhost:3020${u}`, { waitUntil: "networkidle2", timeout: 90000 }); await wait(800) }
const clickText = async (text, tag = "button") => { const ok = await page.evaluate((t, g) => { const els = [...document.querySelectorAll(g)]; const el = els.find((b) => b.textContent.trim().startsWith(t)) ?? els.find((b) => b.textContent.includes(t)); if (el) { el.click(); return true } return false }, text, tag); if (!ok) console.log("  no element:", text); return ok }

// 1. Playground streamed answer
await go("/w/northwind/kb/kb_lending/playground")
await page.type("textarea", "What is the origination fee on a small business loan over $250k?")
await page.keyboard.press("Enter")
await wait(5000)
await shot("flow-playground-answer")
await clickText("Chunks")
await wait(500)
await shot("flow-playground-chunks")
console.log("playground:", await page.evaluate(() => document.body.innerText.includes("0.75%") ? "answer rendered" : "NO ANSWER"))

// 2. Add source wizard: type -> step 2 sharepoint
await go("/w/northwind/sources/new")
await clickText("Confluence", "div[role=button]")
await wait(300)
await clickText("Next")
await wait(500)
await page.type("input#src-name", "Product space")
await shot("flow-add-source-step2")
console.log("wizard step2:", await page.evaluate(() => document.body.innerText.includes("Connection") ? "ok" : "NOT ok"))

// 3. Create KB sheet
await go("/w/northwind/kb/new")
await page.type("input#kb-name", "Branch operations")
await clickText("Next")
await wait(500)
await shot("flow-create-kb-step2")

// 4. Files upload dialog with sample files
await go("/w/northwind/files?upload=1")
await clickText("Add 12 sample files")
await wait(300)
await shot("flow-upload-rows")
const uploadBtn = await clickText("Upload 10 files")
await wait(6000)
await shot("flow-upload-done")
console.log("upload:", await page.evaluate(() => document.body.innerText.match(/\d+ uploaded/)?.[0] ?? "no summary"))

// 5. MCP token create
await go("/w/northwind/connect/mcp")
await clickText("Create token")
await wait(500)
await page.type("input[id*=name], input[placeholder*=ame]", "Flow test token").catch(() => {})
await shot("flow-token-dialog")

// 6. Retry a failed sync from source overview
await go("/w/northwind/sources/src_contracts")
await clickText("Retry failed")
await wait(3000)
await shot("flow-source-retry")

// 7. Chat send
await go("/w/northwind/chat")
await page.type("textarea", "What is the refund window for annual plans?")
await page.keyboard.press("Enter")
await wait(4000)
await shot("flow-chat-answer")
console.log("errors:", errs.length ? errs.join(" | ") : "none")
await browser.close()
