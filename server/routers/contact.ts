import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { enquiries } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

export const contactRouter = router({
  submitEnquiry: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().max(320),
        business: z.string().min(1).max(300),
        businessType: z.string().min(1).max(100),
        entrants: z.string().optional(),
        message: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db.insert(enquiries).values({
        name: input.name,
        email: input.email,
        business: input.business,
        businessType: input.businessType,
        estimatedEntrants: input.entrants ?? null,
        message: input.message ?? null,
      });

      // Notify the platform owner
      await notifyOwner({
        title: `New demo enquiry from ${input.business}`,
        content: `**Name:** ${input.name}\n**Email:** ${input.email}\n**Business:** ${input.business}\n**Type:** ${input.businessType}\n**Estimated entrants:** ${input.entrants ?? "Not specified"}\n\n${input.message ? `**Message:** ${input.message}` : ""}`,
      });

      return { success: true };
    }),
});
