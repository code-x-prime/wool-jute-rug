/**
 * Utility function to format image URLs correctly
 * @param image The image path or URL
 * @returns Properly formatted image URL
 */
export const getImageUrl = (image: string | null | undefined): string => {
  if (!image) return "https://placehold.co/600x400?text=No+Image";
  if (image.startsWith("http")) return image;
  return `https://desirediv-storage.blr1.digitaloceanspaces.com/${image}`;
};
