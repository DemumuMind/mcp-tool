declare namespace App {
  interface SessionData {
    adminUser?: {
      id: string;
      name: string;
      email: string;
      role: "Owner" | "Operator" | "Reviewer" | "Analyst";
    };
    csrfToken?: string;
  }

  interface Locals {
    adminUser: SessionData["adminUser"] | null;
    csrfToken: string | null;
    isAdminAuthenticated: boolean;
  }
}
