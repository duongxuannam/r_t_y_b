use std::time::Duration;

use http_body_util::{BodyExt, Full};
use hyper::{Method, Request, StatusCode};
use hyper::body::Bytes;
use hyper_util::client::legacy::{Client, connect::HttpConnector};
use hyper_util::rt::TokioExecutor;

use crate::{
    error::AppError,
    models::ai::{AiGenerateRequest, AiGenerateResponse},
    state::AppState,
};

#[derive(Debug, serde::Serialize)]
struct OllamaGenerateRequest<'a> {
    model: &'a str,
    prompt: &'a str,
    stream: bool,
}

#[derive(Debug, serde::Deserialize)]
struct OllamaGenerateResponse {
    model: String,
    response: String,
}

pub async fn generate(
    state: &AppState,
    payload: AiGenerateRequest,
) -> Result<AiGenerateResponse, AppError> {
    let model = payload
        .model
        .unwrap_or_else(|| state.ollama.default_model.clone());
    let url = format!(
        "{}/api/generate",
        state.ollama.base_url.trim_end_matches('/')
    );

    let body = serde_json::to_vec(&OllamaGenerateRequest {
        model: &model,
        prompt: &payload.prompt,
        stream: false,
    })
    .map_err(|error| {
        tracing::error!("failed to serialize ollama request: {error}");
        AppError::Internal
    })?;

    let request = Request::builder()
        .method(Method::POST)
        .uri(url)
        .header("Content-Type", "application/json")
        .body(Full::new(Bytes::from(body)))
        .map_err(|error| {
            tracing::error!("failed to build ollama request: {error}");
            AppError::Internal
        })?;

    let client: Client<HttpConnector, Full<Bytes>> =
        Client::builder(TokioExecutor::new()).build_http();

    let response = tokio::time::timeout(
        Duration::from_secs(state.ollama.timeout_seconds),
        client.request(request),
    )
    .await
    .map_err(|_| {
        tracing::error!("ollama request timed out");
        AppError::Internal
    })?
    .map_err(|error| {
        tracing::error!("ollama request failed: {error}");
        AppError::Internal
    })?;

    let status = response.status();
    let body_bytes = response
        .into_body()
        .collect()
        .await
        .map_err(|error| {
            tracing::error!("failed to read ollama response: {error}");
            AppError::Internal
        })?
        .to_bytes();

    if !status.is_success() {
        let body_text = String::from_utf8_lossy(&body_bytes);
        let message = if body_text.trim().is_empty() {
            format!("ollama request failed with status {status}")
        } else {
            format!("ollama request failed: {body_text}")
        };
        return Err(match status {
            StatusCode::BAD_REQUEST => AppError::BadRequest(message),
            _ => AppError::Internal,
        });
    }

    let response_body =
        serde_json::from_slice::<OllamaGenerateResponse>(&body_bytes).map_err(|error| {
            tracing::error!("invalid ollama response: {error}");
            AppError::Internal
        })?;

    Ok(AiGenerateResponse {
        model: response_body.model,
        response: response_body.response,
    })
}
