import createClient, { ImageAnalysisResultOutput } from '@azure-rest/ai-vision-image-analysis';
import { AzureKeyCredential } from '@azure/core-auth';
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { addDescription, DescriptionEntity, getBlobContentMD5, getDescription } from '../lib/azure-storage';

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

    const credential = new AzureKeyCredential(ComputerVisionKey);
    const computerVisionEndpoint = `https://${ComputerVisionName}.cognitiveservices.azure.com`;
    const client = createClient(computerVisionEndpoint, credential);

    const features = [
      'Caption',
    ];

    const imageUrl = `https://${StorageAccountName}.blob.core.windows.net/${containerName}/${filename}`;

    const result = (await client.path('/imageanalysis:analyze').post({
      body: { url: imageUrl },
      queryParameters: { features },
      contentType: 'application/json',
    })).body as ImageAnalysisResultOutput;

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
