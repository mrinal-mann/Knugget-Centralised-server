// src/services/generateSummary.ts
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const generateSummary = async (
  transcript: string,
  title: string
): Promise<{
  title: string;
  keyPoints: string[];
  fullSummary: string;
}> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-thinking-exp-01-21",
  });

  const prompt = `
    You're an expert content summarizer. Summarize the following YouTube video transcript in a clean and engaging way.
    Title: "${title}"

    Transcript:
    ${transcript}

    Please provide:
    1. A list of 3-5 key points from the video
    2. A concise summary paragraph that captures the main ideas

    Format your response as follows:
    KEY POINTS:
    - Point 1
    - Point 2
    - Point 3
    ...

    SUMMARY:
    Your paragraph summary here...
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response
    const keyPointsMatch = text.match(/KEY POINTS:([\s\S]*?)(?=SUMMARY:|$)/i);
    const summaryMatch = text.match(/SUMMARY:([\s\S]*?)$/i);
    
    // Extract key points as array
    const keyPointsText = keyPointsMatch ? keyPointsMatch[1].trim() : '';
    const keyPoints = keyPointsText
      .split('-')
      .map(point => point.trim())
      .filter(point => point.length > 0);
    
    // Extract full summary
    const fullSummary = summaryMatch ? summaryMatch[1].trim() : text;
    
    return {
      title: title,
      keyPoints: keyPoints,
      fullSummary: fullSummary
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary");
  }
};