import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './_api';

describe('apiClient', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should return parsed JSON data on successful fetch', async () => {
    const mockData = { id: 1, name: 'test' };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const abortController = new AbortController();
    const result = await apiClient(
      'https://api.example.com/data',
      abortController.signal,
      [],
      'test data',
    );

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      signal: abortController.signal,
    });
  });

  it('should throw error on HTTP error response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    mockFetch.mockResolvedValue(mockResponse);

    const abortController = new AbortController();

    await expect(
      apiClient('https://api.example.com/data', abortController.signal, [], 'test data'),
    ).rejects.toThrow('HTTP error! status: 404');
  });

  it('should return default value on abort error', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const abortController = new AbortController();
    const defaultValue: unknown[] = [];

    const result = await apiClient(
      'https://api.example.com/data',
      abortController.signal,
      defaultValue,
      'test data',
    );

    expect(result).toBe(defaultValue);
  });

  it('should re-throw non-abort errors', async () => {
    const networkError = new Error('Network error');
    mockFetch.mockRejectedValue(networkError);

    const abortController = new AbortController();

    await expect(
      apiClient('https://api.example.com/data', abortController.signal, [], 'test data'),
    ).rejects.toThrow('Network error');
  });
});
