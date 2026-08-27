/**
 * Hand-authored OpenAPI 3.1 description of the `/api/v1` surface.
 *
 * Served as JSON at `GET /api/v1/openapi.json` and rendered with Swagger UI at `/api-docs`.
 * Keep this in sync when routes under `src/app/api/v1/**` change — there is no code
 * generation step, by design (the route handlers stay dependency-free).
 */

const bearerNote =
  "Auth is a first-party Auth.js session cookie (`authjs.session-token`), set by the " +
  "NextAuth credentials flow under `/api/v1/auth`. In the browser it is sent automatically. " +
  "Endpoints are marked **student**, **admin**, or **any signed-in user** where they require one.";

const ValidationError = {
  type: "object",
  description:
    "Zod `flatten()` output returned on 400 for a malformed body. `fieldErrors` keys are the offending fields.",
  properties: {
    error: {
      type: "object",
      properties: {
        formErrors: { type: "array", items: { type: "string" } },
        fieldErrors: {
          type: "object",
          additionalProperties: { type: "array", items: { type: "string" } },
        },
      },
      required: ["formErrors", "fieldErrors"],
    },
  },
  required: ["error"],
} as const;

const ErrorMessage = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

const Ok = {
  type: "object",
  properties: { ok: { type: "boolean", enum: [true] } },
  required: ["ok"],
} as const;

const Category = {
  type: "object",
  properties: {
    id: { type: "string", example: "cmt9xk3vr0001cs9ulpm2zz83" },
    name: { type: "string", example: "CA Foundation" },
    slug: { type: "string", example: "ca-foundation" },
  },
  required: ["id", "name", "slug"],
} as const;

const QuestionBank = {
  type: "object",
  description:
    "Question bank as returned by the API. `price`, `earlyBirdPrice`, `previewPageCount` are integers. " +
    "Money is always in **paise** (₹1 = 100). `thumbnailUrl` is null when no thumbnail was uploaded.",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    slug: { type: "string" },
    description: { type: "string" },
    categoryId: { type: "string" },
    category: Category,
    price: { type: "integer", description: "Regular price in paise", example: 64900 },
    earlyBirdPrice: {
      type: ["integer", "null"],
      description: "Discounted price in paise while the early-bird window is open",
    },
    earlyBirdEndsAt: { type: ["string", "null"], format: "date-time" },
    fileName: { type: "string" },
    fileSizeBytes: { type: "integer" },
    totalPages: { type: ["integer", "null"] },
    previewEnabled: { type: "boolean" },
    previewPageCount: { type: ["integer", "null"] },
    isPublished: { type: "boolean" },
    isFeatured: { type: "boolean" },
    features: { type: "array", items: { type: "string" }, maxItems: 8 },
    thumbnailUrl: {
      type: ["string", "null"],
      example: "https://res.cloudinary.com/demo/image/upload/v1712345678/question-bank/abc123/thumbnail.jpg",
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "title", "slug", "description", "categoryId", "price", "isPublished"],
} as const;

const Coupon = {
  type: "object",
  properties: {
    id: { type: "string" },
    code: { type: "string", example: "WELCOME50" },
    discountType: { type: "string", enum: ["PERCENT", "FLAT"] },
    discountValue: {
      type: "integer",
      description: "Percent (1–100) when PERCENT, else a flat amount in paise",
    },
    expiresAt: { type: "string", format: "date-time" },
    usageLimit: { type: "integer" },
    usedCount: { type: "integer" },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "code", "discountType", "discountValue", "expiresAt", "usageLimit", "isActive"],
} as const;

const FaqItem = {
  type: "object",
  properties: {
    id: { type: "string" },
    question: { type: "string" },
    answer: { type: "string" },
    sortOrder: { type: "integer" },
    isPublished: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "question", "answer", "sortOrder", "isPublished"],
} as const;

const CouponInput = {
  type: "object",
  properties: {
    code: { type: "string", minLength: 3, maxLength: 32, description: "Upper-cased and trimmed server-side" },
    discountType: { type: "string", enum: ["PERCENT", "FLAT"] },
    discountValue: { type: "integer", minimum: 1 },
    expiresAt: { type: "string", format: "date-time" },
    usageLimit: { type: "integer", minimum: 1 },
    isActive: { type: "boolean", default: true },
  },
  required: ["code", "discountType", "discountValue", "expiresAt", "usageLimit"],
} as const;

const FaqInput = {
  type: "object",
  properties: {
    question: { type: "string", minLength: 3, maxLength: 200 },
    answer: { type: "string", minLength: 3, maxLength: 2000 },
    sortOrder: { type: "integer", minimum: 0, description: "Omit on create to append to the end of the list" },
    isPublished: { type: "boolean", default: true },
  },
  required: ["question", "answer"],
} as const;

const jsonBody = (schema: unknown, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

const jsonResponse = (description: string, schema: unknown) => ({
  description,
  content: { "application/json": { schema } },
});

const responses401 = { 401: jsonResponse("Not authenticated", ErrorMessage) };
const responses403 = { 403: jsonResponse("Wrong role (admin/student required)", ErrorMessage) };
const responses400 = { 400: jsonResponse("Validation failed", ValidationError) };

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Decode with Shakti — LMS API",
    version: "1.0.0",
    description:
      "REST API for the CA exam-prep question-bank platform (Phase 1).\n\n" +
      "- All routes are versioned under `/api/v1`.\n" +
      "- Money is stored and returned as **integer paise** (₹1 = 100), never floats.\n" +
      "- Payment is a mock provider in this phase (`PAYMENT_PROVIDER=mock`).\n\n" +
      bearerNote,
  },
  servers: [{ url: "/", description: "This deployment" }],
  tags: [
    { name: "System", description: "Health and machine-readable docs" },
    { name: "Auth", description: "Registration, password reset, and the NextAuth session flow" },
    { name: "Catalog", description: "Public categories and question-bank browsing" },
    { name: "Question Banks (admin)", description: "Create / update / delete question banks" },
    { name: "Coupons (admin)", description: "Discount code management" },
    { name: "FAQ", description: "Landing-page FAQ (public read, admin write)" },
    { name: "Purchase", description: "Coupon validation, order creation, and status polling" },
    { name: "Files", description: "Authenticated file delivery: previews, downloads, invoices" },
    { name: "Account", description: "Self-service account actions" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
        description: bearerNote,
      },
    },
    schemas: {
      Category,
      QuestionBank,
      Coupon,
      CouponInput,
      FaqItem,
      FaqInput,
      ValidationError,
      ErrorMessage,
      Ok,
    },
  },
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["System"],
        summary: "Liveness + database connectivity",
        security: [],
        responses: {
          200: jsonResponse("Service and DB are up", {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok"] },
              db: { type: "string", enum: ["connected"] },
              timestamp: { type: "string", format: "date-time" },
            },
          }),
          503: jsonResponse("Database unreachable", {
            type: "object",
            properties: {
              status: { type: "string", enum: ["error"] },
              db: { type: "string", enum: ["disconnected"] },
              timestamp: { type: "string", format: "date-time" },
            },
          }),
        },
      },
    },

    "/api/v1/openapi.json": {
      get: {
        tags: ["System"],
        summary: "This OpenAPI document",
        security: [],
        responses: { 200: jsonResponse("The raw OpenAPI 3.1 spec", { type: "object" }) },
      },
    },

    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create a student account",
        security: [],
        requestBody: jsonBody({
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
          required: ["name", "email", "password"],
        }),
        responses: {
          201: jsonResponse("Account created", {
            type: "object",
            properties: { id: { type: "string" }, email: { type: "string" } },
          }),
          ...responses400,
          409: jsonResponse("Email already registered", ErrorMessage),
        },
      },
    },

    "/api/v1/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password-reset email",
        description:
          "Always returns `{ ok: true }` regardless of whether the email exists (no account enumeration). " +
          "Sends a link valid for 1 hour when the account exists.",
        security: [],
        requestBody: jsonBody({
          type: "object",
          properties: { email: { type: "string", format: "email" } },
          required: ["email"],
        }),
        responses: { 200: jsonResponse("Accepted", Ok), ...responses400 },
      },
    },

    "/api/v1/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Set a new password using a reset token",
        security: [],
        requestBody: jsonBody({
          type: "object",
          properties: {
            token: { type: "string", description: "Raw token from the reset link" },
            password: { type: "string", minLength: 8 },
          },
          required: ["token", "password"],
        }),
        responses: {
          200: jsonResponse("Password updated; all outstanding reset tokens for the user are invalidated", Ok),
          400: jsonResponse("Invalid body, or the token is unknown / used / expired", ValidationError),
        },
      },
    },

    "/api/v1/auth/{nextauth}": {
      parameters: [
        {
          name: "nextauth",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "NextAuth action, e.g. `session`, `csrf`, `callback/credentials`, `signout`",
        },
      ],
      get: {
        tags: ["Auth"],
        summary: "NextAuth handler (session, csrf, providers, …)",
        security: [],
        description:
          "Auth.js v5 catch-all mounted at `basePath: /api/v1/auth`. Common calls: " +
          "`GET /api/v1/auth/session` (current session or `{}`), `GET /api/v1/auth/csrf` (token for the sign-in POST).",
        responses: { 200: { description: "Action-dependent JSON" } },
      },
      post: {
        tags: ["Auth"],
        summary: "NextAuth handler (sign in / sign out)",
        security: [],
        description:
          "`POST /api/v1/auth/callback/credentials` with `csrfToken`, `email`, `password` (form-encoded) signs in " +
          "and sets the `authjs.session-token` cookie. `POST /api/v1/auth/signout` clears it.",
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  csrfToken: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                  redirect: { type: "string", enum: ["false"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Sign-in result" }, 302: { description: "Redirect (when `redirect` is not false)" } },
      },
    },

    "/api/v1/categories": {
      get: {
        tags: ["Catalog"],
        summary: "List all CA exam categories",
        security: [],
        responses: {
          200: jsonResponse("Categories, alphabetical by name", {
            type: "array",
            items: Category,
          }),
        },
      },
    },

    "/api/v1/question-banks": {
      get: {
        tags: ["Catalog"],
        summary: "List question banks",
        description:
          "Public by default (published banks only). `admin=true` returns unpublished banks too and requires an admin session.",
        parameters: [
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Filter by category **slug** (e.g. `ca-foundation`)",
          },
          {
            name: "featured",
            in: "query",
            schema: { type: "boolean" },
            description: "Only banks flagged for the landing page",
          },
          {
            name: "admin",
            in: "query",
            schema: { type: "boolean" },
            description: "Include unpublished banks (admin session required)",
          },
        ],
        responses: {
          200: jsonResponse("Question banks", { type: "array", items: QuestionBank }),
          401: jsonResponse("`admin=true` without a session", ErrorMessage),
          403: jsonResponse("`admin=true` as a non-admin", ErrorMessage),
        },
      },
      post: {
        tags: ["Question Banks (admin)"],
        summary: "Upload a new question bank (admin)",
        description:
          "`multipart/form-data`. The PDF is required; a thumbnail image is optional. Booleans are sent as the " +
          "strings `\"true\"`/`\"false\"`. `features` is a JSON-encoded string array. All money fields are paise.",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary", description: "The question-bank PDF (required)" },
                  thumbnail: { type: "string", format: "binary", description: "JPEG/PNG/WebP, ≤ 5 MB (optional)" },
                  title: { type: "string", minLength: 3, maxLength: 200 },
                  description: { type: "string", minLength: 10, maxLength: 2000 },
                  categoryId: { type: "string" },
                  price: { type: "integer", description: "Regular price in paise" },
                  previewEnabled: { type: "string", enum: ["true", "false"], default: "false" },
                  previewPageCount: { type: "integer", description: "Required when previewEnabled is true" },
                  earlyBirdPrice: { type: "integer", description: "Paise; must be < price and set together with earlyBirdEndsAt" },
                  earlyBirdEndsAt: { type: "string", format: "date-time" },
                  isPublished: { type: "string", enum: ["true", "false"], default: "true" },
                  isFeatured: { type: "string", enum: ["true", "false"], default: "false" },
                  features: { type: "string", description: 'JSON array, e.g. `["600 MCQs","Answer key"]` (max 8)' },
                },
                required: ["file", "title", "description", "categoryId", "price"],
              },
            },
          },
        },
        responses: {
          201: jsonResponse("Created", QuestionBank),
          400: jsonResponse("Missing/invalid file or fields", ValidationError),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/question-banks/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      patch: {
        tags: ["Question Banks (admin)"],
        summary: "Update a question bank (admin)",
        description:
          "JSON body, all fields optional. Omitting `earlyBirdPrice`/`earlyBirdEndsAt` clears the early-bird window. " +
          "Toggling `previewEnabled`/`previewPageCount` regenerates or drops the preview file.",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody({
          type: "object",
          properties: {
            title: { type: "string", minLength: 3, maxLength: 200 },
            description: { type: "string", minLength: 10, maxLength: 2000 },
            categoryId: { type: "string" },
            price: { type: "integer" },
            previewEnabled: { type: "boolean" },
            previewPageCount: { type: "integer" },
            earlyBirdPrice: { type: "integer" },
            earlyBirdEndsAt: { type: "string", format: "date-time" },
            isPublished: { type: "boolean" },
            isFeatured: { type: "boolean" },
            features: { type: "array", items: { type: "string" }, maxItems: 8 },
          },
        }),
        responses: {
          200: jsonResponse("Updated", QuestionBank),
          404: jsonResponse("No such question bank", ErrorMessage),
          ...responses400,
          ...responses401,
          ...responses403,
        },
      },
      delete: {
        tags: ["Question Banks (admin)"],
        summary: "Delete a question bank (admin)",
        description: "Refused with 409 if any purchase references it — unpublish instead.",
        security: [{ sessionCookie: [] }],
        responses: {
          200: jsonResponse("Deleted; stored files removed", Ok),
          409: jsonResponse("Has purchases", ErrorMessage),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/question-banks/{id}/thumbnail": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      post: {
        tags: ["Question Banks (admin)"],
        summary: "Replace a question bank's thumbnail (admin)",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { thumbnail: { type: "string", format: "binary" } },
                required: ["thumbnail"],
              },
            },
          },
        },
        responses: {
          200: jsonResponse("Updated bank with the new `thumbnailUrl`", QuestionBank),
          400: jsonResponse("Missing image, wrong type, or > 5 MB", ErrorMessage),
          404: jsonResponse("No such question bank", ErrorMessage),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/coupons": {
      get: {
        tags: ["Coupons (admin)"],
        summary: "List coupons (admin)",
        security: [{ sessionCookie: [] }],
        responses: {
          200: jsonResponse("Coupons, newest first", { type: "array", items: Coupon }),
          ...responses401,
          ...responses403,
        },
      },
      post: {
        tags: ["Coupons (admin)"],
        summary: "Create a coupon (admin)",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody(CouponInput),
        responses: {
          201: jsonResponse("Created", Coupon),
          409: jsonResponse("Code already exists", ErrorMessage),
          ...responses400,
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/coupons/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      patch: {
        tags: ["Coupons (admin)"],
        summary: "Update a coupon (admin)",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody({ ...CouponInput, required: [] }),
        responses: {
          200: jsonResponse("Updated", Coupon),
          ...responses400,
          ...responses401,
          ...responses403,
        },
      },
      delete: {
        tags: ["Coupons (admin)"],
        summary: "Delete a coupon (admin)",
        description: "Refused with 409 once the coupon has been used — deactivate it instead.",
        security: [{ sessionCookie: [] }],
        responses: {
          200: jsonResponse("Deleted", Ok),
          409: jsonResponse("Coupon already used", ErrorMessage),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/faqs": {
      get: {
        tags: ["FAQ"],
        summary: "List FAQ items",
        description: "Public: published items in display order. `all=true` returns every item and requires an admin session.",
        security: [],
        parameters: [
          { name: "all", in: "query", schema: { type: "boolean" }, description: "Include unpublished (admin only)" },
        ],
        responses: {
          200: jsonResponse("FAQ items", { type: "array", items: FaqItem }),
          401: jsonResponse("`all=true` without a session", ErrorMessage),
          403: jsonResponse("`all=true` as a non-admin", ErrorMessage),
        },
      },
      post: {
        tags: ["FAQ"],
        summary: "Create an FAQ item (admin)",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody(FaqInput),
        responses: {
          201: jsonResponse("Created", FaqItem),
          ...responses400,
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/faqs/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      patch: {
        tags: ["FAQ"],
        summary: "Update an FAQ item (admin)",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody({ ...FaqInput, required: [] }),
        responses: {
          200: jsonResponse("Updated", FaqItem),
          ...responses400,
          ...responses401,
          ...responses403,
        },
      },
      delete: {
        tags: ["FAQ"],
        summary: "Delete an FAQ item (admin)",
        security: [{ sessionCookie: [] }],
        responses: { 200: jsonResponse("Deleted", Ok), ...responses401, ...responses403 },
      },
    },

    "/api/v1/purchase/validate-coupon": {
      post: {
        tags: ["Purchase"],
        summary: "Check a coupon against a question bank (student)",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody({
          type: "object",
          properties: {
            code: { type: "string" },
            questionBankId: { type: "string" },
          },
          required: ["code", "questionBankId"],
        }),
        responses: {
          200: jsonResponse("Coupon is valid; amounts in paise", {
            type: "object",
            properties: {
              valid: { type: "boolean", enum: [true] },
              code: { type: "string" },
              basePrice: { type: "integer" },
              discountAmount: { type: "integer" },
              finalAmount: { type: "integer" },
            },
          }),
          400: jsonResponse("Invalid body, or coupon invalid/expired/exhausted", ValidationError),
          404: jsonResponse("Question bank not found", ErrorMessage),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/purchase/create-order": {
      post: {
        tags: ["Purchase"],
        summary: "Create a pending purchase and payment order (student)",
        description:
          "Creates a PENDING purchase, asks the configured payment provider (mock in this phase) for an order, and " +
          "returns where to send the buyer next.",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody({
          type: "object",
          properties: {
            questionBankId: { type: "string" },
            couponCode: { type: "string", description: "Optional" },
          },
          required: ["questionBankId"],
        }),
        responses: {
          200: jsonResponse("Order created", {
            type: "object",
            properties: {
              redirectUrl: { type: "string", description: "Send the buyer here to complete payment" },
              purchaseId: { type: "string" },
            },
          }),
          400: jsonResponse("Invalid body or coupon", ValidationError),
          404: jsonResponse("Question bank not available", ErrorMessage),
          409: jsonResponse("Already owned", ErrorMessage),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/purchase/verify/{orderId}": {
      parameters: [
        {
          name: "orderId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "The `purchaseId` from create-order",
        },
      ],
      get: {
        tags: ["Purchase"],
        summary: "Poll / finalize a purchase (student)",
        description:
          "Fallback status check for when the provider callback hasn't landed yet. If the purchase is still PENDING it " +
          "runs the provider callback and finalizes (issues the invoice) before returning.",
        security: [{ sessionCookie: [] }],
        responses: {
          200: jsonResponse("Current status", {
            type: "object",
            properties: { status: { type: "string", enum: ["PENDING", "SUCCESS", "FAILED"] } },
          }),
          404: jsonResponse("Not found or not the caller's purchase", ErrorMessage),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/files/preview/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "Question bank id" }],
      get: {
        tags: ["Files"],
        summary: "Download the free preview PDF",
        description: "Public. 404 unless the bank has preview enabled and a generated preview file.",
        security: [],
        responses: {
          200: {
            description: "The capped preview PDF",
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
          404: jsonResponse("Preview not available", ErrorMessage),
        },
      },
    },

    "/api/v1/files/download/{purchaseId}": {
      parameters: [{ name: "purchaseId", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["Files"],
        summary: "Download a purchased question bank (any signed-in user)",
        description:
          "Returns the original PDF **watermarked in memory** with the caller's email. Only the buyer of a SUCCESS " +
          "purchase may download.",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Watermarked PDF (attachment)",
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
          403: jsonResponse("Not the buyer, or purchase not completed", ErrorMessage),
          ...responses401,
        },
      },
    },

    "/api/v1/files/invoice/{invoiceId}": {
      parameters: [{ name: "invoiceId", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["Files"],
        summary: "Download a purchase invoice PDF (any signed-in user)",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Invoice PDF (attachment)",
            content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
          },
          403: jsonResponse("Not the caller's invoice", ErrorMessage),
          ...responses401,
        },
      },
    },

    "/api/v1/account": {
      delete: {
        tags: ["Account"],
        summary: "Delete / anonymize your account (student)",
        description:
          "Requires the current password. Hard-deletes when there is no purchase history; otherwise anonymizes the " +
          "user row so sales and invoice records stay intact.",
        security: [{ sessionCookie: [] }],
        requestBody: jsonBody({
          type: "object",
          properties: { password: { type: "string" } },
          required: ["password"],
        }),
        responses: {
          200: jsonResponse("Account removed or anonymized", Ok),
          400: jsonResponse("Missing or incorrect password", ValidationError),
          ...responses401,
          ...responses403,
        },
      },
    },

    "/api/v1/contact": {
      post: {
        tags: ["System"],
        summary: "Send a contact message by email",
        deprecated: true,
        description:
          "Legacy endpoint. The website contact form now opens the visitor's mail client with a `mailto:` link " +
          "instead of calling this. Still functional when the mail transport is configured; returns 502 when it isn't.",
        security: [],
        requestBody: jsonBody({
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            email: { type: "string", format: "email" },
            subject: { type: "string", minLength: 3, maxLength: 150 },
            message: { type: "string", minLength: 10, maxLength: 4000 },
          },
          required: ["name", "email", "subject", "message"],
        }),
        responses: {
          200: jsonResponse("Queued for delivery", Ok),
          ...responses400,
          502: jsonResponse("Mail delivery failed (e.g. RESEND_API_KEY not configured)", ErrorMessage),
        },
      },
    },
  },
} as const;

export type OpenApiDocument = typeof openApiDocument;
