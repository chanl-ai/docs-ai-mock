// Screenshot routes with the installed Chrome. Usage: node scripts/shoot.mjs <outDir> <width> route[,route...]
import puppeteer from "puppeteer-core"
import { mkdirSync } from "node:fs"

const [outDir, widthArg, routesArg, roleArg] = process.argv.slice(2)
const width = Number(widthArg || 1440)
const routes = (routesArg || "/w/northwind").split(",")
mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
})
const page = await browser.newPage()
await page.setViewport({ width, height: width < 600 ? 844 : 1000, deviceScaleFactor: 1 })
await page.evaluateOnNewDocument((role) => {
  try {
    const key = "docs-ai-mock-v3"
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ state: { authed: true, role: role || "owner", lastWorkspaceSlug: "northwind", onboardingDone: true }, version: 0 }))
  } catch {}
}, roleArg)
const errs = []
page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 300)))
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 300)) })
for (const route of routes) {
  errs.length = 0
  const name = route.replace(/^\//, "").replace(/[\/?=&]+/g, "_").replace(/_$/, "") || "root"
  const url = `http://localhost:3020${route}`
  try {
    await page.setViewport({ width, height: width < 600 ? 844 : 1000, deviceScaleFactor: 1 })
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 })
    await new Promise((r) => setTimeout(r, 1200))
    const height = await page.evaluate(() => Math.min(document.documentElement.scrollHeight, 4000))
    await page.setViewport({ width, height: Math.max(height, width < 600 ? 844 : 1000), deviceScaleFactor: 1 })
    await new Promise((r) => setTimeout(r, 300))
    await page.screenshot({ path: `${outDir}/${name}@${width}.png`, fullPage: false })
    const errors = await page.evaluate(() => document.body.innerText.includes("Application error") || document.body.innerText.includes("Unhandled Runtime Error"))
    console.log(`${errors ? "ERROR" : "ok"} ${route} -> ${name}@${width}.png (h=${height})`)
    if (errs.length) console.log("   console: " + errs.filter((e) => !e.includes("hydrat") || true).slice(0, 4).join(" | "))
  } catch (e) {
    console.log(`FAIL ${route}: ${e.message}`)
  }
}
await browser.close()
