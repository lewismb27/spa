/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { Role } from "@prisma/client";
import { initTRPC, TRPCError } from "@trpc/server";
import { Session } from "next-auth";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  instanceParamsSchema,
  refinedSpaceParamsSchema,
} from "@/lib/validations/params";

import { checkAdminPermissions } from "./utils/admin-access";
import { getInstance } from "./utils/get-instance";
import { isSuperAdmin } from "./utils/is-super-admin";
import { getUserRole } from "./utils/user-role";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  session: Session | null;
}) => {
  const session = opts.session ?? (await auth());
  const source = opts.headers.get("x-trpc-source") ?? "unknown";

  console.log(">>> tRPC Request from", source, "by", session?.user);

  return {
    session,
    db,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/**
 * Middleware that enforces users are logged in before running the procedure.
 */
const authedMiddleware = t.middleware(({ ctx: { session }, next }) => {
  if (!session || !session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User is not signed in",
    });
  }
  return next({ ctx: { session: { ...session, user: session.user } } });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(authedMiddleware);

/**
 * Middleware that fetches the instance from the database and adds it to the context.
 */
export const instanceMiddleware = authedMiddleware.unstable_pipe(
  async ({ ctx, input, next }) => {
    const { params } = z.object({ params: instanceParamsSchema }).parse(input);
    const instance = await getInstance(ctx.db, params);

    return next({ ctx: { instance: { params, ...instance } } });
  },
);

/**
 * Middleware that fetches the user's role in the instance from the database and adds it to the context.
 */
const userRoleMiddleware = instanceMiddleware.unstable_pipe(
  async ({ ctx, next }) => {
    const role = await getUserRole(
      ctx.db,
      ctx.session.user,
      ctx.instance.params,
    );

    return next({ ctx: { session: { user: { ...ctx.session.user, role } } } });
  },
);

/**
 * Procedure containing the current instance in its context.
 */
export const instanceProcedure = protectedProcedure
  .input(z.object({ params: instanceParamsSchema }))
  .use(instanceMiddleware);

/**
 * Procedure aware of the current user's role.
 */
export const roleAwareProcedure = instanceProcedure.use(userRoleMiddleware);

/**
 * Procedure that enforces the user is a student.
 */
export const studentProcedure = instanceProcedure
  .use(userRoleMiddleware)
  .use(async ({ ctx, next }) => {
    const user = ctx.session.user;
    if (user.role !== Role.STUDENT) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User is not a Student",
      });
    }

    const { studentLevel } = await ctx.db.studentDetails.findFirstOrThrow({
      where: { userId: user.id },
    });

    return next({
      ctx: {
        session: { user: { ...user, role: user.role, studentLevel } },
      },
    });
  });

export const adminProcedure = protectedProcedure
  .input(z.object({ params: refinedSpaceParamsSchema }))
  .use(async ({ ctx, input, next }) => {
    const user = ctx.session.user;
    const membership = await checkAdminPermissions(
      ctx.db,
      input.params,
      user.id,
    );

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User is not an Admin",
      });
    }

    return next({ ctx: { session: { user: { ...user, role: Role.ADMIN } } } });
  });

export const instanceAdminProcedure = adminProcedure
  .input(z.object({ params: instanceParamsSchema }))
  .use(instanceMiddleware);

export const superAdminProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const membership = await isSuperAdmin(ctx.db, ctx.session.user.id);

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User is not a Super Admin",
      });
    }

    return next();
  },
);

// ! deprecated ---------------------------
/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User is not signed in",
    });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

export const stageAwareProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .input(z.object({ params: instanceParamsSchema }))
  .use(
    async ({
      ctx,
      input: {
        params: { group, subGroup, instance },
      },
      next,
    }) => {
      const { stage } = await ctx.db.allocationInstance.findFirstOrThrow({
        where: {
          allocationGroupId: group,
          allocationSubGroupId: subGroup,
          id: instance,
        },
        select: { stage: true },
      });

      return next({ ctx: { stage } });
    },
  );

export const forkedInstanceProcedure = protectedProcedure
  .input(z.object({ params: instanceParamsSchema }))
  .use(
    async ({
      ctx,
      input: {
        params: { group, subGroup, instance },
      },
      next,
    }) => {
      const { parentInstanceId } =
        await ctx.db.allocationInstance.findFirstOrThrow({
          where: {
            allocationGroupId: group,
            allocationSubGroupId: subGroup,
            id: instance,
          },
          select: { parentInstanceId: true },
        });

      return next({ ctx: { parentInstanceId } });
    },
  );
