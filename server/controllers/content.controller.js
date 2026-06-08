import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import sendEmail from "../utils/sendEmail.js";

/**
 * Get blog posts with pagination
 */
const getBlogPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 9;
  const skip = (page - 1) * limit;
  const categorySlug = req.query.category;

  try {
    // Build where clause based on filters
    const where = { isPublished: true };
    if (categorySlug) {
      where.categories = {
        some: {
          slug: categorySlug,
        },
      };
    }

    // Get total count for pagination
    const totalPosts = await prisma.blogPost.count({ where });

    // Get blog posts with pagination
    const posts = await prisma.blogPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        categories: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Add full URL to coverImage for all posts
    const postsWithUrls = posts.map((post) => ({
      ...post,
      coverImageUrl: post.coverImage ? getFileUrl(post.coverImage) : null,
    }));

    return res.status(200).json(
      new ApiResponsive(200, {
        posts: postsWithUrls,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
        },
      })
    );
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    throw new ApiError(500, "Failed to fetch blog posts");
  }
});

/**
 * Get a single blog post by slug
 */
const getBlogPostBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  try {
    // Find post by slug
    const post = await prisma.blogPost.findUnique({
      where: { slug, isPublished: true },
      include: {
        categories: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!post) {
      throw new ApiError(404, "Blog post not found");
    }

    // Add full URL to coverImage
    if (post.coverImage) {
      post.coverImageUrl = getFileUrl(post.coverImage);
    }

    // Get related posts (posts with the same categories)
    let relatedPosts = [];
    if (post.categories.length > 0) {
      // Get category IDs from the current post
      const categoryIds = post.categories.map((cat) => cat.id);

      relatedPosts = await prisma.blogPost.findMany({
        where: {
          id: { not: post.id },
          isPublished: true,
          categories: {
            some: {
              id: { in: categoryIds },
            },
          },
        },
        take: 3,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          coverImage: true,
          createdAt: true,
        },
      });

      // Add full URL to coverImage for related posts
      relatedPosts = relatedPosts.map((p) => ({
        ...p,
        coverImageUrl: p.coverImage ? getFileUrl(p.coverImage) : null,
      }));
    }

    return res.status(200).json(
      new ApiResponsive(200, {
        post,
        relatedPosts,
      })
    );
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error("Error fetching blog post:", error);
    throw new ApiError(500, "Failed to fetch blog post");
  }
});

/**
 * Get blog categories
 */
const getBlogCategories = asyncHandler(async (req, res) => {
  try {
    // Get all published categories
    const categories = await prisma.blogCategory.findMany({
      orderBy: { name: "asc" },
    });

    // Count posts for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const postCount = await prisma.blogPost.count({
          where: {
            isPublished: true,
            categories: {
              some: {
                id: category.id,
              },
            },
          },
        });

        return {
          ...category,
          postCount,
        };
      })
    );

    return res.status(200).json(new ApiResponsive(200, categoriesWithCount));
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    throw new ApiError(500, "Failed to fetch blog categories");
  }
});

/**
 * Get about page content
 */
const getAboutPageContent = asyncHandler(async (req, res) => {
  try {
    // Try to get content from database
    const aboutContent = await prisma.pageContent.findUnique({
      where: { slug: "about" },
    });

    if (aboutContent) {
      return res.status(200).json(new ApiResponsive(200, aboutContent));
    }

    // If no content exists in the database, return the fallback content
    return res.status(200).json(
      new ApiResponsive(200, {
        title: "About Us",
        content:
          "<h2>Our Story</h2><p>Founded in 2015, wooljuterug started with a simple mission: to provide high-quality nutritional supplements that actually work, backed by science and free from harmful additives.</p><p>Our founder, Rahul Sharma, was frustrated with the lack of transparency in the supplements industry. After struggling to find products he could trust, he decided to create his own solution.</p><p>Today, we've grown into one of India's most trusted supplement brands, with a commitment to quality, transparency, and customer satisfaction that remains as strong as ever.</p>",
        metaTitle: "About Us | wooljuterug",
        metaDescription: "Learn more about wooljuterug and our mission.",
      })
    );
  } catch (error) {
    console.error("Error fetching about page content:", error);
    throw new ApiError(500, "Failed to fetch about page content");
  }
});

/**
 * Get shipping policy content
 */
const getShippingPolicy = asyncHandler(async (req, res) => {
  try {
    // Try to get content from database
    const shippingContent = await prisma.pageContent.findUnique({
      where: { slug: "shipping" },
    });

    if (shippingContent) {
      return res.status(200).json(new ApiResponsive(200, shippingContent));
    }

    // If no content exists in the database, return the fallback content
    return res.status(200).json(
      new ApiResponsive(200, {
        title: "Shipping Policy",
        content:
          "<h2>Delivery Information</h2><p>At wooljuterug, we strive to deliver your orders as quickly and efficiently as possible. We understand that when you order nutritional supplements, you want them right away. That's why we've partnered with reliable courier services to ensure your products reach you in perfect condition.</p><h2>Shipping Fees</h2><ul><li><strong>Free Shipping:</strong> On all orders above ₹999</li><li><strong>Standard Shipping:</strong> ₹99 for orders below ₹999</li><li><strong>Express Shipping:</strong> ₹199 (delivery within 24-48 hours in select metro cities)</li></ul>",
        metaTitle: "Shipping Policy | wooljuterug",
        metaDescription: "Our shipping policies and delivery information.",
      })
    );
  } catch (error) {
    console.error("Error fetching shipping policy:", error);
    throw new ApiError(500, "Failed to fetch shipping policy");
  }
});

/**
 * Get FAQs
 */
const getFaqs = asyncHandler(async (req, res) => {
  try {
    // Get FAQs from database
    const faqs = await prisma.fAQ.findMany({
      where: { isPublished: true },
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });

    if (faqs.length > 0) {
      return res.status(200).json(
        new ApiResponsive(200, {
          faqs,
          metaTitle: "Frequently Asked Questions | wooljuterug",
          metaDescription:
            "Find answers to common questions about our products and services.",
        })
      );
    }

    // If no FAQs in database, return mock data
    return res.status(200).json(
      new ApiResponsive(200, {
        faqs: [
          {
            id: "1",
            question: "How do I track my order?",
            answer:
              "<p>You can track your order by logging into your account and visiting the 'Orders' section. Alternatively, you can use the tracking number provided in your shipping confirmation email.</p>",
            category: "Orders",
            order: 1,
            isPublished: true,
          },
          {
            id: "2",
            question: "What payment methods do you accept?",
            answer:
              "<p>We accept credit/debit cards, UPI, net banking, and various wallets including PayTM, PhonePe, and Google Pay.</p>",
            category: "Payments",
            order: 1,
            isPublished: true,
          },
          {
            id: "3",
            question: "Are your supplements safe?",
            answer:
              "<p>Yes, all our supplements are manufactured in FDA-approved facilities and undergo rigorous quality testing. We prioritize safety and efficacy in all our products.</p>",
            category: "Products",
            order: 1,
            isPublished: true,
          },
        ],
        metaTitle: "Frequently Asked Questions | wooljuterug",
        metaDescription:
          "Find answers to common questions about our products and services.",
      })
    );
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    throw new ApiError(500, "Failed to fetch FAQs");
  }
});

/**
 * @desc    Submit custom rug request
 * @route   POST /api/content/custom-rugs
 * @access  Public
 */
const submitCustomRugRequest = asyncHandler(async (req, res) => {
  const { name, email, phone, dimensions, material, colors, designNotes } = req.body;

  if (!name || !email) {
    throw new ApiError(400, "Name and email are required");
  }

  try {
    // Create custom rug request in database
    await prisma.customRugRequest.create({
      data: {
        name,
        email,
        phone,
        dimensions,
        material,
        colors,
        designNotes,
        type: "CUSTOM_RUG",
        status: "NEW",
      },
    });

    // Try to send emails
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "connect.wooljuterug@gmail.com";
      // Send to Admin
      await sendEmail({
        email: adminEmail,
        subject: "New Custom Rug Request Received - Wool Jute Rug Co.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e0d5; padding: 20px;">
            <div style="background-color: #3D1C02; color: #fff; padding: 15px; text-align: center;">
              <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">Custom Rug Request</h2>
            </div>
            <div style="padding: 20px; color: #333;">
              <p>Hello Admin,</p>
              <p>You have received a new custom rug request. Here are the details:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Dimensions:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dimensions || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Material:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${material || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Colors:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${colors || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Design Notes:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${designNotes || "N/A"}</td></tr>
              </table>
            </div>
          </div>
        `
      });

      // Send to Customer
      await sendEmail({
        email: email,
        subject: "We've Received Your Custom Rug Inquiry - Wool Jute Rug Co.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e0d5; padding: 20px;">
            <div style="background-color: #3D1C02; color: #fff; padding: 15px; text-align: center;">
              <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">Wool Jute Rug Co.</h2>
            </div>
            <div style="padding: 20px; color: #333; line-height: 1.6;">
              <p>Dear ${name},</p>
              <p>Thank you for reaching out to us with your custom rug requirements. We have received your inquiry and our design specialists are reviewing the specifications.</p>
              <p><strong>Summary of details submitted:</strong></p>
              <ul>
                <li><strong>Dimensions:</strong> ${dimensions || "N/A"}</li>
                <li><strong>Material:</strong> ${material || "N/A"}</li>
                <li><strong>Colors:</strong> ${colors || "N/A"}</li>
              </ul>
              <p>We will get back to you within 24-48 business hours with an initial design consultation.</p>
              <p>Warm regards,<br/>Team Wool Jute Rug Co.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Error sending custom rug emails:", emailErr);
    }

    return res
      .status(201)
      .json(
        new ApiResponsive(
          201,
          "Your custom rug inquiry has been received. We will contact you soon!"
        )
      );
  } catch (error) {
    console.error("Error submitting custom rug request:", error);
    throw new ApiError(500, "Failed to submit custom rug request");
  }
});

/**
 * @desc    Submit rug services (washing & repair) request
 * @route   POST /api/public/rug-services
 * @access  Public
 */
const submitRugServiceRequest = asyncHandler(async (req, res) => {
  const { name, email, phone, pincode, designNotes } = req.body;

  if (!name || !phone || !pincode) {
    throw new ApiError(400, "Name, phone, and pincode are required");
  }

  try {
    const dbEmail = email || `no-email-${Date.now()}@wooljuterug.com`;
    // Create service request in database
    await prisma.customRugRequest.create({
      data: {
        name,
        email: dbEmail,
        phone,
        pincode,
        designNotes,
        type: "RUG_SERVICE",
        status: "NEW",
      },
    });

    // Send email notifications
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "connect.wooljuterug@gmail.com";
      // Send to Admin
      await sendEmail({
        email: adminEmail,
        subject: "New Rug Wash & Repair Request - Wool Jute Rug Co.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e0d5; padding: 20px;">
            <div style="background-color: #3D1C02; color: #fff; padding: 15px; text-align: center;">
              <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">Rug Wash & Repair Request</h2>
            </div>
            <div style="padding: 20px; color: #333;">
              <p>Hello Admin,</p>
              <p>A new washing and repair request has been submitted:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%;">Customer Name:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Pincode:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${pincode}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description/Notes:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${designNotes || "N/A"}</td></tr>
              </table>
            </div>
          </div>
        `
      });

      // Send to Customer (if valid email provided)
      if (email) {
        await sendEmail({
          email: email,
          subject: "We've Received Your Rug Service Request - Wool Jute Rug Co.",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e0d5; padding: 20px;">
              <div style="background-color: #3D1C02; color: #fff; padding: 15px; text-align: center;">
                <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">Wool Jute Rug Co.</h2>
              </div>
              <div style="padding: 20px; color: #333; line-height: 1.6;">
                <p>Dear ${name},</p>
                <p>Thank you for requesting our professional rug washing and care services. We have registered your request for pincode <strong>${pincode}</strong>.</p>
                <p>One of our rug care specialists will contact you at <strong>${phone}</strong> shortly to discuss the pickup options, service charges, and logistics details.</p>
                <p>Warm regards,<br/>Team Wool Jute Rug Co.</p>
              </div>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error("Error sending rug service emails:", emailErr);
    }

    return res
      .status(201)
      .json(
        new ApiResponsive(
          201,
          "Your service request has been received. Our rug specialists will contact you shortly."
        )
      );
  } catch (error) {
    console.error("Error submitting rug service request:", error);
    throw new ApiError(500, "Failed to submit service request");
  }
});

/**
 * @desc    Submit general contact enquiry
 * @route   POST /api/public/contact-enquiry
 * @access  Public
 */
const submitContactEnquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, designNotes } = req.body;

  if (!name || !email || !designNotes) {
    throw new ApiError(400, "Name, email, and message are required");
  }

  try {
    // Create contact request in database
    await prisma.customRugRequest.create({
      data: {
        name,
        email,
        phone,
        designNotes,
        type: "CONTACT_ENQUIRY",
        status: "NEW",
      },
    });

    // Send email notifications
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "connect.wooljuterug@gmail.com";
      // Send to Admin
      await sendEmail({
        email: adminEmail,
        subject: "New General Contact Enquiry - Wool Jute Rug Co.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e0d5; padding: 20px;">
            <div style="background-color: #3D1C02; color: #fff; padding: 15px; text-align: center;">
              <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">General Contact Enquiry</h2>
            </div>
            <div style="padding: 20px; color: #333;">
              <p>Hello Admin,</p>
              <p>You have received a new message from the contact page:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 35%;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone || "N/A"}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Message:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${designNotes}</td></tr>
              </table>
            </div>
          </div>
        `
      });

      // Send to Customer
      await sendEmail({
        email: email,
        subject: "Thank You for Contacting Us - Wool Jute Rug Co.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8e0d5; padding: 20px;">
            <div style="background-color: #3D1C02; color: #fff; padding: 15px; text-align: center;">
              <h2 style="margin: 0; font-weight: normal; letter-spacing: 1px;">Wool Jute Rug Co.</h2>
            </div>
            <div style="padding: 20px; color: #333; line-height: 1.6;">
              <p>Dear ${name},</p>
              <p>Thank you for getting in touch with us. We have received your message and our customer support team is looking into it.</p>
              <p>We will get back to you as soon as possible, typically within 24 hours.</p>
              <p>Warm regards,<br/>Team Wool Jute Rug Co.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Error sending contact enquiry emails:", emailErr);
    }

    return res
      .status(201)
      .json(
        new ApiResponsive(
          201,
          "Your enquiry has been submitted. We will contact you soon."
        )
      );
  } catch (error) {
    console.error("Error submitting contact enquiry:", error);
    throw new ApiError(500, "Failed to submit contact enquiry");
  }
});

/**
 * Get contact page information
 */
const getContactInfo = asyncHandler(async (req, res) => {
  try {
    // Try to get content from database
    const contactContent = await prisma.pageContent.findUnique({
      where: { slug: "contact" },
    });

    // If exists in database, return that content
    if (contactContent) {
      const contactData = {
        ...contactContent,
        // You can override or add specific fields as needed
        mapCoordinates: {
          lat: 19.076,
          lng: 72.8777,
        },
        socialLinks: {
          facebook: "https://facebook.com/wooljuterug",
          instagram: "https://instagram.com/wooljuterug",
          twitter: "https://twitter.com/wooljuterug",
        },
      };

      return res.status(200).json(new ApiResponsive(200, contactData));
    }

    // Default fallback contact info
    const contactInfo = {
      address: "89/2 Sector 39, Gurugram, Haryana",
      phone: "+91 8053210008",
      email: "connect.wooljuterug@gmail.com",
      hours: "Monday - Saturday: 10:00 AM - 7:00 PM",
      mapCoordinates: {
        lat: 19.076,
        lng: 72.8777,
      },
      socialLinks: {
        facebook: "https://facebook.com/wooljuterug",
        instagram: "https://instagram.com/wooljuterug",
        twitter: "https://twitter.com/wooljuterug",
      },
      metaTitle: "Contact Us | wooljuterug",
      metaDescription:
        "Get in touch with our customer support team. We're here to help!",
    };

    return res.status(200).json(new ApiResponsive(200, contactInfo));
  } catch (error) {
    console.error("Error fetching contact info:", error);
    throw new ApiError(500, "Failed to fetch contact information");
  }
});

export {
  getBlogPosts,
  getBlogPostBySlug,
  getBlogCategories,
  getAboutPageContent,
  getShippingPolicy,
  getFaqs,
  submitCustomRugRequest,
  submitRugServiceRequest,
  submitContactEnquiry,
  getContactInfo,
};
