/** Email bodies are HTML (rich-text editor); search index and previews use plain text. */
export const stripHtml = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
