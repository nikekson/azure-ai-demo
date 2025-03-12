import { api } from "@/lib/api";
import { fileToArrayBuffer } from "@/lib/util/array-buffer";
import { BlockBlobClient } from "@azure/storage-blob";

type ApiSasResponse = {
  url: string;
};

const STORAGE_CONTAINER_NAME = import.meta.env.VITE_STORAGE_CONTAINER_NAME;

async function getSasUrl(filename: string): Promise<string> {
  try {
    const { url } = (await api.post('/api/sas', {}, {
      params: {
        file: filename,
        permission: 'w',
        container: STORAGE_CONTAINER_NAME,
        timerangeMins: 5,
      }
    })).data as ApiSasResponse;

    return url;
  } catch (error) {
    throw error;
  }
}

export default function App() {
  const uploadFile = async (file: File) => {
    try {
      const filename = file.name;

      const sasUrl = await getSasUrl(filename);
      console.log(sasUrl);

      const arrayBuffer = await fileToArrayBuffer(file);
      const blockBlobClient = new BlockBlobClient(sasUrl);
      const result = await blockBlobClient.uploadData(arrayBuffer);

      if (result.errorCode) {
        console.error(`error code: ${result.errorCode}`);
      } else {
        console.log('success');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
    </div>
  );
}
