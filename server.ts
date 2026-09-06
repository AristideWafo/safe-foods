import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini client using environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for large payload (images)
  app.use(express.json({ limit: '10mb' }));

  // AI Analysis Endpoint
  app.post('/api/analyze-image', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Extract raw base64 and mimeType
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

      const prompt = `Tu es un expert en analyse d'étiquettes alimentaires. 
      Extrais les informations de cette étiquette. 
      Identifie la liste complète des ingrédients et les allergènes majeurs (Lait, Œufs, Arachides, Fruits à coque, Soja, Blé/Gluten, Poisson, Crustacés, etc.).
      
      Retourne un objet JSON strict :
      - ingredientsText: Le texte complet et exact des ingrédients tel qu'écrit sur la boîte.
      - allergensHierarchy: Un tableau de strings contenant les allergènes PRÉSENTS dans la liste des ingrédients, formatés comme des tags standards anglais OpenFoodFacts (ex: "en:milk", "en:peanuts", "en:gluten", "en:soybeans", "en:eggs", "en:fish", "en:crustaceans", "en:nuts"). 
      - tracesTags: Un tableau de strings contenant les allergènes mentionnés sous forme de TRACES ("peut contenir des traces de...", "fabriqué dans un atelier utilisant..."), au format tag anglais OpenFoodFacts (ex: "en:milk").`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredientsText: { type: Type.STRING },
              allergensHierarchy: { type: Type.ARRAY, items: { type: Type.STRING } },
              tracesTags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["ingredientsText", "allergensHierarchy", "tracesTags"]
          }
        }
      });

      const text = response.text;
      let result = {};
      try {
        result = JSON.parse(text || '{}');
      } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        return res.status(422).json({ 
          error: {
            code: "IMAGE_UNREADABLE",
            message: "La liste des ingrédients n’est pas suffisamment lisible.",
            retryable: true
          }
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
      res.status(503).json({ 
        error: {
          code: "AI_SERVICE_UNAVAILABLE",
          message: "Service d'analyse indisponible pour le moment.",
          retryable: true
        }
      });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
