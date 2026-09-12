const { getStore, connectLambda } = require('@netlify/blobs');
const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'sinendet-default-secret-change-me-2026')
    .update(payloadB64)
    .digest('hex');
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    return !(payload.exp && Date.now() > payload.exp);
  } catch {
    return false;
  }
}

function json(statusCode, obj) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const store = getStore('submissions');
  const mediaStore = getStore('media');
  const params = event.queryStringParameters || {};

  try {
    // ---- GET: list submissions for a subject ----
    if (event.httpMethod === 'GET') {
      const subject = params.subject;
      if (!subject) return json(400, { error: 'subject is required' });
      const { blobs } = await store.list({ prefix: `${subject}/` });
      const items = [];
      for (const b of blobs) {
        const data = await store.get(b.key, { type: 'json' });
        if (data) items.push(data);
      }
      items.sort((a, b) => b.createdAt - a.createdAt);
      return json(200, items);
    }

    // ---- POST: create a new submission (any user, no login needed) ----
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { subject, studentName, assessmentNo, marks, photos, video, audio } = body;
      if (!subject || !studentName || !assessmentNo) {
        return json(400, { error: 'subject, studentName and assessmentNo are required' });
      }
      const id = crypto.randomUUID();
      const photoKeys = [];

      if (Array.isArray(photos)) {
        for (const p of photos) {
          const key = `${id}/photo-${crypto.randomUUID()}`;
          await mediaStore.set(key, Buffer.from(p.data, 'base64'), { metadata: { contentType: p.type || 'image/jpeg' } });
          photoKeys.push(key);
        }
      }
      let videoKey = null;
      if (video && video.data) {
        videoKey = `${id}/video`;
        await mediaStore.set(videoKey, Buffer.from(video.data, 'base64'), { metadata: { contentType: video.type || 'video/mp4' } });
      }
      let audioKey = null;
      if (audio && audio.data) {
        audioKey = `${id}/audio`;
        await mediaStore.set(audioKey, Buffer.from(audio.data, 'base64'), { metadata: { contentType: audio.type || 'audio/mpeg' } });
      }

      const record = {
        id,
        subject,
        studentName,
        assessmentNo,
        marks: marks === '' || marks === undefined || marks === null ? null : Number(marks),
        photoKeys,
        videoKey,
        audioKey,
        createdAt: Date.now(),
      };
      await store.setJSON(`${subject}/${id}.json`, record);
      return json(200, record);
    }

    // ---- PUT: edit an existing submission (admin only) ----
    if (event.httpMethod === 'PUT') {
      if (!verifyToken(event.headers.authorization || event.headers.Authorization)) {
        return json(401, { error: 'Admin login required' });
      }
      const body = JSON.parse(event.body || '{}');
      const { id, subject, studentName, assessmentNo, marks, photos, video, audio, removePhotos, removeVideo, removeAudio } = body;
      if (!id || !subject) return json(400, { error: 'id and subject are required' });

      const key = `${subject}/${id}.json`;
      const existing = await store.get(key, { type: 'json' });
      if (!existing) return json(404, { error: 'Submission not found' });

      if (studentName) existing.studentName = studentName;
      if (assessmentNo) existing.assessmentNo = assessmentNo;
      if (marks !== undefined) existing.marks = marks === '' ? null : Number(marks);

      if (removePhotos && existing.photoKeys?.length) {
        for (const k of existing.photoKeys) await mediaStore.delete(k);
        existing.photoKeys = [];
      }
      if (Array.isArray(photos) && photos.length) {
        existing.photoKeys = existing.photoKeys || [];
        for (const p of photos) {
          const k = `${id}/photo-${crypto.randomUUID()}`;
          await mediaStore.set(k, Buffer.from(p.data, 'base64'), { metadata: { contentType: p.type || 'image/jpeg' } });
          existing.photoKeys.push(k);
        }
      }

      if (removeVideo && existing.videoKey) {
        await mediaStore.delete(existing.videoKey);
        existing.videoKey = null;
      }
      if (video && video.data) {
        const k = `${id}/video`;
        await mediaStore.set(k, Buffer.from(video.data, 'base64'), { metadata: { contentType: video.type || 'video/mp4' } });
        existing.videoKey = k;
      }

      if (removeAudio && existing.audioKey) {
        await mediaStore.delete(existing.audioKey);
        existing.audioKey = null;
      }
      if (audio && audio.data) {
        const k = `${id}/audio`;
        await mediaStore.set(k, Buffer.from(audio.data, 'base64'), { metadata: { contentType: audio.type || 'audio/mpeg' } });
        existing.audioKey = k;
      }

      await store.setJSON(key, existing);
      return json(200, existing);
    }

    // ---- DELETE: remove a submission (admin only) ----
    if (event.httpMethod === 'DELETE') {
      if (!verifyToken(event.headers.authorization || event.headers.Authorization)) {
        return json(401, { error: 'Admin login required' });
      }
      const { subject, id } = params;
      if (!subject || !id) return json(400, { error: 'subject and id are required' });
      const key = `${subject}/${id}.json`;
      const existing = await store.get(key, { type: 'json' });
      if (existing) {
        for (const k of existing.photoKeys || []) await mediaStore.delete(k);
        if (existing.videoKey) await mediaStore.delete(existing.videoKey);
        if (existing.audioKey) await mediaStore.delete(existing.audioKey);
      }
      await store.delete(key);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
