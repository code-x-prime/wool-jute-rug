/**
 * Media storage delete & URL - uses database StorageConfig
 * Re-exports from storageService for backward compatibility
 */

import { deleteFile, getFileUrl } from "./storageService.js";

export const deleteFromS3 = deleteFile;
export { getFileUrl };
