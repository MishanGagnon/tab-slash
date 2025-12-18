import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.email as string,
        };
      },
    }),
    Google({
      authorization: {
        params: {
          scope: "openid email profile",
        },
      }
    }),
  ],
});
