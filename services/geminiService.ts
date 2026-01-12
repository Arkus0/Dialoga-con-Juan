import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ConceptNode, ConceptLink, TrainingDrill, TrainingStep, DebateTurnResult, PedagogyMode, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- MAPPING SERVICE ---

export const expandConcept = async (concept: string, currentNodes: string[]): Promise<{ nodes: ConceptNode[], links: ConceptLink[] }> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert academic sociologist and graph theory architect. 
    The user is exploring the concept: "${concept}".
    Current existing nodes in the graph are: ${currentNodes.join(", ")}.
    
    Generate 3 to 5 NEW, distinct sub-concepts, theories, or related sociologists specifically connected to "${concept}".
    Do not repeat existing nodes.

    ACADEMIC REQUIREMENTS:
    1. For each node, provide a standard academic definition.
    2. List the specific "Seminal Works" (books/papers/years) where this concept originated.
    3. Explain the "Academic Controversy" (why scholars debate this).
    4. Provide the approximate "Year" of origin or peak relevance (Integer, e.g., 1867).
    
    RELATIONSHIP TAXONOMY:
    Links MUST use one of these relations: "CRITIQUES", "EXPANDS_UPON", "INFLUENCED_BY", "OPPOSES", "RELATES_TO".
    Use "CRITIQUES" or "OPPOSES" to show theoretical conflict (e.g. Marx vs Weber).
    
    Return a JSON object with 'nodes' and 'links'.
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
                  keyDefinition: { type: Type.STRING },
                  seminalWorks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  academicControversy: { type: Type.STRING },
                  year: { type: Type.INTEGER, description: "Year of origin (e.g. 1890)" },
                  associatedTheorist: { type: Type.STRING }
                },
                required: ["id", "label", "type", "description", "keyDefinition", "seminalWorks", "academicControversy", "year", "associatedTheorist"]
              }
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  relation: { type: Type.STRING, enum: ["CRITIQUES", "EXPANDS_UPON", "INFLUENCED_BY", "OPPOSES", "RELATES_TO"] }
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
  topic: string,
  mode: PedagogyMode = 'DEBATE'
): Promise<DebateTurnResult> => {
  
  const model = "gemini-3-pro-preview"; // Use Pro for better reasoning
  
  let pedagogyInstructions = "";
  if (mode === 'SOCRATIC') {
    pedagogyInstructions = `
      MODE: SOCRATIC TUTOR (MAIEUTICS).
      CRITICAL RULE: DO NOT explain the concept directly or give the answer.
      Instead, ask a probing question that leads the user to realize the answer themselves.
      If they are wrong, ask a question that highlights their contradiction.
      Be patient but rigorous.
    `;
  } else {
    pedagogyInstructions = `
      MODE: ACADEMIC DEBATE.
      Act as a rigorous academic opponent.
      If the user makes a claim WITHOUT referring to a specific concept, historical event, or text, penalize the score slightly and ask for evidence.
      If the user uses a term incorrectly, correct them immediately and explicitly.
      Your response MUST include at least one direct citation or paraphrase from your own written works to support your argument.
    `;
  }
  
  // Construct a chat history context
  const context = `
    You are roleplaying as ${theorist}. The topic is ${topic}.
    
    ${pedagogyInstructions}
    
    Analyze the user's latest argument: "${lastUserMessage}".
    
    1. Respond directly to the user in character (first person).
    2. Provide a 'score' (1-10) based on Conceptual Accuracy, Use of Evidence, and Logic.
    3. Provide a 'critique' (1 sentence). In Socratic mode, this should be a meta-comment on their thinking process.
    
    EVOLUTION MECHANIC:
    If the user mentions a specific modern example, a related concept, or a counter-theory NOT implicitly covered by the current topic "${topic}", you must suggest a new node for the concept map.
    If no new distinct concept is brought up, 'suggestedNode' should be null.
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
            critique: { type: Type.STRING },
            suggestedNode: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["theory", "person", "concept"] },
                associatedTheorist: { type: Type.STRING },
                relation: { type: Type.STRING, enum: ["CRITIQUES", "EXPANDS_UPON", "INFLUENCED_BY", "OPPOSES", "RELATES_TO"] }
              },
              nullable: true
            }
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

export const generateSessionSummary = async (messages: Message[], topic: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const conversation = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  
  const prompt = `
    Act as a research assistant. Summarize the following debate/tutoring session on the topic "${topic}".
    
    Format output as Markdown Study Notes including:
    1. Core Concepts Discussed
    2. Key Arguments & Counter-Arguments
    3. Logical Fallacies Identified (if any)
    4. Agreed Conclusions
    
    Conversation History:
    ${conversation}
  `;

  try {
     const response = await ai.models.generateContent({
       model,
       contents: prompt
     });
     return response.text || "Could not generate summary.";
  } catch (e) {
    return "Error generating summary.";
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