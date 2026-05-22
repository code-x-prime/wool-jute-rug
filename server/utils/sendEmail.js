/**
 * Email sending utility
 * Uses MarketingConfig from database - NO emails sent until admin configures and enables
 * Order confirmation, OTP, verify, forgot password, etc. all require admin to fill & enable
 */

import nodemailer from "nodemailer";
import { prisma } from "../config/db.js";
import { decrypt } from "./encryption.js";

/**
 * Get email config from database
 */
async function getEmailConfig() {
    const config = await prisma.marketingConfig.findFirst();
    return config;
}

/**
 * Send email - only works when admin has configured and enabled in Email Delivery settings
 * Returns null if not configured/enabled (no error thrown)
 */
const sendEmail = async (options) => {
    try {
        const config = await getEmailConfig();

        if (!config || !config.emailEnabled) {
            console.log("Email not sent: Admin has not configured or enabled email delivery");
            return null;
        }

        if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
            console.log("Email not sent: SMTP credentials not configured in Email Delivery settings");
            return null;
        }

        let password = config.smtpPassword;
        if (config.smtpPassword.startsWith("enc:")) {
            try {
                password = decrypt(config.smtpPassword.replace("enc:", ""));
            } catch (e) {
                console.error("Failed to decrypt SMTP password:", e.message);
                return null;
            }
        }

        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort || 587,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: password,
            },
        });

        const fromName = config.fromName || "Your Store";
        const fromEmail = config.fromEmail || config.smtpUser;
        const fromAddress = `${fromName} <${fromEmail}>`;

        const mailOptions = {
            from: fromAddress,
            to: options.email,
            subject: options.subject,
            html: options.html,
            attachments: options.attachments || [],
        };

        const info = await transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV !== "production" && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log("Email preview URL:", previewUrl);
            }
        }

        return info;
    } catch (error) {
        console.error("Email sending error:", error);
        throw error;
    }
};

export default sendEmail;
