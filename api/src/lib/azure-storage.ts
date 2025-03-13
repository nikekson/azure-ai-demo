import { AzureNamedKeyCredential, RestError, TableClient } from '@azure/data-tables';
import {
  BlobSASPermissions,
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
  SASProtocol,
  StorageSharedKeyCredential
} from '@azure/storage-blob';

const TABLE_PARTITION_KEY = 'default';

export type DescriptionEntity = {
  caption: string;
  confidence: number;
};

function getBlobServiceClient(
  serviceName: string,
  serviceKey: string
): BlobServiceClient {
  const sharedKeyCredential = new StorageSharedKeyCredential(
    serviceName,
    serviceKey
  );

  const blobServiceClient = new BlobServiceClient(
    `https://${serviceName}.blob.core.windows.net`,
    sharedKeyCredential
  );

  return blobServiceClient;
}

function getTableServiceClient(
  serviceName: string,
  serviceKey: string,
  tableName: string
): TableClient {
  return new TableClient(
    `https://${serviceName}.table.core.windows.net`,
    tableName,
    new AzureNamedKeyCredential(serviceName, serviceKey)
  );
}

async function createContainer(
  containerName: string,
  blobServiceClient: BlobServiceClient
): Promise<ContainerClient> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  return containerClient;
}

async function getBlockBlobClient(
  serviceName: string,
  serviceKey: string,
  containerName: string,
  filename: string
): Promise<BlockBlobClient> {
  const blobServiceClient = getBlobServiceClient(serviceName, serviceKey);
  const containerClient = await createContainer(
    containerName,
    blobServiceClient
  );
  return containerClient.getBlockBlobClient(filename);
}

export async function getBlobContentMD5(
  serviceName: string,
  serviceKey: string,
  containerName: string,
  filename: string
): Promise<string | null> {
  const blockBlobClient = await getBlockBlobClient(
    serviceName,
    serviceKey,
    containerName,
    filename
  );

  const { contentMD5 } = await blockBlobClient.getProperties();

  if (contentMD5) {
    return Buffer.from(contentMD5).toString('hex');
  }

  return null;
}

export async function generateSASUrl(
  serviceName: string,
  serviceKey: string,
  containerName: string,
  filename: string,
  permissions = 'r',
  timerangeMinutes = 1
): Promise<string> {
  if (!serviceName || !serviceKey || !filename || !containerName) {
    return 'Generate SAS function missing parameters';
  }

  const blockBlobClient = await getBlockBlobClient(
    serviceName,
    serviceKey,
    containerName,
    filename
  );

  const accountSasTokenUrl = await blockBlobClient.generateSasUrl({
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + timerangeMinutes * 60 * 1000),
    permissions: BlobSASPermissions.parse(permissions),
    protocol: SASProtocol.Https,
  });

  return accountSasTokenUrl;
}

export function getBlobUrl(
  serviceName: string,
  containerName: string,
  filename: string
): string {
  return `https://${serviceName}.blob.core.windows.net/${containerName}/${filename}`;
}

export async function getDescription(
  serviceName: string,
  serviceKey: string,
  tableName: string,
  md5: string
): Promise<DescriptionEntity | null> {
  const client = getTableServiceClient(serviceName, serviceKey, tableName);

  try {
    return await client.getEntity<DescriptionEntity>(
      TABLE_PARTITION_KEY,
      md5,
    );
  } catch (error) {
    if (error instanceof RestError) {
      if (error.statusCode === 404) {
        return null;
      }
    }

    throw error;
  }
}

export async function addDescription(
  serviceName: string,
  serviceKey: string,
  tableName: string,
  md5: string,
  description: DescriptionEntity,
) {
  const client = getTableServiceClient(serviceName, serviceKey, tableName);

  try {
    await client.createEntity<DescriptionEntity>({
      partitionKey: TABLE_PARTITION_KEY,
      rowKey: md5,
      ...description,
    });
  } catch (error) {
    if (error instanceof RestError) {
      if (error.statusCode === 409) {
        // Already exists, ignore
        return;
      }
    }

    throw error;
  }
}
