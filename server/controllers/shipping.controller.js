import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkServiceability, isShiprocketEnabled, getShiprocketSettings } from "../utils/shiprocket.js";

export const getShippingRates = asyncHandler(async (req, res) => {
    const { addressId } = req.body;
    const userId = req.user.id;

    if (!addressId) {
        throw new ApiError(400, "addressId is required");
    }

    // Get delivery address
    const address = await prisma.address.findFirst({
        where: { id: addressId, userId },
    });
    if (!address) {
        throw new ApiError(404, "Address not found");
    }

    const deliveryPincode = address.postalCode?.replace(/\D/g, "");
    if (!deliveryPincode || deliveryPincode.length < 6) {
        throw new ApiError(400, "Invalid delivery pincode in address");
    }

    // Get cart items to calculate weight
    const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
            productVariant: true,
        },
    });

    if (!cartItems.length) {
        throw new ApiError(400, "Cart is empty");
    }

    // Fallback shipping (always available)
    const srSettings = await prisma.shiprocketSettings.findFirst();
    const fallbackCharge = parseFloat(srSettings?.shippingCharge || 0);
    const freeShippingThreshold = parseFloat(srSettings?.freeShippingThreshold || 0);

    // Calculate subtotal for free shipping check
    let subtotal = 0;
    for (const item of cartItems) {
        const price = parseFloat(item.productVariant.salePrice || item.productVariant.price);
        subtotal += Math.round(price) * item.quantity;
    }

    const isFreeShipping = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold;

    // Try Shiprocket rates if enabled
    const shiprocketEnabled = await isShiprocketEnabled();
    if (shiprocketEnabled) {
        try {
            // Get pickup address
            const pickupAddress = await prisma.shiprocketPickupAddress.findFirst({
                where: { isDefault: true },
            });
            if (!pickupAddress) {
                throw new Error("No default pickup address configured");
            }

            const settings = await getShiprocketSettings();

            // Calculate total weight
            let totalWeight = 0;
            for (const item of cartItems) {
                const weight = item.productVariant.shippingWeight || settings.defaultWeight || 0.5;
                totalWeight += weight * item.quantity;
            }

            const isCOD = true; // Check both COD and prepaid options

            const serviceabilityData = await checkServiceability({
                pickupPincode: pickupAddress.pincode,
                deliveryPincode,
                weight: totalWeight,
                cod: isCOD,
            });

            const couriers = serviceabilityData?.data?.available_courier_companies || [];

            if (couriers.length > 0) {
                // Format courier options
                const options = couriers.map((c) => ({
                    courierId: c.courier_company_id,
                    courierName: c.courier_name,
                    rate: isFreeShipping ? 0 : Math.round(c.freight_charge || c.rate || 0),
                    originalRate: Math.round(c.freight_charge || c.rate || 0),
                    estimatedDays: c.estimated_delivery_days || c.etd || "3-7 days",
                    codAvailable: c.cod === 1,
                    isFreeShipping,
                }));

                // Sort by rate ascending
                options.sort((a, b) => a.rate - b.rate);

                return res.status(200).json(
                    new ApiResponsive(200, {
                        couriers: options,
                        isFreeShipping,
                        freeShippingThreshold,
                        source: "shiprocket",
                    }, "Shipping rates fetched")
                );
            }
        } catch (err) {
            console.error("Shiprocket serviceability error:", err.message);
            // Fall through to fixed rate fallback
        }
    }

    // Fallback: fixed rate from settings
    const fixedOptions = [
        {
            courierId: null,
            courierName: "Standard Delivery",
            rate: isFreeShipping ? 0 : fallbackCharge,
            originalRate: fallbackCharge,
            estimatedDays: "3-7 days",
            codAvailable: true,
            isFreeShipping,
        },
    ];

    return res.status(200).json(
        new ApiResponsive(200, {
            couriers: fixedOptions,
            isFreeShipping,
            freeShippingThreshold,
            source: "fixed",
        }, "Shipping rates fetched")
    );
});
