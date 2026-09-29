import { BookOpenText } from "lucide-react"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center bg-muted/30 px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookOpenText className="size-4" />
        </span>
        Docs AI
      </div>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  )
}
