import puppeteer from "puppeteer-core"
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] })
const p = await b.newPage(); await p.setViewport({ width: 390, height: Number(process.argv[3] || 844) })
await p.evaluateOnNewDocument(() => { localStorage.setItem("docs-ai-mock-v3", JSON.stringify({ state: { authed: true, role: "owner", lastWorkspaceSlug: "northwind", onboardingDone: true }, version: 0 })) })
await p.goto("http://localhost:3020" + (process.argv[2] || "/w/northwind"), { waitUntil: "networkidle2" }); await new Promise(r => setTimeout(r, 1000))
console.log(await p.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect()
    if (r.right > 395 && r.width > 100) out.push(`${el.tagName}.${el.className.toString().slice(0, 90)} right=${Math.round(r.right)} w=${Math.round(r.width)}`)
  }
  const avatars = [...document.querySelectorAll("[data-sidebar], [data-slot^=sidebar]")].filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && getComputedStyle(a).display !== "none" }).map((a) => `${JSON.stringify(a.getBoundingClientRect())} ${a.tagName}.${a.className.toString().slice(0,60)} ds=${a.getAttribute("data-sidebar")||a.getAttribute("data-slot")} text=${a.textContent.trim().slice(0,10)} parent=${a.parentElement.className.toString().slice(0,50)} gp=${a.parentElement.parentElement.className.toString().slice(0,50)}`).map((a) => { const r = a.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)} vis=${getComputedStyle(a).visibility} parentClasses=${a.parentElement.className.toString().slice(0,60)}` })
  return { docW: document.documentElement.scrollWidth, wide: out.slice(0, 12), avatars }
}))
await b.close()
