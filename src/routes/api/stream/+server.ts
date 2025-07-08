// src/routes/api/stream/+server.ts
import { VITE_ICECAST_STREAM_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const response = await fetch(VITE_ICECAST_STREAM_URL);

    if (!response.ok) {
      return new Response(null, {
        status: 502,
        statusText: `Icecast stream error: ${response.status}`,
      });
    }

    // Proxy the response with proper headers
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Stream proxy error:', error);
    return new Response(null, {
      status: 500,
      statusText: 'Failed to connect to Icecast stream',
    });
  }
};
