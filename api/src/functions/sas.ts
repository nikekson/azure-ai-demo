import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { generateSASUrl } from '../lib/azure-storage';
import { parseIntSafe } from '../lib/util';

async function getGenerateSasToken(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const { StorageAccountName, StorageAccountKey } = process.env ?? {};
    if (!StorageAccountName || !StorageAccountKey) {
      console.error('Missing required app configuration');
      return { status: 500 };
    }

    const containerName = request.query.get('container');
    const filename = request.query.get('file');
    const permissions = request.query.get('permission');
    const defaultTimeRangeMins = '10';
    const timeRangeMins = parseIntSafe(request.query.get('timerange') ?? defaultTimeRangeMins);

    if (!containerName || !filename || !permissions || !timeRangeMins) {
      return { status: 400 };
    }

    const url = await generateSASUrl(
      StorageAccountName,
      StorageAccountKey,
      containerName,
      filename,
      permissions,
      timeRangeMins
    );

    return {
      jsonBody: {
        url
      }
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: error
    };
  }
}

app.http('sas', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: getGenerateSasToken,
});
