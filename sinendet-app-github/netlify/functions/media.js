const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key) return { statusCode: 400, body: 'key is required' };

  const store = getStore('media');
  const entry = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!entry) return { statusCode: 404, body: 'not found' };

  const contentType = (entry.metadata && entry.metadata.contentType) || 'application/octet-stream';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
    body: Buffer.from(entry.data).toString('base64'),
    isBase64Encoded: true,
  };
};
