import type { Context } from 'hono';

const scalarHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Scalar API Docs</title>
    <style>
      html, body { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <script id="api-reference" data-url="/api-doc/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js"></script>
  </body>
</html>
`;

const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Todo API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/api-doc/openapi.json', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>
`;

export const scalarUi = (c: Context) => c.html(scalarHtml);

export const swaggerUi = (c: Context) => c.html(swaggerHtml);

export const openApiSpec = (c: Context) =>
  c.json({
    openapi: '3.0.3',
    info: {
      title: 'Todo API',
      version: '1.0.0',
    },
    servers: [{ url: '/api', description: 'API base' }],
    paths: {
      '/health': { get: { tags: ['health'], responses: { '200': { description: 'OK' } } } },
      '/metrics': { get: { tags: ['metrics'], responses: { '200': { description: 'Prometheus metrics' } } } },
      '/ai/generate': { post: { tags: ['ai'], responses: { '200': { description: 'Generate response' } } } },
      '/auth/register': { post: { tags: ['auth'] } },
      '/auth/login': { post: { tags: ['auth'] } },
      '/auth/refresh': { post: { tags: ['auth'] } },
      '/auth/logout': { post: { tags: ['auth'] } },
      '/auth/forgot': { post: { tags: ['auth'] } },
      '/auth/reset': { post: { tags: ['auth'] } },
      '/todos': { get: { tags: ['todos'] }, post: { tags: ['todos'] } },
      '/todos/reorder-items': { put: { tags: ['todos'] } },
      '/todos/{id}': { get: { tags: ['todos'] }, put: { tags: ['todos'] }, delete: { tags: ['todos'] } },
      '/users': { get: { tags: ['users'] } },
    },
  });
