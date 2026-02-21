import axios from 'axios';

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || '';

export async function searchUnsplashImages(query: string) {
  if (!UNSPLASH_ACCESS_KEY) return [];

  try {
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: { query, per_page: 3 },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });
    return response.data.results.map((img: any) => img.urls.regular);
  } catch (error) {
    console.error("Unsplash error", error);
    return [];
  }
}
