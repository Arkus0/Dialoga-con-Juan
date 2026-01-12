import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ConceptNode, ConceptLink, TrainingDrill, TrainingStep } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- MAPPING SERVICE ---

export const expandConcept = async (concept: string, currentNodes: string[]): Promise<{ nodes: ConceptNode[], links: ConceptLink[] }> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert sociologist and graph theory architect. 
    The user is exploring the concept: "${concept}".
    Current existing nodes in the graph are: ${currentNodes.join(", ")}.
    
    Generate 3 to 5 NEW, distinct sub-concepts, theories, or related sociologists specifically connected to "${concept}".
    Do not repeat existing nodes.
    
    Return a JSON object with 'nodes' and 'links'.
    For each node, assign a 'type' (theory, person, concept) and a likely 'associatedTheorist' (e.g., Marx for Capitalism, Weber for Bureaucracy).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["theory", "person", "concept"] },
                  description: { type: Type.STRING },
                  associatedTheorist: { type: Type.STRING }
                },
                required: ["id", "label", "type", "description", "associatedTheorist"]
              }
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  relation: { type: Type.STRING }
                },
                required: ["source", "target", "relation"]
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Transform to internal types if needed, adding default visual props
    const newNodes = (data.nodes || []).map((n: any) => ({
      ...n,
      mastery: 0,
      unlocked: true,
    }));
    
    return { nodes: newNodes, links: data.links || [] };
  } catch (error) {
    console.error("Error expanding concept:", error);
    return { nodes: [], links: [] };
  }
};

// --- DEBATE & CRITIQUE SERVICE ---

export const analyzeDebateTurn = async (
  history: {role: string, content: string}[], 
  lastUserMessage: string,
  theorist: string,
  topic: string
): Promise<{ reply: string, score: number, critique: string }> => {
  
  const model = "gemini-3-pro-preview"; // Use Pro for better reasoning
  
  // Construct a chat history context
  const context = `
    You are roleplaying as ${theorist}. The topic is ${topic}.
    You are debating the user. Your goal is to be intellectually rigorous, citing your own theories and historical context.
    
    Analyze the user's latest argument: "${lastUserMessage}".
    
    1. Respond directly to the user in character (first person). Be provocative but educational.
    2. Provide a 'score' (1-10) on the strength/logic of their argument.
    3. Provide a 'critique' (1 sentence) on what they missed or got right.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: context, // Simplified for this demo, ideally we pass full history
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            score: { type: Type.INTEGER },
            critique: { type: Type.STRING }
          },
          required: ["reply", "score", "critique"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data;

  } catch (error) {
    console.error("Debate analysis failed", error);
    return { 
      reply: "I must pause to gather my thoughts... (API Error)", 
      score: 5, 
      critique: "System interference detected." 
    };
  }
};

// --- TRAINING MODE SERVICE ---

export const createTrainingDrill = async (topic: string): Promise<TrainingDrill | null> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Create a structured 3-step debate training drill for the sociology topic: "${topic}".
    The drill should guide the user to improve their argumentation skills step-by-step.
    
    Step 1: Analysis. Provide a short statement with a logical fallacy or weak premise related to ${topic}. Ask the user to identify it.
    Step 2: Construction. Ask the user to build a concise argument supporting a specific aspect of ${topic}.
    Step 3: Refutation. Provide a strong counter-argument to ${topic}. Ask the user to refute it using evidence or logic.
    
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["analysis", "construction", "refutation"] },
                  scenarioText: { type: Type.STRING, description: "The statement or context the user must respond to." },
                  instruction: { type: Type.STRING, description: "What the user needs to do (e.g., 'Identify the fallacy')." }
                },
                required: ["type", "scenarioText", "instruction"]
              }
            }
          },
          required: ["topic", "steps"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    return {
      id: Date.now().toString(),
      topic: data.topic,
      steps: data.steps.map((s: any, i: number) => ({
        ...s,
        id: `step-${i}`,
        completed: false
      }))
    };
  } catch (error) {
    console.error("Error creating drill:", error);
    return null;
  }
};

export const evaluateDrillResponse = async (step: TrainingStep, userResponse: string, topic: string): Promise<{ passed: boolean, feedback: string, score: number }> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a debate coach. The topic is "${topic}".
    
    Context/Scenario: "${step.scenarioText}"
    Task Instruction: "${step.instruction}"
    User Answer: "${userResponse}"
    
    Evaluate the user's answer. 
    Did they correctly follow the instruction and provide a logical response?
    Provide constructive feedback (max 2 sentences).
    Give a score (1-10). If score >= 6, they pass.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            score: { type: Type.INTEGER }
          },
          required: ["passed", "feedback", "score"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error evaluating drill:", error);
    return { passed: false, feedback: "Error evaluating response. Please try again.", score: 0 };
  }
};


// --- TTS SERVICE ---

export const generateTheoristVoice = async (text: string, voiceName: string = 'Fenrir'): Promise<string | null> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName } // Puck, Charon, Kore, Fenrir, Zephyr
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS generation failed", error);
    return null;
  }
};