use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{HeaderMap, request::Parts},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Language {
    En,
    Vi,
}

impl Language {
    pub fn message(self, en: &str, vi: &str) -> String {
        match self {
            Language::En => en.to_string(),
            Language::Vi => vi.to_string(),
        }
    }
}

fn parse_accept_language(headers: &HeaderMap) -> Language {
    let value = headers.get(axum::http::header::ACCEPT_LANGUAGE);
    let Some(value) = value.and_then(|val| val.to_str().ok()) else {
        return Language::En;
    };

    let mut parts = value.split(',');
    let first = parts.next().unwrap_or_default().trim().to_lowercase();
    if first.starts_with("vi") {
        Language::Vi
    } else {
        Language::En
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for Language
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Ok(parse_accept_language(&parts.headers))
    }
}
