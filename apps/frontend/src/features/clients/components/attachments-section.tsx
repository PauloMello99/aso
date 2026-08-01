"use client"

import { useRef, useState } from "react"
import { FileText, Paperclip, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import {
  FilePreviewDialog,
  type PreviewFile,
} from "@/shared/components/file-preview-dialog"
import {
  useCustomerAttachments,
  type CustomerAttachment,
} from "../hooks/use-customer-attachments"
import { RenameAttachmentDialog } from "./rename-attachment-dialog"
import { UploadAttachmentDialog } from "./upload-attachment-dialog"

interface AttachmentsSectionProps {
  orgId: string
  customerId: string
}

const MAX_BYTES = 10 * 1024 * 1024

function toPreviewFile(a: CustomerAttachment): PreviewFile {
  return {
    id: a.id,
    fileName: a.fileName,
    contentType: a.contentType,
    url: a.url,
    downloadUrl: a.downloadUrl,
  }
}

export function AttachmentsSection({
  orgId,
  customerId,
}: AttachmentsSectionProps) {
  const {
    attachments,
    loading,
    uploadAttachment,
    deleteAttachment,
    renameAttachment,
  } = useCustomerAttachments(orgId, customerId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const renamingAttachment =
    attachments.find((a) => a.id === renamingId) ?? null
  const deletingAttachment =
    attachments.find((a) => a.id === deletingId) ?? null
  const previewIndex = attachments.findIndex((a) => a.id === previewId)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError("Arquivo deve ter no máximo 10 MB.")
      return
    }
    setPendingFile(file)
    setUploadDialogOpen(true)
  }

  function openRename(attachmentId: string) {
    setPreviewOpen(false)
    setRenamingId(attachmentId)
    setRenameDialogOpen(true)
  }

  function openDelete(attachmentId: string) {
    setPreviewOpen(false)
    setDeleteError(null)
    setDeletingId(attachmentId)
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deletingAttachment) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await deleteAttachment(deletingAttachment.id)
      setDeleteDialogOpen(false)
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Falha ao remover anexo.",
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/70">
          <Paperclip className="h-3.5 w-3.5" /> Anexos
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Enviar
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <p className="text-xs text-foreground/30">Carregando…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-foreground/30">
          Nenhum anexo. Imagens ou PDF até 10 MB (ex.: ficha de anamnese).
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {attachments.map((a) => {
            const isImage = a.contentType?.startsWith("image/") ?? false
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewId(a.id)
                    setPreviewOpen(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2 text-left hover:bg-foreground/[0.04]"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt={a.fileName}
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-foreground/40" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/70">
                    {a.fileName}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {previewIndex >= 0 && (
        <FilePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          files={attachments.map(toPreviewFile)}
          startIndex={previewIndex}
          onRename={(f) => openRename(f.id)}
          onRemove={(f) => openDelete(f.id)}
        />
      )}

      {pendingFile && (
        <UploadAttachmentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          file={pendingFile}
          onConfirm={async (file, baseName) => {
            await uploadAttachment(file, baseName)
          }}
        />
      )}

      {renamingAttachment && (
        <RenameAttachmentDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentName={renamingAttachment.fileName}
          onSave={(baseName) =>
            renameAttachment(renamingAttachment.id, baseName)
          }
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover anexo"
        description={
          deletingAttachment
            ? `Tem certeza que deseja remover "${deletingAttachment.fileName}"? Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Remover"
        destructive
        loading={deleteLoading}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}
