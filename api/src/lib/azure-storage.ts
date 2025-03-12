import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  SASProtocol,
  StorageSharedKeyCredential
} from '@azure/storage-blob';

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

async function createContainer(
  containerName: string,
  blobServiceClient: BlobServiceClient
): Promise<ContainerClient> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  return containerClient;
}

export async function generateSASUrl(
  serviceName: string,
  serviceKey: string,
  containerName: string,
  filename: string,
  permissions = 'r',
  timerangeMinutes = 1,
): Promise<string> {
  if (!serviceName || !serviceKey || !filename || !containerName) {
    return 'Generate SAS function missing parameters';
  }

  const blobServiceClient = getBlobServiceClient(serviceName, serviceKey);
  const containerClient = await createContainer(
    containerName,
    blobServiceClient
  );
  const blockBlobClient = containerClient.getBlockBlobClient(filename);

  const accountSasTokenUrl = await blockBlobClient.generateSasUrl({
    startsOn: new Date(),
    expiresOn: new Date(new Date().valueOf() + timerangeMinutes * 60 * 1000),
    permissions: BlobSASPermissions.parse(permissions),
    protocol: SASProtocol.Https,
  });

  return accountSasTokenUrl;
}
