import { z } from "zod";

const idParam = z.string().min(1);

export const createNotificationSchema = z.object({
  params: z.object({
    schoolId: idParam,
  }),
  body: z.object({
    title: z.string().trim().min(3).max(120),
    message: z.string().trim().min(1).max(3000),
    priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).default("NORMAL"),
    recipientType: z.enum(["ALL_TEACHERS", "SELECTED_TEACHERS"]),
    recipientMembershipIds: z.array(idParam).optional(),
  }).superRefine((data, ctx) => {
    if (data.recipientType === "SELECTED_TEACHERS") {
      if (!data.recipientMembershipIds?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["recipientMembershipIds"],
          message: "Select at least one teacher.",
        });
      }

      if (
        data.recipientMembershipIds &&
        new Set(data.recipientMembershipIds).size !== data.recipientMembershipIds.length
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["recipientMembershipIds"],
          message: "Duplicate teacher selections are not allowed.",
        });
      }
    }
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    schoolId: idParam,
    notificationId: idParam,
  }),
});

export const notificationSchoolParamSchema = z.object({
  params: z.object({
    schoolId: idParam,
  }),
});
