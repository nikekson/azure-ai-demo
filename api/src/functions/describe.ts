import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { addDescription, DescriptionEntity, getBlobContentMD5, getBlobUrl, getDescription } from '../lib/azure-storage';
import { getImageCaption } from '../lib/azure-ai';

async function describe(
  request: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const {
      StorageAccountName,
      StorageAccountKey,
      StorageTableName,
      ComputerVisionName,
      ComputerVisionKey
    } = process.env ?? {};

    if (!StorageAccountName || !StorageAccountKey || !StorageTableName || !ComputerVisionName || !ComputerVisionKey) {
      console.error('Missing required app configuration');
      return { status: 500 };
    }

    const containerName = request.query.get('container');
    const filename = request.query.get('file');

    if (!containerName || !filename) {
      return { status: 400 };
    }

    const md5 = await getBlobContentMD5(StorageAccountName, StorageAccountKey, containerName, filename);
    const cachedDescription = await getDescription(StorageAccountName, StorageAccountKey, StorageTableName, md5);

    if (cachedDescription) {
      console.log('Cached description found');

      const { caption, confidence } = cachedDescription;

      return {
        jsonBody: { caption, confidence }
      };
    }

    const imageUrl = getBlobUrl(StorageAccountName, containerName, filename);
    const result = await getImageCaption(ComputerVisionName, ComputerVisionKey, imageUrl);

    const caption = result.captionResult.text;
    const confidence = result.captionResult.confidence;

    const description: DescriptionEntity = {
      caption,
      confidence,
    };
    await addDescription(StorageAccountName, StorageAccountKey, StorageTableName, md5, description);

    return {
      jsonBody: { caption, confidence }
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: error,
    };
  }
}

app.http('describe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: describe
});
