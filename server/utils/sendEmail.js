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

        // Determine if email delivery is enabled (via DB setting or fallback env SMTP variables)
        const emailEnabled = config ? config.emailEnabled : (process.env.SMTP_USER ? true : false);

        if (!emailEnabled) {
            console.log("Email not sent: Email delivery is not configured or enabled");
            return null;
        }

        // Host, user, password, port fallback to env variables
        const host = config?.smtpHost || process.env.SMTP_HOST;
        const user = config?.smtpUser || process.env.SMTP_USER;
        let rawPassword = config?.smtpPassword || process.env.SMTP_PASSWORD;

        if (!host || !user || !rawPassword) {
            console.log("Email not sent: SMTP host, user, or password is not configured");
            return null;
        }

        let password = rawPassword;
        if (rawPassword.startsWith("enc:")) {
            try {
                password = decrypt(rawPassword.replace("enc:", ""));
            } catch (e) {
                console.error("Failed to decrypt SMTP password:", e.message);
                return null;
            }
        }

        const port = config?.smtpPort || parseInt(process.env.SMTP_PORT || "587");
        const transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: port === 465,
            auth: {
                user: user,
                pass: password,
            },
        });

        const fromName = config?.fromName || process.env.FROM_NAME || "Wool Jute Rug";
        const fromEmail = config?.fromEmail || process.env.FROM_EMAIL || user;
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
