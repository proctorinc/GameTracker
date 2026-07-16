import { seedCardCatalog } from "../src/lib/card-catalog-seed";

async function main() {
  await seedCardCatalog();
  console.log("Card catalog is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
