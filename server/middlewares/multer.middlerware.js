import multer from "multer";
import sharp from "sharp";
import { uploadFile, deleteFile, getFileUrl } from "../utils/storageService.js";

const storage = multer.memoryStorage();
export const uploadFiles = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
});

export const processAndUploadImage = async (file, subfolder = "images") => {
    try {
        const { originalname, buffer } = file;
        if (!buffer) throw new Error("File buffer is missing");

        const timestamp = Date.now();
        const sanitizedName = originalname.toLowerCase().replace(/[^a-z0-9.]/g, "-");
        const fileExtension = originalname.split(".").pop().toLowerCase();

        const key = `${subfolder}/${timestamp}-${sanitizedName}`;

        const processedBuffer = await sharp(buffer)
            .resize(1200, null, { withoutEnlargement: true })
            .toBuffer();

        const contentType = fileExtension === "png" ? "image/png" : fileExtension === "gif" ? "image/gif" : "image/jpeg";

        const filename = await uploadFile(processedBuffer, key, {
            contentType,
            acl: "public-read",
        });

        return filename;
    } catch (error) {
        console.error("Image processing/upload failed:", error);
        throw error;
    }
};

export const uploadPDF = async (file) => {
    const { originalname, buffer, mimetype } = file;
    const key = `pdfs/${Date.now()}-${originalname.toLowerCase().split(" ").join("-")}`;
    return uploadFile(buffer, key, {
        contentType: mimetype || "application/pdf",
        acl: "public-read",
    });
};

export const uploadAudio = async (file) => {
    const { originalname, buffer, mimetype } = file;
    const key = `audio/${Date.now()}-${originalname.toLowerCase().split(" ").join("-")}`;
    return uploadFile(buffer, key, {
        contentType: mimetype || "audio/mpeg",
        acl: "public-read",
    });
};

export const uploadVideo = async (file) => {
    const { originalname, buffer, mimetype } = file;
    const ext = originalname.split(".").pop()?.toLowerCase() || "mp4";
    const key = `videos/${Date.now()}-${originalname.toLowerCase().replace(/[^a-z0-9.]/g, "-")}`;
    const contentType = mimetype || (ext === "webm" ? "video/webm" : "video/mp4");
    return uploadFile(buffer, key, {
        contentType,
        acl: "public-read",
    });
};

export const processFiles = async (req, res, next) => {
    try {
        if (req.files?.thumbnail) {
            const filename = await processAndUploadImage(req.files.thumbnail[0], "thumbnails");
            req.files.thumbnail[0].filename = filename;
        }
        if (req.files?.pdf) {
            const filename = await uploadPDF(req.files.pdf[0]);
            req.files.pdf[0].filename = filename;
        }
        if (req.files?.audio) {
            const filename = await uploadAudio(req.files.audio[0]);
            req.files.audio[0].filename = filename;
        }
        next();
    } catch (error) {
        next(error);
    }
};

export { getFileUrl, deleteFile };
