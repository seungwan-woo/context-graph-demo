require("dotenv").config();

const express = require("express");
const path = require("path");
const { closeDriver, getDriver, getNeo4jConfig } = require("./src/neo4j");
const {
  getGraphSnapshot,
  getScenarioList,
  simulateScenario,
} = require("./src/simulation");
const { seedDemoData } = require("./src/seed");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function normalizeError(error) {
  return {
    message: error.message,
    code: error.code || "UNSPECIFIED_ERROR",
  };
}

app.get("/api/health", async (_req, res) => {
  const config = getNeo4jConfig();
  const driver = getDriver();

  if (!driver) {
    return res.status(200).json({
      ok: false,
      configured: false,
      message: "Neo4j configuration is incomplete.",
      config: {
        uri: config.uri,
        user: config.user,
        database: config.database,
      },
    });
  }

  try {
    const serverInfo = await driver.getServerInfo();
    return res.json({
      ok: true,
      configured: true,
      message: "Neo4j is reachable.",
      server: {
        address: serverInfo.address,
        version: serverInfo.protocolVersion,
      },
      config: {
        uri: config.uri,
        user: config.user,
        database: config.database,
      },
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      configured: true,
      message: "Neo4j configuration exists but the server is not reachable.",
      error: normalizeError(error),
      config: {
        uri: config.uri,
        user: config.user,
        database: config.database,
      },
    });
  }
});

app.post("/api/seed", async (_req, res) => {
  try {
    const result = await seedDemoData(getDriver());
    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: normalizeError(error),
    });
  }
});

app.get("/api/scenarios", async (_req, res) => {
  try {
    const scenarios = await getScenarioList(getDriver());
    return res.json({
      ok: true,
      scenarios,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: normalizeError(error),
    });
  }
});

app.get("/api/graph/:scenarioId", async (req, res) => {
  try {
    const graph = await getGraphSnapshot(getDriver(), req.params.scenarioId);
    return res.json({
      ok: true,
      graph,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: normalizeError(error),
    });
  }
});

app.post("/api/simulate", async (req, res) => {
  try {
    const { scenarioId, eventType } = req.body || {};
    const simulation = await simulateScenario(getDriver(), {
      scenarioId,
      eventType,
    });
    return res.json({
      ok: true,
      simulation,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: normalizeError(error),
    });
  }
});

app.listen(port, () => {
  const config = getNeo4jConfig();
  console.log(`Context graph demo listening on http://localhost:${port}`);
  console.log(
    `Neo4j target: ${config.uri} (db=${config.database}, user=${config.user})`
  );
});

process.on("SIGINT", async () => {
  await closeDriver();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDriver();
  process.exit(0);
});
