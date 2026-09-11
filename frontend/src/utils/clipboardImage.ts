/** Turn a Snipping Tool / screenshot clipboard payload into an uploadable File. */
export function clipboardImageToFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.items)) {
    if (!item.type.startsWith('image/')) continue;
    const blob = item.getAsFile();
    if (!blob) continue;
    const ext = item.type.includes('jpeg') ? 'jpg' : item.type.includes('gif') ? 'gif' : 'png';
    return new File([blob], `screenshot-${Date.now()}.${ext}`, { type: item.type || 'image/png' });
  }
  return null;
}

export async function readClipboardImage(): Promise<File | null> {
  if (!navigator.clipboard?.read) return null;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (!type) continue;
      const blob = await item.getType(type);
      const ext = type.includes('jpeg') ? 'jpg' : 'png';
      return new File([blob], `screenshot-${Date.now()}.${ext}`, { type });
    }
  } catch {
    return null;
  }
  return null;
}
