import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    venmoUsername: v.optional(v.string()),
  }).index("email", ["email"]),
  numbers: defineTable({
    value: v.number(),
  }),

  // RECEIPT PARSING APP TABLES

  // Receipts Table (Merged with BillSession)
  // High level receipt info for totals and tips and image
  receipts: defineTable({
    // --- Image info ---
    imageID: v.optional(v.id("_storage")), // Convex File ID from Images Relation
    createdAt: v.number(),

    // --- Amounts info ---
    totalCents: v.optional(v.number()),
    taxCents: v.optional(v.number()),
    tipCents: v.optional(v.number()),

    // --- Merchant and Date info ---
    merchantName: v.optional(v.string()),
    date: v.optional(v.string()),

    // --- Session / Status info ---
    hostUserId: v.id("users"),
    title: v.optional(v.string()),
    status: v.string(), // "parsing" | "parsed" | "error" | "paid" | "draft" | "active" | "finalized" | "settled"
    parsingStartedAt: v.optional(v.number()), // Timestamp when parsing started
    joinCode: v.optional(v.string()),
    currency: v.optional(v.string()),
    authedParticipants: v.optional(v.array(v.id("users"))),
    tipConfirmed: v.optional(v.boolean()),
  })
    .index("by_imageID", ["imageID"])
    .index("by_host", ["hostUserId"])
    .index("by_joinCode", ["joinCode"]),

  // Share Codes Table for temporary links
  shareCodes: defineTable({
    receiptId: v.id("receipts"),
    code: v.string(), // e.g., "TACO"
    expiresAt: v.number(), // Timestamp
  })
    .index("by_code", ["code", "expiresAt"])
    .index("by_receiptId", ["receiptId", "expiresAt"]),

  // Receipt Line Items Table
  // Each line item is a single item on the receipt
  receiptItems: defineTable({
    receiptId: v.id("receipts"),
    name: v.string(),
    quantity: v.number(),
    priceCents: v.optional(v.number()),

    // Who claimed this item
    claimedBy: v.optional(v.array(v.id("users"))),

    // Modifiers will be an array on the line itmes
    modifiers: v.optional(v.array(v.object({ name: v.string(), priceCents: v.optional(v.number()) }))),

  }).index("by_receipt", ["receiptId"]),

  images: defineTable({
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
  })
    .index("by_user", ["uploadedBy"])
    .index("by_storageId", ["storageId"]),

  // NEW: Memberships table for efficient many-to-many relationship
  memberships: defineTable({
    userId: v.id("users"),
    receiptId: v.id("receipts"),
  })
    .index("by_user", ["userId"])
    .index("by_receipt", ["receiptId"])
    .index("by_user_receipt", ["userId", "receiptId"]),
});
