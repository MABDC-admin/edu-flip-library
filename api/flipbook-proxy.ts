import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const storageUrl = `${supabaseUrl}/storage/v1/object/public/html5-uploads/${path}`;

    try {
        const response = await fetch(storageUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'File not found' });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();

        // Set correct headers to serve inline
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        return res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: 'Failed to fetch file' });
    }
}
