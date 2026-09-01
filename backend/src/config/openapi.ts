import { env } from './env';

const bearer = [{ bearerAuth: [] }];
const jsonBody = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
});
const ok = (desc = 'Success') => ({
  description: desc,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessResponse' },
    },
  },
});

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NEON ARCADE Backend API',
    version: '1.0.0',
    description:
      'Production API for the NEON ARCADE gaming platform — auth, games, play tracking, scores & leaderboards, achievements, Arcade Archives (blog), notifications and admin.',
  },
  servers: [{ url: `http://localhost:${env.PORT}/api`, description: 'Local' }],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Games' },
    { name: 'Scores' },
    { name: 'Leaderboard' },
    { name: 'Achievements' },
    { name: 'Blog' },
    { name: 'Notifications' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
          meta: { type: 'object', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, example: 'neon_runner' },
          email: { type: 'string', format: 'email', nullable: true },
          password: { type: 'string', minLength: 8, example: 'Sup3rSecret' },
          confirmPassword: { type: 'string', example: 'Sup3rSecret' },
          avatar: { type: 'string', example: 'nebula' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['password'],
        properties: {
          username: { type: 'string', example: 'neon_runner' },
          email: { type: 'string', format: 'email' },
          identifier: { type: 'string', description: 'username OR email' },
          password: { type: 'string' },
        },
      },
      SubmitScoreInput: {
        type: 'object',
        required: ['gameId', 'score'],
        properties: {
          gameId: { type: 'string', example: '665f0c...' },
          score: { type: 'number', example: 52400 },
          duration: { type: 'number', description: 'seconds', example: 180 },
          playSessionId: { type: 'string', nullable: true },
          metadata: { type: 'object' },
        },
      },
      GameInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'Neon Runner' },
          slug: { type: 'string' },
          description: { type: 'string' },
          shortDescription: { type: 'string' },
          thumbnail: { type: 'string', format: 'uri' },
          banner: { type: 'string', format: 'uri' },
          category: { type: 'string', enum: ['ARCADE', 'RACING', 'SHOOTER', 'ACTION', 'CASUAL'] },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
          gameUrl: { type: 'string', format: 'uri' },
          version: { type: 'string' },
          featured: { type: 'boolean' },
          instructions: { type: 'string' },
          controls: { type: 'array', items: { type: 'string' } },
          genre: { type: 'string' },
          tagline: { type: 'string' },
          gradient: { type: 'string' },
        },
      },
      BlogInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          slug: { type: 'string' },
          excerpt: { type: 'string' },
          content: { type: 'string' },
          contentBlocks: { type: 'array', items: { type: 'string' } },
          coverImage: { type: 'string', format: 'uri' },
          category: {
            type: 'string',
            enum: ['GAME HISTORY', 'GAMING NEWS', 'GAME DEVELOPMENT', 'GAMING CULTURE', 'TIPS & TRICKS'],
          },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
        },
      },
      AdminNotificationInput: {
        type: 'object',
        required: ['title', 'message'],
        properties: {
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          target: { type: 'string', enum: ['all', 'user', 'users'], default: 'all' },
          userId: { type: 'string' },
          userIds: { type: 'array', items: { type: 'string' } },
          push: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    '/health': { get: { tags: ['Auth'], summary: 'Health check', responses: { 200: ok() } } },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account (alias: /auth/signup)',
        requestBody: jsonBody({ $ref: '#/components/schemas/RegisterInput' }),
        responses: { 201: ok('Account created'), 409: { description: 'Username/email taken' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in — returns access + refresh tokens',
        requestBody: jsonBody({ $ref: '#/components/schemas/LoginInput' }),
        responses: { 200: ok(), 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Exchange a refresh token for new tokens', responses: { 200: ok() } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Sign out (revokes sessions)', security: bearer, responses: { 200: ok() } },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user', security: bearer, responses: { 200: ok() } },
    },
    '/auth/verify': {
      get: { tags: ['Auth'], summary: 'Validate current access token', security: bearer, responses: { 200: ok() } },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password-reset email',
        requestBody: jsonBody({ type: 'object', properties: { email: { type: 'string' } } }),
        responses: { 200: ok() },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: jsonBody({
          type: 'object',
          properties: { token: { type: 'string' }, password: { type: 'string' } },
        }),
        responses: { 200: ok() },
      },
    },
    '/auth/send-verification': {
      post: { tags: ['Auth'], summary: 'Send email-verification link', security: bearer, responses: { 200: ok() } },
    },
    '/auth/verify-email/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Verify email',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },

    '/users/me': {
      get: { tags: ['Users'], summary: 'Get my profile', security: bearer, responses: { 200: ok() } },
      put: {
        tags: ['Users'],
        summary: 'Update my profile (username/avatar/bio only)',
        security: bearer,
        requestBody: jsonBody({
          type: 'object',
          properties: {
            username: { type: 'string' },
            avatar: { type: 'string' },
            bio: { type: 'string' },
          },
        }),
        responses: { 200: ok() },
      },
    },
    '/users/me/achievements': {
      get: { tags: ['Users'], summary: 'My unlocked achievements', security: bearer, responses: { 200: ok() } },
    },
    '/users/{username}': {
      get: {
        tags: ['Users'],
        summary: 'Public profile',
        parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },

    '/games': {
      get: {
        tags: ['Games'],
        summary: 'List published games',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'featured', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: ok() },
      },
      post: {
        tags: ['Games'],
        summary: 'Create game (admin)',
        security: bearer,
        requestBody: jsonBody({ $ref: '#/components/schemas/GameInput' }),
        responses: { 201: ok() },
      },
    },
    '/games/featured': { get: { tags: ['Games'], summary: 'Featured games', responses: { 200: ok() } } },
    '/games/category/{category}': {
      get: {
        tags: ['Games'],
        summary: 'Games by category',
        parameters: [{ name: 'category', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/games/{slug}': {
      get: {
        tags: ['Games'],
        summary: 'Game by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok(), 404: { description: 'Not found' } },
      },
    },
    '/games/{id}': {
      put: {
        tags: ['Games'],
        summary: 'Update game (admin)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: jsonBody({ $ref: '#/components/schemas/GameInput' }),
        responses: { 200: ok() },
      },
      delete: {
        tags: ['Games'],
        summary: 'Delete game (admin)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/games/{id}/status': {
      patch: {
        tags: ['Games'],
        summary: 'Set game status (admin)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: jsonBody({ type: 'object', properties: { status: { type: 'string' } } }),
        responses: { 200: ok() },
      },
    },
    '/games/{id}/featured': {
      patch: {
        tags: ['Games'],
        summary: 'Feature/unfeature game (admin)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: jsonBody({ type: 'object', properties: { featured: { type: 'boolean' } } }),
        responses: { 200: ok() },
      },
    },
    '/games/{gameId}/play': {
      post: {
        tags: ['Games'],
        summary: 'Start a play session',
        security: bearer,
        parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: ok() },
      },
    },
    '/games/play/complete': {
      post: {
        tags: ['Games'],
        summary: 'Complete a play session',
        security: bearer,
        requestBody: jsonBody({
          type: 'object',
          properties: {
            playSessionId: { type: 'string' },
            score: { type: 'number' },
            durationSeconds: { type: 'number' },
          },
        }),
        responses: { 200: ok() },
      },
    },

    '/scores': {
      post: {
        tags: ['Scores'],
        summary: 'Submit a score',
        security: bearer,
        requestBody: jsonBody({ $ref: '#/components/schemas/SubmitScoreInput' }),
        responses: { 201: ok() },
      },
    },
    '/scores/my': {
      get: { tags: ['Scores'], summary: 'My scores', security: bearer, responses: { 200: ok() } },
    },
    '/scores/game/{gameId}': {
      get: {
        tags: ['Scores'],
        summary: 'Scores for a game',
        parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Global leaderboard',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'range', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month', 'all'] } },
        ],
        responses: { 200: ok() },
      },
    },
    '/leaderboard/{gameId}': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Per-game leaderboard',
        parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },

    '/achievements': { get: { tags: ['Achievements'], summary: 'List active achievements', responses: { 200: ok() } } },

    '/blog': {
      get: {
        tags: ['Blog'],
        summary: 'List published Arcade Archives posts',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: ok() },
      },
      post: {
        tags: ['Blog'],
        summary: 'Create post (admin)',
        security: bearer,
        requestBody: jsonBody({ $ref: '#/components/schemas/BlogInput' }),
        responses: { 201: ok() },
      },
    },
    '/blog/{slug}': {
      get: {
        tags: ['Blog'],
        summary: 'Post by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },

    '/notifications': {
      get: { tags: ['Notifications'], summary: 'My notifications', security: bearer, responses: { 200: ok() } },
    },
    '/notifications/read-all': {
      patch: { tags: ['Notifications'], summary: 'Mark all read', security: bearer, responses: { 200: ok() } },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one read',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete notification',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },

    '/admin/users': { get: { tags: ['Admin'], summary: 'List users', security: bearer, responses: { 200: ok() } } },
    '/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update user',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/admin/users/{id}/suspend': {
      patch: {
        tags: ['Admin'],
        summary: 'Suspend user',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/admin/users/{id}/activate': {
      patch: {
        tags: ['Admin'],
        summary: 'Activate user',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/admin/notifications': {
      post: {
        tags: ['Admin'],
        summary: 'Send a notification to one/many/all users',
        security: bearer,
        requestBody: jsonBody({ $ref: '#/components/schemas/AdminNotificationInput' }),
        responses: { 201: ok() },
      },
    },
    '/admin/analytics/overview': {
      get: { tags: ['Admin'], summary: 'Dashboard overview', security: bearer, responses: { 200: ok() } },
    },
    '/admin/analytics/games': {
      get: { tags: ['Admin'], summary: 'Games analytics', security: bearer, responses: { 200: ok() } },
    },
    '/admin/analytics/users': {
      get: { tags: ['Admin'], summary: 'Users analytics', security: bearer, responses: { 200: ok() } },
    },
    '/admin/analytics/scores': {
      get: { tags: ['Admin'], summary: 'Scores analytics', security: bearer, responses: { 200: ok() } },
    },
    '/admin/scores': {
      get: { tags: ['Admin'], summary: 'List/search scores', security: bearer, responses: { 200: ok() } },
    },
    '/admin/scores/{id}/flag': {
      patch: {
        tags: ['Admin'],
        summary: 'Flag/unflag a score',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/admin/leaderboard/{gameId}/reset': {
      post: {
        tags: ['Admin'],
        summary: 'Reset a game leaderboard',
        security: bearer,
        parameters: [{ name: 'gameId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok() },
      },
    },
    '/admin/audit-logs': {
      get: { tags: ['Admin'], summary: 'Destructive-action audit trail', security: bearer, responses: { 200: ok() } },
    },
    '/admin/uploads/sign': {
      post: {
        tags: ['Admin'],
        summary: 'Get a signed image-upload target (Cloudinary/S3/local)',
        security: bearer,
        responses: { 200: ok() },
      },
    },
  },
} as const;
