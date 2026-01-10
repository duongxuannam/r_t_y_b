use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    message::{Mailbox, header::ContentType},
    transport::smtp::authentication::Credentials,
};

use crate::{error::AppError, state::EmailConfig};

pub async fn send_reset_email(
    email_config: &EmailConfig,
    to_email: &str,
    reset_link: &str,
) -> Result<(), AppError> {
    let from = Mailbox::new(
        Some(email_config.from_name.clone()),
        email_config
            .from_email
            .parse()
            .map_err(|_| AppError::Internal)?,
    );
    let to = Mailbox::new(None, to_email.parse().map_err(|_| AppError::Internal)?);

    let body = format!(
        "Bạn đã yêu cầu đặt lại mật khẩu.\n\nNhấn link sau để đặt lại: {reset_link}\n\nLink hết hạn sau {} phút.",
        email_config.reset_ttl_minutes
    );

    let email = Message::builder()
        .from(from)
        .to(to)
        .subject("Reset mật khẩu Todo App")
        .header(ContentType::TEXT_PLAIN)
        .body(body)
        .map_err(|_| AppError::Internal)?;

    let creds = Credentials::new(
        email_config.smtp_username.clone(),
        email_config.smtp_password.clone(),
    );

    let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&email_config.smtp_host)
        .map_err(|_| AppError::Internal)?
        .credentials(creds)
        .port(email_config.smtp_port)
        .build();

    mailer.send(email).await.map_err(|_| AppError::Internal)?;
    Ok(())
}
