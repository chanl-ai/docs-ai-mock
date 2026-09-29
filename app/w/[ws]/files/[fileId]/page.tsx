import { FileLibrary } from "@/components/files/file-library"

export default async function FileDetailPage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  return <FileLibrary openFileId={fileId} />
}
