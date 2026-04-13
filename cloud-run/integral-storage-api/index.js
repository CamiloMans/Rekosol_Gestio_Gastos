import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 8080);
const bucketName = process.env.GCS_BUCKET_NAME;
const uploadSecret = process.env.UPLOAD_API_SECRET;
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 25);

if (!bucketName) {
  throw new Error('Missing required env var GCS_BUCKET_NAME');
}

if (!uploadSecret) {
  throw new Error('Missing required env var UPLOAD_API_SECRET');
}

const app = express();
const storage = new Storage();
const bucket = storage.bucket(bucketName);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, maxUploadSizeMb) * 1024 * 1024,
  },
});

app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin }));
app.use(express.json({ limit: '1mb' }));

function toSafeSegment(value, fallback = 'misc') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

function sanitizeFileName(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex + 1) : '';

  const safeName = toSafeSegment(name, 'archivo');
  const safeExtension = extension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return safeExtension ? `${safeName}.${safeExtension}` : safeName;
}

function buildObjectPath({ folder, projectId, recordId, fileName }) {
  const segments = [
    toSafeSegment(folder, 'control-pagos'),
    projectId ? toSafeSegment(projectId, 'sin-proyecto') : null,
    recordId ? toSafeSegment(recordId, 'sin-registro') : null,
    `${Date.now()}-${randomUUID()}-${sanitizeFileName(fileName)}`,
  ].filter(Boolean);

  return segments.join('/');
}

function extractSecret(request) {
  const authHeader = request.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return request.get('x-upload-secret') || '';
}

function secretsMatch(receivedSecret) {
  const expected = Buffer.from(uploadSecret, 'utf8');
  const received = Buffer.from(receivedSecret, 'utf8');

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    bucket: bucketName,
    service: 'integral-storage-api',
  });
});

app.use((request, response, next) => {
  const providedSecret = extractSecret(request);

  if (!providedSecret || !secretsMatch(providedSecret)) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
});

app.post('/upload', upload.single('file'), async (request, response, next) => {
  try {
    const file = request.file;

    if (!file) {
      response.status(400).json({ error: 'Missing file field' });
      return;
    }

    const objectPath = buildObjectPath({
      folder: request.body.folder,
      projectId: request.body.projectId,
      recordId: request.body.recordId,
      fileName: file.originalname,
    });

    const targetFile = bucket.file(objectPath);

    await targetFile.save(file.buffer, {
      resumable: false,
      contentType: file.mimetype || 'application/octet-stream',
      metadata: {
        cacheControl: 'private, max-age=0, no-transform',
        metadata: {
          originalName: file.originalname,
          folder: String(request.body.folder || 'control-pagos'),
          projectId: String(request.body.projectId || ''),
          recordId: String(request.body.recordId || ''),
        },
      },
    });

    response.status(201).json({
      bucket: bucketName,
      objectPath,
      gcsUri: `gs://${bucketName}/${objectPath}`,
      originalName: file.originalname,
      contentType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/objects/content', async (request, response, next) => {
  try {
    const objectPath = String(request.query.objectPath || '').trim();

    if (!objectPath) {
      response.status(400).json({ error: 'Missing objectPath' });
      return;
    }

    const targetFile = bucket.file(objectPath);
    const [metadata] = await targetFile.getMetadata();
    const originalName = metadata.metadata?.originalName || objectPath.split('/').pop() || 'archivo';

    response.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    response.setHeader('Cache-Control', metadata.cacheControl || 'private, max-age=0, no-transform');

    if (metadata.size) {
      response.setHeader('Content-Length', metadata.size);
    }

    targetFile.createReadStream()
      .on('error', (error) => next(error))
      .pipe(response);
  } catch (error) {
    next(error);
  }
});

app.delete('/objects', async (request, response, next) => {
  try {
    const objectPath = String(request.body?.objectPath || '').trim();

    if (!objectPath) {
      response.status(400).json({ error: 'Missing objectPath' });
      return;
    }

    await bucket.file(objectPath).delete({ ignoreNotFound: true });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({ error: `File exceeds ${maxUploadSizeMb} MB limit` });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Integral Storage API listening on port ${port}`);
});
