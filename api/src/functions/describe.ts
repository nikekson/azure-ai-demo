import createClient, { ImageAnalysisResultOutput } from '@azure-rest/ai-vision-image-analysis';
import { AzureKeyCredential } from '@azure/core-auth';
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function describe(
  request: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const {
      StorageAccountName,
      ComputerVisionName,
      ComputerVisionKey
    } = process.env ?? {};

    if (!StorageAccountName || !ComputerVisionName || !ComputerVisionKey) {
      console.error('Missing required app configuration');
      return { status: 500 };
    }

    const credential = new AzureKeyCredential(ComputerVisionKey);
    const computerVisionEndpoint = `https://${ComputerVisionName}.cognitiveservices.azure.com`;
    const client = createClient(computerVisionEndpoint, credential);

    const containerName = request.query.get('container');
    const filename = request.query.get('file');

    if (!containerName || !filename) {
      return { status: 400 };
    }

    const features = [
      'Caption',
    ];

    const imageUrl = `https://${StorageAccountName}.blob.core.windows.net/${containerName}/${filename}`;

    const result = (await client.path('/imageanalysis:analyze').post({
      body: { url: imageUrl },
      queryParameters: { features },
      contentType: 'application/json',
    })).body as ImageAnalysisResultOutput;

    return {
      jsonBody: {
        caption: result.captionResult.text,
        confidence: result.captionResult.confidence,
      }
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
