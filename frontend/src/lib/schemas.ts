import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const ticketFormSchema = z.object({
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
  assignedToUserId: z.number().int().positive("Select an employee"),
  priority: z.string().min(1, "Required"),
  deadlineDate: z.string().optional(),
  internalTag: z.string().optional(),
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

export const ticketFeedbackSchema = z.string().max(50, "Max 50 characters");

export const ticketRemarkSchema = z.string().trim().min(1, "Remark cannot be empty");
