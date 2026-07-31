/**
 * Builds the FormData sent to upload a customer attachment. The `baseName`
 * field is only appended when the trimmed value is non-empty — the backend
 * rejects an explicit empty string with 400, but treats an omitted field as
 * "keep the original file name" (`upload-customer-attachment.dto.ts`).
 */
export function buildAttachmentFormData(file: File, baseName?: string): FormData {
  const form = new FormData()
  form.append("file", file)

  const trimmed = baseName?.trim()
  if (trimmed) {
    form.append("baseName", trimmed)
  }

  return form
}
