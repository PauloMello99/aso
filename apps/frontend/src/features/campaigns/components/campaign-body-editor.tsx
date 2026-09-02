"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import {
  campaignImageErrorMessage,
  IMAGE_TOO_LARGE_MESSAGE,
} from "../lib/error-messages"
import type { CampaignBody } from "../schemas/campaign.schema"

/** Guarda de tamanho no cliente (feedback rápido); o servidor também barra. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

interface CampaignBodyEditorProps {
  value: CampaignBody
  onChange: (doc: CampaignBody) => void
  onLoadDefault: () => void
  onUploadImage: (file: File) => Promise<{ url: string }>
  uploadingImage?: boolean
  disabled?: boolean
}

/**
 * Editor rich-text (Tiptap) do CORPO da campanha. A toolbar oferece SÓ o que o
 * walker de allowlist fechada do servidor (`validateCampaignBody`) aceita:
 * negrito, itálico, títulos 2/3, listas e link http/https. Nada de código,
 * citação, régua, tachado ou sublinhado — senão o dono só descobriria no 400 ao
 * salvar. A imagem é enviada por `onUploadImage` e inserida com a URL pública do
 * bucket `campaign-images`; o schema do nó é reduzido a `src` (ver extensão
 * abaixo) para casar com a allowlist do walker do servidor.
 */
export function CampaignBodyEditor({
  value,
  onChange,
  onLoadDefault,
  onUploadImage,
  uploadingImage = false,
  disabled = false,
}: CampaignBodyEditorProps) {
  // Último doc que empurramos/emitimos. O ProseMirror normaliza o doc (um doc
  // vazio vira um parágrafo, `trailingNode` acrescenta outro), então
  // `getJSON()` nunca é literalmente igual ao `value` — comparar contra o
  // `value` cru faria o efeito de sync disparar `setContent` a cada render.
  const lastDocRef = useRef(JSON.stringify(value))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const editor = useEditor({
    // Pages router SSR: obrigatório para não dar hydration mismatch. Se ainda
    // aparecer mismatch no console do preview, o fallback é importar este
    // componente via `next/dynamic` com `{ ssr: false }` no campaign-sheet.tsx.
    immediatelyRender: false,
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Fora da allowlist do servidor:
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        // StarterKit v3 embute Link; usamos o pacote dedicado abaixo.
        link: false,
      }),
      Link.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        protocols: ["http", "https"],
        isAllowedUri: (url, ctx) =>
          /^https?:\/\//i.test(url.trim()) && ctx.defaultValidate(url),
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      // O walker do servidor (`validateCampaignBody`) aceita SÓ `src` e `alt`
      // no nó `image` e REJEITA (não ignora) qualquer outro atributo. O schema
      // padrão da extensão declara `title/width/height` (default null) e o
      // ProseMirror os re-emite no `getJSON()`, o que faria o salvar quebrar
      // com 400. Reduzimos o schema a `src` — o único atributo que a toolbar
      // produz.
      Image.extend({
        addAttributes() {
          return { src: { default: null } }
        },
      }),
    ],
    onUpdate: ({ editor: instance }) => {
      const doc = instance.getJSON() as CampaignBody
      lastDocRef.current = JSON.stringify(doc)
      onChange(doc)
    },
  })

  // `value` trocado por fora (botão "usar texto padrão" ou troca de gatilho no
  // Sheet). Só reescreve o editor quando realmente difere do que já está lá.
  useEffect(() => {
    if (!editor) return
    const next = JSON.stringify(value)
    if (next === lastDocRef.current) return
    lastDocRef.current = next
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) return null

  async function handleImageFile(file: File) {
    if (!editor) return
    setImageError(null)
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(IMAGE_TOO_LARGE_MESSAGE)
      return
    }
    try {
      const { url } = await onUploadImage(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      setImageError(campaignImageErrorMessage(err))
    }
  }

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b p-1">
        <ToolbarButton
          label="Negrito"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Itálico"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Título 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista com marcadores"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={editor.isActive("link") ? "Remover link" : "Inserir link"}
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run()
              return
            }
            const url = window.prompt("URL (http:// ou https://)")?.trim()
            if (!url) return
            if (!/^https?:\/\//i.test(url)) return
            editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || uploadingImage}
          aria-label="Imagem"
          aria-busy={uploadingImage}
          title="Inserir imagem"
          className="h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImageFile(file)
            e.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onLoadDefault}
          className="ml-auto"
        >
          Usar texto padrão
        </Button>
      </div>
      {imageError && (
        <p className="px-3 pt-2 text-xs text-destructive" role="alert">
          {imageError}
        </p>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          "px-3 py-2 text-sm",
          "[&_[contenteditable]]:min-h-[160px] [&_[contenteditable]]:outline-none",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold",
          "[&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold",
          "[&_a]:text-primary [&_a]:underline",
        )}
      />
    </div>
  )
}

interface ToolbarButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className="h-8 w-8 p-0"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
