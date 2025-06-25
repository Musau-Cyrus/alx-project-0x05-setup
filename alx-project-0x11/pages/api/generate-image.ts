import { HEIGHT, WIDTH } from "@/constants";
import { RequestProps } from "@/interfaces";
import { NextApiRequest, NextApiResponse } from "next"


const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const gptApiKey = process.env.GPT_API_KEY || process.env.NEXT_PUBLIC_GPT_API_KEY;
  const gptUrl = "https://chatgpt-42.p.rapidapi.com/texttoimage";

  console.log("API Key available:", !!gptApiKey);
  console.log("API Key length:", gptApiKey?.length);

  if (!gptApiKey || !gptUrl) {
    return response.status(500).json({ error: "API key or URL is missing in environment variables" });
  }

  try {
    const { prompt }: RequestProps = request.body;

    if (!prompt) {
      return response.status(400).json({ error: "Prompt is required" });
    }

    console.log("Making request to:", gptUrl);
    console.log("Request payload:", {
      text: prompt,
      width: WIDTH,
      height: HEIGHT
    });

    const res = await fetch(gptUrl, {
      method: "POST",
      body: JSON.stringify({
        text: prompt,
        width: WIDTH,
        height: HEIGHT
      }),
      headers: {
        'x-rapidapi-key': gptApiKey.trim(),
        'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("API Error Response:", {
        status: res.status,
        statusText: res.statusText,
        errorText
      });
      throw new Error(`Failed to fetch from DALLE: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    
    console.log("API Response:", data);

    // Check different possible response formats
    const imageUrl = data?.generated_image || 
                    data?.image_url || 
                    data?.url || 
                    data?.data?.[0]?.url ||
                    "https://via.placeholder.com/600x400?text=Generated+Image";

    return response.status(200).json({
      message: imageUrl,
    });
  } catch (error) {
    console.error("Error in API route:", error);
    
    // If it's our custom error with API details, return more specific info
    if (error instanceof Error && error.message.includes("Failed to fetch from DALLE")) {
      return response.status(500).json({ 
        error: "External API error", 
        details: error.message 
      });
    }
    
    // For other errors (network, parsing, etc.)
    return response.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export default handler
