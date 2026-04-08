require("dotenv").config();

const { closeDriver, getDriver } = require("../src/neo4j");
const { seedDemoData } = require("../src/seed");

async function main() {
  try {
    const result = await seedDemoData(getDriver());
    console.log("Seed complete.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await closeDriver();
  }
}

main();
