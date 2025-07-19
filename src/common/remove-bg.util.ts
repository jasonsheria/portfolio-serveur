import axios from 'axios';
import * as FormData from 'form-data';

/**
 * Supprime le fond d'une image en utilisant l'API remove.bg
 * @param inputBuffer Buffer de l'image d'entrée
 * @param apiKey Votre clé API remove.bg
 * @returns Buffer de l'image sans fond (PNG)
 */
export async function removeBackground(inputBuffer: Buffer, apiKey: string): Promise<Buffer> {
  const formData = new FormData();
  formData.append('image_file', inputBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  });
  formData.append('size', 'auto');

  const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
    responseType: 'arraybuffer',
    headers: {
      ...formData.getHeaders(),
      'X-Api-Key': apiKey,
    },
    maxContentLength: 10 * 1024 * 1024, // 10MB
  });

  if (response.status !== 200) {
    throw new Error(`remove.bg API error: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(response.data);
}
