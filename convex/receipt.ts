import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create an image record and a draft receipt in one transaction.
 * Returns the receipt ID for routing.
 */
export const createImageWithDraftReceipt = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.id("receipts"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Create the image record
    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      uploadedBy: userId,
      uploadedAt: Date.now(),
    });

    // Create a draft receipt
    const receiptId = await ctx.db.insert("receipts", {
      imageID: args.storageId,
      hostUserId: userId,
      createdAt: Date.now(),
      status: "draft",
    });

    return receiptId;
  },
});

/**
 * Get the current authenticated user.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});


/**
 * Mutation to join a receipt as an authenticated participant.
 */
export const joinReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to join a split");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    const participants = receipt.authedParticipants || [];
    if (!participants.includes(userId)) {
      await ctx.db.patch(args.receiptId, {
        authedParticipants: [...participants, userId],
      });
    }
  },
});

/**
 * Mutation to claim or unclaim an item on a receipt.
 */
export const toggleClaimItem = mutation({
  args: {
    itemId: v.id("receiptItems"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to claim items");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    const claimedBy = item.claimedBy || [];
    const isAlreadyClaimed = claimedBy.includes(userId);

    let newClaimedBy: Id<"users">[];

    if (isAlreadyClaimed) {
      // Unclaim: remove the user from claimedBy
      newClaimedBy = claimedBy.filter((id) => id !== userId);
    } else {
      // Claim: add the user to claimedBy
      newClaimedBy = [...claimedBy, userId];
    }

    if (newClaimedBy.length > 0) {
      await ctx.db.patch(args.itemId, {
        claimedBy: newClaimedBy,
      });
    } else {
      await ctx.db.patch(args.itemId, {
        claimedBy: undefined,
      });
    }
  },
});

/**
 * Mutation to toggle a specific participant's claim on an item.
 * Allows one user to split an item among others.
 */
export const toggleParticipantClaim = mutation({
  args: {
    itemId: v.id("receiptItems"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("You must be logged in to split items");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    const claimedBy = item.claimedBy || [];
    const isAlreadyClaimed = claimedBy.includes(args.userId);

    let newClaimedBy: Id<"users">[];

    if (isAlreadyClaimed) {
      // Unclaim: remove the user from claimedBy
      newClaimedBy = claimedBy.filter((id) => id !== args.userId);
    } else {
      // Claim: add the user to claimedBy
      newClaimedBy = [...claimedBy, args.userId];
    }

    await ctx.db.patch(args.itemId, {
      claimedBy: newClaimedBy.length > 0 ? newClaimedBy : undefined,
    });
  },
});

/**
 * Internal query to get a receipt by ID.
 */
export const getReceiptById = internalQuery({
  args: {
    receiptId: v.id("receipts"),
  },
  returns: v.union(
    v.object({
      _id: v.id("receipts"),
      imageID: v.optional(v.id("_storage")),
      hostUserId: v.id("users"),
      status: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;
    return {
      _id: receipt._id,
      imageID: receipt.imageID,
      hostUserId: receipt.hostUserId,
      status: receipt.status,
    };
  },
});

/**
 * Internal query to get an image by storage ID.
 */
export const getImageByStorageId = internalQuery({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(
    v.object({
      _id: v.id("images"),
      storageId: v.id("_storage"),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .filter(q => q.eq(q.field("storageId"), args.storageId))
      .first();
    if (!image) return null;
    return {
      _id: image._id,
      storageId: image.storageId,
      uploadedBy: image.uploadedBy,
      uploadedAt: image.uploadedAt,
    };
  },
});

/**
 * Internal query to get an image by ID.
 */
export const getImageById = internalQuery({
  args: {
    imageId: v.id("images"),
  },
  returns: v.union(
    v.object({
      _id: v.id("images"),
      storageId: v.id("_storage"),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;
    return {
      _id: image._id,
      storageId: image.storageId,
      uploadedBy: image.uploadedBy,
      uploadedAt: image.uploadedAt,
    };
  },
});

/**
 * Internal query to get an image URL from storage.
 */
export const getImageUrl = internalQuery({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Internal mutation to create a receipt and its items.
 * If a receipt already exists for this storageId, it will be replaced.
 */
export const createReceiptWithItems = internalMutation({
  args: {
    storageId: v.id("_storage"),
    hostUserId: v.id("users"), // New field
    merchantName: v.optional(v.string()),
    date: v.optional(v.string()),
    totalCents: v.optional(v.number()),
    taxCents: v.optional(v.number()),
    tipCents: v.optional(v.number()),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        priceCents: v.optional(v.number()),
        modifiers: v.optional(
          v.array(
            v.object({
              name: v.string(),
              priceCents: v.optional(v.number()),
            })
          )
        ),
      })
    ),
  },
  returns: v.id("receipts"),
  handler: async (ctx, args) => {
    // 1. Check for existing receipt and delete its items
    const existingReceipt = await ctx.db
      .query("receipts")
      .withIndex("by_imageID", (q) => q.eq("imageID", args.storageId))
      .unique();

    if (existingReceipt) {
      const existingItems = await ctx.db
        .query("receiptItems")
        .withIndex("by_receipt", (q) => q.eq("receiptId", existingReceipt._id))
        .collect();

      for (const item of existingItems) {
        await ctx.db.delete(item._id);
      }

      // Update the existing receipt instead of deleting it to preserve links
      await ctx.db.patch(existingReceipt._id, {
        merchantName: args.merchantName,
        date: args.date,
        totalCents: args.totalCents,
        taxCents: args.taxCents,
        tipCents: args.tipCents,
        hostUserId: args.hostUserId,
        status: "parsed",
        createdAt: Date.now(),
      });

      const receiptId = existingReceipt._id;

      // Create new line items
      for (const item of args.items) {
        await ctx.db.insert("receiptItems", {
          receiptId,
          name: item.name,
          quantity: item.quantity,
          priceCents: item.priceCents,
          modifiers: item.modifiers,
        });
      }

      return receiptId;
    }

    // 2. Create a new receipt if none existed
    const receiptId = await ctx.db.insert("receipts", {
      imageID: args.storageId,
      hostUserId: args.hostUserId,
      createdAt: Date.now(),
      merchantName: args.merchantName,
      date: args.date,
      totalCents: args.totalCents,
      taxCents: args.taxCents,
      tipCents: args.tipCents,
      status: "parsed",
    });

    // Create all line items
    for (const item of args.items) {
      await ctx.db.insert("receiptItems", {
        receiptId,
        name: item.name,
        quantity: item.quantity,
        priceCents: item.priceCents,
        modifiers: item.modifiers,
      });
    }

    return receiptId;
  },
});

/**
 * Get all receipts related to the current user (either uploaded or claimed).
 */
export const listUserReceipts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // 1. Get receipts hosted by the user (now indexed directly!)
    const hostedReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_host", (q) => q.eq("hostUserId", userId))
      .collect();

    const hostedReceiptIds = new Set(hostedReceipts.map((r) => r._id));
    
    // 2. Get receipts where the user has claimed at least one item
    // We still scan items here, but only once.
    const allItems = await ctx.db.query("receiptItems").collect();
    const claimedReceiptIds = new Set<Id<"receipts">>();
    for (const item of allItems) {
      if (item.claimedBy?.includes(userId)) {
        claimedReceiptIds.add(item.receiptId);
      }
    }

    // 3. Combine hosted, claimed, and participant receipts
    const allReceipts = await ctx.db.query("receipts").collect();
    const relevantReceipts = [];

    for (const receipt of allReceipts) {
      const isHost = receipt.hostUserId === userId;
      const isClaimant = claimedReceiptIds.has(receipt._id);
      const isParticipant = receipt.authedParticipants?.includes(userId);

      if (isHost || isClaimant || isParticipant) {
        // Find the image ID for the URL link
        let imageId;
        if (receipt.imageID) {
          const image = await ctx.db
            .query("images")
            .filter(q => q.eq(q.field("storageId"), receipt.imageID))
            .first();
          if (image) imageId = image._id;
        }

        relevantReceipts.push({
          _id: receipt._id,
          imageId,
          merchantName: receipt.merchantName || "Unknown Merchant",
          date: receipt.date,
          totalCents: receipt.totalCents,
          status: receipt.status,
          isUploadedByMe: isHost,
          isClaimedByMe: isClaimant,
          isParticipantByMe: isParticipant, // Extra flag just in case
          createdAt: receipt.createdAt,
        });
      }
    }

    return relevantReceipts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a receipt by storage ID to check if an image has been parsed.
 */
export const getReceiptByStorageId = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(
    v.object({
      _id: v.id("receipts"),
      imageID: v.optional(v.id("_storage")),
      createdAt: v.number(),
      merchantName: v.optional(v.string()),
      date: v.optional(v.string()),
      totalCents: v.optional(v.number()),
      taxCents: v.optional(v.number()),
      tipCents: v.optional(v.number()),
      hostUserId: v.id("users"),
      status: v.string(),
      title: v.optional(v.string()),
      joinCode: v.optional(v.string()),
      currency: v.optional(v.string()),
      authedParticipants: v.optional(v.array(v.id("users"))),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("receipts")
      .withIndex("by_imageID", (q) => q.eq("imageID", args.storageId))
      .unique();

    if (!receipt) return null;

    return {
      _id: receipt._id,
      imageID: receipt.imageID,
      createdAt: receipt.createdAt,
      merchantName: receipt.merchantName,
      date: receipt.date,
      totalCents: receipt.totalCents,
      taxCents: receipt.taxCents,
      tipCents: receipt.tipCents,
      hostUserId: receipt.hostUserId,
      status: receipt.status,
      title: receipt.title,
      joinCode: receipt.joinCode,
      currency: receipt.currency,
      authedParticipants: receipt.authedParticipants,
    };
  },
});

/**
 * Get a receipt with all its items for the detail page.
 */
export const getReceiptWithItems = query({
  args: {
    receiptId: v.id("receipts"),
  },
  returns: v.union(
    v.object({
      receipt: v.object({
        _id: v.id("receipts"),
        imageID: v.optional(v.id("_storage")),
        createdAt: v.number(),
        merchantName: v.optional(v.string()),
        date: v.optional(v.string()),
        totalCents: v.optional(v.number()),
        taxCents: v.optional(v.number()),
        tipCents: v.optional(v.number()),
        hostUserId: v.id("users"),
        status: v.string(),
        title: v.optional(v.string()),
        joinCode: v.optional(v.string()),
        currency: v.optional(v.string()),
        authedParticipants: v.optional(v.array(v.id("users"))),
        participants: v.optional(
          v.array(
            v.object({
              userId: v.id("users"),
              userName: v.string(),
            })
          )
        ),
      }),
      items: v.array(
        v.object({
          _id: v.id("receiptItems"),
          name: v.string(),
          quantity: v.number(),
          priceCents: v.optional(v.number()),
          claimedBy: v.optional(
            v.array(
              v.object({
                userId: v.id("users"),
                userName: v.optional(v.string()),
              })
            )
          ),
          modifiers: v.optional(
            v.array(
              v.object({
                name: v.string(),
                priceCents: v.optional(v.number()),
              })
            )
          ),
        })
      ),
      imageUrl: v.union(v.string(), v.null()),
      imageTableId: v.union(v.id("images"), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;

    const items = await ctx.db
      .query("receiptItems")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .collect();

    const itemsWithUserNames = await Promise.all(
      items.map(async (item) => {
        const claimedByWithNames = item.claimedBy
          ? await Promise.all(
              item.claimedBy.map(async (userId) => {
                const user = await ctx.db.get(userId);
                return {
                  userId,
                  userName: user?.name || user?.email || "Unknown User",
                };
              })
            )
          : undefined;
        return {
          _id: item._id,
          name: item.name,
          quantity: item.quantity,
          priceCents: item.priceCents,
          claimedBy: claimedByWithNames,
          modifiers: item.modifiers,
        };
      })
    );

    // Resolve participants
    const participantIds = new Set<Id<"users">>();
    participantIds.add(receipt.hostUserId);
    receipt.authedParticipants?.forEach(id => participantIds.add(id));
    
    const resolvedParticipants = await Promise.all(
      Array.from(participantIds).map(async (userId) => {
        const user = await ctx.db.get(userId);
        return {
          userId,
          userName: user?.name || user?.email || "Unknown User",
        };
      })
    );

    let imageUrl: string | null = null;
    let imageTableId: Id<"images"> | null = null;
    if (receipt.imageID) {
      imageUrl = await ctx.storage.getUrl(receipt.imageID);
      // Find the images table record for this storageId
      const imageRecord = await ctx.db
        .query("images")
        .filter(q => q.eq(q.field("storageId"), receipt.imageID))
        .first();
      if (imageRecord) {
        imageTableId = imageRecord._id;
      }
    }

    return {
      receipt: {
        _id: receipt._id,
        imageID: receipt.imageID,
        createdAt: receipt.createdAt,
        merchantName: receipt.merchantName,
        date: receipt.date,
        totalCents: receipt.totalCents,
        taxCents: receipt.taxCents,
        tipCents: receipt.tipCents,
        hostUserId: receipt.hostUserId,
        status: receipt.status,
        title: receipt.title,
        joinCode: receipt.joinCode,
        currency: receipt.currency,
        authedParticipants: receipt.authedParticipants,
        participants: resolvedParticipants,
      },
      items: itemsWithUserNames,
      imageUrl,
      imageTableId,
    };
  },
});

/**
 * Get image data with receipt info (if parsed) for the detail page.
 */
export const getImageWithReceipt = query({
  args: {
    imageId: v.id("images"),
  },
  returns: v.union(
    v.object({
      image: v.object({
        _id: v.id("images"),
        storageId: v.id("_storage"),
        uploadedAt: v.number(),
      }),
      imageUrl: v.union(v.string(), v.null()),
      receipt: v.union(
        v.object({
          _id: v.id("receipts"),
          createdAt: v.number(),
          merchantName: v.optional(v.string()),
          date: v.optional(v.string()),
          totalCents: v.optional(v.number()),
          taxCents: v.optional(v.number()),
          tipCents: v.optional(v.number()),
          hostUserId: v.id("users"),
          status: v.string(),
          title: v.optional(v.string()),
          joinCode: v.optional(v.string()),
          currency: v.optional(v.string()),
          authedParticipants: v.optional(v.array(v.id("users"))),
          participants: v.optional(
            v.array(
              v.object({
                userId: v.id("users"),
                userName: v.string(),
              })
            )
          ),
        }),
        v.null()
      ),
      items: v.array(
        v.object({
          _id: v.id("receiptItems"),
          name: v.string(),
          quantity: v.number(),
          priceCents: v.optional(v.number()),
          claimedBy: v.optional(
            v.array(
              v.object({
                userId: v.id("users"),
                userName: v.optional(v.string()),
              })
            )
          ),
          modifiers: v.optional(
            v.array(
              v.object({
                name: v.string(),
                priceCents: v.optional(v.number()),
              })
            )
          ),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;

    const imageUrl = await ctx.storage.getUrl(image.storageId);

    // Check if this image has been parsed
    const receipt = await ctx.db
      .query("receipts")
      .withIndex("by_imageID", (q) => q.eq("imageID", image.storageId))
      .unique();

    let items: Array<{
      _id: Id<"receiptItems">;
      name: string;
      quantity: number;
      priceCents?: number;
      claimedBy?: Array<{
        userId: Id<"users">;
        userName?: string;
      }>;
      modifiers?: Array<{ name: string; priceCents?: number }>;
    }> = [];

    let resolvedParticipants: Array<{ userId: Id<"users">; userName: string }> | undefined = undefined;

    if (receipt) {
      const receiptItems = await ctx.db
        .query("receiptItems")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .collect();

      items = await Promise.all(
        receiptItems.map(async (item) => {
          const claimedByWithNames = item.claimedBy
            ? await Promise.all(
                item.claimedBy.map(async (userId) => {
                  const user = await ctx.db.get(userId);
                  return {
                    userId,
                    userName: user?.name || user?.email || "Unknown User",
                  };
                })
              )
            : undefined;
          return {
            _id: item._id,
            name: item.name,
            quantity: item.quantity,
            priceCents: item.priceCents,
            claimedBy: claimedByWithNames,
            modifiers: item.modifiers,
          };
        })
      );

      // Resolve participants
      const participantIds = new Set<Id<"users">>();
      participantIds.add(receipt.hostUserId);
      receipt.authedParticipants?.forEach(id => participantIds.add(id));
      
      resolvedParticipants = await Promise.all(
        Array.from(participantIds).map(async (userId) => {
          const user = await ctx.db.get(userId);
          return {
            userId,
            userName: user?.name || user?.email || "Unknown User",
          };
        })
      );
    }

    return {
      image: {
        _id: image._id,
        storageId: image.storageId,
        uploadedAt: image.uploadedAt,
      },
      imageUrl,
      receipt: receipt
        ? {
            _id: receipt._id,
            createdAt: receipt.createdAt,
            merchantName: receipt.merchantName,
            date: receipt.date,
            totalCents: receipt.totalCents,
            taxCents: receipt.taxCents,
            tipCents: receipt.tipCents,
            hostUserId: receipt.hostUserId,
            status: receipt.status,
            title: receipt.title,
            joinCode: receipt.joinCode,
            currency: receipt.currency,
            authedParticipants: receipt.authedParticipants,
            participants: resolvedParticipants,
          }
        : null,
      items,
    };
  },
});

