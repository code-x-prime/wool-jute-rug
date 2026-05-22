import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage, uploadVideo } from "../middlewares/multer.middlerware.js";

const VIDEO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Get carousel (admin)
export const getCarousel = asyncHandler(async (req, res) => {
  const carousel = await prisma.shoppableVideoCarousel.findFirst({
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true },
              },
              variants: {
                take: 1,
                select: { salePrice: true, price: true },
              },
            },
          },
        },
      },
    },
  });

  if (!carousel) {
    return res.status(200).json(
      new ApiResponsive(200, {
        carousel: null,
        items: [],
      }, "No carousel yet")
    );
  }

  const formattedItems = carousel.items.map((item) => ({
    ...item,
    mediaUrl: item.mediaUrl
      ? item.mediaType === "UPLOAD"
        ? getFileUrl(item.mediaUrl)
        : item.mediaUrl
      : null,
    thumbnailUrl: item.thumbnailUrl ? getFileUrl(item.thumbnailUrl) : null,
    product: item.product
      ? {
        ...item.product,
        imageUrl: item.product.images?.[0]?.url
          ? getFileUrl(item.product.images[0].url)
          : null,
        price:
          item.product.variants?.[0]?.salePrice ?? item.product.variants?.[0]?.price,
        originalPrice: item.product.variants?.[0]?.price ?? item.product.variants?.[0]?.salePrice,
      }
      : null,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        carousel: { ...carousel, items: undefined },
        items: formattedItems,
      },
      "Carousel fetched successfully"
    )
  );
});

// Create or update carousel settings (admin)
export const upsertCarousel = asyncHandler(async (req, res) => {
  const { autoScroll, isActive } = req.body;

  let carousel = await prisma.shoppableVideoCarousel.findFirst();

  if (!carousel) {
    carousel = await prisma.shoppableVideoCarousel.create({
      data: {
        autoScroll: autoScroll !== false,
        isActive: isActive !== false,
      },
    });
  } else {
    carousel = await prisma.shoppableVideoCarousel.update({
      where: { id: carousel.id },
      data: {
        ...(autoScroll !== undefined && { autoScroll: autoScroll === true }),
        ...(isActive !== undefined && { isActive: isActive === true }),
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(200, { carousel }, "Carousel updated successfully")
  );
});

// Create carousel item (admin)
export const createCarouselItem = asyncHandler(async (req, res) => {
  let carousel = await prisma.shoppableVideoCarousel.findFirst();
  if (!carousel) {
    carousel = await prisma.shoppableVideoCarousel.create({
      data: { autoScroll: true, isActive: true },
    });
  }

  const { mediaType, youtubeUrl, instagramUrl, textOverlay, productId } = req.body;

  if (!mediaType || !["UPLOAD", "YOUTUBE", "INSTAGRAM"].includes(mediaType)) {
    throw new ApiError(400, "mediaType must be UPLOAD, YOUTUBE, or INSTAGRAM");
  }

  let mediaUrl = null;
  let thumbnailUrl = null;

  if (mediaType === "UPLOAD") {
    const mediaFile = req.files?.media?.[0];
    const thumbFile = req.files?.thumbnail?.[0];

    if (!mediaFile) {
      throw new ApiError(400, "Media file is required for UPLOAD type");
    }

    const isVideo = mediaFile.mimetype?.startsWith("video/");
    if (isVideo && mediaFile.size > VIDEO_MAX_SIZE_BYTES) {
      throw new ApiError(400, "Video size must not exceed 10MB");
    }

    if (isVideo) {
      mediaUrl = await uploadVideo(mediaFile);
    } else {
      mediaUrl = await processAndUploadImage(mediaFile, "carousel");
    }

    if (thumbFile) {
      thumbnailUrl = await processAndUploadImage(thumbFile, "carousel-thumbs");
    }
  } else if (mediaType === "YOUTUBE" && youtubeUrl) {
    mediaUrl = youtubeUrl.trim();
  } else if (mediaType === "INSTAGRAM" && instagramUrl) {
    mediaUrl = instagramUrl.trim();
  } else {
    throw new ApiError(400, `URL required for ${mediaType} type`);
  }

  const maxOrder = await prisma.shoppableVideoCarouselItem.aggregate({
    where: { carouselId: carousel.id },
    _max: { displayOrder: true },
  });
  const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  const item = await prisma.shoppableVideoCarouselItem.create({
    data: {
      carouselId: carousel.id,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      textOverlay: textOverlay || null,
      productId: productId || null,
      displayOrder,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          variants: { take: 1, select: { salePrice: true, price: true } },
        },
      },
    },
  });

  const formatted = {
    ...item,
    mediaUrl: item.mediaUrl
      ? item.mediaType === "UPLOAD"
        ? getFileUrl(item.mediaUrl)
        : item.mediaUrl
      : null,
    thumbnailUrl: item.thumbnailUrl ? getFileUrl(item.thumbnailUrl) : null,
    product: item.product
      ? {
        ...item.product,
        imageUrl: item.product.images?.[0]?.url ? getFileUrl(item.product.images[0].url) : null,
        price: item.product.variants?.[0]?.salePrice ?? item.product.variants?.[0]?.price,
        originalPrice: item.product.variants?.[0]?.price ?? item.product.variants?.[0]?.salePrice,
      }
      : null,
  };

  res.status(201).json(
    new ApiResponsive(201, { item: formatted }, "Item created successfully")
  );
});

// Update carousel item (admin)
export const updateCarouselItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { mediaType, youtubeUrl, instagramUrl, textOverlay, productId } = req.body;

  const existing = await prisma.shoppableVideoCarouselItem.findUnique({
    where: { id: itemId },
  });
  if (!existing) {
    throw new ApiError(404, "Item not found");
  }

  let mediaUrl = existing.mediaUrl;
  let thumbnailUrl = existing.thumbnailUrl;

  const effectiveType = mediaType || existing.mediaType;

  if (effectiveType === "UPLOAD") {
    const mediaFile = req.files?.media?.[0];
    const thumbFile = req.files?.thumbnail?.[0];

    if (mediaFile) {
      const isVideo = mediaFile.mimetype?.startsWith("video/");
      if (isVideo && mediaFile.size > VIDEO_MAX_SIZE_BYTES) {
        throw new ApiError(400, "Video size must not exceed 10MB");
      }
      if (isVideo) {
        mediaUrl = await uploadVideo(mediaFile);
      } else {
        mediaUrl = await processAndUploadImage(mediaFile, "carousel");
      }
    }
    if (thumbFile) {
      thumbnailUrl = await processAndUploadImage(thumbFile, "carousel-thumbs");
    }
  } else if (effectiveType === "YOUTUBE" && youtubeUrl) {
    mediaUrl = youtubeUrl.trim();
    thumbnailUrl = null;
  } else if (effectiveType === "INSTAGRAM" && instagramUrl) {
    mediaUrl = instagramUrl.trim();
    thumbnailUrl = null;
  }

  const item = await prisma.shoppableVideoCarouselItem.update({
    where: { id: itemId },
    data: {
      ...(mediaType && { mediaType: effectiveType }),
      mediaUrl,
      thumbnailUrl,
      ...(textOverlay !== undefined && { textOverlay: textOverlay || null }),
      ...(productId !== undefined && { productId: productId || null }),
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          variants: { take: 1, select: { salePrice: true, price: true } },
        },
      },
    },
  });

  const formatted = {
    ...item,
    mediaUrl: item.mediaUrl
      ? item.mediaType === "UPLOAD"
        ? getFileUrl(item.mediaUrl)
        : item.mediaUrl
      : null,
    thumbnailUrl: item.thumbnailUrl ? getFileUrl(item.thumbnailUrl) : null,
    product: item.product
      ? {
        ...item.product,
        imageUrl: item.product.images?.[0]?.url ? getFileUrl(item.product.images[0].url) : null,
        price: item.product.variants?.[0]?.salePrice ?? item.product.variants?.[0]?.price,
        originalPrice: item.product.variants?.[0]?.price ?? item.product.variants?.[0]?.salePrice,
      }
      : null,
  };

  res.status(200).json(
    new ApiResponsive(200, { item: formatted }, "Item updated successfully")
  );
});

// Reorder items (admin)
export const reorderItems = asyncHandler(async (req, res) => {
  const { itemIds } = req.body; // array of item ids in new order

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new ApiError(400, "itemIds array is required");
  }

  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.shoppableVideoCarouselItem.update({
        where: { id },
        data: { displayOrder: index },
      })
    )
  );

  res.status(200).json(
    new ApiResponsive(200, { message: "Order updated" }, "Items reordered successfully")
  );
});

// Delete carousel item (admin)
export const deleteCarouselItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  await prisma.shoppableVideoCarouselItem.delete({
    where: { id: itemId },
  });

  res.status(200).json(
    new ApiResponsive(200, null, "Item deleted successfully")
  );
});

// Increment view count (public - optional)
export const incrementViewCount = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  await prisma.shoppableVideoCarouselItem.update({
    where: { id: itemId },
    data: { viewCount: { increment: 1 } },
  });

  res.status(200).json(new ApiResponsive(200, null, "OK"));
});
