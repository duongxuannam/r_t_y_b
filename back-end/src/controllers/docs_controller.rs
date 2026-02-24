use axum::{Router, response::Html};
use utoipa_swagger_ui::SwaggerUi;

use crate::state::AppState;

#[utoipa::path(
    get,
    path = "/docs/scalar",
    tag = "docs",
    responses((status = 200, description = "Scalar UI"))
)]
pub async fn scalar_ui() -> Html<String> {
    let html = r#"<!doctype html>
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
"#;

    Html(html.to_string())
}

pub fn routes(openapi: utoipa::openapi::OpenApi) -> Router<AppState> {
    Router::new()
        .route("/api/docs/scalar", axum::routing::get(scalar_ui))
        .merge(SwaggerUi::new("/api/docs").url("/api-doc/openapi.json", openapi))
}
