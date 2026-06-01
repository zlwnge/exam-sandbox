import { useCallback } from 'react';

/**
 * Hook that returns a paste handler for extracting image data URLs from clipboard.
 * @param onImagePasted callback receiving the base64 data URL when an image is pasted
 * @returns a React.ClipboardEvent handler to attach to any textarea/input
 */
export function useImagePaste(onImagePasted: (dataUrl: string) => void) {
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              onImagePasted(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [onImagePasted]
  );
  return handlePaste;
}

export default useImagePaste;
