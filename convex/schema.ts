import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),

  // RECEIPT PARSING APP TABLES
  receipts: defineTable({
    // Image info
    imageID: v.optional(v.string()), // Convex File ID from Images Relation
    createdAt: v.number(),

    // Amounts info
    totalCents: v.optional(v.number()),
    taxCents: v.optional(v.number()),
    tipCents: v.optional(v.number()),

    // Status
    // TODO: consider adding a "pending" status, incase it needs to be reviewed by host
    status: v.string(), // "parsed" | "error" | "paid" 
  }),
  receiptItems: defineTable({

    receiptId: v.id("receipts"),
    name: v.string(),
    quantity: v.number(),
    priceCents: v.optional(v.number()),

    // Who claimed this item and what percentage
    claimedBy: v.optional(v.array(v.object({ userId: v.id("users"), claimedPercentage: v.number() }))),

  }).index("by_receipt", ["receiptId"]),
  receiptModifiers: defineTable({

    itemId: v.id("receiptItems"),
    name: v.string(),
    priceCents: v.optional(v.number()),

  }).index("by_item", ["itemId"]),

  // BillSession - Relations
  billSession: defineTable({

    hostUserId: v.id("users"),
    receiptId: v.id("receipts"),

    title: v.string(),
    createdAt: v.number(),

    status: v.optional(v.string()), // "draft" | "active" | "finalized" | "settled"

    joinCode: v.optional(v.string()), // short code or QR
    currency: v.optional(v.string()),

  }),
  billParticipants: defineTable({

    billSessionId: v.id("billSession"),
    userId: v.id("users"),
    displayName: v.string(),

    isHost: v.boolean(),
    joinedAt: v.number(),

    amountOwedCents: v.optional(v.number()),
    amountPaidCents: v.optional(v.number()),

  }).index("by_bill_session", ["billSessionId"]).index("by_user", ["userId"]),


});
