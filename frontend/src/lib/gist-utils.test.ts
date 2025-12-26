import { describe, it, expect } from 'vitest';
import { compressGist, decompressGist, GistData } from './gist-utils';

describe('gist-utils', () => {
  const sampleGist: GistData = {
    files: [
      { name: 'test.txt', content: 'Hello World', type: 'text' }
    ],
    description: 'A test gist'
  };

  it('should compress and decompress data correctly', () => {
    const compressed = compressGist(sampleGist);
    expect(typeof compressed).toBe('string');
    expect(compressed.length).toBeGreaterThan(0);

    const decompressed = decompressGist(compressed);
    expect(decompressed).toEqual(sampleGist);
  });

  it('should handle URL hash with # prefix', () => {
    const compressed = compressGist(sampleGist);
    const decompressed = decompressGist('#' + compressed);
    expect(decompressed).toEqual(sampleGist);
  });

  it('should return null for invalid hash', () => {
    const result = decompressGist('invalid-hash-data');
    expect(result).toBeNull();
  });
});
