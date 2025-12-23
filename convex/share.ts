import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const FOOD_WORDS = [
  "TACO", "CAKE", "TOFU", "PEAR", "BEAN", "RICE", "MEAT", "FISH", "SOUP", "KALE",
  "CORN", "OKRA", "MINT", "LIME", "SALT", "DILL", "SAGE", "BEER", "WINE", "MILK",
  "EGGS", "PORK", "BEEF", "LAMB", "VEAL", "DUCK", "GOAT", "CRAB", "CLAM", "TUNA",
  "SOLE", "BASS", "KIWI", "PLUM", "DATE", "GOJI", "CHIA", "HEMP", "FLAX", "OATS",
  "BRAN", "SODA", "TEAS", "PEAS", "LEEK", "BEET", "PATE", "BAKE", "STEW", "BOIL"
];

/**
 * Generates or retrieves an existing share code for a receipt.
 * Codes expire after 30 minutes.
 */
export const getOrCreateShareCode = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if a valid code already exists
    const existing = await ctx.db
      .query("shareCodes")
      .withIndex("by_receiptId", (q) =>
        q.eq("receiptId", args.receiptId).gt("expiresAt", now)
      )
      .first();

    if (existing) {
      return existing.code;
    }

    // Generate a new code
    // In a production app, we'd handle collisions better, but for this scale
    // picking a random one from 50 is fine for 30 min windows.
    let code = FOOD_WORDS[Math.floor(Math.random() * FOOD_WORDS.length)];
    
    // Check if code is already in use by another receipt
    let attempts = 0;
    while (attempts < 5) {
      const inUse = await ctx.db
        .query("shareCodes")
        .withIndex("by_code", (q) => q.eq("code", code).gt("expiresAt", now))
        .first();
      
      if (!inUse) break;
      code = FOOD_WORDS[Math.floor(Math.random() * FOOD_WORDS.length)];
      attempts++;
    }

    const expiresAt = now + 30 * 60 * 1000; // 30 minutes
    const shareCodeId = await ctx.db.insert("shareCodes", {
      receiptId: args.receiptId,
      code,
      expiresAt,
    });

    // Schedule deletion
    await ctx.scheduler.runAfter(30 * 60 * 1000, internal.share.expireCode, {
      shareCodeId,
    });

    return code;
  },
});

/**
 * Internal mutation to delete an expired code.
 */
export const expireCode = internalMutation({
  args: {
    shareCodeId: v.id("shareCodes"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.shareCodeId);
    if (existing) {
      await ctx.db.delete(args.shareCodeId);
    }
  },
});

/**
 * Look up a receipt ID by its active share code.
 */
export const getReceiptByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shareCode = await ctx.db
      .query("shareCodes")
      .withIndex("by_code", (q) =>
        q.eq("code", args.code.toUpperCase()).gt("expiresAt", now)
      )
      .first();

    return shareCode?.receiptId ?? null;
  },
});
