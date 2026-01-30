import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '100mb',
        },
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { filename, content, contentType } = req.body;

        if (!filename || !content) {
            return res.status(400).json({ error: 'Missing filename or content' });
        }

        // Convert base64 content back to buffer
        const buffer = Buffer.from(content, 'base64');

        // Upload to Vercel Blob
        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: contentType || 'application/octet-stream',
            addRandomSuffix: false,
        });

        return res.status(200).json({ url: blob.url });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: 'Upload failed' });
    }
}
