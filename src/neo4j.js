const neo4j = require("neo4j-driver");

let driver;

function getNeo4jConfig() {
  return {
    uri: process.env.NEO4J_URI || "bolt://127.0.0.1:7687",
    user: process.env.NEO4J_USER || "neo4j",
    password: process.env.NEO4J_PASSWORD || "contextgraph123",
    database: process.env.NEO4J_DATABASE || "neo4j",
  };
}

function getDriver() {
  if (driver) {
    return driver;
  }

  const config = getNeo4jConfig();
  if (!config.uri || !config.user || !config.password) {
    return null;
  }

  driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password),
    {
      disableLosslessIntegers: true,
    }
  );

  return driver;
}

function getSession(targetDriver) {
  const selectedDriver = targetDriver || getDriver();
  if (!selectedDriver) {
    throw new Error(
      "Neo4j driver is not available. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD."
    );
  }

  return selectedDriver.session({
    database: getNeo4jConfig().database,
  });
}

async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}

module.exports = {
  closeDriver,
  getDriver,
  getNeo4jConfig,
  getSession,
};
