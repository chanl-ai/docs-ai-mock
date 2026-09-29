import { redirect } from "next/navigation"

export default async function Page({ params }: { params: Promise<{ ws: string; toolId: string }> }) {
  const { ws, toolId } = await params
  redirect(`/w/${ws}/tools/${toolId}/general`)
}
