export function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result;

      if (!arrayBuffer) {
        reject(new Error('Failed to read file into ArrayBuffer'));
        return;
      }

      if (typeof arrayBuffer === 'string') {
        resolve(stringToArrayBuffer(arrayBuffer));
        return;
      }

      resolve(arrayBuffer);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
