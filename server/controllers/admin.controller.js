import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { validatePassword } from "../helper/validatePassword.js";
import sendEmail from "../utils/sendEmail.js";
import { getAdminResetTemplate, getResetTemplate } from "../email/temp/EmailTemplate.js";
import { getStoreConfigFromDb } from "../utils/storeConfig.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register a new admin
export const registerAdmin = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role, customPermissions } =
    req.body;

  // Check if the current user is a super admin (if not, they shouldn't be here)
  if (req.admin && req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only Super Admins can create new admins");
  }

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    throw new ApiError(409, "Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin with permissions
  const newAdmin = await prisma.$transaction(async (tx) => {
    // Create the admin user
    const admin = await tx.admin.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "ADMIN",
        lastLogin: new Date(),
      },
    });

    // If customPermissions were provided, use them instead of defaults
    const permissionsToCreate =
      Array.isArray(customPermissions) && customPermissions.length > 0
        ? customPermissions
        : getDefaultPermissionsForRole(role || "ADMIN");

    // Add permissions
    for (const perm of permissionsToCreate) {
      await tx.permission.create({
        data: {
          adminId: admin.id,
          resource: perm.resource,
          action: perm.action,
        },
      });
    }

    return admin;
  });

  // Remove sensitive data from response
  const adminWithoutPassword = { ...newAdmin };
  delete adminWithoutPassword.password;

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        adminWithoutPassword,
        "Admin registered successfully"
      )
    );
});

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

// Login admin
export const loginAdmin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find admin
  const admin = await prisma.admin.findUnique({
    where: { email },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if admin account is active
  if (!admin.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  // Check lockout (3 failed attempts = 10 min block)
  const now = new Date();
  if (admin.lockedUntil && admin.lockedUntil > now) {
    const minsLeft = Math.ceil((admin.lockedUntil - now) / 60000);
    throw new ApiError(
      403,
      `Too many failed attempts. Try again in ${minsLeft} minute(s).`
    );
  }

  // If lockout expired, reset counter
  if (admin.lockedUntil && admin.lockedUntil <= now) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    const newAttempts = (admin.failedLoginAttempts || 0) + 1;
    const updates = { failedLoginAttempts: newAttempts };

    if (newAttempts >= LOCKOUT_ATTEMPTS) {
      const lockUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      updates.lockedUntil = lockUntil;
      const minsLeft = LOCKOUT_MINUTES;
      await prisma.admin.update({
        where: { id: admin.id },
        data: updates,
      });
      throw new ApiError(
        403,
        `Too many failed attempts. Account locked for ${minsLeft} minutes.`
      );
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: updates,
    });
    throw new ApiError(401, "Invalid email or password");
  }

  // Success: reset failed attempts and update last login
  await prisma.admin.update({
    where: { id: admin.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
  });

  // Generate token
  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions.map((p) => `${p.resource}:${p.action}`),
    },
    process.env.ADMIN_JWT_SECRET,
    {
      expiresIn: process.env.ADMIN_TOKEN_LIFE || "1d",
    }
  );

  // Remove sensitive data from response
  const adminWithoutPassword = { ...admin };
  delete adminWithoutPassword.password;

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        admin: adminWithoutPassword,
        token,
      },
      "Logged in successfully"
    )
  );
});

// Get admin profile
export const getAdminProfile = asyncHandler(async (req, res, next) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  // Remove sensitive data from response
  const adminWithoutPassword = { ...admin };
  delete adminWithoutPassword.password;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admin: adminWithoutPassword },
        "Admin profile fetched successfully"
      )
    );
});

// Update admin profile
export const updateAdminProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, language } = req.body;

  const updatedAdmin = await prisma.admin.update({
    where: { id: req.admin.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(language && { language }),
    },
  });

  // Remove sensitive data from response
  const adminWithoutPassword = { ...updatedAdmin };
  delete adminWithoutPassword.password;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admin: adminWithoutPassword },
        "Admin profile updated successfully"
      )
    );
});

// Change admin password
export const changeAdminPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Find admin
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Password changed successfully"));
});

// Forgot admin password - send reset link via email (Brevo/SMTP)
export const forgotAdminPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    return res.status(200).json(
      new ApiResponsive(200, {}, "If this email is registered as admin, you will receive a password reset link")
    );
  }

  const resetToken = jwt.sign(
    { id: admin.id, purpose: "adminpwdreset" },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: "1h" }
  );

  const adminPanelUrl =
    process.env.ADMIN_PANEL_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173";
  const resetLink = `${adminPanelUrl}/reset-password-admin/${resetToken}`;

  try {
    const storeConfig = await getStoreConfigFromDb();
    await sendEmail({
      email,
      subject: `Admin Password Reset - ${storeConfig?.storeName || "Dashboard"}`,
      html: getAdminResetTemplate(resetLink, storeConfig),
    });
  } catch (err) {
    console.error("Admin forgot password email error:", err);
  }

  res.status(200).json(
    new ApiResponsive(200, {}, "If this email is registered as admin, you will receive a password reset link")
  );
});

// Reset admin password with token (from email link)
export const resetAdminPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, "Token and new password are required");
  }

  validatePassword(password);

  const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

  if (!decoded || decoded.purpose !== "adminpwdreset") {
    throw new ApiError(400, "Invalid or expired reset link");
  }

  const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: hashedPassword, failedLoginAttempts: 0, lockedUntil: null },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Password reset successfully. You can now log in."));
});

// Get all admins (super admin only)
export const getAllAdmins = asyncHandler(async (req, res, next) => {
  // Check if current admin is a super admin
  if (req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  const admins = await prisma.admin.findMany({
    include: { permissions: true },
    orderBy: { createdAt: "desc" },
  });

  // Remove sensitive data
  const adminsWithoutPasswords = admins.map((admin) => {
    const adminData = { ...admin };
    delete adminData.password;
    return adminData;
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admins: adminsWithoutPasswords },
        "Admins fetched successfully"
      )
    );
});

// Update admin role (super admin only)
export const updateAdminRole = asyncHandler(async (req, res, next) => {
  const { adminId } = req.params;
  const { role, isActive } = req.body;

  // Check if current admin is a super admin
  if (req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  // Prevent self-demotion
  if (adminId === req.admin.id) {
    throw new ApiError(400, "You cannot modify your own role");
  }

  const updatedAdmin = await prisma.$transaction(async (tx) => {
    // Update the admin role
    const admin = await tx.admin.update({
      where: { id: adminId },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // If role changed, update permissions
    if (role) {
      // Delete existing permissions
      await tx.permission.deleteMany({
        where: { adminId },
      });

      // Add new permissions based on role
      const defaultPermissions = getDefaultPermissionsForRole(role);

      for (const perm of defaultPermissions) {
        await tx.permission.create({
          data: {
            adminId,
            resource: perm.resource,
            action: perm.action,
          },
        });
      }
    }

    return admin;
  });

  // Remove sensitive data
  const adminWithoutPassword = { ...updatedAdmin };
  delete adminWithoutPassword.password;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admin: adminWithoutPassword },
        "Admin role updated successfully"
      )
    );
});

// Delete admin (super admin only)
export const deleteAdmin = asyncHandler(async (req, res, next) => {
  const { adminId } = req.params;

  // Check if current admin is a super admin
  if (req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  // Prevent self-deletion
  if (adminId === req.admin.id) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  // Delete admin
  await prisma.admin.delete({
    where: { id: adminId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Admin deleted successfully"));
});

// Update admin permissions based on their role
export const updateAdminPermissions = asyncHandler(async (req, res) => {
  const { adminId } = req.params;

  // Check if admin exists
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  // Get default permissions for this role
  const defaultPermissions = getDefaultPermissionsForRole(admin.role);

  // Create a record of existing permissions
  const existingPermissions = admin.permissions.map(
    (p) => `${p.resource}:${p.action}`
  );

  // Filter out permissions that already exist
  const newPermissions = defaultPermissions.filter(
    (p) => !existingPermissions.includes(`${p.resource}:${p.action}`)
  );

  if (newPermissions.length === 0) {
    return res.status(200).json(
      new ApiResponsive(
        200,
        {
          adminId,
          message: "No new permissions to add",
        },
        "Admin permissions are already up to date"
      )
    );
  }

  // Add missing permissions in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const createdPermissions = [];

    for (const permission of newPermissions) {
      const createdPermission = await tx.adminPermission.create({
        data: {
          adminId,
          resource: permission.resource,
          action: permission.action,
        },
      });
      createdPermissions.push(createdPermission);
    }

    return createdPermissions;
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        adminId,
        addedPermissions: result,
        count: result.length,
      },
      `Added ${result.length} new permissions to admin`
    )
  );
});

// Get low stock inventory alerts for admin dashboard
export const getLowStockAlerts = asyncHandler(async (req, res) => {
  const { threshold = 5 } = req.query;

  // Get product variants with quantity below threshold
  const lowStockVariants = await prisma.productVariant.findMany({
    where: {
      quantity: { lte: parseInt(threshold) },
      isActive: true,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          variants: {
            where: { isActive: true },
            include: {
              images: true,
            },
          },
        },
      },
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
    orderBy: { quantity: "asc" },
  });

  // Format response with proper image URLs with fallback logic
  const formattedAlerts = lowStockVariants.map((variant) => {
    // Get image with priority: variant images > product images > other variant images
    let imageUrl = null;

    // Priority 1: Current variant images
    if (variant.images && variant.images.length > 0) {
      const primaryImage = variant.images.find((img) => img.isPrimary);
      imageUrl = primaryImage ? primaryImage.url : variant.images[0].url;
    }
    // Priority 2: Product images
    else if (variant.product.images && variant.product.images.length > 0) {
      const primaryImage = variant.product.images.find((img) => img.isPrimary);
      imageUrl = primaryImage
        ? primaryImage.url
        : variant.product.images[0].url;
    }
    // Priority 3: Any variant images from any variant
    else if (variant.product.variants && variant.product.variants.length > 0) {
      const variantWithImages = variant.product.variants.find(
        (v) => v.images && v.images.length > 0
      );
      if (variantWithImages) {
        const primaryImage = variantWithImages.images.find(
          (img) => img.isPrimary
        );
        imageUrl = primaryImage
          ? primaryImage.url
          : variantWithImages.images[0].url;
      }
    }

    return {
      id: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      productSlug: variant.product.slug,
      stock: variant.quantity, // Use quantity but keep the response field as "stock" for frontend compatibility
      sku: variant.sku,
      attributes: variant.attributes
        ? variant.attributes.map((va) => ({
          attribute: va.attributeValue.attribute.name,
          value: va.attributeValue.value,
        }))
        : [],
      image: imageUrl ? getFileUrl(imageUrl) : null,
      status: variant.quantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
      createdAt: variant.createdAt,
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        alerts: formattedAlerts,
        count: formattedAlerts.length,
        outOfStockCount: formattedAlerts.filter(
          (a) => a.status === "OUT_OF_STOCK"
        ).length,
        lowStockCount: formattedAlerts.filter((a) => a.status === "LOW_STOCK")
          .length,
      },
      "Inventory alerts fetched successfully"
    )
  );
});

// Helper function to get default permissions based on role
const getDefaultPermissionsForRole = (role) => {
  const permissions = [];

  // Common permissions for all admins
  permissions.push({ resource: "dashboard", action: "read" });

  if (role === "SUPER_ADMIN") {
    // Super admin has all permissions
    permissions.push(
      { resource: "admins", action: "create" },
      { resource: "admins", action: "read" },
      { resource: "admins", action: "update" },
      { resource: "admins", action: "delete" },
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "users", action: "delete" },
      { resource: "products", action: "create" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "products", action: "delete" },
      { resource: "orders", action: "create" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "orders", action: "delete" },
      { resource: "categories", action: "create" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "update" },
      { resource: "categories", action: "delete" },
      { resource: "reviews", action: "create" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "reviews", action: "delete" },
      { resource: "settings", action: "read" },
      { resource: "settings", action: "update" },
      { resource: "inventory", action: "create" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "update" },
      { resource: "inventory", action: "delete" },
      { resource: "coupons", action: "create" },
      { resource: "coupons", action: "read" },
      { resource: "coupons", action: "update" },
      { resource: "coupons", action: "delete" },
      { resource: "flavors", action: "create" },
      { resource: "flavors", action: "read" },
      { resource: "flavors", action: "update" },
      { resource: "flavors", action: "delete" },
      { resource: "weights", action: "create" },
      { resource: "weights", action: "read" },
      { resource: "weights", action: "update" },
      { resource: "weights", action: "delete" }
    );
  } else if (role === "ADMIN") {
    // Regular admin permissions
    permissions.push(
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "products", action: "create" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "create" },
      { resource: "categories", action: "update" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "inventory", action: "create" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "update" },
      { resource: "inventory", action: "delete" },
      { resource: "coupons", action: "read" },
      { resource: "coupons", action: "create" },
      { resource: "coupons", action: "update" },
      { resource: "flavors", action: "read" },
      { resource: "flavors", action: "create" },
      { resource: "flavors", action: "update" },
      { resource: "weights", action: "read" },
      { resource: "weights", action: "create" },
      { resource: "weights", action: "create" },
      { resource: "weights", action: "update" },
      { resource: "settings", action: "read" },
      { resource: "settings", action: "update" }
    );
  } else if (role === "MANAGER") {
    // Manager permissions
    permissions.push(
      { resource: "users", action: "read" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "categories", action: "read" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "create" },
      { resource: "coupons", action: "read" },
      { resource: "flavors", action: "read" },
      { resource: "weights", action: "read" }
    );
  } else if (role === "CONTENT_EDITOR") {
    // Content editor permissions
    permissions.push(
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "update" },
      { resource: "flavors", action: "read" },
      { resource: "weights", action: "read" }
    );
  } else if (role === "SUPPORT_AGENT") {
    // Support agent permissions
    permissions.push(
      { resource: "users", action: "read" },
      { resource: "orders", action: "read" },
      { resource: "products", action: "read" },
      { resource: "reviews", action: "read" },
      { resource: "inventory", action: "read" }
    );
  }

  return permissions;
};

// Get users with pagination and search
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, search = "" } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const whereClause = search
    ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }
    : {};

  const [usersRaw, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        otpVerified: true,
        role: true,
        signupSource: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const totalPages = Math.ceil(totalUsers / parseInt(limit));

  const users = usersRaw.map((u) => ({
    ...u,
    signupSource: u.signupSource ?? "credentials",
    emailVerified: u.otpVerified,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        users,
        pagination: {
          total: totalUsers,
          pages: totalPages,
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
      "Users fetched successfully"
    )
  );
});

// Get user by ID
export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      otpVerified: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponsive(200, { user }, "User fetched successfully"));
});

// Update user status (active/inactive)
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    throw new ApiError(400, "isActive field is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { user: updatedUser },
        `User ${isActive ? "activated" : "deactivated"} successfully`
      )
    );
});

// Verify user email (mark OTP verified)
export const verifyUserEmail = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.otpVerified) {
    return res
      .status(200)
      .json(new ApiResponsive(200, {}, "Email is already verified"));
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { otpVerified: true, otp: null, otpVerifiedExpiry: null },
    select: {
      id: true,
      name: true,
      email: true,
      otpVerified: true,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { user: updatedUser },
        "User email verified successfully"
      )
    );
});

// Update user details
export const updateUserDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, phone } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if email is being changed and already exists
  if (email && email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(409, "Email is already in use by another account");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      otpVerified: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { user: updatedUser },
        "User details updated successfully"
      )
    );
});

// Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete all related data before deleting user (FK RESTRICT constraints)
  // First get order IDs to cascade delete order children
  const userOrders = await prisma.order.findMany({
    where: { userId },
    select: { id: true },
  });
  const orderIds = userOrders.map((o) => o.id);

  await prisma.$transaction(async (tx) => {
    // Clear cart, wishlist, reviews, coupons, addresses, analytics
    await tx.cartItem.deleteMany({ where: { userId } });
    await tx.wishlistItem.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { userId } });
    await tx.userCoupon.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    await tx.pageView.deleteMany({ where: { userId } });
    await tx.productView.deleteMany({ where: { userId } });
    await tx.returnRequest.deleteMany({ where: { userId } });

    // Delete orders (OrderItem cascades via schema onDelete:Cascade)
    if (orderIds.length > 0) {
      await tx.order.deleteMany({ where: { userId } });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  res.status(200).json(new ApiResponsive(200, {}, "User deleted successfully"));
});

// Send password reset link to user (admin action)
export const sendUserPasswordReset = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.signupSource !== "credentials") {
    throw new ApiError(400, "User signed up via OAuth — password reset not applicable");
  }

  const resetToken = jwt.sign(
    { id: user.id, purpose: "pwdreset" },
    process.env.RESET_TOKEN_SECRET || process.env.ACCESS_JWT_SECRET,
    { expiresIn: "1h" }
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await sendEmail({
    email: user.email,
    subject: "Reset Your Password",
    html: getResetTemplate(resetLink),
  });

  res.status(200).json(new ApiResponsive(200, {}, "Password reset link sent to user's email"));
});

// Get payment settings
export const getPaymentSettings = asyncHandler(async (req, res) => {
  // Get or create payment settings (singleton)
  let paymentSettings = await prisma.paymentSettings.findFirst();

  // If no settings exist, create default ones
  if (!paymentSettings) {
    paymentSettings = await prisma.paymentSettings.create({
      data: {
        cashEnabled: true,
        razorpayEnabled: false,
        codCharge: 0,
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        cashEnabled: paymentSettings.cashEnabled,
        razorpayEnabled: paymentSettings.razorpayEnabled,
        codCharge: parseFloat(paymentSettings.codCharge) || 0,
      },
      "Payment settings fetched successfully"
    )
  );
});

// Update payment settings
export const updatePaymentSettings = asyncHandler(async (req, res) => {
  const { cashEnabled, razorpayEnabled, codCharge } = req.body;

  // Validate that at least one payment method is enabled
  if (cashEnabled === false && razorpayEnabled === false) {
    throw new ApiError(
      400,
      "At least one payment method must be enabled (Cash or Razorpay)"
    );
  }

  // Validate COD charge is non-negative
  if (codCharge !== undefined && codCharge < 0) {
    throw new ApiError(400, "COD charge cannot be negative");
  }

  // Get or create payment settings
  let paymentSettings = await prisma.paymentSettings.findFirst();

  if (!paymentSettings) {
    paymentSettings = await prisma.paymentSettings.create({
      data: {
        cashEnabled: cashEnabled !== undefined ? cashEnabled : true,
        razorpayEnabled: razorpayEnabled !== undefined ? razorpayEnabled : false,
        codCharge: codCharge !== undefined ? codCharge : 0,
        updatedBy: req.admin?.id,
      },
    });
  } else {
    paymentSettings = await prisma.paymentSettings.update({
      where: { id: paymentSettings.id },
      data: {
        ...(cashEnabled !== undefined && { cashEnabled }),
        ...(razorpayEnabled !== undefined && { razorpayEnabled }),
        ...(codCharge !== undefined && { codCharge }),
        updatedBy: req.admin?.id,
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        cashEnabled: paymentSettings.cashEnabled,
        razorpayEnabled: paymentSettings.razorpayEnabled,
        codCharge: parseFloat(paymentSettings.codCharge) || 0,
      },
      "Payment settings updated successfully"
    )
  );
});

// Get price visibility settings
export const getPriceVisibilitySettings = asyncHandler(async (req, res) => {
  // Get or create price visibility settings (singleton)
  let priceVisibilitySettings = await prisma.priceVisibilitySetting.findFirst();

  // If no settings exist, create default ones
  if (!priceVisibilitySettings) {
    priceVisibilitySettings = await prisma.priceVisibilitySetting.create({
      data: {
        hidePricesForGuests: false,
        isActive: true,
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        hidePricesForGuests: priceVisibilitySettings.hidePricesForGuests,
        isActive: priceVisibilitySettings.isActive,
      },
      "Price visibility settings fetched successfully"
    )
  );
});

// Update price visibility settings
export const updatePriceVisibilitySettings = asyncHandler(async (req, res) => {
  const { hidePricesForGuests } = req.body;

  // Get or create price visibility settings
  let priceVisibilitySettings = await prisma.priceVisibilitySetting.findFirst();

  if (!priceVisibilitySettings) {
    priceVisibilitySettings = await prisma.priceVisibilitySetting.create({
      data: {
        hidePricesForGuests: hidePricesForGuests !== undefined ? hidePricesForGuests : false,
        isActive: true,
        updatedBy: req.admin?.id,
      },
    });
  } else {
    priceVisibilitySettings = await prisma.priceVisibilitySetting.update({
      where: { id: priceVisibilitySettings.id },
      data: {
        ...(hidePricesForGuests !== undefined && { hidePricesForGuests }),
        updatedBy: req.admin?.id,
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        hidePricesForGuests: priceVisibilitySettings.hidePricesForGuests,
        isActive: priceVisibilitySettings.isActive,
      },
      "Price visibility settings updated successfully"
    )
  );
});
