import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import {
  processAndUploadImage,
  uploadVideo,
} from "../middlewares/multer.middlerware.js";

const MAX_PHOTOS = 20;
const MAX_VIDEO_BYTES = 10 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_CUSTOM_FIELDS = 5;
const MAX_MATERIALS = 5;

const parseJson = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(400, "Invalid JSON payload");
  }
};

const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const toMoneyOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Strip the CDN prefix so we can compare against stored keys.
const toStoredKey = (url, knownKeys) => {
  if (!url) return url;
  for (const key of knownKeys) {
    if (key && (url === key || getFileUrl(key) === url)) return key;
  }
  return url;
};

// GET /admin/products/:productId/listing
export const getListing = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: { include: { category: true } },
      images: { orderBy: { order: "asc" } },
      customFields: { orderBy: { order: "asc" } },
      variants: {
        orderBy: { createdAt: "asc" },
        include: {
          images: { orderBy: { order: "asc" } },
          pricingSlabs: true,
          attributes: {
            include: { attributeValue: { include: { attribute: true } } },
          },
        },
      },
    },
  });
  if (!product) throw new ApiError(404, "Product not found");

  const data = {
    ...product,
    videoUrl: product.videoUrl ? getFileUrl(product.videoUrl) : null,
    videoUrl2: product.videoUrl2 ? getFileUrl(product.videoUrl2) : null,
    categories: product.categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      isPrimary: pc.isPrimary,
    })),
    images: product.images.map((img) => ({ ...img, url: getFileUrl(img.url) })),
    variants: product.variants.map((v) => ({
      ...v,
      images: v.images.map((img) => ({ ...img, url: getFileUrl(img.url) })),
      attributes: v.attributes.map((a) => ({
        attributeId: a.attributeValue.attributeId,
        attribute: a.attributeValue.attribute.name,
        attributeValueId: a.attributeValueId,
        value: a.attributeValue.value,
      })),
    })),
  };

  res.status(200).json(new ApiResponsive(200, { product: data }, "Listing fetched"));
});

/**
 * POST /admin/products/:productId/listing-media  (multipart)
 * Fields: photos[] (new files), video, video2
 * Body: layout JSON — ordered photo slots: {kind:"existing", id} | {kind:"variant", url} | {kind:"new", file:index}
 *       variantLinks JSON — [{variantId, slots:[layoutIndex,...]}]
 *       removeVideo / removeVideo2 = "true"
 */
export const saveListingMedia = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true, variants: { include: { images: true } } },
  });
  if (!product) throw new ApiError(404, "Product not found");

  const layout = parseJson(req.body.layout, []);
  const variantLinks = parseJson(req.body.variantLinks, []);
  if (!Array.isArray(layout) || !Array.isArray(variantLinks)) {
    throw new ApiError(400, "layout and variantLinks must be arrays");
  }
  if (layout.length > MAX_PHOTOS) {
    throw new ApiError(400, `Maximum ${MAX_PHOTOS} photos allowed`);
  }

  const newFiles = req.files?.photos || [];
  for (const f of newFiles) {
    if (!f.mimetype?.startsWith("image/")) throw new ApiError(400, `${f.originalname} is not an image`);
  }

  const productImageById = new Map(product.images.map((i) => [i.id, i]));
  const allVariantImageUrls = product.variants.flatMap((v) => v.images.map((i) => i.url));

  // 1. Resolve every layout slot to a stored key; upload new files.
  const slotKeys = [];
  const keptProductImageIds = new Set();
  for (const slot of layout) {
    if (slot.kind === "existing") {
      const img = productImageById.get(slot.id);
      if (!img) throw new ApiError(400, "Unknown photo in layout");
      keptProductImageIds.add(img.id);
      slotKeys.push({ key: img.url, productImageId: img.id });
    } else if (slot.kind === "variant") {
      const key = toStoredKey(slot.url, allVariantImageUrls);
      if (!allVariantImageUrls.includes(key)) throw new ApiError(400, "Unknown variant photo in layout");
      slotKeys.push({ key, productImageId: null });
    } else if (slot.kind === "new") {
      const file = newFiles[slot.file];
      if (!file) throw new ApiError(400, "Missing uploaded file for photo slot");
      const key = await processAndUploadImage(file, `products/${productId}`);
      slotKeys.push({ key, productImageId: null, isNewUpload: true });
    } else {
      throw new ApiError(400, "Invalid photo slot");
    }
  }

  // 2. Remove product photos that are no longer in the layout.
  const removedProductImages = product.images.filter((i) => !keptProductImageIds.has(i.id));

  await prisma.$transaction(async (tx) => {
    if (removedProductImages.length) {
      await tx.productImage.deleteMany({ where: { id: { in: removedProductImages.map((i) => i.id) } } });
    }

    // 3. Create/reorder product gallery; first slot is primary.
    let order = 0;
    for (const slot of slotKeys) {
      const isPrimary = order === 0;
      if (slot.productImageId) {
        await tx.productImage.update({
          where: { id: slot.productImageId },
          data: { order, isPrimary },
        });
      } else {
        const created = await tx.productImage.create({
          data: { productId, url: slot.key, alt: `${product.name} - Image ${order + 1}`, order, isPrimary },
        });
        slot.productImageId = created.id;
      }
      order++;
    }

    // 4. Sync variant photo links.
    const validVariantIds = new Set(product.variants.map((v) => v.id));
    const desiredByVariant = new Map();
    for (const link of variantLinks) {
      if (!validVariantIds.has(link.variantId)) continue;
      const keys = (link.slots || []).map((i) => slotKeys[i]?.key).filter(Boolean);
      desiredByVariant.set(link.variantId, [...new Set(keys)]);
    }
    for (const variant of product.variants) {
      const desired = desiredByVariant.get(variant.id) || [];
      await tx.productVariantImage.deleteMany({ where: { variantId: variant.id } });
      if (desired.length) {
        await tx.productVariantImage.createMany({
          data: desired.map((key, i) => ({
            variantId: variant.id,
            url: key,
            alt: `${product.name} - ${variant.sku}`,
            isPrimary: i === 0,
            order: i,
          })),
        });
      }
    }
  });

  // 5. Delete orphaned files from storage (after DB commit).
  const stillUsed = new Set(slotKeys.map((s) => s.key));
  const orphanCandidates = new Set([
    ...removedProductImages.map((i) => i.url),
    ...allVariantImageUrls,
  ]);
  for (const key of orphanCandidates) {
    if (stillUsed.has(key)) continue;
    const usedElsewhere = await prisma.productImage.findFirst({ where: { url: key }, select: { id: true } })
      || await prisma.productVariantImage.findFirst({ where: { url: key }, select: { id: true } });
    if (usedElsewhere) continue;
    try {
      await deleteFromS3(key);
    } catch (err) {
      console.error("Failed to delete orphaned photo:", key, err);
    }
  }

  // 6. Videos (2 slots).
  const videoUpdates = {};
  for (const [field, removeFlag] of [["videoUrl", "removeVideo"], ["videoUrl2", "removeVideo2"]]) {
    const upload = req.files?.[field === "videoUrl" ? "video" : "video2"]?.[0];
    const current = product[field];
    if (upload) {
      if (upload.size > MAX_VIDEO_BYTES) throw new ApiError(400, "Video must be 10MB or less");
      if (!VIDEO_TYPES.includes(upload.mimetype)) throw new ApiError(400, "Only MP4 and WebM videos are supported");
      videoUpdates[field] = await uploadVideo(upload);
      if (current) await deleteFromS3(current).catch(() => { });
    } else if (req.body[removeFlag] === "true" && current) {
      videoUpdates[field] = null;
      await deleteFromS3(current).catch(() => { });
    }
  }
  if (Object.keys(videoUpdates).length) {
    await prisma.product.update({ where: { id: productId }, data: videoUpdates });
  }

  res.status(200).json(new ApiResponsive(200, {}, "Listing media saved"));
});

/**
 * PUT /admin/products/:productId/listing-extras  (JSON)
 */
export const saveListingExtras = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { id: true } } },
  });
  if (!product) throw new ApiError(404, "Product not found");

  const {
    materials,
    allowRestockRequests,
    globalPricing,
    processingMinDays,
    processingMaxDays,
    deliveryProfileId,
    returnPolicyId,
    customFields,
    variantExtras,
    whoMade,
    whatIsIt,
    whenMade,
  } = req.body;

  const cleanMaterials = Array.isArray(materials)
    ? [...new Set(materials.map((m) => String(m).trim()).filter(Boolean))].slice(0, MAX_MATERIALS)
    : undefined;

  const minDays = toIntOrNull(processingMinDays);
  const maxDays = toIntOrNull(processingMaxDays);
  if (minDays !== null && maxDays !== null && minDays > maxDays) {
    throw new ApiError(400, "Processing min days cannot exceed max days");
  }

  if (deliveryProfileId) {
    const exists = await prisma.deliveryProfile.findUnique({ where: { id: deliveryProfileId } });
    if (!exists) throw new ApiError(400, "Delivery profile not found");
  }
  if (returnPolicyId) {
    const exists = await prisma.returnPolicy.findUnique({ where: { id: returnPolicyId } });
    if (!exists) throw new ApiError(400, "Return policy not found");
  }

  let fields;
  if (Array.isArray(customFields)) {
    if (customFields.length > MAX_CUSTOM_FIELDS) {
      throw new ApiError(400, `Maximum ${MAX_CUSTOM_FIELDS} custom options allowed`);
    }
    fields = customFields.map((f, i) => {
      const label = String(f.label || "").trim();
      if (!label) throw new ApiError(400, "Each custom option needs a label");
      return {
        productId,
        label: label.slice(0, 120),
        fieldType: f.fieldType === "IMAGE" ? "IMAGE" : "TEXT",
        required: !!f.required,
        maxLength: f.fieldType === "IMAGE" ? null : toIntOrNull(f.maxLength),
        order: i,
      };
    });
  }

  const variantIds = new Set(product.variants.map((v) => v.id));

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        ...(cleanMaterials !== undefined && { materials: cleanMaterials }),
        ...(allowRestockRequests !== undefined && { allowRestockRequests: !!allowRestockRequests }),
        ...(globalPricing !== undefined && { globalPricing: !!globalPricing }),
        processingMinDays: minDays,
        processingMaxDays: maxDays,
        deliveryProfileId: deliveryProfileId || null,
        returnPolicyId: returnPolicyId || null,
        ...(whoMade !== undefined && { whoMade: whoMade || null }),
        ...(whatIsIt !== undefined && { whatIsIt: whatIsIt || null }),
        ...(whenMade !== undefined && { whenMade: whenMade || null }),
      },
    });

    if (fields) {
      await tx.productCustomField.deleteMany({ where: { productId } });
      if (fields.length) await tx.productCustomField.createMany({ data: fields });
    }

    if (Array.isArray(variantExtras)) {
      for (const ve of variantExtras) {
        if (!variantIds.has(ve.variantId)) continue;
        const vMin = toIntOrNull(ve.processingMinDays);
        const vMax = toIntOrNull(ve.processingMaxDays);
        await tx.productVariant.update({
          where: { id: ve.variantId },
          data: {
            priceUS: globalPricing ? toMoneyOrNull(ve.priceUS) : null,
            priceIntl: globalPricing ? toMoneyOrNull(ve.priceIntl) : null,
            processingMinDays: vMin,
            processingMaxDays: vMin !== null && vMax !== null && vMin > vMax ? vMin : vMax,
          },
        });
      }
    }
  });

  res.status(200).json(new ApiResponsive(200, {}, "Listing details saved"));
});

// ── Delivery profiles ───────────────────────────────────────────────────────
const deliveryData = (body) => {
  const name = String(body.name || "").trim();
  if (!name) throw new ApiError(400, "Profile name is required");
  const pricingType = body.pricingType === "FREE" ? "FREE" : "FIXED";
  return {
    name,
    pricingType,
    originPincode: body.originPincode ? String(body.originPincode).trim() : null,
    domesticCost: pricingType === "FREE" ? 0 : toMoneyOrNull(body.domesticCost) ?? 0,
    internationalCost: toMoneyOrNull(body.internationalCost),
    minDeliveryDays: toIntOrNull(body.minDeliveryDays),
    maxDeliveryDays: toIntOrNull(body.maxDeliveryDays),
  };
};

export const listDeliveryProfiles = asyncHandler(async (req, res) => {
  const profiles = await prisma.deliveryProfile.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.status(200).json(new ApiResponsive(200, { profiles }, "Delivery profiles fetched"));
});

export const createDeliveryProfile = asyncHandler(async (req, res) => {
  const profile = await prisma.deliveryProfile.create({ data: deliveryData(req.body) });
  res.status(201).json(new ApiResponsive(201, { profile }, "Delivery profile created"));
});

export const updateDeliveryProfile = asyncHandler(async (req, res) => {
  const profile = await prisma.deliveryProfile.update({
    where: { id: req.params.id },
    data: deliveryData(req.body),
  });
  res.status(200).json(new ApiResponsive(200, { profile }, "Delivery profile updated"));
});

export const deleteDeliveryProfile = asyncHandler(async (req, res) => {
  await prisma.deliveryProfile.delete({ where: { id: req.params.id } });
  res.status(200).json(new ApiResponsive(200, {}, "Delivery profile deleted"));
});

// ── Return policies ─────────────────────────────────────────────────────────
const returnData = (body) => {
  const name = String(body.name || "").trim();
  if (!name) throw new ApiError(400, "Policy name is required");
  const windowDays = toIntOrNull(body.windowDays);
  return {
    name,
    acceptReturns: !!body.acceptReturns,
    acceptExchanges: !!body.acceptExchanges,
    windowDays: windowDays ?? 7,
    buyerPaysReturnShipping: body.buyerPaysReturnShipping !== false,
  };
};

export const listReturnPolicies = asyncHandler(async (req, res) => {
  const policies = await prisma.returnPolicy.findMany({ orderBy: { createdAt: "asc" } });
  res.status(200).json(new ApiResponsive(200, { policies }, "Return policies fetched"));
});

export const createReturnPolicy = asyncHandler(async (req, res) => {
  const policy = await prisma.returnPolicy.create({ data: returnData(req.body) });
  res.status(201).json(new ApiResponsive(201, { policy }, "Return policy created"));
});

export const updateReturnPolicy = asyncHandler(async (req, res) => {
  const policy = await prisma.returnPolicy.update({
    where: { id: req.params.id },
    data: returnData(req.body),
  });
  res.status(200).json(new ApiResponsive(200, { policy }, "Return policy updated"));
});

export const deleteReturnPolicy = asyncHandler(async (req, res) => {
  await prisma.returnPolicy.delete({ where: { id: req.params.id } });
  res.status(200).json(new ApiResponsive(200, {}, "Return policy deleted"));
});

// POST /admin/products/sku-check  { skus: string[], productId?: string } → which SKUs already belong to another listing
export const checkSkus = asyncHandler(async (req, res) => {
  const skus = [...new Set((req.body?.skus || []).map((s) => String(s).trim()).filter(Boolean))];
  if (!skus.length) return res.status(200).json(new ApiResponsive(200, { taken: [] }, "OK"));
  const rows = await prisma.productVariant.findMany({
    where: { sku: { in: skus }, ...(req.body.productId && { productId: { not: req.body.productId } }) },
    select: { sku: true, product: { select: { name: true } } },
  });
  res.status(200).json(new ApiResponsive(200, { taken: rows.map((r) => ({ sku: r.sku, product: r.product?.name })) }, "OK"));
});
