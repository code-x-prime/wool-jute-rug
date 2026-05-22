import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const color = "49e61204-7b06-4f21-9cc3-7f1f9359ccd8";
  const size = "38077e21-c785-4b19-ae6a-ab7999952203";
  const category = "test";
  
  // Find products in category
  const products = await prisma.product.findMany({
    where: {
      categories: {
        some: {
          category: {
            OR: [{ id: category }, { slug: category }]
          }
        }
      }
    },
    include: {
      variants: {
        include: {
          attributes: true
        }
      }
    }
  });
  
  console.log(`Found ${products.length} products in category '${category}'`);
  
  products.forEach(p => {
    console.log(`Product: ${p.name} (${p.id})`);
    p.variants.forEach(v => {
      const attrs = v.attributes.map(a => a.attributeValueId);
      console.log(`  Variant: ${v.sku} - Attributes: ${attrs.join(', ')}`);
      
      const hasColor = attrs.includes(color);
      const hasSize = attrs.includes(size);
      if (hasColor && hasSize) {
        console.log(`    *** MATCHES BOTH! ***`);
      } else if (hasColor || hasSize) {
        console.log(`    Matches ${hasColor ? 'color' : 'size'}`);
      }
    });
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
