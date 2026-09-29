import type { KnowledgeBase, PlaygroundAnswer, RetrievalSettings } from "./types"
import { playgroundAnswers, genericAnswer, chatReplies } from "./seed"

/** Pick the canned answer whose matchers best fit the question; fall back to a generic one. */
export function findAnswer(question: string, kb?: KnowledgeBase, settings?: Partial<RetrievalSettings>): PlaygroundAnswer {
  const q = question.toLowerCase()
  let best: PlaygroundAnswer | undefined
  let bestScore = 0
  for (const a of playgroundAnswers) {
    const score = a.matchers.filter((m) => q.includes(m.toLowerCase())).length
    if (score > bestScore) {
      best = a
      bestScore = score
    }
  }
  const base = best ?? { ...genericAnswer, question }
  const threshold = settings?.threshold ?? kb?.retrieval.threshold ?? 0.5
  const limit = settings?.chunkLimit ?? kb?.retrieval.chunkLimit ?? 8
  // Re-apply threshold and chunk limit so the settings rail visibly changes the result.
  const chunks = base.chunks.map((c) => ({ ...c, rejected: c.score < threshold })).slice(0, Math.max(limit, 2))
  const accepted = chunks.filter((c) => !c.rejected)
  const noAnswer = base.noAnswer || accepted.length === 0
  const synthesis = settings?.synthesis ?? kb?.retrieval.synthesis ?? true
  return {
    ...base,
    id: `${base.id}_${Date.now().toString(36)}`,
    question,
    chunks,
    noAnswer,
    answer: noAnswer || !synthesis ? "" : base.answer,
    citations: noAnswer ? [] : base.citations.filter((ci) => accepted.some((c) => c.documentId === ci.documentId)),
    synthesisMs: synthesis && !noAnswer ? base.synthesisMs : 0,
  }
}

export function findChatReply(question: string) {
  const q = question.toLowerCase()
  const hit = chatReplies.find((r) => r.matchers.some((m) => q.includes(m)))
  if (hit) return hit
  const a = findAnswer(question)
  return { matchers: [], content: a.answer, citations: a.citations, noAnswer: a.noAnswer }
}
