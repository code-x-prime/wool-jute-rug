import express from "express";
import { prisma } from "../config/db.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { uploadFile } from "../utils/storageService.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Helper to construct fully qualified URLs for uploaded files
const formatMenuImages = (item) => {
  if (!item) return item;
  const copy = { ...item };
  if (copy.bannerImage) {
    copy.bannerImage = getFileUrl(copy.bannerImage);
  }
  if (copy.columns) {
    copy.columns = copy.columns.map((col) => {
      const colCopy = { ...col };
      if (colCopy.links) {
        colCopy.links = colCopy.links.map((lnk) => {
          const lnkCopy = { ...lnk };
          if (lnkCopy.image) {
            lnkCopy.image = getFileUrl(lnkCopy.image);
          }
          return lnkCopy;
        });
      }
      return colCopy;
    });
  }
  return copy;
};

// ----------------------------------------------------
// NAVBAR ITEMS CRUD
// ----------------------------------------------------

// Get all navbar items (hierarchical)
router.get("/menus", isAdmin, async (req, res) => {
  try {
    const navbarItems = await prisma.navbarItem.findMany({
      include: {
        columns: {
          include: {
            links: true,
            category: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    const formatted = navbarItems.map(formatMenuImages);

    return res.status(200).json({
      success: true,
      message: "Navbar items fetched successfully",
      data: { navbarItems: formatted },
    });
  } catch (error) {
    console.error("Error fetching navbar items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch navbar items",
      error: error.message,
    });
  }
});

// Get a single navbar item
router.get("/menus/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const navbarItem = await prisma.navbarItem.findUnique({
      where: { id },
      include: {
        columns: {
          include: {
            links: true,
            category: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!navbarItem) {
      return res.status(404).json({
        success: false,
        message: "Navbar item not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { navbarItem: formatMenuImages(navbarItem) },
    });
  } catch (error) {
    console.error("Error fetching navbar item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch navbar item",
      error: error.message,
    });
  }
});

// Create navbar item
router.post("/menus", isAdmin, upload.single("bannerImage"), async (req, res) => {
  try {
    const { label, slug, order, isActive, layout, bannerTitle, bannerSubtitle, bannerLink } = req.body;

    if (!label) {
      return res.status(400).json({
        success: false,
        message: "Label is required",
      });
    }

    let bannerImageKey = null;
    if (req.file) {
      const key = `menus/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "-")}`;
      bannerImageKey = await uploadFile(req.file.buffer, key, {
        contentType: req.file.mimetype,
        acl: "public-read",
      });
    }

    const newItem = await prisma.navbarItem.create({
      data: {
        label,
        slug: slug || null,
        order: order ? parseInt(order) : 0,
        isActive: isActive === "true" || isActive === true,
        layout: layout || "SIMPLE",
        bannerImage: bannerImageKey,
        bannerTitle: bannerTitle || null,
        bannerSubtitle: bannerSubtitle || null,
        bannerLink: bannerLink || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Navbar item created successfully",
      data: { navbarItem: formatMenuImages(newItem) },
    });
  } catch (error) {
    console.error("Error creating navbar item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create navbar item",
      error: error.message,
    });
  }
});

// Update navbar item
router.patch("/menus/:id", isAdmin, upload.single("bannerImage"), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, slug, order, isActive, layout, bannerTitle, bannerSubtitle, bannerLink } = req.body;

    const existing = await prisma.navbarItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Navbar item not found" });
    }

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (slug !== undefined) updateData.slug = slug || null;
    if (order !== undefined) updateData.order = parseInt(order);
    if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
    if (layout !== undefined) updateData.layout = layout;
    if (bannerTitle !== undefined) updateData.bannerTitle = bannerTitle || null;
    if (bannerSubtitle !== undefined) updateData.bannerSubtitle = bannerSubtitle || null;
    if (bannerLink !== undefined) updateData.bannerLink = bannerLink || null;

    if (req.file) {
      if (existing.bannerImage) {
        await deleteFromS3(existing.bannerImage).catch(console.error);
      }
      const key = `menus/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "-")}`;
      updateData.bannerImage = await uploadFile(req.file.buffer, key, {
        contentType: req.file.mimetype,
        acl: "public-read",
      });
    }

    const updated = await prisma.navbarItem.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Navbar item updated successfully",
      data: { navbarItem: formatMenuImages(updated) },
    });
  } catch (error) {
    console.error("Error updating navbar item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update navbar item",
      error: error.message,
    });
  }
});

// Delete navbar item
router.delete("/menus/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.navbarItem.findUnique({
      where: { id },
      include: {
        columns: {
          include: { links: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Navbar item not found" });
    }

    // Delete associated images from S3
    if (existing.bannerImage) {
      await deleteFromS3(existing.bannerImage).catch(console.error);
    }

    for (const column of existing.columns) {
      for (const link of column.links) {
        if (link.image) {
          await deleteFromS3(link.image).catch(console.error);
        }
      }
    }

    await prisma.navbarItem.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Navbar item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting navbar item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete navbar item",
      error: error.message,
    });
  }
});

// ----------------------------------------------------
// COLUMNS CRUD
// ----------------------------------------------------

// Create Column
router.post("/menus/:navbarItemId/columns", isAdmin, async (req, res) => {
  try {
    const { navbarItemId } = req.params;
    const { title, order, categoryId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Column title is required" });
    }

    const column = await prisma.navbarColumn.create({
      data: {
        navbarItemId,
        title,
        order: order ? parseInt(order) : 0,
        categoryId: categoryId || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Column created successfully",
      data: { column },
    });
  } catch (error) {
    console.error("Error creating column:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create column",
      error: error.message,
    });
  }
});

// Update Column
router.patch("/menus/:navbarItemId/columns/:columnId", isAdmin, async (req, res) => {
  try {
    const { columnId } = req.params;
    const { title, order, categoryId } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (order !== undefined) updateData.order = parseInt(order);
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;

    const column = await prisma.navbarColumn.update({
      where: { id: columnId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Column updated successfully",
      data: { column },
    });
  } catch (error) {
    console.error("Error updating column:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update column",
      error: error.message,
    });
  }
});

// Delete Column
router.delete("/menus/:navbarItemId/columns/:columnId", isAdmin, async (req, res) => {
  try {
    const { columnId } = req.params;

    // Delete S3 images associated with links under this column
    const links = await prisma.navbarLink.findMany({ where: { columnId } });
    for (const link of links) {
      if (link.image) {
        await deleteFromS3(link.image).catch(console.error);
      }
    }

    await prisma.navbarColumn.delete({ where: { id: columnId } });

    return res.status(200).json({
      success: true,
      message: "Column deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting column:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete column",
      error: error.message,
    });
  }
});

// ----------------------------------------------------
// LINKS CRUD
// ----------------------------------------------------

// Create Link
router.post("/menus/columns/:columnId/links", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { columnId } = req.params;
    const { label, url, badge, order } = req.body;

    if (!label || !url) {
      return res.status(400).json({ success: false, message: "Label and URL are required" });
    }

    let imageKey = null;
    if (req.file) {
      const key = `menus/links/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "-")}`;
      imageKey = await uploadFile(req.file.buffer, key, {
        contentType: req.file.mimetype,
        acl: "public-read",
      });
    }

    const link = await prisma.navbarLink.create({
      data: {
        columnId,
        label,
        url,
        badge: badge || null,
        order: order ? parseInt(order) : 0,
        image: imageKey,
      },
    });

    const formattedLink = {
      ...link,
      image: link.image ? getFileUrl(link.image) : null,
    };

    return res.status(201).json({
      success: true,
      message: "Link created successfully",
      data: { link: formattedLink },
    });
  } catch (error) {
    console.error("Error creating link:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create link",
      error: error.message,
    });
  }
});

// Update Link
router.patch("/menus/columns/:columnId/links/:linkId", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { linkId } = req.params;
    const { label, url, badge, order } = req.body;

    const existing = await prisma.navbarLink.findUnique({ where: { id: linkId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Link not found" });
    }

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (url !== undefined) updateData.url = url;
    if (badge !== undefined) updateData.badge = badge || null;
    if (order !== undefined) updateData.order = parseInt(order);

    if (req.file) {
      if (existing.image) {
        await deleteFromS3(existing.image).catch(console.error);
      }
      const key = `menus/links/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "-")}`;
      updateData.image = await uploadFile(req.file.buffer, key, {
        contentType: req.file.mimetype,
        acl: "public-read",
      });
    }

    const link = await prisma.navbarLink.update({
      where: { id: linkId },
      data: updateData,
    });

    const formattedLink = {
      ...link,
      image: link.image ? getFileUrl(link.image) : null,
    };

    return res.status(200).json({
      success: true,
      message: "Link updated successfully",
      data: { link: formattedLink },
    });
  } catch (error) {
    console.error("Error updating link:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update link",
      error: error.message,
    });
  }
});

// Delete Link
router.delete("/menus/columns/:columnId/links/:linkId", isAdmin, async (req, res) => {
  try {
    const { linkId } = req.params;
    const existing = await prisma.navbarLink.findUnique({ where: { id: linkId } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Link not found" });
    }

    if (existing.image) {
      await deleteFromS3(existing.image).catch(console.error);
    }

    await prisma.navbarLink.delete({ where: { id: linkId } });

    return res.status(200).json({
      success: true,
      message: "Link deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting link:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete link",
      error: error.message,
    });
  }
});

export default router;
