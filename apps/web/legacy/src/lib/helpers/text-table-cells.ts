/**
 * Table cell display for optional long text: empty values show an em dash;
 * long values truncate with an ellipsis (default 50 chars) for dense layouts.
 */
export function tableCellTextPreview(value: string | null | undefined, maxLength = 50): string {
  if (!value) return '–'
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}…`
}
