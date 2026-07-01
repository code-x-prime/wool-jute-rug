import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      variants: {
        include: {
          attributes: {
            include: {
              attributeValue: true
            }
          }
        }
      }
    }
  });

  for (const p of products) {
    console.log(`Product: ${p.name} (Slug: ${p.slug})`);
    console.log(`Variants: ${p.variants.length}`);
    for (const v of p.variants) {
      console.log(`  - Variant ID: ${v.id}, SKU: ${v.sku}, Price: ${v.price}, SalePrice: ${v.salePrice}, Active: ${v.isActive}`);
      if (v.attributes) {
        for (const attr of v.attributes) {
          console.log(`    * Attr: ${attr.attributeValue?.value}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
