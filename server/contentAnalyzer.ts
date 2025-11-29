import { invokeLLM } from "./_core/llm";

export interface ContentAnalysisResult {
  isExplicit: boolean;
  explicitLevel: number; // 0-100
  categories: string[];
  tags: string[];
  description: string;
  suggestedTitle?: string;
}

/**
 * Analyzes adult content using AI to automatically categorize and tag
 * @param imageUrl Public URL to the image
 * @returns Comprehensive analysis including categories, tags, and metadata
 */
export async function analyzeAdultContent(imageUrl: string): Promise<ContentAnalysisResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert adult content analyzer. Analyze images and provide detailed categorization for content management and monetization purposes.

Your task is to:
1. Determine if content is explicit (NSFW) and rate explicitness (0-100)
2. Assign relevant categories (e.g., "Solo", "Couples", "Lingerie", "Artistic Nude", "Fetish", "Cosplay", etc.)
3. Generate descriptive tags (e.g., "blonde", "outdoor", "studio", "natural lighting", "tattoos", etc.)
4. Write a brief description
5. Suggest a title

Be professional, accurate, and detailed. Focus on visual elements, setting, style, and content type.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and provide categorization for adult content management.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isExplicit: {
                type: "boolean",
                description: "Whether the content contains explicit/NSFW material",
              },
              explicitLevel: {
                type: "number",
                description: "Explicitness rating from 0 (not explicit) to 100 (extremely explicit)",
              },
              categories: {
                type: "array",
                description: "Main content categories (e.g., Solo, Couples, Lingerie, Artistic)",
                items: {
                  type: "string",
                },
              },
              tags: {
                type: "array",
                description: "Descriptive tags for searchability (e.g., blonde, outdoor, tattoos)",
                items: {
                  type: "string",
                },
              },
              description: {
                type: "string",
                description: "Brief description of the content",
              },
              suggestedTitle: {
                type: "string",
                description: "Suggested title for the content",
              },
            },
            required: ["isExplicit", "explicitLevel", "categories", "tags", "description"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as ContentAnalysisResult;
    
    // Validate and sanitize
    result.explicitLevel = Math.max(0, Math.min(100, result.explicitLevel));
    result.categories = result.categories.slice(0, 5); // Limit to 5 categories
    result.tags = result.tags.slice(0, 20); // Limit to 20 tags
    
    return result;
  } catch (error) {
    console.error("Content analysis failed:", error);
    
    // Return safe defaults on error
    return {
      isExplicit: false,
      explicitLevel: 0,
      categories: ["Uncategorized"],
      tags: ["unprocessed"],
      description: "Content analysis pending",
    };
  }
}

/**
 * Batch analyze multiple images
 * @param imageUrls Array of public URLs
 * @returns Array of analysis results
 */
export async function batchAnalyzeContent(imageUrls: string[]): Promise<ContentAnalysisResult[]> {
  const results: ContentAnalysisResult[] = [];
  
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(url => analyzeAdultContent(url))
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Quick NSFW detection without full analysis
 * @param imageUrl Public URL to the image
 * @returns Boolean indicating if content is explicit
 */
export async function quickNSFWCheck(imageUrl: string): Promise<boolean> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an NSFW content detector. Determine if images contain explicit adult content. Respond with only 'true' or 'false'.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this image explicit/NSFW? Answer only 'true' or 'false'.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== 'string') return false;
    return content.toLowerCase().trim() === "true";
  } catch (error) {
    console.error("NSFW check failed:", error);
    return false;
  }
}
