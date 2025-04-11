import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const generateSummary = async (
  transcript: string,
  title: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-thinking-exp-01-21",
  });

  const prompt = `
    You're an expert content summarizer. Summarize the following YouTube video transcript in a clean and engaging way.
    Title: "${title}"

    Transcript:
    ${transcript}

    Summary:
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};
