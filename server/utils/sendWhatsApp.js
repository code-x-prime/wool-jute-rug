/**
 * WhatsApp Utility using AiSensy API
 * Sends WhatsApp messages via AiSensy platform
 */

import { ApiError } from "./ApiError.js";
import { prisma } from "../config/db.js";

/**
 * Get marketing config from database
 */
const getMarketingConfig = async () => {
    let config = await prisma.marketingConfig.findFirst();
    if (!config) {
        config = await prisma.marketingConfig.create({ data: {} });
    }
    return config;
};


export const sendWhatsApp = async (options) => {
    try {
        const config = options.config || await getMarketingConfig();

        if (!config.whatsappEnabled) {
            throw new ApiError(400, "WhatsApp marketing is not enabled");
        }

        if (!config.aisensyApiKey || !config.aisensyCampaignName) {
            throw new ApiError(400, "WhatsApp API credentials not configured");
        }

        // Format destination - remove + and ensure it's just numbers
        let destination = options.destination.replace(/[^0-9]/g, '');
        // Add 91 prefix if not present (for Indian numbers)
        if (destination.length === 10) {
            destination = "91" + destination;
        }

        const payload = {
            apiKey: config.aisensyApiKey,
            campaignName: config.aisensyCampaignName,
            destination: destination,
            userName: "Desire Div",
            source: options.source || "new-landing-page form",
            templateParams: options.templateParams || ["$FirstName"],
            media: {},
            buttons: [],
            carouselCards: [],
            location: {},
            attributes: {},
            paramsFallbackValue: {}
        };
        ;

        const response = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new ApiError(response.status, data.message || data.error || "Failed to send WhatsApp message");
        }

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("WhatsApp sending error:", error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, error.message || "Failed to send WhatsApp message");
    }
};

/**
 * Test WhatsApp connection by sending a test message
 * @param {string} destination - Phone number to send test message
 * @param {Object} config - Config with apiKey and campaignName
 */
export const testWhatsAppConnection = async (destination, config) => {
    try {
        // Format destination - remove + and ensure it's just numbers
        let formattedDest = destination.replace(/[^0-9]/g, '');
        // Add 91 prefix if not present (for Indian numbers)
        if (formattedDest.length === 10) {
            formattedDest = "91" + formattedDest;
        }

        const payload = {
            apiKey: config.aisensyApiKey,
            campaignName: config.aisensyCampaignName,
            destination: formattedDest,
            userName: "Desire Div",
            source: "new-landing-page form",
            templateParams: ["$FirstName"],
            media: {},
            buttons: [],
            carouselCards: [],
            location: {},
            attributes: {},
            paramsFallbackValue: {}
        };

        const response = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        return {
            success: response.ok,
            statusCode: response.status,
            data,
        };
    } catch (error) {
        console.error("WhatsApp test error:", error);
        return {
            success: false,
            error: error.message,
        };
    }
};

export default sendWhatsApp;
