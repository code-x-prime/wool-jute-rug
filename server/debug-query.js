import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const color = "49e61204-7b06-4f21-9cc3-7f1f9359ccd8";
  const size = "38077e21-c785-4b19-ae6a-ab7999952203";
  const category = "test";
  
  const allAttributeValueIds = [color, size];
  
  const where = {
    isActive: true,
    categories: {
      some: {
        category: {
          OR: [{ id: category }, { slug: category }]
        }
      }
    },
    variants: {
      some: {
        AND: [
          { isActive: true },
          ...allAttributeValueIds.map((id) => ({
            attributes: {
              some: {
                attributeValueId: id,
              },
            },
          })),
        ],
      },
    },
  };
  
  const result = await prisma.product.findMany({
    where,
    include: {
      variants: {
        include: {
          attributes: true
        }
      }
    }
  });
  
  console.log("Found products with exactly this query:", result.length);
  
  // What if we OR the attributes instead of AND?
  const whereOr = {
    isActive: true,
    variants: {
      some: {
        AND: [
          { isActive: true },
          {
            OR: allAttributeValueIds.map((id) => ({
              attributes: {
                some: { attributeValueId: id }
              }
            }))
          }
        ]
      }
    }
  };
  
  const resultOr = await prisma.product.findMany({ where: whereOr });
  console.log("Found products if we OR the attributes:", resultOr.length);
  
  // Let's just find ANY variant with one of these attributes to see if they exist
  const vars = await prisma.productVariant.findMany({
    where: {
      attributes: {
        some: {
          attributeValueId: { in: allAttributeValueIds }
        }
      }
    },
    include: { attributes: true }
  });
  console.log("Variants with ANY of these attributes:", vars.length);
  if (vars.length > 0) {
    console.log("First variant attributes:", vars[0].attributes);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
