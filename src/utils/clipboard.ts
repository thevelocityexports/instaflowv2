/**
 * Robust Cross-Browser Clipboard Helper
 * Works seamlessly in iframes, restricted permissions contexts, mobile browsers, and desktop.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    console.warn('copyToClipboard: Empty text provided.');
    return false;
  }

  // 1. Try modern Asynchronous Clipboard API if available and document is focused
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed or was blocked by iframe permissions, falling back to execCommand:', err);
    }
  }

  // 2. Reliable Fallback via textarea and document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Position fixed offscreen to prevent scrolling or visible flash
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.fontSize = '16px'; // Prevents iOS Safari from auto-zooming on focus
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      return true;
    }
  } catch (fallbackErr) {
    console.error('execCommand copy fallback failed:', fallbackErr);
  }

  // 3. Last-ditch prompt if in a completely sandboxed environment
  try {
    if (typeof window !== 'undefined' && window.prompt) {
      window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
      return true;
    }
  } catch {
    // Ignore
  }

  return false;
}
