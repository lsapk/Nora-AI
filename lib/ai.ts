import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
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

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'Tu es Nora AI, un assistant de rédaction en français. Tu produis du texte propre et stable en Markdown simple (titres #/##, gras **, italique *, checklist - [ ] et soulignement HTML <u>...</u>).',
    });
    const prompt = `
Tu es un assistant IA spécialisé dans la prise de notes.
Contenu actuel de la note :
"""
${noteContent}
"""

Instruction de l'utilisateur : "${userMessage}"\n\nContrainte: garde le ton et la langue de la note si possible.
Contrainte de mise en forme: renvoie un Markdown propre et stable, sans caractères Unicode décoratifs. Utilise uniquement #, ##, **gras**, *italique*, - [ ] pour checklist, et <u>...</u> pour souligner.\n\nRéponds UNIQUEMENT avec un JSON valide:
{
  "explanation": "Ce que tu as fait",
  "newContent": "Le nouveau contenu complet de la note après modification",
  "suggestedImages": ["mots clés pour images Unsplash si pertinent"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        explanation: text.slice(0, 200) || 'Réponse IA reçue.',
        newContent: noteContent,
        suggestedImages: [],
      };
    }

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
    console.error('AI provider error', e);
    return null;
  }
}
