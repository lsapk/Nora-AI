import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export type AIResponse = {
  explanation: string;
  newContent: string;
  suggestedImages?: string[];
};

export async function getAIResponse(noteContent: string, userMessage: string): Promise<AIResponse | null> {
  if (!genAI) {
    console.warn('Gemini API key is missing. Set EXPO_PUBLIC_GEMINI_API_KEY in .env.');
    return null;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Tu es un assistant IA spécialisé dans la prise de notes.
Contenu actuel de la note :
"""
${noteContent}
"""

Instruction de l'utilisateur : "${userMessage}"

Réponds UNIQUEMENT avec un JSON valide:
{
  "explanation": "Ce que tu as fait",
  "newContent": "Le nouveau contenu complet de la note après modification",
  "suggestedImages": ["mots clés pour images Unsplash si pertinent"]
}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed?.newContent !== 'string' || typeof parsed?.explanation !== 'string') {
      return null;
    }

    return {
      explanation: parsed.explanation,
      newContent: parsed.newContent,
      suggestedImages: Array.isArray(parsed.suggestedImages) ? parsed.suggestedImages : [],
    };
  } catch (e) {
    console.error('Failed to parse AI response', e);
    return null;
  }
}
