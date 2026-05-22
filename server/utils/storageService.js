/**
 * Media Storage Service - Database-driven
 * Supports: Digital Ocean Spaces, Cloudflare R2, AWS S3
 * Only one provider active at a time. Credentials stored encrypted in DB.
 */

import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../config/db.js";
import { encrypt, decrypt } from "./encryption.js";

let _cachedConfig = null;
let _cachedClient = null;
let _cachedProvider = null;

async function getStorageConfig() {
    if (_cachedConfig) return _cachedConfig;
    let config = await prisma.storageConfig.findFirst();
    if (!config) {
        const data = {};
        if (process.env.SPACES_ACCESS_KEY && process.env.SPACES_SECRET_KEY && process.env.SPACES_BUCKET && process.env.SPACES_ENDPOINT) {
            data.activeProvider = "DIGITAL_OCEAN";
            data.uploadFolder = process.env.UPLOAD_FOLDER || "ecom-uploads";
            data.spacesAccessKey = process.env.SPACES_ACCESS_KEY;
            data.spacesSecretKey = "enc:" + encrypt(process.env.SPACES_SECRET_KEY);
            data.spacesBucket = process.env.SPACES_BUCKET;
            data.spacesRegion = process.env.SPACES_REGION || "blr1";
            data.spacesEndpoint = process.env.SPACES_ENDPOINT;
            data.spacesCdnUrl = process.env.SPACES_CDN_URL || null;
        }
        config = await prisma.storageConfig.create({ data: Object.keys(data).length ? data : {} });
    }
    _cachedConfig = config;
    return config;
}

function clearCache() {
    _cachedConfig = null;
    _cachedClient = null;
    _cachedProvider = null;
}

function getSecret(val) {
    if (!val) return null;
    if (val.startsWith("enc:")) {
        try {
            return decrypt(val.replace("enc:", ""));
        } catch (e) {
            console.error("Storage secret decrypt error:", e.message);
            return null;
        }
    }
    return val;
}

async function getS3Client() {
    const config = await getStorageConfig();
    if (!config || !config.activeProvider) {
        throw new Error("No media storage configured. Configure in Site Settings → Media Storage.");
    }

    if (_cachedClient && _cachedProvider === config.activeProvider) {
        return _cachedClient;
    }

    let clientConfig;

    if (config.activeProvider === "DIGITAL_OCEAN") {
        const secret = getSecret(config.spacesSecretKey);
        if (!config.spacesAccessKey || !secret || !config.spacesBucket || !config.spacesEndpoint) {
            throw new Error("Digital Ocean Spaces config incomplete");
        }
        clientConfig = {
            endpoint: config.spacesEndpoint,
            region: config.spacesRegion || "blr1",
            credentials: {
                accessKeyId: config.spacesAccessKey,
                secretAccessKey: secret,
            },
            forcePathStyle: false,
        };
    } else if (config.activeProvider === "CLOUDFLARE_R2") {
        const secret = getSecret(config.r2SecretAccessKey);
        if (!config.r2AccountId || !config.r2AccessKeyId || !secret || !config.r2BucketName) {
            throw new Error("Cloudflare R2 config incomplete");
        }
        clientConfig = {
            endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
            region: "auto",
            credentials: {
                accessKeyId: config.r2AccessKeyId,
                secretAccessKey: secret,
            },
            forcePathStyle: true,
        };
    } else if (config.activeProvider === "AWS_S3") {
        const secret = getSecret(config.s3SecretAccessKey);
        if (!config.s3AccessKeyId || !secret || !config.s3BucketName || !config.s3Region) {
            throw new Error("AWS S3 config incomplete");
        }
        clientConfig = {
            region: config.s3Region,
            credentials: {
                accessKeyId: config.s3AccessKeyId,
                secretAccessKey: secret,
            },
        };
        if (config.s3Endpoint) {
            clientConfig.endpoint = config.s3Endpoint;
            clientConfig.forcePathStyle = true;
        }
    } else {
        throw new Error(`Unknown storage provider: ${config.activeProvider}`);
    }

    _cachedClient = new S3Client(clientConfig);
    _cachedProvider = config.activeProvider;
    return _cachedClient;
}

async function getBucketAndConfig() {
    const config = await getStorageConfig();
    if (!config || !config.activeProvider) return null;

    let bucket;
    if (config.activeProvider === "DIGITAL_OCEAN") bucket = config.spacesBucket;
    else if (config.activeProvider === "CLOUDFLARE_R2") bucket = config.r2BucketName;
    else if (config.activeProvider === "AWS_S3") bucket = config.s3BucketName;
    else return null;

    return { config, bucket };
}

/**
 * Upload file buffer to active storage
 */
export async function uploadFile(buffer, key, options = {}) {
    const { config, bucket } = await getBucketAndConfig();
    if (!config || !bucket) {
        throw new Error("No media storage configured");
    }

    const client = await getS3Client();
    const uploadFolder = config.uploadFolder || "ecom-uploads";
    const fullKey = key.startsWith(uploadFolder) ? key : `${uploadFolder}/${key}`;

    const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        Body: buffer,
        ContentType: options.contentType || "application/octet-stream",
        ACL: options.acl || "public-read",
    });

    await client.send(cmd);
    return fullKey;
}

/**
 * Delete file from active storage
 */
export async function deleteFile(fileUrlOrKey) {
    const { bucket } = await getBucketAndConfig();
    if (!bucket) return;

    let key;
    if (fileUrlOrKey && fileUrlOrKey.startsWith("http")) {
        try {
            const parsed = new URL(fileUrlOrKey);
            key = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
        } catch {
            return;
        }
    } else if (fileUrlOrKey) {
        key = fileUrlOrKey.startsWith("/") ? fileUrlOrKey.slice(1) : fileUrlOrKey;
    } else {
        return;
    }

    try {
        const client = await getS3Client();
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
        console.error("Storage delete error:", error);
        throw error;
    }
}

/**
 * Get public URL for a file key (sync - uses cached config from initStorageConfig)
 */
export function getFileUrl(keyOrFilename) {
    if (!keyOrFilename) return null;
    // If already full URL, return as-is (backward compat with existing data)
    if (keyOrFilename.startsWith("http")) return keyOrFilename;

    const key = keyOrFilename.startsWith("/") ? keyOrFilename.slice(1) : keyOrFilename;

    // Fallback: when DB config not set, use env vars for backward compat
    if (!_cachedConfig || !_cachedConfig.activeProvider) {
        if (process.env.SPACES_BUCKET && process.env.SPACES_REGION) {
            const cdn = process.env.SPACES_CDN_URL;
            if (cdn) return `${cdn.replace(/\/$/, "")}/${key}`;
            return `https://${process.env.SPACES_BUCKET}.${process.env.SPACES_REGION}.digitaloceanspaces.com/${key}`;
        }
        return null;
    }

    const config = _cachedConfig;

    if (config.activeProvider === "DIGITAL_OCEAN") {
        if (config.spacesCdnUrl) {
            return `${config.spacesCdnUrl.replace(/\/$/, "")}/${key}`;
        }
        return `https://${config.spacesBucket}.${config.spacesRegion || "blr1"}.digitaloceanspaces.com/${key}`;
    }

    if (config.activeProvider === "CLOUDFLARE_R2") {
        if (config.r2PublicUrl) {
            return `${config.r2PublicUrl.replace(/\/$/, "")}/${key}`;
        }
        return `https://${config.r2BucketName}.r2.cloudflarestorage.com/${key}`;
    }

    if (config.activeProvider === "AWS_S3") {
        if (config.s3PublicUrl) {
            return `${config.s3PublicUrl.replace(/\/$/, "")}/${key}`;
        }
        return `https://${config.s3BucketName}.s3.${config.s3Region}.amazonaws.com/${key}`;
    }

    return null;
}

/**
 * Ensure config is loaded (call at app startup or before first upload)
 */
export async function initStorageConfig() {
    clearCache();
    const config = await getStorageConfig();
    if (config && config.activeProvider) {
        try {
            await getS3Client();
        } catch (e) {
            console.warn("Storage init warning:", e.message);
        }
    }
}

export { getStorageConfig, clearCache };
