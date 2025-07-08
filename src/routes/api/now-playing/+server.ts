// src/routes/api/now-playing/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ICECAST_URL } from '$env/static/private';

export const GET: RequestHandler = async () => {
  try {
    const response = await fetch(`${ICECAST_URL}/status-json.xsl`);

    if (!response.ok) {
      return json(
        { error: `Icecast server error: ${response.status} ${response.statusText}` },
        { status: 502 },
      );
    }

    const data = await response.json();

    // Extract title from the nested structure
    const title = data?.icestats?.source?.title || 'Unknown Track';

    return json({ title });
  } catch (error) {
    console.error('Error fetching now playing:', error);
    return json({ error: 'Failed to connect to Icecast server' }, { status: 500 });
  }
};
