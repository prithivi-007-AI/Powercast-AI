
import { GoogleGenAI, Type } from "@google/genai";
import { LoadDataPoint, GeneratorUnit, ForecastResult, HorizonUnit } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performAIForecast = async (
  historicalData: LoadDataPoint[],
  horizonValue: number,
  horizonUnit: HorizonUnit,
  lookBack: number,
  units: GeneratorUnit[]
): Promise<ForecastResult> => {
  const recentData = historicalData.slice(-lookBack);
  const dataSummary = recentData.map(d => `[${d.timestamp}, ${d.load}]`).join(", ");
  const currentTotalCapacity = units.reduce((acc, u) => acc + u.capacity, 0);
  const unitsSummary = units.map(u => `${u.name}: ${u.capacity}MW`).join(", ");

  const isLongTerm = horizonUnit === 'years' || (horizonUnit === 'days' && horizonValue > 30);

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `
      You are a Senior Power Systems Consultant.
      Historical Context: ${dataSummary}
      Current Infrastructure: ${unitsSummary} (Total Capacity: ${currentTotalCapacity}MW)
      Forecast Task: Predict next ${horizonValue} ${horizonUnit}.

      Requirements:
      1. Generate a load forecast for the specified horizon. If unit is 'years', assume a reasonable annual load growth (e.g., 2-5%) based on the provided trend.
      2. If the horizon is 'hours' or 'days', include a 6-hour overlap with the latest historical data for accuracy checking.
      3. Calculate peak demand and total generation requirement (+15% reserve margin).
      4. If peak demand exceeds ${currentTotalCapacity}MW at any point in the forecast:
         - Suggest the number of additional generator units needed.
         - Suggest the optimal capacity (MW) for these new units.
         - Provide a priority level (Low/Medium/High/Critical).
      5. Provide maintenance windows for 'hours'/'days' horizons only.

      Return strictly JSON:
      {
        "predictions": [{"timestamp": "YYYY-MM-DD HH:mm", "predicted": number}],
        "generationRequirement": number,
        "recommendedUnits": ["Unit Names"],
        "maintenanceWindows": [{"start": "string", "end": "string", "avgLoad": number}],
        "explanation": "Brief context",
        "upgradeAdvisory": {
          "additionalUnitsNeeded": number,
          "targetTotalCapacity": number,
          "reasoning": "string",
          "priority": "Low|Medium|High|Critical"
        }
      }
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                predicted: { type: Type.NUMBER }
              },
              required: ["timestamp", "predicted"]
            }
          },
          generationRequirement: { type: Type.NUMBER },
          recommendedUnits: { type: Type.ARRAY, items: { type: Type.STRING } },
          maintenanceWindows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                avgLoad: { type: Type.NUMBER }
              }
            }
          },
          explanation: { type: Type.STRING },
          upgradeAdvisory: {
            type: Type.OBJECT,
            properties: {
              additionalUnitsNeeded: { type: Type.NUMBER },
              targetTotalCapacity: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              priority: { type: Type.STRING }
            }
          }
        },
        required: ["predictions", "generationRequirement", "recommendedUnits", "explanation"]
      }
    }
  });

  try {
    return JSON.parse(response.text) as ForecastResult;
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to process power system analysis.");
  }
};
