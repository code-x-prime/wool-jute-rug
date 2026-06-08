import { prisma } from "../config/db.js";

async function main() {
  console.log("Cleaning up existing navigation menu data...");
  await prisma.navbarLink.deleteMany({});
  await prisma.navbarColumn.deleteMany({});
  await prisma.navbarItem.deleteMany({});

  console.log("Seeding navigation menu...");

  // ----------------------------------------------------
  // 0. Ensure Categories & Attributes exist to map IDs
  // ----------------------------------------------------

  // Ensure 'rugs' category exists
  let rugsCategory = await prisma.category.findUnique({ where: { slug: "rugs" } });
  if (!rugsCategory) {
    rugsCategory = await prisma.category.create({
      data: {
        name: "RUGS",
        slug: "rugs",
        description: "Premium handcrafted rugs & carpets",
      },
    });
  }

  // Ensure other category tabs exist
  const shopCategoryNames = [
    { name: "MANCHAHA", slug: "manchaha" },
    { name: "HOME TEXTILE", slug: "home-textile" },
    { name: "WALL ART & TAPESTRY", slug: "wall-art" },
    { name: "FURNITURE", slug: "furniture" },
    { name: "ACCESSORIES", slug: "accessories" },
    { name: "CLEARANCE SALE", slug: "clearance" },
  ];

  for (const catInfo of shopCategoryNames) {
    const existing = await prisma.category.findUnique({ where: { slug: catInfo.slug } });
    if (!existing) {
      await prisma.category.create({
        data: {
          name: catInfo.name,
          slug: catInfo.slug,
          description: `Shop premium ${catInfo.name.toLowerCase()}`,
        },
      });
    }
  }

  // Ensure default database categories exist (for style links)
  const defaultCategories = [
    { name: "Abstract", slug: "abstract" },
    { name: "Geometrical", slug: "geometrical" },
    { name: "Moroccan", slug: "moroccan" },
    { name: "Oriental", slug: "oriental" },
    { name: "Vintage & Distressed", slug: "vintage--distressed" }
  ];

  for (const catInfo of defaultCategories) {
    const existing = await prisma.category.findUnique({ where: { slug: catInfo.slug } });
    if (!existing) {
      await prisma.category.create({
        data: {
          name: catInfo.name,
          slug: catInfo.slug,
          description: `${catInfo.name} design collection`,
        },
      });
    }
  }

  // Helper to ensure subcategories exist
  const ensureSubCategories = async (categorySlug, subCategoriesList) => {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) return;

    for (const sub of subCategoriesList) {
      const existing = await prisma.subCategory.findFirst({
        where: {
          categoryId: category.id,
          slug: sub.slug,
        },
      });

      if (!existing) {
        await prisma.subCategory.create({
          data: {
            categoryId: category.id,
            name: sub.name,
            slug: sub.slug,
            description: `${sub.name} collection under ${category.name}`,
            isActive: true,
          },
        });
        console.log(`Created subcategory ${sub.name} under ${category.name}`);
      }
    }
  };

  // Seed SubCategories for all categories
  await ensureSubCategories("rugs", [
    { name: "Modern Rugs", slug: "modern-rugs" },
    { name: "Traditional Rugs", slug: "traditional-rugs" },
    { name: "Transitional Rugs", slug: "transitional-rugs" },
    { name: "Vintage Rugs", slug: "vintage-rugs" },
    { name: "Kilims & Flatweaves", slug: "kilims-flatweaves" },
    { name: "Shag Rugs", slug: "shag-rugs" },
  ]);

  await ensureSubCategories("manchaha", [
    { name: "Manchaha Wool", slug: "manchaha-wool" },
    { name: "Manchaha Silk", slug: "manchaha-silk" },
    { name: "Manchaha Jute", slug: "manchaha-jute" },
  ]);

  await ensureSubCategories("home-textile", [
    { name: "Cushions & Covers", slug: "cushions" },
    { name: "Poufs & Ottomans", slug: "poufs" },
    { name: "Throws & Blankets", slug: "throws" },
    { name: "Bedspreads", slug: "bedspreads" },
  ]);

  await ensureSubCategories("wall-art", [
    { name: "Handwoven Tapestry", slug: "handwoven-tapestry" },
    { name: "Framed Rug Art", slug: "framed-rug-art" },
    { name: "Macrame Hangings", slug: "macrame-hangings" },
  ]);

  await ensureSubCategories("furniture", [
    { name: "Stools & Poufs", slug: "stools-poufs" },
    { name: "Benches", slug: "benches" },
    { name: "Chairs", slug: "chairs" },
    { name: "Side Tables", slug: "side-tables" },
  ]);

  await ensureSubCategories("accessories", [
    { name: "Handbags & Totes", slug: "handbags-totes" },
    { name: "Clutches & Pouches", slug: "clutches-pouches" },
    { name: "Planter Covers", slug: "planter-covers" },
  ]);

  await ensureSubCategories("clearance", [
    { name: "Under ₹999", slug: "under-999" },
    { name: "Under ₹4999", slug: "under-4999" },
    { name: "50% Off & Above", slug: "50-off-above" },
  ]);

  await ensureSubCategories("abstract", [
    { name: "Modern Abstract", slug: "modern-abstract" },
    { name: "Textured Abstract", slug: "textured-abstract" },
  ]);

  await ensureSubCategories("geometrical", [
    { name: "Linear Geometric", slug: "linear-geometric" },
    { name: "Modern Geometric", slug: "modern-geometric" },
  ]);

  await ensureSubCategories("moroccan", [
    { name: "Beni Ourain", slug: "beni-ourain" },
    { name: "Azilal", slug: "azilal" },
  ]);

  await ensureSubCategories("oriental", [
    { name: "Classic Persian", slug: "classic-persian" },
    { name: "Floral Oriental", slug: "floral-oriental" },
  ]);

  await ensureSubCategories("vintage--distressed", [
    { name: "Overdyed Vintage", slug: "overdyed-vintage" },
    { name: "Distressed Classic", slug: "distressed-classic" },
  ]);

  // Resolve Attributes & values to map UUIDs for precise filtering
  // Helper to ensure an attribute value exists and return its ID
  const getAttrValueId = async (attributeName, valueName, hexCode = null) => {
    let attribute = await prisma.attribute.findFirst({
      where: { name: { equals: attributeName, mode: "insensitive" } }
    });

    if (!attribute) {
      attribute = await prisma.attribute.create({
        data: {
          name: attributeName,
          inputType: "select"
        }
      });
    }

    let attrVal = await prisma.attributeValue.findFirst({
      where: {
        attributeId: attribute.id,
        value: { equals: valueName, mode: "insensitive" }
      }
    });

    if (!attrVal) {
      attrVal = await prisma.attributeValue.create({
        data: {
          attributeId: attribute.id,
          value: valueName,
          hexCode
        }
      });
    }

    return attrVal.id;
  };

  // Pre-resolve Size value IDs
  const size2x3 = await getAttrValueId("Size", "2x3");
  const size3x5 = await getAttrValueId("Size", "3x5");
  const size4x6 = await getAttrValueId("Size", "4x6");
  const size5x7 = await getAttrValueId("Size", "5x7");
  const size5x8 = await getAttrValueId("Size", "5x8");
  const size6x9 = await getAttrValueId("Size", "6x9");
  const size8x10 = await getAttrValueId("Size", "8x10");
  const size9x12 = await getAttrValueId("Size", "9x12");
  const size10x14 = await getAttrValueId("Size", "10x14");

  // Pre-resolve Color value IDs
  const colorBlue = await getAttrValueId("Color", "Blue", "#0000FF");
  const colorRed = await getAttrValueId("Color", "Red", "#FF0000");
  const colorGreen = await getAttrValueId("Color", "Green", "#008000");
  const colorYellow = await getAttrValueId("Color", "Yellow", "#FFFF00");
  const colorWhite = await getAttrValueId("Color", "White", "#FFFFFF");
  const colorGrey = await getAttrValueId("Color", "Grey", "#808080");
  const colorBlack = await getAttrValueId("Color", "Black", "#000000");

  // Pre-resolve Material value IDs
  const matWool = await getAttrValueId("Material", "Wool");
  const matPureWool = await getAttrValueId("Material", "Pure Wool");
  const matSilk = await getAttrValueId("Material", "Silk");
  const matViscose = await getAttrValueId("Material", "Viscose");
  const matJute = await getAttrValueId("Material", "Jute");

  // Pre-resolve Construction value IDs
  const constHandKnotted = await getAttrValueId("Construction", "Hand Knotted");
  const constHandTufted = await getAttrValueId("Construction", "Hand Tufted");
  const constHandLoom = await getAttrValueId("Construction", "Hand Loom");
  const constFlatWeave = await getAttrValueId("Construction", "Flat Weave");

  // Pre-resolve Room value IDs
  const roomLiving = await getAttrValueId("Room", "Living Room");
  const roomBed = await getAttrValueId("Room", "Bedroom");
  const roomDining = await getAttrValueId("Room", "Dining Room");
  const roomOutdoor = await getAttrValueId("Room", "Outdoor");


  // ----------------------------------------------------
  // 1. SHOP (SHOP_TABS)
  // ----------------------------------------------------
  const shopMenu = await prisma.navbarItem.create({
    data: {
      label: "SHOP",
      order: 0,
      layout: "SHOP_TABS",
      isActive: true,
    },
  });

  // Create columns for RUGS category tab
  const sizeCol = await prisma.navbarColumn.create({
    data: {
      navbarItemId: shopMenu.id,
      title: "SIZE",
      order: 0,
      categoryId: rugsCategory.id,
    },
  });

  await prisma.navbarLink.createMany({
    data: [
      { columnId: sizeCol.id, label: "2x3 Ft", url: `/products?category=rugs&size=${size2x3}`, order: 0 },
      { columnId: sizeCol.id, label: "3x5 Ft", url: `/products?category=rugs&size=${size3x5}`, order: 1 },
      { columnId: sizeCol.id, label: "4x6 Ft", url: `/products?category=rugs&size=${size4x6}`, order: 2 },
      { columnId: sizeCol.id, label: "5x7 Ft", url: `/products?category=rugs&size=${size5x7}`, order: 3 },
      { columnId: sizeCol.id, label: "5x8 Ft", url: `/products?category=rugs&size=${size5x8}`, order: 4 },
      { columnId: sizeCol.id, label: "6x9 Ft", url: `/products?category=rugs&size=${size6x9}`, order: 5 },
      { columnId: sizeCol.id, label: "8x10 Ft", url: `/products?category=rugs&size=${size8x10}`, order: 6 },
      { columnId: sizeCol.id, label: "9x12 Ft", url: `/products?category=rugs&size=${size9x12}`, order: 7 },
      { columnId: sizeCol.id, label: "10x14 Ft", url: `/products?category=rugs&size=${size10x14}`, order: 8 },
    ],
  });

  const colorsCol = await prisma.navbarColumn.create({
    data: {
      navbarItemId: shopMenu.id,
      title: "COLORS",
      order: 1,
      categoryId: rugsCategory.id,
    },
  });

  await prisma.navbarLink.createMany({
    data: [
      { columnId: colorsCol.id, label: "Blue", url: `/products?category=rugs&color=${colorBlue}`, order: 0 },
      { columnId: colorsCol.id, label: "Red", url: `/products?category=rugs&color=${colorRed}`, order: 1 },
      { columnId: colorsCol.id, label: "Green", url: `/products?category=rugs&color=${colorGreen}`, order: 2 },
      { columnId: colorsCol.id, label: "Yellow", url: `/products?category=rugs&color=${colorYellow}`, order: 3 },
      { columnId: colorsCol.id, label: "Ivory / White", url: `/products?category=rugs&color=${colorWhite}`, order: 4 },
      { columnId: colorsCol.id, label: "Grey", url: `/products?category=rugs&color=${colorGrey}`, order: 5 },
      { columnId: colorsCol.id, label: "Black", url: `/products?category=rugs&color=${colorBlack}`, order: 6 },
    ],
  });

  const roomCol = await prisma.navbarColumn.create({
    data: {
      navbarItemId: shopMenu.id,
      title: "ROOM",
      order: 2,
      categoryId: rugsCategory.id,
    },
  });

  await prisma.navbarLink.createMany({
    data: [
      { columnId: roomCol.id, label: "Living Room", url: `/products?category=rugs&attributeValueIds=${roomLiving}`, order: 0 },
      { columnId: roomCol.id, label: "Dining Room", url: `/products?category=rugs&attributeValueIds=${roomDining}`, order: 1 },
      { columnId: roomCol.id, label: "Bedroom", url: `/products?category=rugs&attributeValueIds=${roomBed}`, order: 2 },
      { columnId: roomCol.id, label: "Outdoor", url: `/products?category=rugs&attributeValueIds=${roomOutdoor}`, order: 3 },
    ],
  });

  const matCol = await prisma.navbarColumn.create({
    data: {
      navbarItemId: shopMenu.id,
      title: "MATERIAL",
      order: 3,
      categoryId: rugsCategory.id,
    },
  });

  await prisma.navbarLink.createMany({
    data: [
      { columnId: matCol.id, label: "Wool", url: `/products?category=rugs&attributeValueIds=${matWool}`, order: 0 },
      { columnId: matCol.id, label: "Pure Wool", url: `/products?category=rugs&attributeValueIds=${matPureWool}`, order: 1 },
      { columnId: matCol.id, label: "Silk", url: `/products?category=rugs&attributeValueIds=${matSilk}`, order: 2 },
      { columnId: matCol.id, label: "Viscose", url: `/products?category=rugs&attributeValueIds=${matViscose}`, order: 3 },
      { columnId: matCol.id, label: "Jute & Hemp", url: `/products?category=rugs&attributeValueIds=${matJute}`, order: 4 },
    ],
  });

  const constCol = await prisma.navbarColumn.create({
    data: {
      navbarItemId: shopMenu.id,
      title: "CONSTRUCTION",
      order: 4,
      categoryId: rugsCategory.id,
    },
  });

  await prisma.navbarLink.createMany({
    data: [
      { columnId: constCol.id, label: "Hand Knotted", url: `/products?category=rugs&attributeValueIds=${constHandKnotted}`, order: 0 },
      { columnId: constCol.id, label: "Hand Tufted", url: `/products?category=rugs&attributeValueIds=${constHandTufted}`, order: 1 },
      { columnId: constCol.id, label: "Hand Loom", url: `/products?category=rugs&attributeValueIds=${constHandLoom}`, order: 2 },
      { columnId: constCol.id, label: "Flat Weaves", url: `/products?category=rugs&attributeValueIds=${constFlatWeave}`, order: 3 },
    ],
  });


  // ----------------------------------------------------
  // 2. STYLE (COLUMNS_WITH_BANNER)
  // ----------------------------------------------------
  const styleMenu = await prisma.navbarItem.create({
    data: {
      label: "STYLE",
      order: 1,
      layout: "COLUMNS_WITH_BANNER",
      isActive: true,
      bannerImage: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=600",
      bannerTitle: "TRENDSETTING BESTSELLERS",
      bannerSubtitle: "SHOP NOW",
      bannerLink: "/products?sort=featured&order=desc",
    },
  });

  const styleSubCol1 = await prisma.navbarColumn.create({
    data: { navbarItemId: styleMenu.id, title: "STYLE", order: 0 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: styleSubCol1.id, label: "Modern", url: "/products?search=modern", order: 0 },
      { columnId: styleSubCol1.id, label: "Transitional", url: "/products?search=transitional", order: 1 },
      { columnId: styleSubCol1.id, label: "Traditional", url: "/products?search=traditional", order: 2 },
    ],
  });

  const styleSubCol2 = await prisma.navbarColumn.create({
    data: { navbarItemId: styleMenu.id, title: "DECOR STYLE", order: 1 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: styleSubCol2.id, label: "Minimalist", url: "/products?search=minimalist", order: 0 },
      { columnId: styleSubCol2.id, label: "Bohemian", url: "/products?search=bohemian", order: 1 },
      { columnId: styleSubCol2.id, label: "Eclectic", url: "/products?search=eclectic", order: 2 },
      { columnId: styleSubCol2.id, label: "Maximalist", url: "/products?search=maximalist", order: 3 },
    ],
  });

  const styleSubCol3 = await prisma.navbarColumn.create({
    data: { navbarItemId: styleMenu.id, title: "COLORMOODS", order: 2 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: styleSubCol3.id, label: "Monochromatic", url: "/products?search=monochromatic", order: 0 },
      { columnId: styleSubCol3.id, label: "Neutrals", url: "/products?search=neutral", order: 1 },
      { columnId: styleSubCol3.id, label: "Pastels", url: "/products?search=pastel", order: 2 },
      { columnId: styleSubCol3.id, label: "Vibrant", url: "/products?search=vibrant", order: 3 },
    ],
  });

  const styleSubCol4 = await prisma.navbarColumn.create({
    data: { navbarItemId: styleMenu.id, title: "PATTERN", order: 3 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: styleSubCol4.id, label: "Abstract", url: "/products?category=abstract", order: 0 },
      { columnId: styleSubCol4.id, label: "Geometrical", url: "/products?category=geometrical", order: 1 },
      { columnId: styleSubCol4.id, label: "Moroccan", url: "/products?category=moroccan", order: 2 },
      { columnId: styleSubCol4.id, label: "Oriental", url: "/products?category=oriental", order: 3 },
      { columnId: styleSubCol4.id, label: "Distressed", url: "/products?category=vintage--distressed", order: 4 },
      { columnId: styleSubCol4.id, label: "Floral", url: "/products?search=floral", order: 5 },
      { columnId: styleSubCol4.id, label: "Solid", url: "/products?search=solid", order: 6 },
    ],
  });

  const styleSubCol5 = await prisma.navbarColumn.create({
    data: { navbarItemId: styleMenu.id, title: "COLLECTIONS", order: 4 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: styleSubCol5.id, label: "Genesis", url: "/products?search=genesis", order: 0 },
      { columnId: styleSubCol5.id, label: "Lucid", url: "/products?search=lucid", order: 1 },
      { columnId: styleSubCol5.id, label: "Kasbah", url: "/products?search=kasbah", order: 2 },
      { columnId: styleSubCol5.id, label: "Cera", url: "/products?search=cera", order: 3 },
      { columnId: styleSubCol5.id, label: "Savana", url: "/products?search=savana", order: 4 },
    ],
  });


  // ----------------------------------------------------
  // 3. DESIGNERS (COLUMNS_WITH_BANNER)
  // ----------------------------------------------------
  const designersMenu = await prisma.navbarItem.create({
    data: {
      label: "DESIGNERS",
      order: 2,
      layout: "COLUMNS_WITH_BANNER",
      isActive: true,
      bannerImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=600",
      bannerTitle: "DESIGNER COLLECTIONS",
      bannerSubtitle: "EXPLORE ALL",
      bannerLink: "/products?sort=featured",
    },
  });

  const desCol1 = await prisma.navbarColumn.create({
    data: { navbarItemId: designersMenu.id, title: "DESIGNERS", order: 0 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: desCol1.id, label: "Kengo Kuma", url: "/products?search=kengo+kuma", badge: "NEW", order: 0 },
      { columnId: desCol1.id, label: "VIMAR 1991", url: "/products?search=vimar", order: 1 },
      { columnId: desCol1.id, label: "Bodour Al Qasimi", url: "/products?search=bodour", order: 2 },
      { columnId: desCol1.id, label: "Richard Hutten", url: "/products?search=richard", order: 3 },
      { columnId: desCol1.id, label: "Peter D'ascoli", url: "/products?search=peter", order: 4 },
      { columnId: desCol1.id, label: "Vinita Chaitanya", url: "/products?search=vinita", order: 5 },
    ],
  });

  const desCol2 = await prisma.navbarColumn.create({
    data: { navbarItemId: designersMenu.id, title: "ARTISTS", order: 1 },
  });
  await prisma.navbarLink.createMany({
    data: [
      { columnId: desCol2.id, label: "Princess Pea", url: "/products?search=princess", order: 0 },
      { columnId: desCol2.id, label: "Gurjeet Singh", url: "/products?search=gurjeet", order: 1 },
      { columnId: desCol2.id, label: "Lorenzo Vitturi", url: "/products?search=lorenzo", order: 2 },
    ],
  });


  // ----------------------------------------------------
  // 4. SERVICES / STORIES / CUSTOM (SIMPLE)
  // ----------------------------------------------------
  await prisma.navbarItem.create({
    data: { label: "SERVICES", order: 3, layout: "SIMPLE", slug: "/services", isActive: true },
  });
  await prisma.navbarItem.create({
    data: { label: "STORIES", order: 4, layout: "SIMPLE", slug: "/about", isActive: true },
  });
  await prisma.navbarItem.create({
    data: { label: "CUSTOM", order: 5, layout: "SIMPLE", slug: "/custom-rugs", isActive: true },
  });


  // ----------------------------------------------------
  // 5. PROJECTS (IMAGE_GRID)
  // ----------------------------------------------------
  const projectsMenu = await prisma.navbarItem.create({
    data: {
      label: "PROJECTS",
      order: 6,
      layout: "IMAGE_GRID",
      isActive: true,
    },
  });

  const projCol = await prisma.navbarColumn.create({
    data: { navbarItemId: projectsMenu.id, title: "PROJECT TYPES", order: 0 },
  });

  await prisma.navbarLink.createMany({
    data: [
      {
        columnId: projCol.id,
        label: "HOSPITALITY",
        url: "/products?search=hospitality",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400",
        order: 0,
      },
      {
        columnId: projCol.id,
        label: "RETAIL",
        url: "/products?search=retail",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=400",
        order: 1,
      },
      {
        columnId: projCol.id,
        label: "AVIATION",
        url: "/products?search=aviation",
        image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&q=80&w=400",
        order: 2,
      },
      {
        columnId: projCol.id,
        label: "YACHT",
        url: "/products?search=yacht",
        image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&q=80&w=400",
        order: 3,
      },
      {
        columnId: projCol.id,
        label: "RESIDENTIAL",
        url: "/products?search=residential",
        image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=400",
        order: 4,
      },
      {
        columnId: projCol.id,
        label: "ALL",
        url: "/products",
        image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=400",
        order: 5,
      },
    ],
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
