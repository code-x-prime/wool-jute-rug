/**
 * Media Storage Controller
 * Digital Ocean, Cloudflare R2, AWS S3 - only one active at a time
 */

import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { encrypt } from "../utils/encryption.js";
import { clearCache } from "../utils/storageService.js";

function maskConfig(config) {
    if (!config) return null;
    const m = { ...config };
    if (m.spacesSecretKey) m.spacesSecretKey = "********";
    if (m.r2SecretAccessKey) m.r2SecretAccessKey = "********";
    if (m.s3SecretAccessKey) m.s3SecretAccessKey = "********";
    return m;
}

export const getStorageConfig = asyncHandler(async (req, res) => {
    let config = await prisma.storageConfig.findFirst();
    if (!config) {
        config = await prisma.storageConfig.create({ data: {} });
    }
    res.status(200).json(
        new ApiResponsive(200, { config: maskConfig(config) }, "Storage config fetched")
    );
});

export const updateStorageConfig = asyncHandler(async (req, res) => {
    const body = req.body;

    let config = await prisma.storageConfig.findFirst();
    if (!config) {
        config = await prisma.storageConfig.create({ data: {} });
    }

    const updateData = {};

    // Active provider - only one at a time
    if (body.activeProvider !== undefined) {
        const valid = ["DIGITAL_OCEAN", "CLOUDFLARE_R2", "AWS_S3", null];
        if (body.activeProvider && !valid.includes(body.activeProvider)) {
            throw new ApiError(400, "Invalid active provider");
        }
        updateData.activeProvider = body.activeProvider;
    }

    if (body.uploadFolder !== undefined) updateData.uploadFolder = body.uploadFolder;

    // Digital Ocean
    if (body.spacesAccessKey !== undefined) updateData.spacesAccessKey = body.spacesAccessKey;
    if (body.spacesBucket !== undefined) updateData.spacesBucket = body.spacesBucket;
    if (body.spacesRegion !== undefined) updateData.spacesRegion = body.spacesRegion;
    if (body.spacesEndpoint !== undefined) updateData.spacesEndpoint = body.spacesEndpoint;
    if (body.spacesCdnUrl !== undefined) updateData.spacesCdnUrl = body.spacesCdnUrl;
    if (body.spacesSecretKey && body.spacesSecretKey !== "********") {
        try {
            updateData.spacesSecretKey = "enc:" + encrypt(body.spacesSecretKey.trim());
        } catch (e) {
            throw new ApiError(400, "Failed to encrypt Spaces secret");
        }
    }

    // Cloudflare R2
    if (body.r2AccountId !== undefined) updateData.r2AccountId = body.r2AccountId;
    if (body.r2AccessKeyId !== undefined) updateData.r2AccessKeyId = body.r2AccessKeyId;
    if (body.r2BucketName !== undefined) updateData.r2BucketName = body.r2BucketName;
    if (body.r2PublicUrl !== undefined) updateData.r2PublicUrl = body.r2PublicUrl;
    if (body.r2SecretAccessKey && body.r2SecretAccessKey !== "********") {
        try {
            updateData.r2SecretAccessKey = "enc:" + encrypt(body.r2SecretAccessKey.trim());
        } catch (e) {
            throw new ApiError(400, "Failed to encrypt R2 secret");
        }
    }

    // AWS S3
    if (body.s3AccessKeyId !== undefined) updateData.s3AccessKeyId = body.s3AccessKeyId;
    if (body.s3BucketName !== undefined) updateData.s3BucketName = body.s3BucketName;
    if (body.s3Region !== undefined) updateData.s3Region = body.s3Region;
    if (body.s3Endpoint !== undefined) updateData.s3Endpoint = body.s3Endpoint;
    if (body.s3PublicUrl !== undefined) updateData.s3PublicUrl = body.s3PublicUrl;
    if (body.s3SecretAccessKey && body.s3SecretAccessKey !== "********") {
        try {
            updateData.s3SecretAccessKey = "enc:" + encrypt(body.s3SecretAccessKey.trim());
        } catch (e) {
            throw new ApiError(400, "Failed to encrypt S3 secret");
        }
    }

    const updated = await prisma.storageConfig.update({
        where: { id: config.id },
        data: updateData,
    });

    clearCache();

    res.status(200).json(
        new ApiResponsive(200, { config: maskConfig(updated) }, "Storage config updated")
    );
});
