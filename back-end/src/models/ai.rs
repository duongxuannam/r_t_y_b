use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, utoipa::ToSchema)]
pub struct AiGenerateRequest {
    pub prompt: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, utoipa::ToSchema)]
pub struct AiGenerateResponse {
    pub model: String,
    pub response: String,
}
