import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { formatVariantWithAttributes } from "../utils/variant-attributes.js";
import { applyFlashSalePrice } from "../utils/flashSaleHelpers.js";

const expandProductsToVariants = async (products, query = {}) => {
  const {
    search = "",
    minPrice,
    maxPrice,
    color,
    size,
    attributeValueIds,
  } = query;

  const normalizedSearch = typeof search === "string" ? search.replace(/\+/g, " ").toLowerCase().trim() : "";

  // Parse filter attribute value IDs
  const filterValueIds = [];
  if (color) filterValueIds.push(color);
  if (size) filterValueIds.push(size);
  if (attributeValueIds) {
    attributeValueIds.split(",").map((id) => id.trim()).filter(Boolean).forEach(id => filterValueIds.push(id));
  }
  const uniqueFilterValueIds = [...new Set(filterValueIds)];

  const list = [];
  for (const product of products) {
    const primaryCategory =
      product.categories && product.categories.length > 0
        ? product.categories[0].category
        : null;

    const categoryData = primaryCategory
      ? {
          id: primaryCategory.id,
          name: primaryCategory.name,
          slug: primaryCategory.slug,
        }
      : null;

    // Filter variants based on whether they match the active filters
    let variantsToProcess = product.variants || [];

    if (variantsToProcess.length > 0) {
      variantsToProcess = variantsToProcess.filter((variant) => {
        // 1. Attribute filter matching
        if (uniqueFilterValueIds.length > 0) {
          const hasAllAttrs = uniqueFilterValueIds.every((id) =>
            variant.attributes && variant.attributes.some((attr) => attr.attributeValueId === id)
          );
          if (!hasAllAttrs) return false;
        }

        // 2. Price filter matching
        const priceVal = parseFloat(variant.salePrice || variant.price);
        if (minPrice && priceVal < parseFloat(minPrice)) return false;
        if (maxPrice && priceVal > parseFloat(maxPrice)) return false;

        // 3. Search query matching
        if (normalizedSearch) {
          const attrNames = variant.attributes
            ? variant.attributes.map((a) => a.attributeValue.value).join(" ")
            : "";
          const variantName = attrNames ? `${product.name} (${attrNames})` : product.name;

          const matchesSearch =
            product.name.toLowerCase().includes(normalizedSearch) ||
            product.description?.toLowerCase().includes(normalizedSearch) ||
            variantName.toLowerCase().includes(normalizedSearch) ||
            variant.sku?.toLowerCase().includes(normalizedSearch) ||
            (categoryData && categoryData.name.toLowerCase().includes(normalizedSearch));

          if (!matchesSearch) return false;
        }

        return true;
      });
    }

    // Only expand variants that have their own images AND matched the filters
    const variantsWithImages = variantsToProcess.filter((v) => v.images && v.images.length > 0);

    if (variantsWithImages.length > 0) {
      for (const variant of variantsWithImages) {
        const attrNames = variant.attributes
          ? variant.attributes.map((a) => a.attributeValue.value).join(" / ")
          : "";
        const variantName = attrNames ? `${product.name} (${attrNames})` : product.name;

        const imageUrl = variant.images[0].url;

        const priceVal = parseFloat(variant.salePrice || variant.price);
        const fs = await applyFlashSalePrice(priceVal, product.id);

        list.push({
          id: `${product.id}-${variant.id}`,
          productId: product.id,
          variantId: variant.id,
          name: variantName,
          slug: product.slug,
          featured: product.featured,
          description: product.description,
          category: categoryData,
          image: imageUrl ? getFileUrl(imageUrl) : null,
          variants: product.variants.map((v) => ({
            ...v,
            images: v.images
              ? v.images.map((img) => ({
                  ...img,
                  url: getFileUrl(img.url),
                }))
              : [],
          })),
          basePrice: fs.hasFlashSale ? fs.price : priceVal,
          hasSale: fs.hasFlashSale || variant.salePrice !== null,
          regularPrice: fs.hasFlashSale ? fs.originalPrice : parseFloat(variant.price),
          variantCount: product._count.variants,
          reviewCount: product._count.reviews,
        });
      }
    } else if (product.variants && product.variants.length > 0) {
      const firstMatchingVariant = variantsToProcess.length > 0 ? variantsToProcess[0] : product.variants[0];

      if (normalizedSearch && variantsToProcess.length === 0) {
        const productMatches =
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.description?.toLowerCase().includes(normalizedSearch) ||
          (categoryData && categoryData.name.toLowerCase().includes(normalizedSearch));
        if (!productMatches) continue;
      }

      let imageUrl = null;
      if (product.images && product.images.length > 0) {
        imageUrl = product.images[0].url;
      } else {
        const firstVarWithImg = product.variants.find(v => v.images && v.images.length > 0);
        if (firstVarWithImg) imageUrl = firstVarWithImg.images[0].url;
      }

      const priceVal = parseFloat(firstMatchingVariant.salePrice || firstMatchingVariant.price);
      const fs = await applyFlashSalePrice(priceVal, product.id);

      list.push({
        id: product.id,
        productId: product.id,
        variantId: firstMatchingVariant.id,
        name: product.name,
        slug: product.slug,
        featured: product.featured,
        description: product.description,
        category: categoryData,
        image: imageUrl ? getFileUrl(imageUrl) : null,
        variants: product.variants.map((v) => ({
          ...v,
          images: v.images
            ? v.images.map((img) => ({
                ...img,
                url: getFileUrl(img.url),
              }))
            : [],
        })),
        basePrice: fs.hasFlashSale ? fs.price : priceVal,
        hasSale: fs.hasFlashSale || firstMatchingVariant.salePrice !== null,
        regularPrice: fs.hasFlashSale ? fs.originalPrice : parseFloat(firstMatchingVariant.price),
        variantCount: product._count.variants,
        reviewCount: product._count.reviews,
      });
    } else {
      if (normalizedSearch) {
        const matchesSearch =
          product.name.toLowerCase().includes(normalizedSearch) ||
          product.description?.toLowerCase().includes(normalizedSearch) ||
          (categoryData && categoryData.name.toLowerCase().includes(normalizedSearch));
        if (!matchesSearch) continue;
      }

      let imageUrl = null;
      if (product.images && product.images.length > 0) {
        imageUrl = product.images[0].url;
      }

      list.push({
        id: product.id,
        productId: product.id,
        variantId: null,
        name: product.name,
        slug: product.slug,
        featured: product.featured,
        description: product.description,
        category: categoryData,
        image: imageUrl ? getFileUrl(imageUrl) : null,
        variants: [],
        basePrice: null,
        hasSale: false,
        regularPrice: null,
        variantCount: 0,
        reviewCount: product._count.reviews,
      });
    }
  }
  return list;
};

// Get all products with filtering, pagination and sorting
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category = "",
    sort = "createdAt",
    order = "desc",
    minPrice,
    maxPrice,
    featured,
    productType,
    color, // For backward compatibility
    size, // For backward compatibility
    attributeValueIds, // Comma-separated attribute value IDs for filtering
  } = req.query;

  // Normalize search: treat + as space (when querystrings use + for spaces)
  const normalizedSearch =
    typeof search === "string" ? search.replace(/\+/g, " ") : "";

  // Build filter conditions
  const whereConditions = {
    isActive: true,
    // Search in name or description
    ...(normalizedSearch && {
      OR: [
        { name: { contains: normalizedSearch, mode: "insensitive" } },
        { description: { contains: normalizedSearch, mode: "insensitive" } },
        // Also allow searching by category name or slug
        {
          categories: {
            some: {
              category: {
                OR: [
                  { name: { contains: normalizedSearch, mode: "insensitive" } },
                  { slug: { contains: normalizedSearch, mode: "insensitive" } },
                ],
              },
            },
          },
        },
        // Also allow searching by brand name
        {
          brand: {
            name: { contains: normalizedSearch, mode: "insensitive" },
          },
        },
        // Also allow searching by subcategory name
        {
          subCategories: {
            some: {
              subCategory: {
                name: { contains: normalizedSearch, mode: "insensitive" },
              },
            },
          },
        },
        // Also allow searching by variant attributes (style, design, size, color, etc.)
        {
          variants: {
            some: {
              isActive: true,
              attributes: {
                some: {
                  attributeValue: {
                    OR: [
                      { value: { contains: normalizedSearch, mode: "insensitive" } },
                      {
                        attribute: {
                          name: { contains: normalizedSearch, mode: "insensitive" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ],
    }),
    // Filter by category
    ...(category && {
      categories: {
        some: {
          category: {
            OR: [{ id: category }, { slug: category }],
          },
        },
      },
    }),
    // Filter by featured
    ...(featured === "true" && { featured: true }),
    // Filter by product type
    ...(productType && {
      productType: {
        array_contains: [productType],
      },
    }),
    // Filter by price range via variants
    ...((minPrice || maxPrice) && {
      variants: {
        some: {
          AND: [
            { isActive: true },
            // Min price
            ...(minPrice
              ? [
                {
                  OR: [
                    { price: { gte: parseFloat(minPrice) } },
                    {
                      AND: [
                        { salePrice: { not: null } },
                        { salePrice: { gte: parseFloat(minPrice) } },
                      ],
                    },
                  ],
                },
              ]
              : []),
            // Max price
            ...(maxPrice
              ? [
                {
                  OR: [
                    {
                      AND: [
                        { salePrice: { not: null } },
                        { salePrice: { lte: parseFloat(maxPrice) } },
                      ],
                    },
                    {
                      AND: [
                        { salePrice: null },
                        { price: { lte: parseFloat(maxPrice) } },
                      ],
                    },
                  ],
                },
              ]
              : []),
          ],
        },
      },
    }),
    // Filter by attribute values (dynamic - supports all attributes)
    // Collect all attribute value IDs
    ...((() => {
      const allAttributeValueIds = [];

      // Add color and size if provided (backward compatibility)
      if (color) allAttributeValueIds.push(color);
      if (size) allAttributeValueIds.push(size);

      // Add all attribute value IDs from attributeValueIds parameter
      if (attributeValueIds) {
        const valueIds = attributeValueIds.split(",").map((id) => id.trim()).filter(Boolean);
        allAttributeValueIds.push(...valueIds);
      }

      // Remove duplicates
      const uniqueAttributeValueIds = [...new Set(allAttributeValueIds)];

      if (uniqueAttributeValueIds.length === 0) return {};

      // Filter: product must have at least one variant with ALL selected attribute values
      return {
        variants: {
          some: {
            AND: [
              { isActive: true },
              // Variant must have ALL selected attribute values
              // Each attribute value ID must be present in variant's attributes
              ...uniqueAttributeValueIds.map((valueId) => ({
                attributes: {
                  some: {
                    attributeValueId: valueId,
                  },
                },
              })),
            ],
          },
        },
      };
    })()),
  };

  // Get total count for pagination
  const totalProducts = await prisma.product.count({
    where: whereConditions,
  });

  // Get products with pagination, sorting
  const products = await prisma.product.findMany({
    where: whereConditions,
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isActive: true },
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          images: {
            orderBy: { order: "asc" }, // Sort images by order (0, 1, 2, 3...)
          },
        },
        orderBy: { price: "asc" },
      },
      _count: {
        select: {
          reviews: {
            where: {
              status: "APPROVED",
            },
          },
          variants: true,
        },
      },
    },
    orderBy: [{ [sort]: order }],
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  // Format products for response (expand each variant to its own card)
  const formattedProducts = await expandProductsToVariants(products, req.query);

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        products: formattedProducts,
        pagination: {
          total: totalProducts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalProducts / parseInt(limit)),
        },
      },
      "Products fetched successfully"
    )
  );
});

// Get product details by slug
export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const product = await prisma.product.findUnique({
    where: {
      slug,
      isActive: true,
    },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      brand: true,
      images: {
        orderBy: { isPrimary: "desc" },
      },
      variants: {
        where: { isActive: true },
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          images: {
            orderBy: { order: "asc" }, // Sort images by order (0, 1, 2, 3...)
          },
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          reviews: {
            where: {
              status: "APPROVED",
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Apply flash sale to product-level prices
  const baseVariantPrice =
    product.variants.length > 0
      ? parseFloat(
          product.variants[0].salePrice || product.variants[0].price || 0
        )
      : 0;
  const productFlashSale =
    baseVariantPrice > 0
      ? await applyFlashSalePrice(baseVariantPrice, product.id)
      : null;

  // Get the category ID from the product's categories
  const categoryId =
    product.categories.length > 0 ? product.categories[0].category.id : null;

  // Format the response
  const formattedProduct = {
    ...product,
    // Add primary category
    category:
      product.categories.length > 0 ? product.categories[0].category : null,
    // Include brand (only select basic fields)
    brand: product.brand
      ? {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
      }
      : null,
    images: product.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    })),
    videoUrl: product.videoUrl ? getFileUrl(product.videoUrl) : null,
    // Format variants with proper image URLs and attributes
    reviews: product.reviews.map((review) => ({
      ...review,
      images: review.images ? review.images.map(img => getFileUrl(img)) : []
    })),
    variants: await Promise.all(
      product.variants.map(async (variant) => {
        const formatted = formatVariantWithAttributes(variant);

        // Get effective MOQ for this variant
        let effectiveMOQ = 1;
        let moqSource = "DEFAULT";

        // Check variant MOQ
        const variantMOQ = await prisma.mOQSetting.findFirst({
          where: {
            scope: "VARIANT",
            variantId: variant.id,
            isActive: true,
          },
        });

        if (variantMOQ) {
          effectiveMOQ = variantMOQ.minQuantity;
          moqSource = "VARIANT";
        } else {
          // Check product MOQ
          const productMOQ = await prisma.mOQSetting.findFirst({
            where: {
              scope: "PRODUCT",
              productId: variant.productId,
              isActive: true,
            },
          });

          if (productMOQ) {
            effectiveMOQ = productMOQ.minQuantity;
            moqSource = "PRODUCT";
          } else {
            // Check global MOQ
            const globalMOQ = await prisma.mOQSetting.findFirst({
              where: {
                scope: "GLOBAL",
                isActive: true,
              },
            });

            if (globalMOQ) {
              effectiveMOQ = globalMOQ.minQuantity;
              moqSource = "GLOBAL";
            }
          }
        }

        // Get pricing slabs for this variant
        const variantSlabs = await prisma.pricingSlab.findMany({
          where: {
            variantId: variant.id,
          },
          orderBy: {
            minQty: "asc",
          },
        });

        // Get product-level pricing slabs
        const productSlabs = await prisma.pricingSlab.findMany({
          where: {
            productId: variant.productId,
            variantId: null,
          },
          orderBy: {
            minQty: "asc",
          },
        });

        // Combine slabs (variant slabs override product slabs)
        const allSlabs = [...variantSlabs, ...productSlabs].sort((a, b) => a.minQty - b.minQty);

        // Apply flash sale to variant price
        const variantBase = parseFloat(variant.salePrice || variant.price);
        const flashVariant =
          productFlashSale?.hasFlashSale && variantBase > 0
            ? await applyFlashSalePrice(variantBase, variant.productId)
            : null;

        return {
          ...formatted,
          flashSalePrice: flashVariant?.hasFlashSale ? flashVariant.price : null,
          flashSaleOriginalPrice: flashVariant?.hasFlashSale ? flashVariant.originalPrice : null,
          images: variant.images
            ? variant.images.map((image) => ({
              ...image,
              url: getFileUrl(image.url),
            }))
            : [],
          videoUrl: variant.videoUrl ? getFileUrl(variant.videoUrl) : null,
          stock: variant.quantity, // Use quantity as stock
          moq: effectiveMOQ,
          moqSource,
          pricingSlabs: allSlabs.map((slab) => ({
            id: slab.id,
            minQty: slab.minQty,
            maxQty: slab.maxQty,
            price: parseFloat(slab.price),
          })),
          // Include shipping dimensions
          shippingLength: variant.shippingLength,
          shippingBreadth: variant.shippingBreadth,
          shippingHeight: variant.shippingHeight,
          shippingWeight: variant.shippingWeight,
        };
      })
    ),
    // Group variants by attributes - create dynamic attribute options
    attributeOptions: (() => {
      const attributeMap = new Map();

      product.variants.forEach((variant) => {
        variant.attributes?.forEach((vav) => {
          const attr = vav.attributeValue.attribute;
          const attrValue = vav.attributeValue;

          if (!attributeMap.has(attr.id)) {
            attributeMap.set(attr.id, {
              id: attr.id,
              name: attr.name,
              inputType: attr.inputType,
              values: new Map(),
            });
          }

          const attrData = attributeMap.get(attr.id);
          if (!attrData.values.has(attrValue.id)) {
            attrData.values.set(attrValue.id, {
              id: attrValue.id,
              value: attrValue.value,
              hexCode: attrValue.hexCode || null,
              image: attrValue.image ? getFileUrl(attrValue.image) : null,
            });
          }
        });
      });

      // Convert to array format
      return Array.from(attributeMap.values()).map((attr) => ({
        ...attr,
        values: Array.from(attr.values.values()),
      }));
    })(),
    // Average rating
    avgRating:
      product.reviews.length > 0
        ? (
          product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          product.reviews.length
        ).toFixed(1)
        : null,
    reviewCount: product._count.reviews,
    // Include SEO fields
    metaTitle: product.metaTitle || product.name,
    metaDescription: product.metaDescription || product.description,
    keywords: product.keywords || "",
    // Add price fields for fallback when no variant is selected (with flash sale)
    basePrice: productFlashSale?.hasFlashSale
      ? productFlashSale.price
      : product.variants.length > 0
        ? parseFloat(
            product.variants[0].salePrice || product.variants[0].price || 0
          )
        : 0,
    hasSale:
      productFlashSale?.hasFlashSale ||
      (product.variants.length > 0 && product.variants[0].salePrice !== null),
    regularPrice: productFlashSale?.hasFlashSale
      ? productFlashSale.originalPrice
      : product.variants.length > 0
        ? parseFloat(product.variants[0].price || 0)
        : 0,
    flashSale: productFlashSale?.hasFlashSale
      ? { discountPercentage: productFlashSale.discountPercentage }
      : null,
  };

  // Add related products
  const relatedProducts = categoryId
    ? await prisma.product.findMany({
      where: {
        categories: {
          some: {
            category: {
              id: categoryId,
            },
          },
        },
        isActive: true,
        id: { not: product.id },
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          take: 1,
          include: {
            attributes: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
            images: true,
          },
        },
        _count: {
          select: {
            reviews: {
              where: {
                status: "APPROVED",
              },
            },
          },
        },
      },
      take: 4,
    })
    : [];

  const formattedRelated = await Promise.all(
    relatedProducts.map(async (p) => {
      const baseVp =
        p.variants.length > 0
          ? parseFloat(p.variants[0].salePrice || p.variants[0].price)
          : null;
      const fs =
        baseVp != null ? await applyFlashSalePrice(baseVp, p.id) : null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images[0] ? getFileUrl(p.images[0].url) : null,
        basePrice: fs?.hasFlashSale ? fs.price : baseVp,
        hasSale:
          fs?.hasFlashSale ||
          (p.variants.length > 0 && p.variants[0].salePrice !== null),
        regularPrice: fs?.hasFlashSale
          ? fs.originalPrice
          : p.variants.length > 0
            ? parseFloat(p.variants[0].price)
            : null,
        reviewCount: p._count.reviews,
        variants: p.variants.map((variant) => ({
          ...variant,
          attributes: formatVariantWithAttributes(variant).attributes,
          images: variant.images
            ? variant.images.map((image) => ({
                ...image,
                url: getFileUrl(image.url),
              }))
            : [],
        })),
      };
    })
  );

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        product: formattedProduct,
        relatedProducts: formattedRelated,
      },
      "Product fetched successfully"
    )
  );
});

// Get product variant details by attribute value IDs
export const getProductVariant = asyncHandler(async (req, res) => {
  const { productId, attributeValueIds } = req.query;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Parse attributeValueIds if provided as string or array
  let attributeValueIdsArray = [];
  if (attributeValueIds) {
    if (Array.isArray(attributeValueIds)) {
      attributeValueIdsArray = attributeValueIds;
    } else if (typeof attributeValueIds === "string") {
      attributeValueIdsArray = attributeValueIds.split(",").filter(Boolean);
    }
  }

  // Build query to find variant with matching attributes
  // A variant matches if it has ALL the specified attributeValueIds
  const variant = await prisma.productVariant.findFirst({
    where: {
      productId,
      isActive: true,
      ...(attributeValueIdsArray.length > 0 && {
        AND: attributeValueIdsArray.map((attrValueId) => ({
          attributes: {
            some: {
              attributeValueId: attrValueId,
            },
          },
        })),
      }),
    },
    include: {
      attributes: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
            },
          },
        },
      },
      images: true,
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Format the variant response with attributes
  const formattedVariant = formatVariantWithAttributes(variant);
  formattedVariant.images = variant.images
    ? variant.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    }))
    : [];

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: formattedVariant },
        "Product variant fetched successfully"
      )
    );
});

// Get product variant by ID
export const getProductVariantById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Variant ID is required");
  }

  const variant = await prisma.productVariant.findFirst({
    where: {
      id: id,
      isActive: true,
    },
    include: {
      attributes: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
            },
          },
        },
      },
      images: true,
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Format the variant response with attributes
  const formattedVariant = formatVariantWithAttributes(variant);
  formattedVariant.images = variant.images
    ? variant.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    }))
    : [];
  formattedVariant.product = {
    ...variant.product,
    image: variant.product.images?.[0]?.url
      ? getFileUrl(variant.product.images[0].url)
      : null,
  };

  // Add MOQ (VARIANT → PRODUCT → GLOBAL)
  let effectiveMOQ = 1;
  const variantMOQ = await prisma.mOQSetting.findFirst({
    where: {
      scope: "VARIANT",
      variantId: variant.id,
      isActive: true,
    },
  });
  if (variantMOQ) {
    effectiveMOQ = variantMOQ.minQuantity;
  } else {
    const productMOQ = await prisma.mOQSetting.findFirst({
      where: {
        scope: "PRODUCT",
        productId: variant.productId,
        isActive: true,
      },
    });
    if (productMOQ) {
      effectiveMOQ = productMOQ.minQuantity;
    } else {
      const globalMOQ = await prisma.mOQSetting.findFirst({
        where: { scope: "GLOBAL", isActive: true },
      });
      if (globalMOQ) effectiveMOQ = globalMOQ.minQuantity;
    }
  }
  formattedVariant.moq = effectiveMOQ;

  // Add pricing slabs (variant + product)
  const variantSlabs = await prisma.pricingSlab.findMany({
    where: { variantId: variant.id },
    orderBy: { minQty: "asc" },
  });
  const productSlabs = await prisma.pricingSlab.findMany({
    where: {
      productId: variant.productId,
      variantId: null,
    },
    orderBy: { minQty: "asc" },
  });
  const allSlabs = [...variantSlabs, ...productSlabs].sort((a, b) => a.minQty - b.minQty);
  formattedVariant.pricingSlabs = allSlabs.map((s) => ({
    id: s.id,
    minQty: s.minQty,
    maxQty: s.maxQty,
    price: parseFloat(s.price),
  }));

  // Apply flash sale on base price
  const basePrice = parseFloat(variant.salePrice || variant.price);
  const flashSaleResult = await applyFlashSalePrice(basePrice, variant.productId);
  formattedVariant.price = Math.round(flashSaleResult.hasFlashSale ? flashSaleResult.price : basePrice);
  formattedVariant.originalPrice = Math.round(flashSaleResult.originalPrice || basePrice);
  formattedVariant.hasFlashSale = flashSaleResult.hasFlashSale;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: formattedVariant },
        "Product variant fetched successfully"
      )
    );
});

// Get maximum product price for price range slider
export const getMaxPrice = asyncHandler(async (req, res) => {
  // Find the highest priced active variant
  const highestPriceVariant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      product: {
        isActive: true,
      },
    },
    orderBy: {
      price: "desc",
    },
  });

  // If no variants found, return a default max price
  const maxPrice = highestPriceVariant
    ? parseFloat(highestPriceVariant.price)
    : 1000;

  res
    .status(200)
    .json(
      new ApiResponsive(200, { maxPrice }, "Maximum price fetched successfully")
    );
});

// Get products by type (featured, bestseller, trending, new, etc.)
export const getProductsByType = asyncHandler(async (req, res) => {
  const { productType } = req.params;
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions for product type
  const filterConditions = {
    isActive: true,
    productType: {
      array_contains: [productType],
    },
  };

  // Get total count for pagination
  const totalProducts = await prisma.product.count({
    where: filterConditions,
  });

  // Get products with sorting
  const products = await prisma.product.findMany({
    where: filterConditions,
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isActive: true },
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          images: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { price: "asc" },
      },
      _count: {
        select: {
          reviews: {
            where: {
              status: "APPROVED",
            },
          },
          variants: true,
        },
      },
    },
    orderBy: [{ [sort]: order }],
    skip,
    take: parseInt(limit),
  });

  // Format the response data (expand each variant to its own card)
  const formattedProducts = await expandProductsToVariants(products);

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        products: formattedProducts,
        pagination: {
          total: totalProducts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalProducts / parseInt(limit)),
        },
      },
      `${productType} products fetched successfully`
    )
  );
});
