import { AdminRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: AdminRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AdminRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AdminRole;
  }
}
