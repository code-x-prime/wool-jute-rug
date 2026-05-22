import { prisma } from "../config/db.js";


// Get Tawk.to configuration
export const getTawkToConfig = async (req, res) => {
    try {
        let config = await prisma.tawkToConfig.findFirst();

        if (!config) {
            // Create default config if doesn't exist
            config = await prisma.tawkToConfig.create({
                data: {
                    propertyId: null,
                    widgetId: null,
                    isEnabled: false,
                },
            });
        }

        res.json({
            success: true,
            data: {
                propertyId: config.propertyId || "",
                widgetId: config.widgetId || "",
                isEnabled: config.isEnabled,
            },
        });
    } catch (error) {
        console.error("Error fetching Tawk.to config:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch Tawk.to configuration",
        });
    }
};

// Update Tawk.to configuration
export const updateTawkToConfig = async (req, res) => {
    try {
        const { propertyId, widgetId, isEnabled } = req.body;

        // Validation: Can only enable if both propertyId and widgetId are provided
        if (isEnabled && (!propertyId || !widgetId)) {
            return res.status(400).json({
                success: false,
                message:
                    "Property ID and Widget ID are required to enable the chat widget",
            });
        }

        let config = await prisma.tawkToConfig.findFirst();

        if (!config) {
            // Create new config
            config = await prisma.tawkToConfig.create({
                data: {
                    propertyId: propertyId || null,
                    widgetId: widgetId || null,
                    isEnabled: isEnabled || false,
                },
            });
        } else {
            // Update existing config
            config = await prisma.tawkToConfig.update({
                where: { id: config.id },
                data: {
                    propertyId: propertyId || null,
                    widgetId: widgetId || null,
                    isEnabled: isEnabled || false,
                },
            });
        }

        res.json({
            success: true,
            message: "Tawk.to configuration updated successfully",
            data: {
                propertyId: config.propertyId || "",
                widgetId: config.widgetId || "",
                isEnabled: config.isEnabled,
            },
        });
    } catch (error) {
        console.error("Error updating Tawk.to config:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update Tawk.to configuration",
        });
    }
};

// Public endpoint to get Tawk.to config for client website
export const getPublicTawkToConfig = async (req, res) => {
    try {
        const config = await prisma.tawkToConfig.findFirst();

        if (!config || !config.isEnabled) {
            return res.json({
                success: true,
                data: {
                    isEnabled: false,
                    propertyId: null,
                    widgetId: null,
                },
            });
        }

        res.json({
            success: true,
            data: {
                isEnabled: config.isEnabled,
                propertyId: config.propertyId,
                widgetId: config.widgetId,
            },
        });
    } catch (error) {
        console.error("Error fetching public Tawk.to config:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chat configuration",
        });
    }
};
