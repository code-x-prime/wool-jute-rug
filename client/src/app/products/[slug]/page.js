import { fetchApi } from "@/lib/utils";
import ProductContent from "./ProductContent";

// Helper function to format image URLs correctly
const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};

export async function generateMetadata({ params }) {
  const { slug } = params;
  let title = "Product Details | Wool Jute Rug Co";
  let description =
    "Premium handcrafted wool and jute rugs. Browse our collection of Moroccan, Oriental, Vintage, and custom rugs. Free shipping on orders above ₹999!";
  let image = null;

  try {
    // Fetch product details from API
    const response = await fetchApi(`/public/products/${slug}`);
    const product = response.data.product;

    if (product) {
      title = product.metaTitle || `${product.name} | Wool Jute Rug Co`;
      description =
        product.metaDescription || product.description || description;

      // Get the first image from product images
      if (product.images && product.images.length > 0) {
        image = getImageUrl(product.images[0].url);
      }
    }
  } catch (error) {
    console.error("Error fetching product metadata:", error);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
      type: "website",
    },
  };
}

export default function ProductDetailPage({ params }) {
  return <ProductContent slug={params.slug} />;
}
