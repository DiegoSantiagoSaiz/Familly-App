import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API helper with lazy initialization
  let genAI: any = null;
  function getGenAI() {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY environment variable is required and must be valid");
      }
      genAI = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAI;
  }

  // API Route: Categorize Message
  app.post("/api/categorize-message", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze this family message: "${content}". Suggest a category and 3 short tags.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              tags: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["category", "tags"]
          }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty AI response");
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Categorize Message Error:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to categorize message" });
    }
  });

  // API Route: Categorize Task
  app.post("/api/categorize-task", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Categorize this family task: "${title}". Suggest a major category and a more granular sub-category (like 'Groceries' under 'Shopping', 'Repair' or 'Cleaning' under 'Home', 'Homework' under 'School', 'Taxes' under 'Finance', 'Appointment' under 'Health', etc.).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { 
                type: Type.STRING,
                enum: ["Shopping", "Home", "School", "Vacation", "Health", "Celebration", "Travel", "Other"]
              },
              subCategory: {
                type: Type.STRING,
                description: "A granular, specific sub-category for the task (like 'Groceries', 'Repair', 'Cleaning', 'Gardening', 'Exams', 'Homework', 'Bills', 'Dental', etc.)"
              },
              priority: {
                type: Type.STRING,
                enum: ["Low", "Medium", "High", "Critical"]
              },
              dueDate: { type: Type.STRING, description: "YYYY-MM-DD (optional)" }
            },
            required: ["category", "subCategory", "priority"]
          }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty AI response");
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Categorize Task Error:", error.message || error);
      res.status(500).json({ error: "Failed to categorize task" });
    }
  });

  // API Route: Prioritize Tasks
  app.post("/api/prioritize-tasks", async (req, res) => {
    try {
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "Tasks list is required" });
      }

      if (tasks.length === 0) {
        return res.json({ prioritizedTasks: [] });
      }

      const ai = getGenAI();
      const systemInstruction = `You are an expert family task coordinator and life coach.
Analyze the given list of family tasks and optimize their priority levels to Low, Medium, High, or Critical.

Rules:
1. Pay attention to the dueDate (due dates close to 2026-05-24, or overdue, must be prioritized as High or Critical).
2. Look at the title and category of each task to gauge dynamic importance or urgency (e.g. Health, School deadlines, urgent Home repairs should be prioritized higher than generic Shopping, custom celebrations, or leisure).
3. Be fair and logical so the family stays balanced and avoids burnout.
4. Output a JSON object containing an array designated "prioritizedTasks". Each element must contain:
   - "id": must match the input task id exactly.
   - "priority": updated priority string ("Low", "Medium", "High", or "Critical").
   - "reason": A brief 1-sentence friendly explanation of why this priority was assigned. If the input titles look Spanish, write the reason in Spanish; otherwise in English.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Optimice prioritizing for these active family tasks:
${JSON.stringify(tasks, null, 2)}

Current date: 2026-05-24`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prioritizedTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    priority: {
                      type: Type.STRING,
                      enum: ["Low", "Medium", "High", "Critical"]
                    },
                    reason: { type: Type.STRING }
                  },
                  required: ["id", "priority", "reason"]
                }
              }
            },
            required: ["prioritizedTasks"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty AI response");
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Prioritize Tasks Error:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to prioritize tasks with AI." });
    }
  });

  // API Route: Grocery Suggestions
  app.post("/api/grocery-suggestions", async (req, res) => {
    try {
      const { recentTasks } = req.body;
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Based on these past shopping lists: ${recentTasks.join(", ")}, suggest 5 items we might need soon.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty AI response");
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Grocery Suggestions Error:", error.message || error);
      res.status(500).json({ error: "Failed to get grocery suggestions" });
    }
  });

  // API Route: Generate AI SVG Avatar
  app.post("/api/generate-avatar", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });

      const ai = getGenAI();
      const systemInstruction = `You are an expert UI/UX and vector graphics designer who generates awesome minimal vector flat-style avatars.
Your output MUST be a valid, standalone XML SVG markup representing the requested avatar.
- MUST start with '<svg' and end with '</svg>'.
- Do NOT wrap the code in markdown code blocks like \`\`\`xml or \`\`\`svg.
- Do NOT provide any conversational introduction or conclusion text. Just return the raw code.
- Size: 256x256, use appropriate viewBox="0 0 256 256".
- Style: modern, colorful, clean curves, elegant color palette, round card avatar. Avoid complex gradients that might break. Use nested elements (<circle>, <rect>, <path>, <ellipse>) creatively to build hairstyles, glasses, clothes, face shape, smiles, eyes.
- Ensure the contrast is very high and looks beautiful.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a beautiful, modern flat vector avatar SVG of: "${prompt}". Ensure it's tailored as a personal profile badge, colorful, artistic, and friendly.`,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      
      let text = response.text;
      if (!text) throw new Error("Empty AI response");
      
      text = text.trim();
      if (text.startsWith("```xml")) {
        text = text.substring(6).trim();
      } else if (text.startsWith("```svg")) {
        text = text.substring(6).trim();
      } else if (text.startsWith("```")) {
        text = text.substring(3).trim();
      }
      if (text.endsWith("```")) {
        text = text.substring(0, text.length - 3).trim();
      }

      res.json({ svg: text });
    } catch (error: any) {
      console.error("Generate Avatar Error:", error.message || error);
      res.status(500).json({ error: "Failed to generate AI avatar" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
