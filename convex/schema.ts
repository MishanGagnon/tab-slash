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

  // Receipts Table
  // High level receipt info for totals and tips and image
  receipts: defineTable({
    // Image info
    imageID: v.optional(v.id("_storage")), // Convex File ID from Images Relation
    createdAt: v.number(),

    // Amounts info
    totalCents: v.optional(v.number()),
    taxCents: v.optional(v.number()),
    tipCents: v.optional(v.number()),

    // Status
    // TODO: consider adding a "pending" status, incase it needs to be reviewed by host
    status: v.string(), // "parsed" | "error" | "paid" 
  }),

  // Receipt Line Items Table
  // Each line item is a single item on the receipt
  receiptItems: defineTable({

    receiptId: v.id("receipts"),
    name: v.string(),
    quantity: v.number(),
    priceCents: v.optional(v.number()),

    // Who claimed this item and what percentage
    claimedBy: v.optional(v.array(v.object({ userId: v.id("users"), claimedPercentage: v.number() }))),

    // Modifiers will be an array on the line itmes
    modifiers: v.optional(v.array(v.object({ name: v.string(), priceCents: v.optional(v.number()) }))),

  }).index("by_receipt", ["receiptId"]),


  // BillSession - Relations
  billSession: defineTable({

    hostUserId: v.id("users"),
    receiptId: v.id("receipts"),

    title: v.string(),
    createdAt: v.number(),

    status: v.optional(v.string()), // "draft" | "active" | "finalized" | "settled"

    joinCode: v.optional(v.string()), // short code or QR
    currency: v.optional(v.string()),

    authedParticipants: v.optional(v.array(v.id("users"))),
    // TODO (priority: low) - add a way to have guest participants 

  }),
});
