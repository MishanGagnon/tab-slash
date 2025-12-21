"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { RECEIPT_PARSING_PROMPT } from "./prompts";

// Zod schema for structured AI output
const receiptParsingSchema = z.object({
  merchantName: z.string().optional().describe("Name of the merchant or store"),
  date: z.string().optional().describe("Date of the receipt as a string"),
  totalCents: z.number().optional().describe("Total amount in cents"),
  taxCents: z.number().optional().describe("Tax amount in cents"),
  tipCents: z.number().optional().describe("Tip amount in cents"),
  items: z.array(
    z.object({
      name: z.string().describe("Name of the item"),
      quantity: z.number().describe("Quantity of the item"),
      priceCents: z.number().optional().describe("Price in cents"),
      modifiers: z
        .array(
          z.object({
            name: z.string().describe("Modifier name"),
            priceCents: z.number().optional().describe("Modifier price adjustment in cents"),
          })
        )
        .optional()
        .describe("Item modifiers like extras or customizations"),
    })
  ),
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
    const { object: parsedReceipt } = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: receiptParsingSchema,
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
              text: "Please parse this receipt and extract all the information.",
            },
          ],
        },
      ],
    });

    // 5. Store the parsed receipt in the database
    const receiptId = await ctx.runMutation(internal.receipt.createReceiptWithItems, {
      storageId: image.storageId,
      merchantName: parsedReceipt.merchantName,
      date: parsedReceipt.date,
      totalCents: parsedReceipt.totalCents,
      taxCents: parsedReceipt.taxCents,
      tipCents: parsedReceipt.tipCents,
      items: parsedReceipt.items,
    });

    return receiptId;
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

