
import { GoogleGenAI, Type } from "@google/genai";
import { LoadDataPoint, GeneratorUnit, ForecastResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const performAIForecast = async (
  historicalData: LoadDataPoint[],
  horizon: number,
  lookBack: number,
  units: GeneratorUnit[]
): Promise<ForecastResult> => {
  // Take last lookBack data points
  const recentData = historicalData.slice(-lookBack);
  const dataSummary = recentData.map(d => `[${d.timestamp}, ${d.load}]`).join(", ");
  const unitsSummary = units.map(u => `${u.name}: ${u.capacity}MW`).join(", ");

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `
      You are an expert Power Systems Load Forecaster. 
      Historical Load Data (Last ${lookBack} hours): ${dataSummary}
      Generator Units: ${unitsSummary}
      Forecast Horizon: Next ${horizon} hours.

      Task:
      1. Predict the electrical load for the next ${horizon} hours based on the trend in historical data.
      2. IMPORTANT: To allow for accuracy verification, also include predictions for the PREVIOUS 6 HOURS of the historical data provided. This creates an "overlapping" period for comparison.
      3. Calculate the total generation requirement (peak load + 10% reserve margin).
      4. Recommend which generator units should be 'ON' and which 'OFF' (Unit Commitment) using a greedy approach.
      5. Identify the best 4-hour window for maintenance where the load is lowest.

      Return the result strictly as a JSON object matching the following structure:
      {
        "predictions": [{"timestamp": "YYYY-MM-DD HH:mm", "predicted": number}],
        "generationRequirement": number,
        "recommendedUnits": ["Unit ID/Name"],
        "maintenanceWindows": [{"start": "YYYY-MM-DD HH:mm", "end": "YYYY-MM-DD HH:mm", "avgLoad": number}],
        "explanation": "Brief reasoning for decisions"
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
          explanation: { type: Type.STRING }
        },
        required: ["predictions", "generationRequirement", "recommendedUnits", "maintenanceWindows", "explanation"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text);
    return result as ForecastResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("AI failed to generate a valid forecast.");
  }
};
