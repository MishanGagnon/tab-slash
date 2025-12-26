import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";

/**
 * Create an image record and a draft receipt in one transaction.
 * Returns the receipt ID for routing.
 * Automatically schedules parsing to begin.
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

    const user = await ctx.db.get(userId);
    if (!user?.venmoUsername) {
      throw new Error("Venmo username is required to start a split");
    }

    // Create the image record
    await ctx.db.insert("images", {
      storageId: args.storageId,
      uploadedBy: userId,
      uploadedAt: Date.now(),
    });

    // Create a receipt with "parsing" status - parsing starts automatically
    const receiptId = await ctx.db.insert("receipts", {
      imageID: args.storageId,
      hostUserId: userId,
      createdAt: Date.now(),
      status: "parsing",
      parsingStartedAt: Date.now(),
    });

    // Add host as a member
    await ctx.db.insert("memberships", {
      userId,
      receiptId,
      joinedAt: Date.now(),
      merchantName: "Processing...",
    });

    // Schedule parsing to begin immediately
    await ctx.scheduler.runAfter(0, internal.receiptActions.parseReceiptByStorageId, {
      storageId: args.storageId,
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
 * Update the current user's Venmo username.
 */
export const updateVenmoUsername = mutation({
  args: {
    venmoUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(userId, {
      venmoUsername: args.venmoUsername,
    });
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

    // Ensure user is in memberships table
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user_receipt", (q) =>
        q.eq("userId", userId).eq("receiptId", args.receiptId)
      )
      .unique();

    if (!existingMembership) {
      await ctx.db.insert("memberships", {
        userId,
        receiptId: args.receiptId,
        joinedAt: Date.now(),
        merchantName: receipt.merchantName || "Unknown Merchant",
      });
    }
  },
});

/**
 * Mutation to add a guest participant to a receipt.
 * Only the host can perform this action.
 */
export const addGuestParticipant = mutation({
  args: {
    receiptId: v.id("receipts"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    if (receipt.hostUserId !== userId) {
      throw new Error("Unauthorized: Only the host can add guests");
    }

    // 1. Create a placeholder anonymous user
    const guestId = await ctx.db.insert("users", {
      name: args.name,
      isAnonymous: true,
    });

    // 2. Add them to memberships so they show up in history/lists
    await ctx.db.insert("memberships", {
      userId: guestId,
      receiptId: args.receiptId,
      joinedAt: Date.now(),
      merchantName: receipt.merchantName || "Unknown Merchant",
    });

    // 3. Add to authedParticipants to ensure they show up in the receipt UI
    const participants = receipt.authedParticipants || [];
    await ctx.db.patch(args.receiptId, {
      authedParticipants: [...participants, guestId],
    });

    return guestId;
  },
});

/**
 * Mutation to delete a receipt, its items, its image record, and storage file.
 * Only the host can perform this action.
 */
export const deleteReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // 1. Verify the user is the host
    if (receipt.hostUserId !== userId) {
      throw new Error("Unauthorized: Only the host can delete this receipt");
    }

    // 2. Find and delete associated items
    const items = await ctx.db
      .query("receiptItems")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // 3. Find and delete associated share codes
    const shareCodes = await ctx.db
      .query("shareCodes")
      .withIndex("by_receiptId", (q) => q.eq("receiptId", args.receiptId))
      .collect();
    for (const code of shareCodes) {
      await ctx.db.delete(code._id);
    }

    // 4. Delete associated memberships
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // 5. Find and delete the image record and storage file
    if (receipt.imageID) {
      const imageRecord = await ctx.db
        .query("images")
        .withIndex("by_storageId", (q) => q.eq("storageId", receipt.imageID!))
        .unique();

      if (imageRecord) {
        await ctx.db.delete(imageRecord._id);
      }

      // Delete the actual file from storage
      await ctx.storage.delete(receipt.imageID);
    }

    // 5. Delete the receipt itself
    await ctx.db.delete(args.receiptId);

    return { success: true };
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

      // Ensure membership
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_receipt", (q) =>
          q.eq("userId", userId).eq("receiptId", item.receiptId)
        )
        .unique();
      if (!existingMembership) {
        const receipt = await ctx.db.get(item.receiptId);
        await ctx.db.insert("memberships", {
          userId,
          receiptId: item.receiptId,
          joinedAt: Date.now(),
          merchantName: receipt?.merchantName || "Unknown Merchant",
        });
      }
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

    if (newClaimedBy.length > 0) {
      // Ensure membership for the target user
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_receipt", (q) =>
          q.eq("userId", args.userId).eq("receiptId", item.receiptId)
        )
        .unique();
      if (!existingMembership) {
        const receipt = await ctx.db.get(item.receiptId);
        await ctx.db.insert("memberships", {
          userId: args.userId,
          receiptId: item.receiptId,
          joinedAt: Date.now(),
          merchantName: receipt?.merchantName || "Unknown Merchant",
        });
      }
    }
  },
});

/**
 * Internal mutation to mark a receipt as failed.
 */
export const markReceiptFailed = internalMutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("receipts")
      .withIndex("by_imageID", (q) => q.eq("imageID", args.storageId))
      .unique();

    if (receipt) {
      await ctx.db.patch(receipt._id, {
        status: "error",
      });
    }
    return null;
  },
});

/**
 * Internal mutation to mark a receipt as parsing.
 */
export const markReceiptParsing = internalMutation({
  args: {
    receiptId: v.id("receipts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.receiptId, {
      status: "parsing",
      parsingStartedAt: Date.now(),
    });
    return null;
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
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
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
    merchantType: v.optional(v.string()),
    currency: v.optional(v.string()),
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
        merchantType: args.merchantType,
        currency: args.currency,
        date: args.date,
        totalCents: args.totalCents,
        taxCents: args.taxCents,
        tipCents: args.tipCents,
        hostUserId: args.hostUserId,
        status: "parsed",
        createdAt: Date.now(),
      });

      // Ensure host is a member
      const existingMembership = await ctx.db
        .query("memberships")
        .withIndex("by_user_receipt", (q) =>
          q.eq("userId", args.hostUserId).eq("receiptId", existingReceipt._id)
        )
        .unique();
      if (!existingMembership) {
        await ctx.db.insert("memberships", {
          userId: args.hostUserId,
          receiptId: existingReceipt._id,
          joinedAt: Date.now(),
          merchantName: args.merchantName || "Unknown Merchant",
        });
      }

      // Update merchantName on ALL memberships for this receipt to maintain consistency
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_receipt", (q) => q.eq("receiptId", existingReceipt._id))
        .collect();
      for (const m of memberships) {
        if (m.merchantName !== args.merchantName) {
          await ctx.db.patch(m._id, {
            merchantName: args.merchantName || "Unknown Merchant",
          });
        }
      }

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
      merchantType: args.merchantType,
      currency: args.currency,
      date: args.date,
      totalCents: args.totalCents,
      taxCents: args.taxCents,
      tipCents: args.tipCents,
      status: "parsed",
    });

    // Add host as a member
    await ctx.db.insert("memberships", {
      userId: args.hostUserId,
      receiptId,
      joinedAt: Date.now(),
      merchantName: args.merchantName || "Unknown Merchant",
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
 * Get all receipts related to the current user (either uploaded or claimed) with pagination and optional search.
 */
export const listUserReceipts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // 1. Get paginated memberships for this user
    const paginatedMemberships = await (args.searchTerm
      ? ctx.db
          .query("memberships")
          .withSearchIndex("search_merchant", (q) =>
            q.search("merchantName", args.searchTerm!).eq("userId", userId)
          )
      : ctx.db
          .query("memberships")
          .withIndex("by_user_joinedAt", (q) => q.eq("userId", userId))
          .order("desc")
    ).paginate(args.paginationOpts);

    // 2. Fetch the actual receipts and map them
    const page = await Promise.all(
      paginatedMemberships.page.map(async (membership) => {
        const receipt = await ctx.db.get(membership.receiptId);
        if (!receipt) return null;

        const isHost = receipt.hostUserId === userId;
        const isParticipant = receipt.authedParticipants?.includes(userId);

        // Check if user has claimed any items on this receipt
        const items = await ctx.db
          .query("receiptItems")
          .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
          .collect();
        const isClaimant = items.some((item) => item.claimedBy?.includes(userId));

        // Find the image ID for the URL link
        let imageId;
        if (receipt.imageID) {
          const image = await ctx.db
            .query("images")
            .withIndex("by_storageId", (q) => q.eq("storageId", receipt.imageID!))
            .first();
          if (image) imageId = image._id;
        }

        return {
          _id: receipt._id,
          imageId,
          merchantName: receipt.merchantName || "Unknown Merchant",
          date: receipt.date,
          totalCents: receipt.totalCents,
          status: receipt.status,
          isUploadedByMe: isHost,
          isClaimedByMe: isClaimant,
          isParticipantByMe: isParticipant,
          createdAt: receipt.createdAt,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return {
      ...paginatedMemberships,
      page: page.filter((r): r is NonNullable<typeof r> => r !== null),
    };
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
      merchantType: v.optional(v.string()),
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
      merchantType: receipt.merchantType,
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
        merchantType: v.optional(v.string()),
        date: v.optional(v.string()),
        totalCents: v.optional(v.number()),
        taxCents: v.optional(v.number()),
        tipCents: v.optional(v.number()),
        hostUserId: v.id("users"),
        status: v.string(),
        parsingStartedAt: v.optional(v.number()),
        title: v.optional(v.string()),
        joinCode: v.optional(v.string()),
        currency: v.optional(v.string()),
        authedParticipants: v.optional(v.array(v.id("users"))),
        tipConfirmed: v.optional(v.boolean()),
        hostVenmoUsername: v.optional(v.string()),
        participants: v.optional(
          v.array(
            v.object({
              userId: v.id("users"),
              userName: v.string(),
              isAnonymous: v.optional(v.boolean()),
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
          isAnonymous: user?.isAnonymous,
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
        .withIndex("by_storageId", (q) => q.eq("storageId", receipt.imageID!))
        .first();
      if (imageRecord) {
        imageTableId = imageRecord._id;
      }
    }

    const hostUser = await ctx.db.get(receipt.hostUserId);

    return {
      receipt: {
        _id: receipt._id,
        imageID: receipt.imageID,
        createdAt: receipt.createdAt,
        merchantName: receipt.merchantName,
        merchantType: receipt.merchantType,
        date: receipt.date,
        totalCents: receipt.totalCents,
        taxCents: receipt.taxCents,
        tipCents: receipt.tipCents,
        hostUserId: receipt.hostUserId,
        status: receipt.status,
        parsingStartedAt: receipt.parsingStartedAt,
        title: receipt.title,
        joinCode: receipt.joinCode,
        currency: receipt.currency,
        authedParticipants: receipt.authedParticipants,
        tipConfirmed: receipt.tipConfirmed,
        hostVenmoUsername: hostUser?.venmoUsername,
        participants: resolvedParticipants,
      },
      items: itemsWithUserNames,
      imageUrl,
      imageTableId,
    };
  },
});

/**
 * Mutation to confirm the tip for a receipt.
 * Only the host can perform this action.
 */
export const confirmTip = mutation({
  args: {
    receiptId: v.id("receipts"),
    tipCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    if (receipt.hostUserId !== userId) {
      throw new Error("Unauthorized: Only the host can confirm the tip");
    }

    const patch: { tipConfirmed: boolean; tipCents?: number; totalCents?: number } = {
      tipConfirmed: true,
    };

    if (args.tipCents !== undefined) {
      const subtotal =
        (receipt.totalCents || 0) -
        (receipt.taxCents || 0) -
        (receipt.tipCents || 0);
      patch.tipCents = args.tipCents;
      patch.totalCents = subtotal + (receipt.taxCents || 0) + args.tipCents;
    }

    await ctx.db.patch(args.receiptId, patch);
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
          merchantType: v.optional(v.string()),
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
          tipConfirmed: v.optional(v.boolean()),
          hostVenmoUsername: v.optional(v.string()),
          participants: v.optional(
            v.array(
              v.object({
                userId: v.id("users"),
                userName: v.string(),
                isAnonymous: v.optional(v.boolean()),
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
      const hostUser = await ctx.db.get(receipt.hostUserId);
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
            isAnonymous: user?.isAnonymous,
          };
        })
      );

      return {
        image: {
          _id: image._id,
          storageId: image.storageId,
          uploadedAt: image.uploadedAt,
        },
        imageUrl,
        receipt: {
          _id: receipt._id,
          createdAt: receipt.createdAt,
          merchantName: receipt.merchantName,
          merchantType: receipt.merchantType,
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
          tipConfirmed: receipt.tipConfirmed,
          hostVenmoUsername: hostUser?.venmoUsername,
          participants: resolvedParticipants,
        },
        items,
      };
    }

    return {
      image: {
        _id: image._id,
        storageId: image.storageId,
        uploadedAt: image.uploadedAt,
      },
      imageUrl,
      receipt: null,
      items,
    };
  },
});

