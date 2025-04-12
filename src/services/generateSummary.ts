// src/services/generateSummary.ts
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Check for API key and provide helpful error message if missing
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("ERROR: Missing GEMINI_API_KEY in environment variables");
}

// Initialize the Google Generative AI client with better error handling
let genAI: GoogleGenerativeAI;
try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
} catch (error) {
  console.error("Failed to initialize Google Generative AI client:", error);
  // Create a placeholder that will throw a helpful error if used
  genAI = {
    getGenerativeModel: () => {
      throw new Error("Google AI API not properly configured");
    },
  } as unknown as GoogleGenerativeAI;
}

/**
 * Generate a summary from a video transcript
 * @param transcript The video transcript text
 * @param metadata Video metadata including title, videoId, etc.
 * @returns Object containing title, key points, and full summary
 */
export const generateSummary = async (
  transcript: string,
  metadata: any
): Promise<{
  title: string;
  keyPoints: string[];
  fullSummary: string;
}> => {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("Empty transcript provided");
  }

  // Get title from metadata or use a default
  const title = metadata?.title || "Video Summary";
  
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-thinking-exp-01-21",
    });

    // Create a well-structured prompt for better summary quality
    const prompt = `
      You're a professional content summarizer specializing in YouTube videos.
      Summarize the following transcript in a clear, concise, and engaging way.
      
      Video Title: "${title}"
      
      Transcript:
      ${transcript}
      
      Please provide:
      1. A list of 3-5 key points from the video (the most important takeaways)
      2. A concise but comprehensive summary paragraph (250-350 words) that captures the main ideas
      
      Format your response exactly as follows:
      KEY POINTS:
      - Point 1
      - Point 2
      - Point 3
      ...
      
      SUMMARY:
      Your paragraph summary here...
    `;

    // Generate content with the model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response to extract key points and summary
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
    
    // Return the structured summary data
    return {
      title,
      keyPoints: keyPoints.length > 0 ? keyPoints : ["No key points extracted"],
      fullSummary: fullSummary || "Summary generation failed. Please try again."
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    
    // Return a graceful failure with error details
    return {
      title,
      keyPoints: ["Summary generation failed"],
      fullSummary: `Sorry, we couldn't generate a summary for this video. Error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
};