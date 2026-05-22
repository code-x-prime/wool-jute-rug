/**
 * Marketing Admin Controller
 * Handles admin operations for Email and WhatsApp marketing
 */

import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import nodemailer from "nodemailer";
import { encrypt, decrypt } from "../utils/encryption.js";
import { sendWhatsApp, testWhatsAppConnection } from "../utils/sendWhatsApp.js";

// Get marketing configuration
export const getConfig = asyncHandler(async (req, res) => {
    let config = await prisma.marketingConfig.findFirst();

    if (!config) {
        config = await prisma.marketingConfig.create({ data: {} });
    }

    // Mask sensitive data
    const maskedConfig = {
        ...config,
        smtpPassword: config.smtpPassword ? "********" : null,
        aisensyApiKey: config.aisensyApiKey ? "********" : null,
    };

    res.status(200).json(
        new ApiResponsive(200, { config: maskedConfig }, "Marketing config fetched successfully")
    );
});

// Update marketing configuration
export const updateConfig = asyncHandler(async (req, res) => {
    const {
        emailEnabled,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
        fromEmail,
        fromName,
        whatsappEnabled,
        aisensyApiKey,
        aisensyCampaignName,
        whatsappSenderName,
    } = req.body;

    let config = await prisma.marketingConfig.findFirst();

    if (!config) {
        config = await prisma.marketingConfig.create({ data: {} });
    }

    const updateData = { updatedBy: req.admin?.id };

    if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = parseInt(smtpPort);
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (smtpPassword && smtpPassword !== "********") {
        try {
            updateData.smtpPassword = "enc:" + encrypt(smtpPassword.trim());
        } catch (e) {
            throw new ApiError(400, "Failed to encrypt SMTP password");
        }
    }
    if (fromEmail !== undefined) updateData.fromEmail = fromEmail;
    if (fromName !== undefined) updateData.fromName = fromName;
    if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;
    if (aisensyApiKey && aisensyApiKey !== "********") updateData.aisensyApiKey = aisensyApiKey;
    if (aisensyCampaignName !== undefined) updateData.aisensyCampaignName = aisensyCampaignName;
    if (whatsappSenderName !== undefined) updateData.whatsappSenderName = whatsappSenderName;

    const updatedConfig = await prisma.marketingConfig.update({
        where: { id: config.id },
        data: updateData,
    });

    // Mask sensitive data
    const maskedConfig = {
        ...updatedConfig,
        smtpPassword: updatedConfig.smtpPassword ? "********" : null,
        aisensyApiKey: updatedConfig.aisensyApiKey ? "********" : null,
    };

    res.status(200).json(
        new ApiResponsive(200, { config: maskedConfig }, "Marketing config updated successfully")
    );
});

// Test email connection - uses DB config only (no .env fallback)
export const testEmailConnection = asyncHandler(async (req, res) => {
    const { testEmail } = req.body;

    if (!testEmail) {
        throw new ApiError(400, "Test email address is required");
    }

    const config = await prisma.marketingConfig.findFirst();
    if (!config || !config.smtpHost || !config.smtpUser || !config.smtpPassword) {
        throw new ApiError(400, "Configure SMTP settings and save before testing");
    }

    let password = config.smtpPassword;
    if (config.smtpPassword.startsWith("enc:")) {
        try {
            password = decrypt(config.smtpPassword.replace("enc:", ""));
        } catch (e) {
            throw new ApiError(400, "Failed to decrypt SMTP password. Re-enter and save.");
        }
    }

    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpPort === 465,
        auth: { user: config.smtpUser, pass: password },
    });

    try {
        await transporter.verify();
        const fromName = config.fromName || "Your Store";
        const fromEmail = config.fromEmail || config.smtpUser || "noreply@store.com";

        await transporter.sendMail({
            from: `${fromName} <${fromEmail}>`,
            to: testEmail,
            subject: "Test Email - Email Delivery Configuration",
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Configuration Test Successful</h2>
          <p>Your email delivery configuration is working correctly.</p>
          <p>Order confirmation, OTP, verify, forgot password emails will be sent via this setup.</p>
        </div>
      `,
        });

        res.status(200).json(
            new ApiResponsive(200, { success: true }, "Test email sent successfully")
        );
    } catch (error) {
        throw new ApiError(400, `Email test failed: ${error.message}`);
    }
});

// Test WhatsApp connection
export const testWhatsAppConnectionHandler = asyncHandler(async (req, res) => {
    const { testPhone } = req.body;

    if (!testPhone) {
        throw new ApiError(400, "Test phone number is required");
    }

    let config = await prisma.marketingConfig.findFirst();

    if (!config || !config.aisensyApiKey || !config.aisensyCampaignName) {
        throw new ApiError(400, "WhatsApp configuration is incomplete");
    }

    const result = await testWhatsAppConnection(testPhone, config);

    if (!result.success) {
        throw new ApiError(400, `WhatsApp test failed: ${result.error || result.data?.message || "Unknown error"}`);
    }

    res.status(200).json(
        new ApiResponsive(200, { success: true, data: result.data }, "Test WhatsApp message sent successfully")
    );
});

// Get audience count by type
export const getAudienceCount = asyncHandler(async (req, res) => {
    const { type } = req.params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let count = 0;
    let whereClause = {};

    switch (type) {
        case "ALL_USERS":
            count = await prisma.user.count({ where: { isActive: true } });
            break;
        case "NEW_USERS":
            count = await prisma.user.count({
                where: { isActive: true, createdAt: { gte: thirtyDaysAgo } },
            });
            break;
        case "OLD_USERS":
            count = await prisma.user.count({
                where: { isActive: true, createdAt: { lt: thirtyDaysAgo } },
            });
            break;
        case "ABANDONED_CART":
            count = await prisma.user.count({
                where: {
                    isActive: true,
                    cartItems: { some: {} },
                },
            });
            break;
        case "REPEAT_BUYERS":
            const repeatBuyers = await prisma.user.findMany({
                where: { isActive: true },
                select: { id: true, _count: { select: { orders: true } } },
            });
            count = repeatBuyers.filter((u) => u._count.orders > 1).length;
            break;
        case "TOP_BUYERS":
            const topBuyers = await prisma.order.groupBy({
                by: ["userId"],
                _sum: { total: true },
                orderBy: { _sum: { total: "desc" } },
                take: 100,
            });
            count = topBuyers.length;
            break;
        default:
            throw new ApiError(400, "Invalid audience type");
    }

    res.status(200).json(
        new ApiResponsive(200, { type, count }, "Audience count fetched successfully")
    );
});

// Get users by audience type
export const getAudienceUsers = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let users = [];

    switch (type) {
        case "ALL_USERS":
            users = await prisma.user.findMany({
                where: { isActive: true },
                select: { id: true, email: true, name: true, phone: true },
                skip,
                take: parseInt(limit),
            });
            break;
        case "NEW_USERS":
            users = await prisma.user.findMany({
                where: { isActive: true, createdAt: { gte: thirtyDaysAgo } },
                select: { id: true, email: true, name: true, phone: true },
                skip,
                take: parseInt(limit),
            });
            break;
        case "OLD_USERS":
            users = await prisma.user.findMany({
                where: { isActive: true, createdAt: { lt: thirtyDaysAgo } },
                select: { id: true, email: true, name: true, phone: true },
                skip,
                take: parseInt(limit),
            });
            break;
        case "ABANDONED_CART":
            users = await prisma.user.findMany({
                where: { isActive: true, cartItems: { some: {} } },
                select: { id: true, email: true, name: true, phone: true },
                skip,
                take: parseInt(limit),
            });
            break;
        case "REPEAT_BUYERS":
            const repeatBuyers = await prisma.user.findMany({
                where: { isActive: true },
                select: { id: true, email: true, name: true, phone: true, _count: { select: { orders: true } } },
            });
            users = repeatBuyers.filter((u) => u._count.orders > 1).slice(skip, skip + parseInt(limit));
            break;
        case "TOP_BUYERS":
            const topBuyers = await prisma.order.groupBy({
                by: ["userId"],
                _sum: { total: true },
                orderBy: { _sum: { total: "desc" } },
                take: 100,
            });
            const topUserIds = topBuyers.map((b) => b.userId).filter(Boolean);
            users = await prisma.user.findMany({
                where: { id: { in: topUserIds } },
                select: { id: true, email: true, name: true, phone: true },
                skip,
                take: parseInt(limit),
            });
            break;
        default:
            throw new ApiError(400, "Invalid audience type");
    }

    res.status(200).json(
        new ApiResponsive(200, { users }, "Audience users fetched successfully")
    );
});

// Send email campaign
export const sendEmailCampaign = asyncHandler(async (req, res) => {
    const { name, subject, content, targetAudience } = req.body;

    if (!name || !subject || !content || !targetAudience) {
        throw new ApiError(400, "Name, subject, content, and target audience are required");
    }

    const config = await prisma.marketingConfig.findFirst();

    if (!config || !config.emailEnabled) {
        throw new ApiError(400, "Email marketing is not enabled");
    }

    // Create campaign
    const campaign = await prisma.marketingCampaign.create({
        data: {
            type: "EMAIL",
            name,
            subject,
            content,
            targetAudience,
            status: "SENDING",
            createdBy: req.admin?.id,
        },
    });

    // Get users
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let whereClause = { isActive: true };

    switch (targetAudience) {
        case "NEW_USERS":
            whereClause.createdAt = { gte: thirtyDaysAgo };
            break;
        case "OLD_USERS":
            whereClause.createdAt = { lt: thirtyDaysAgo };
            break;
        case "ABANDONED_CART":
            whereClause.cartItems = { some: {} };
            break;
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true, email: true, name: true },
    });

    // Setup transporter
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpPort === 465,
        auth: {
            user: config.smtpUser,
            pass: config.smtpPassword,
        },
    });

    let successCount = 0;
    let failureCount = 0;

    // Send emails
    for (const user of users) {
        if (!user.email) continue;

        try {
            await transporter.sendMail({
                from: `${config.fromName || "Newsletter"} <${config.fromEmail || config.smtpUser}>`,
                to: user.email,
                subject,
                html: content.replace(/\{\{name\}\}/g, user.name || "Customer"),
            });

            await prisma.marketingLog.create({
                data: {
                    campaignId: campaign.id,
                    userId: user.id,
                    recipient: user.email,
                    status: "SUCCESS",
                },
            });

            successCount++;
        } catch (error) {
            await prisma.marketingLog.create({
                data: {
                    campaignId: campaign.id,
                    userId: user.id,
                    recipient: user.email,
                    status: "FAILED",
                    error: error.message,
                },
            });

            failureCount++;
        }
    }

    // Update campaign
    await prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
            status: "COMPLETED",
            totalRecipients: users.length,
            successCount,
            failureCount,
            sentAt: new Date(),
        },
    });

    res.status(200).json(
        new ApiResponsive(200, { campaignId: campaign.id, successCount, failureCount }, "Email campaign sent")
    );
});

// Send WhatsApp campaign
export const sendWhatsAppCampaign = asyncHandler(async (req, res) => {
    const { name, content, targetAudience, templateParams } = req.body;

    if (!name || !content || !targetAudience) {
        throw new ApiError(400, "Name, content, and target audience are required");
    }

    const config = await prisma.marketingConfig.findFirst();

    if (!config || !config.whatsappEnabled) {
        throw new ApiError(400, "WhatsApp marketing is not enabled");
    }

    // Create campaign
    const campaign = await prisma.marketingCampaign.create({
        data: {
            type: "WHATSAPP",
            name,
            content,
            targetAudience,
            status: "SENDING",
            createdBy: req.admin?.id,
        },
    });

    // Get users
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let whereClause = { isActive: true, phone: { not: null } };

    switch (targetAudience) {
        case "NEW_USERS":
            whereClause.createdAt = { gte: thirtyDaysAgo };
            break;
        case "OLD_USERS":
            whereClause.createdAt = { lt: thirtyDaysAgo };
            break;
        case "ABANDONED_CART":
            whereClause.cartItems = { some: {} };
            break;
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true, phone: true, name: true },
    });

    let successCount = 0;
    let failureCount = 0;

    // Send WhatsApp messages
    for (const user of users) {
        if (!user.phone) continue;

        try {
            await sendWhatsApp({
                destination: user.phone,
                userName: user.name || "Customer",
                templateParams: templateParams || [],
                config,
            });

            await prisma.marketingLog.create({
                data: {
                    campaignId: campaign.id,
                    userId: user.id,
                    recipient: user.phone,
                    status: "SUCCESS",
                },
            });

            successCount++;
        } catch (error) {
            await prisma.marketingLog.create({
                data: {
                    campaignId: campaign.id,
                    userId: user.id,
                    recipient: user.phone,
                    status: "FAILED",
                    error: error.message,
                },
            });

            failureCount++;
        }
    }

    // Update campaign
    await prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
            status: "COMPLETED",
            totalRecipients: users.length,
            successCount,
            failureCount,
            sentAt: new Date(),
        },
    });

    res.status(200).json(
        new ApiResponsive(200, { campaignId: campaign.id, successCount, failureCount }, "WhatsApp campaign sent")
    );
});

// Get all campaigns
export const getCampaigns = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = type ? { type } : {};

    const [campaigns, total] = await Promise.all([
        prisma.marketingCampaign.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            skip,
            take: parseInt(limit),
        }),
        prisma.marketingCampaign.count({ where: whereClause }),
    ]);

    res.status(200).json(
        new ApiResponsive(200, { campaigns, total, page: parseInt(page), limit: parseInt(limit) }, "Campaigns fetched")
    );
});

// Get campaign details with logs
export const getCampaignDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const campaign = await prisma.marketingCampaign.findUnique({
        where: { id },
        include: {
            logs: {
                orderBy: { sentAt: "desc" },
                take: 100,
            },
        },
    });

    if (!campaign) {
        throw new ApiError(404, "Campaign not found");
    }

    res.status(200).json(
        new ApiResponsive(200, { campaign }, "Campaign details fetched")
    );
});
