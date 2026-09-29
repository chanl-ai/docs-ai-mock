"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Code2, Globe } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SelectableCard, SelectableCardGroup } from "@/components/ui/selectable-card"
import { Textarea } from "@/components/ui/textarea"
import { useMock } from "@/lib/mock/store"
import { useWs } from "@/lib/mock/hooks"
import { snakeify } from "@/lib/format"

export function CreateToolDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const { base } = useWs()
  const tools = useMock((s) => s.tools)
  const createTool = useMock((s) => s.createTool)
  const [type, setType] = useState<"rest" | "code">("rest")
  const [language, setLanguage] = useState<"python" | "javascript">("python")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [touched, setTouched] = useState(false)

  const trimmed = name.trim()
  const mcpName = snakeify(trimmed)
  const error =
    trimmed.length < 2 ? "Name must be at least 2 characters" : trimmed.length > 60 ? "Name must be 60 characters or fewer" : tools.some((t) => t.name.toLowerCase() === trimmed.toLowerCase() || t.slug === mcpName) ? "A tool with this name already exists" : null

  const reset = () => { setName(""); setDescription(""); setTouched(false); setType("rest") }

  const create = () => {
    setTouched(true)
    if (error) return
    const tool = createTool({ name: trimmed, description: description.trim(), type, language: type === "code" ? language : undefined })
    toast.success("Tool created as a draft", { description: tool.name })
    reset()
    onOpenChange(false)
    router.push(`${base}/tools/${tool.id}/general`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New tool</DialogTitle>
          <DialogDescription>Pick the type and name it. Inputs, request or code and testing come next on the tool page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <SelectableCardGroup columns={2}>
            <SelectableCard selected={type === "rest"} onSelect={() => setType("rest")} icon={<Globe className="size-5" />} title="REST API" description="Call an HTTP endpoint with templated inputs and secrets." />
            <SelectableCard selected={type === "code"} onSelect={() => setType("code")} icon={<Code2 className="size-5" />} title="Code execution" description="Run a function in a sandbox with injected secrets." />
          </SelectableCardGroup>
          {type === "code" && (
            <div className="space-y-1.5">
              <Label htmlFor="tool-lang">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                <SelectTrigger id="tool-lang" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python 3.12</SelectItem>
                  <SelectItem value="javascript">JavaScript (Node 22)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tool-name">Name</Label>
            <Input id="tool-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} placeholder="Account lookup" aria-invalid={touched && !!error} />
            {touched && error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                MCP tool name: <span className="font-mono">{mcpName || "—"}</span>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tool-desc">Description</Label>
            <Textarea id="tool-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Look up a customer account by account number. Use before answering questions about a specific account." rows={3} />
            <p className="text-xs text-muted-foreground">The assistant reads this to decide when to call the tool.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
