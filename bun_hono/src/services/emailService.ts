import nodemailer from 'nodemailer';
import { AppError } from '../models/error';
import type { EmailConfig } from '../config/state';

export const sendResetEmail = async (emailConfig: EmailConfig, toEmail: string, resetLink: string) => {
  const transporter = nodemailer.createTransport({
    host: emailConfig.smtpHost,
    port: emailConfig.smtpPort,
    auth: {
      user: emailConfig.smtpUsername,
      pass: emailConfig.smtpPassword,
    },
  });

  const body = `Bạn đã yêu cầu đặt lại mật khẩu.\n\nNhấn link sau để đặt lại: ${resetLink}\n\nLink hết hạn sau ${emailConfig.resetTtlMinutes} phút.`;

  try {
    await transporter.sendMail({
      from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
      to: toEmail,
      subject: 'Reset mật khẩu Todo App',
      text: body,
    });
  } catch {
    throw AppError.internal();
  }
};
