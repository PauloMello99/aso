/**
 * Extracts the extension (including the leading dot) from the basename of a
 * file name or path, e.g. ".pdf". Returns "" when there is no extension.
 * A path is first reduced to its basename (last segment after "/").
 */
export function extensionOf(nameOrPath: string): string {
  const basename = nameOrPath.split("/").pop() ?? ""
  const dotIndex = basename.lastIndexOf(".")

  if (dotIndex <= 0) {
    return ""
  }

  return basename.slice(dotIndex)
}

/**
 * Splits a file name into its base (without extension) and extension
 * (including the leading dot, or "" when there is none).
 */
export function splitFileName(name: string): { base: string; ext: string } {
  const ext = extensionOf(name)

  if (ext === "") {
    return { base: name, ext: "" }
  }

  return { base: name.slice(0, name.length - ext.length), ext }
}

/**
 * Joins a base name and an extension back into a file name. When `ext` is
 * empty, the result is just the trimmed base.
 */
export function joinFileName(base: string, ext: string): string {
  const trimmedBase = base.trim()

  return ext === "" ? trimmedBase : `${trimmedBase}${ext}`
}
