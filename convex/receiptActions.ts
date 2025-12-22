"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { generateText } from "ai";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { z } from "zod";
import { RECEIPT_PARSING_PROMPT } from "./prompts";

// Helper to extract JSON from potential markdown backticks
function extractJSON(text: string): string {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    return match[1].trim();
  }
  return text.trim();
}

// Zod schema for structured AI output
// const receiptParsingSchema = z.object({
//   merchantName: z.string().optional().describe("Store or restaurant name"),
//   date: z.string().optional().describe("Date on the receipt (as shown)"),
//   totalCents: z.number().optional().describe("Total amount in cents (e.g., $12.50 = 1250)"),
//   taxCents: z.number().optional().describe("Tax amount in cents"),
//   tipCents: z.number().optional().describe("Tip amount in cents (if present)"),
//   items: z.array(
//     z.object({
//       name: z.string().describe("Item name"),
//       quantity: z.number().describe("Quantity purchased"),
//       priceCents: z.number().optional().describe("Item price in cents"),
//       modifiers: z
//         .array(
//           z.object({
//             name: z.string().describe("Modifier name (e.g., 'extra cheese')"),
//             priceCents: z.number().optional().describe("Modifier price in cents"),
//           })
//         )
//         .optional()
//         .describe("Item modifiers or add-ons"),
//     })
//   ).describe("List of items on the receipt"),
// });

// Hardened Zod schema for structured AI output
export const receiptParsingSchema = z.object({
  merchantName: z.string().optional().describe("Store or restaurant name"),
  date: z.string().optional().describe("Date on the receipt (as shown)"),

  totalCents: z.number().int().min(0).optional().describe("Total amount in cents (e.g., $12.50 = 1250)"),
  taxCents: z.number().int().min(0).optional().describe("Tax amount in cents"),
  tipCents: z.number().int().min(0).optional().describe("Tip amount in cents (if present)"),

  items: z
    .array(
      z.object({
        name: z.string().min(1).describe("Item name"),

        // ✅ KEY FIX: quantity must be an integer
        quantity: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(1)
          .describe("Whole number quantity purchased (default 1). Never a decimal."),

        priceCents: z.number().int().min(0).optional().describe("Item price in cents"),

        modifiers: z
          .array(
            z.object({
              name: z.string().min(1).describe("Modifier name (e.g., 'extra cheese')"),
              priceCents: z.number().int().min(0).optional().describe("Modifier price in cents"),
            }),
          )
          .optional()
          .describe("Item modifiers or add-ons"),
      }),
    )
    .min(1)
    .describe("List of line items on the receipt"),
});


/**
 * Parse a receipt image using Gemini AI.
 * This is an internal action that fetches the image, calls the AI, and stores results.
 */
export const parseReceipt = internalAction({
  args: {
    imageId: v.id("images"),
  },
  returns: v.id("receipts"),
  handler: async (ctx, args): Promise<Id<"receipts">> => {
    // 1. Get the image record
    const image = await ctx.runQuery(internal.receipt.getImageById, {
      imageId: args.imageId,
    });

    if (!image) {
      throw new Error("Image not found");
    }

    // 2. Get the image URL
    const imageUrl = await ctx.runQuery(internal.receipt.getImageUrl, {
      storageId: image.storageId,
    });

    if (!imageUrl) {
      throw new Error("Could not get image URL");
    }

    // 3. Fetch the image as a buffer
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    // 4. Call Gemini with the image
    let parsedReceipt;
    let lastError;
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await generateText({
          model: google("gemini-3-flash-preview"),
          temperature: 0, // Critical for stable JSON extraction
          maxOutputTokens: 3000,
          providerOptions: {
            google: {
              thinkingConfig: {
                includeThoughts: true,
                thinkingLevel: "low",
              }
            } satisfies GoogleGenerativeAIProviderOptions,
          },
          messages: [
            { role: "system", content: RECEIPT_PARSING_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image",
                  image: `data:${mimeType};base64,${base64Image}`,
                },
                {
                  type: "text",
                  text: "Extract all items, prices, and merchant details from this receipt image into the specified JSON format. Convert all prices to cents.",
                },
              ],
            },
          ],
        });

        const jsonString = extractJSON(result.text);
        const rawObject = JSON.parse(jsonString);
        parsedReceipt = receiptParsingSchema.parse(rawObject);

        // Log token usage and cost estimation
        const { inputTokens = 0, outputTokens = 0, reasoningTokens = 0 } = result.usage || {};
        // Rates for Gemini 2.0 Flash: $0.10/1M input, $0.40/1M output
        const cost = (inputTokens * 0.50) / 1_000_000 + ((outputTokens + reasoningTokens) * 3) / 1_000_000;
        console.log(
          `AI Parse Success (Attempt ${attempt}): ${inputTokens} input tokens, ${outputTokens} output tokens, ${reasoningTokens} reasoning tokens. ` +
          `Estimated Cost: $${cost.toFixed(6)}`
        );
        
        // If we succeeded, break out of the retry loop
        break;
      } catch (error) {
        lastError = error;
        console.error(`AI Generation Attempt ${attempt} Error:`, error);
        
        // If this was the last attempt, don't catch anymore
        if (attempt === MAX_ATTEMPTS) {
          // Set parsing status to failed in the database
          await ctx.runMutation(internal.receipt.markReceiptFailed, {
            storageId: image.storageId,
          });
          throw new Error(`Failed to parse receipt after ${MAX_ATTEMPTS} attempts with AI: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Wait a short bit before retrying (optional, but good practice)
        // For serverless functions, we might just want to retry immediately or with a very short delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!parsedReceipt) {
      throw new Error("Parsed receipt data is missing after all attempts.");
    }

    // 5. Store the parsed receipt in the database
    try {
      const receiptId = await ctx.runMutation(internal.receipt.createReceiptWithItems, {
        storageId: image.storageId,
        hostUserId: image.uploadedBy, // Added hostUserId
        merchantName: parsedReceipt.merchantName ?? undefined,
        date: parsedReceipt.date ?? undefined,
        totalCents: parsedReceipt.totalCents ?? undefined,
        taxCents: parsedReceipt.taxCents ?? undefined,
        tipCents: parsedReceipt.tipCents ?? undefined,
        items: parsedReceipt.items.map(item => ({
          ...item,
          priceCents: item.priceCents ?? undefined,
          modifiers: item.modifiers?.map(m => ({
            ...m,
            priceCents: m.priceCents ?? undefined,
          })) ?? undefined,
        })),
      });
      return receiptId;
    } catch (error) {
      console.error("Database Storage Error:", error);
      // Set parsing status to failed in the database
      await ctx.runMutation(internal.receipt.markReceiptFailed, {
        storageId: image.storageId,
      });
      throw new Error(`Failed to store parsed receipt: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Public action to trigger receipt parsing from the frontend.
 * Requires authentication.
 */
export const triggerParseReceipt = action({
  args: {
    imageId: v.id("images"),
  },
  returns: v.id("receipts"),
  handler: async (ctx, args): Promise<Id<"receipts">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Verify the user owns this image
    const image = await ctx.runQuery(internal.receipt.getImageById, {
      imageId: args.imageId,
    });

    if (!image || image.uploadedBy !== userId) {
      throw new Error("Unauthorized: You don't own this image");
    }

    return await ctx.runAction(internal.receiptActions.parseReceipt, {
      imageId: args.imageId,
    });
  },
});

/**
 * Public action to trigger receipt parsing by receipt ID.
 * Looks up the image from the receipt and triggers parsing.
 * Used for re-parsing an existing receipt.
 */
export const triggerParseReceiptByReceiptId = action({
  args: {
    receiptId: v.id("receipts"),
  },
  returns: v.id("receipts"),
  handler: async (ctx, args): Promise<Id<"receipts">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get the receipt to find its imageID (storageId)
    const receiptData = await ctx.runQuery(internal.receipt.getReceiptById, {
      receiptId: args.receiptId,
    });

    if (!receiptData) {
      throw new Error("Receipt not found");
    }

    // Verify the user is the host
    if (receiptData.hostUserId !== userId) {
      throw new Error("Unauthorized: You don't own this receipt");
    }

    if (!receiptData.imageID) {
      throw new Error("Receipt has no associated image");
    }

    // Mark as parsing before starting
    await ctx.runMutation(internal.receipt.markReceiptParsing, {
      receiptId: args.receiptId,
    });

    // Find the image record by storageId
    const image = await ctx.runQuery(internal.receipt.getImageByStorageId, {
      storageId: receiptData.imageID,
    });

    if (!image) {
      throw new Error("Image record not found");
    }

    return await ctx.runAction(internal.receiptActions.parseReceipt, {
      imageId: image._id,
    });
  },
});

/**
 * Internal action to parse a receipt by storage ID.
 * Called automatically after image upload.
 */
export const parseReceiptByStorageId = internalAction({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.id("receipts"),
  handler: async (ctx, args): Promise<Id<"receipts">> => {
    // Find the image record by storageId
    const image = await ctx.runQuery(internal.receipt.getImageByStorageId, {
      storageId: args.storageId,
    });

    if (!image) {
      throw new Error("Image record not found");
    }

    return await ctx.runAction(internal.receiptActions.parseReceipt, {
      imageId: image._id,
    });
  },
});

