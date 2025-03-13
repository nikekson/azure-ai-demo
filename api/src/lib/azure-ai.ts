import createClient, { ImageAnalysisClient, ImageAnalysisResultOutput } from "@azure-rest/ai-vision-image-analysis";
import { AzureKeyCredential } from "@azure/core-auth";

function getImageAnalysisClient(
  serviceName: string,
  serviceKey: string
): ImageAnalysisClient {
  const credential = new AzureKeyCredential(serviceKey);
  const computerVisionEndpoint = `https://${serviceName}.cognitiveservices.azure.com`;
  return createClient(computerVisionEndpoint, credential);
}

export async function getImageCaption(
  serviceName: string,
  serviceKey: string,
  imageUrl: string,
): Promise<ImageAnalysisResultOutput> {
  const client = getImageAnalysisClient(serviceName, serviceKey);

  const features = [
    'Caption',
  ];

  try {
    const response = await client.path('/imageanalysis:analyze').post({
      body: { url: imageUrl },
      queryParameters: { features },
      contentType: 'application/json',
    });

    return response.body as ImageAnalysisResultOutput;
  } catch (error) {
    throw error;
  }
}
