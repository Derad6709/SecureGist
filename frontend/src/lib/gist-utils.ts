import LZString from 'lz-string';

export interface GistFile {
  name: string;
  content: string;
  language?: string;
  type?: 'code' | 'markdown' | 'text' | 'image';
}

export interface GistData {
  files: GistFile[];
  description?: string;
  created_at?: string;
}

export const compressGist = (data: GistData): string => {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
};

export const decompressGist = (hash: string): GistData | null => {
  try {
    // Remove the leading '#' if present
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const json = LZString.decompressFromEncodedURIComponent(cleanHash);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decompress gist", e);
    return null;
  }
};
