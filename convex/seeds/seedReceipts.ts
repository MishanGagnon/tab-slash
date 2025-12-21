// import { mutation } from "../_generated/server";

// function dollarsToCents(x: number | null | undefined) {
//   if (x === null || x === undefined) return undefined;
//   return Math.round(x * 100);
// }

// export const seedAll = mutation(async (ctx) => {
//   /* ---------------- USERS ---------------- */
//   const hostUserId = await ctx.db.insert("users", {
//     authId: "auth_host_123",
//     name: "Tejas",
//     email: "tejas@example.com",
//     createdAt: Date.now(),
//   });

//   const friendUserId = await ctx.db.insert("users", {
//     authId: "auth_friend_456",
//     name: "Alex",
//     email: "alex@example.com",
//     createdAt: Date.now(),
//   });

//   /* ---------------- RECEIPT ---------------- */
//   const receiptId = await ctx.db.insert("receipts", {
//     imageID: "mock-receipt-image",
//     createdAt: Date.now(),

//     totalCents: dollarsToCents(62.58), // subtotal
//     taxCents: dollarsToCents(3.75),
//     tipCents: undefined,

//     status: "parsed",
//   });

//   /* ---------------- RECEIPT ITEMS ---------------- */
//   const bogoItemId = await ctx.db.insert("receiptItems", {
//     receiptId,
//     name: "BOGO for $1",
//     quantity: 1,
//     priceCents: dollarsToCents(1.0),
//   });

//   const bigMacPackItemId = await ctx.db.insert("receiptItems", {
//     receiptId,
//     name: "Classic Big Mac Pack",
//     quantity: 1,
//     priceCents: dollarsToCents(19.99),
//   });

//   const nuggetsItemId = await ctx.db.insert("receiptItems", {
//     receiptId,
//     name: "20 McNuggets",
//     quantity: 1,
//     priceCents: dollarsToCents(7.29),
//   });

//   /* ---------------- RECEIPT MODIFIERS ---------------- */
//   await ctx.db.insert("receiptModifiers", {
//     itemId: bogoItemId,
//     name: "1 McChicken",
//     priceCents: dollarsToCents(2.19),
//   });

//   await ctx.db.insert("receiptModifiers", {
//     itemId: bogoItemId,
//     name: "1 McChicken",
//     priceCents: undefined,
//   });

//   await ctx.db.insert("receiptModifiers", {
//     itemId: bigMacPackItemId,
//     name: "1 BBQ Sauce",
//     priceCents: undefined,
//   });

//   await ctx.db.insert("receiptModifiers", {
//     itemId: nuggetsItemId,
//     name: "1 Creamy Ranch Cup",
//     priceCents: undefined,
//   });

//   /* ---------------- BILL SESSION ---------------- */
//   const billSessionId = await ctx.db.insert("billSession", {
//     hostUserId,
//     receiptId,

//     title: "McDonalds with friends",
//     createdAt: Date.now(),

//     status: "active",
//     joinCode: "ABCD12",
//     currency: "USD",
//   });

//   /* ---------------- PARTICIPANTS ---------------- */
//   const hostParticipantId = await ctx.db.insert("participants", {
//     billSessionId,
//     userId: hostUserId,
//     displayName: "Tejas",
//     isHost: true,
//     amountOwedCents: 0,
//     amountPaidCents: 0,
//   });

//   const friendParticipantId = await ctx.db.insert("participants", {
//     billSessionId,
//     userId: friendUserId,
//     displayName: "Alex",
//     isHost: false,
//     amountOwedCents: 0,
//     amountPaidCents: 0,
//   });

//   /* ---------------- ITEM CLAIMS ---------------- */
//   await ctx.db.insert("itemClaims", {
//     billSessionId,
//     receiptItemId: bogoItemId,
//     participantId: hostParticipantId,
//     quantity: 1,
//   });

//   await ctx.db.insert("itemClaims", {
//     billSessionId,
//     receiptItemId: nuggetsItemId,
//     participantId: friendParticipantId,
//     quantity: 1,
//   });

//   return {
//     hostUserId,
//     friendUserId,
//     receiptId,
//     billSessionId,
//   };
// });
