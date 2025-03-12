import { api } from "@/lib/api";
import { useEffect } from "react";

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
  useEffect(() => {
    getSasUrl('testfile')
      .then(url => console.log(url))
      .catch(console.error);
  }, []);

  return (<></>);
}
