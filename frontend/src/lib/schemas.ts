import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const ticketFormSchema = z
  .object({
    ticketDate: z.string().min(1, "Required"),
    mode: z.string().min(1, "Required"),
    companyName: z.string().min(1, "Required"),
    contactName: z.string().min(1, "Required"),
    contactNo: z.string().min(1, "Required"),
    emailId: z.string().min(1, "Required").email({ message: "Invalid email" }),
    address: z.string().min(1, "Required"),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    problem: z.string().min(1, "Required"),
    accountManager: z.string().min(1, "Required"),
    assignedBy: z.string().min(1, "Required"),
    callType: z.string().min(1, "Required"),
    assigneeUserIds: z.array(z.number().int().positive()).min(1, "Select at least one employee"),
    priority: z.string().min(1, "Required"),
    deadlineDate: z.string().optional(),
    internalTag: z.string().optional(),
  })
  .refine((data) => !data.deadlineDate || data.deadlineDate >= data.ticketDate, {
    message: "Deadline cannot be before the ticket date",
    path: ["deadlineDate"],
  });
export type TicketFormValues = z.infer<typeof ticketFormSchema>;

export const profileDetailsSchema = z.object({
  displayName: z.string().min(1, "Required").max(100),
  email: z.string().email({ message: "Invalid email" }).optional().or(z.literal("")),
});
export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const adminFeedbackResponseSchema = z
  .string()
  .min(1, "Required")
  .max(800, "Max 800 characters");

export const ticketRemarkSchema = z.string().trim().min(1, "Remark cannot be empty");

export const smtpSettingsSchema = z.object({
  host: z.string().min(1, "Required"),
  port: z.number().int().positive("Required"),
  username: z.string().optional(),
  // Blank means "keep the existing password" on update — see backend
  // controllers/settings.ts, which never echoes the stored password back.
  password: z.string().optional(),
  fromAddress: z.string().min(1, "Required").email({ message: "Invalid email" }),
  fromName: z.string().optional(),
  secure: z.boolean(),
});
export type SmtpSettingsValues = z.infer<typeof smtpSettingsSchema>;

export const feedbackSubmissionSchema = z.object({
  rating: z.number().int().min(1, "Please select a rating").max(5),
  comment: z.string().max(1000, "Max 1000 characters").optional(),
});
export type FeedbackSubmissionValues = z.infer<typeof feedbackSubmissionSchema>;

export const createUserSchema = z.object({
  username: z.string().min(1, "Required").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "employee"]),
  displayName: z.string().min(1, "Required").max(100),
  email: z.string().email({ message: "Invalid email" }).optional().or(z.literal("")),
});
export type CreateUserValues = z.infer<typeof createUserSchema>;
