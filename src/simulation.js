const { getSession } = require("./neo4j");

function requireParams({ scenarioId, eventType }) {
  if (!scenarioId) {
    throw new Error("scenarioId is required.");
  }
  if (!eventType) {
    throw new Error("eventType is required.");
  }
}

function buildNoiseEraseDecision(scenario, eventType) {
  let score = 0;
  const reasons = [];

  if (scenario.noiseDb >= 72) {
    score += 35;
    reasons.push(`ambient noise is high at ${scenario.noiseDb} dB`);
  } else if (scenario.noiseDb >= 60) {
    score += 20;
    reasons.push(`ambient noise is moderately high at ${scenario.noiseDb} dB`);
  } else {
    reasons.push(`ambient noise is low at ${scenario.noiseDb} dB`);
  }

  if (scenario.bluetoothAudio || scenario.wearingBuds) {
    score += 20;
    reasons.push("audio route is active through Bluetooth or earbuds");
  }

  if (scenario.motionState === "in_transit") {
    score += 15;
    reasons.push("device is moving through a transit context");
  }

  if (eventType === "youtube_launch") {
    score += 15;
    reasons.push("YouTube launch strongly suggests upcoming media playback");
  }

  if (eventType === "sharesheet_open") {
    score -= 8;
    reasons.push("sharesheet interaction is visual and lowers audio-processing priority");
  }

  if (scenario.focusMode) {
    score -= 6;
    reasons.push("focus mode suggests a quieter, more controlled workspace");
  }

  const recommended = score >= 45;
  const confidence =
    score >= 70 ? "high" : score >= 50 ? "medium" : "low";

  return {
    recommended,
    score,
    confidence,
    reasons,
    summary: recommended
      ? "Enable or preserve noise erase."
      : "Noise erase is not worth prioritizing right now.",
  };
}

function buildContributionRows(record, mapping) {
  return Object.entries(mapping)
    .filter(([, key]) => (record.get(key) || 0) !== 0)
    .map(([label, key]) => ({
      label,
      score: record.get(key) || 0,
    }))
    .sort((left, right) => right.score - left.score);
}

async function getScenarioList(driver) {
  const session = getSession(driver);

  try {
    const result = await session.run(
      `
        MATCH (s:Demo:Scenario)-[:SOURCE_APP]->(source:Demo:App)
        RETURN s {
          .*,
          sourceApp: source { .id, .label, .category }
        } AS scenario
        ORDER BY s.label
      `
    );

    return result.records.map((record) => record.get("scenario"));
  } finally {
    await session.close();
  }
}

async function getGraphSnapshot(driver, scenarioId) {
  const session = getSession(driver);

  try {
    const firstHop = await session.run(
      `
        MATCH (s:Demo:Scenario {id: $scenarioId})-[r]-(n)
        RETURN s, n, r
      `,
      { scenarioId }
    );

    const secondHop = await session.run(
      `
        MATCH (s:Demo:Scenario {id: $scenarioId})-[r1]-(n)-[r2]-(m)
        RETURN n, m, r2
      `,
      { scenarioId }
    );

    const nodes = new Map();
    const edges = new Map();

    function addNode(node) {
      if (!node) {
        return;
      }
      const id = node.properties.id || node.elementId;
      const kind =
        node.labels.find((label) => label !== "Demo") ||
        node.labels[node.labels.length - 1];
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          label: node.properties.label || node.properties.name || node.properties.id,
          kind,
          properties: node.properties,
        });
      }
    }

    function addEdge(rel, startNode, endNode) {
      if (!rel) {
        return;
      }
      const key = `${rel.elementId}:${startNode.properties.id || startNode.elementId}:${endNode.properties.id || endNode.elementId}`;
      if (!edges.has(key)) {
        edges.set(key, {
          id: rel.elementId,
          source: startNode.properties.id || startNode.elementId,
          target: endNode.properties.id || endNode.elementId,
          type: rel.type,
          properties: rel.properties,
        });
      }
    }

    for (const record of firstHop.records) {
      const scenario = record.get("s");
      const node = record.get("n");
      const relationship = record.get("r");
      addNode(scenario);
      addNode(node);
      addEdge(relationship, scenario, node);
    }

    for (const record of secondHop.records) {
      const node = record.get("n");
      const other = record.get("m");
      const relationship = record.get("r2");
      addNode(node);
      addNode(other);
      addEdge(relationship, node, other);
    }

    return {
      nodes: [...nodes.values()],
      edges: [...edges.values()],
    };
  } finally {
    await session.close();
  }
}

async function simulateScenario(driver, params) {
  requireParams(params);

  const { scenarioId, eventType } = params;
  const session = getSession(driver);

  try {
    const scenarioResult = await session.run(
      `
        MATCH (s:Demo:Scenario {id: $scenarioId})-[:SOURCE_APP]->(source:Demo:App)
        RETURN s {
          .*,
          sourceApp: source { .id, .label, .category }
        } AS scenario
      `,
      { scenarioId }
    );

    if (scenarioResult.records.length === 0) {
      throw new Error(`Unknown scenario: ${scenarioId}`);
    }

    const scenario = scenarioResult.records[0].get("scenario");
    const noiseErase = buildNoiseEraseDecision(scenario, eventType);

    const directResult = await session.run(
      `
        MATCH (s:Demo:Scenario {id: $scenarioId})
        MATCH (event:Demo:EventType {id: 'sharesheet_open'})-[candidate:HAS_DIRECT_CANDIDATE]->(target:Demo:ShareTarget)
        OPTIONAL MATCH (target)-[:TO_CONTACT]->(contact:Demo:Contact)
        OPTIONAL MATCH (target)-[:VIA_APP]->(channel:Demo:App)
        OPTIONAL MATCH (:Demo:User {id: 'demo-user'})-[interaction:INTERACTED_WITH]->(contact)
        OPTIONAL MATCH (s)-[boost:BOOSTS {eventType: 'sharesheet_open'}]->(target)
        OPTIONAL MATCH (s)-[recent:RECENT_APP]->(channel)
        WITH s, target, contact, channel, candidate, interaction, boost, recent,
             coalesce(candidate.baseScore, 0) AS baseScore,
             coalesce(boost.score, 0) AS scenarioBoost,
             CASE
               WHEN interaction.lastHoursAgo <= 2 THEN 16
               WHEN interaction.lastHoursAgo <= 8 THEN 12
               WHEN interaction.lastHoursAgo <= 24 THEN 7
               WHEN interaction.lastHoursAgo <= 72 THEN 3
               ELSE 0
             END AS contactRecencyBoost,
             coalesce(interaction.count7d, 0) * 2 AS contactFrequencyBoost,
             CASE
               WHEN recent.minutesAgo <= 10 THEN 10
               WHEN recent.minutesAgo <= 30 THEN 6
               WHEN recent.minutesAgo <= 90 THEN 2
               ELSE 0
             END AS channelFreshnessBoost,
             CASE
               WHEN s.locationType = 'office' AND channel.id = 'slack' THEN 8
               WHEN s.locationType = 'office' AND channel.id IN ['drive', 'gmail'] THEN 5
               WHEN s.locationType = 'transit' AND channel.id IN ['kakaotalk', 'messages'] THEN 7
               WHEN s.locationType = 'home' AND channel.id IN ['messages', 'kakaotalk'] THEN 6
               WHEN s.locationType = 'cafe' AND channel.id IN ['instagram', 'kakaotalk', 'messages'] THEN 6
               ELSE 0
             END AS locationBoost
        RETURN target.id AS id,
               target.label AS label,
               contact.label AS contactLabel,
               channel.label AS channelLabel,
               baseScore,
               scenarioBoost,
               contactRecencyBoost,
               contactFrequencyBoost,
               channelFreshnessBoost,
               locationBoost,
               (baseScore + scenarioBoost + contactRecencyBoost + contactFrequencyBoost + channelFreshnessBoost + locationBoost) AS totalScore
        ORDER BY totalScore DESC
        LIMIT 5
      `,
      { scenarioId }
    );

    const appResult = await session.run(
      `
        MATCH (s:Demo:Scenario {id: $scenarioId})-[:SOURCE_APP]->(source:Demo:App)
        MATCH (:Demo:EventType {id: 'sharesheet_open'})-[candidate:HAS_APP_CANDIDATE]->(app:Demo:App)
        OPTIONAL MATCH (:Demo:User {id: 'demo-user'})-[history:SHARED_VIA]->(app)
        OPTIONAL MATCH (s)-[boost:BOOSTS {eventType: 'sharesheet_open'}]->(app)
        OPTIONAL MATCH (s)-[recent:RECENT_APP]->(app)
        WITH s, source, app, candidate, history, boost, recent,
             coalesce(candidate.baseScore, 0) AS baseScore,
             coalesce(boost.score, 0) AS scenarioBoost,
             CASE
               WHEN history.lastHoursAgo <= 2 THEN 15
               WHEN history.lastHoursAgo <= 8 THEN 10
               WHEN history.lastHoursAgo <= 24 THEN 6
               ELSE 0
             END AS appRecencyBoost,
             coalesce(history.shareCount7d, 0) * 1.8 AS appFrequencyBoost,
             CASE
               WHEN recent.minutesAgo <= 10 THEN 12
               WHEN recent.minutesAgo <= 30 THEN 7
               WHEN recent.minutesAgo <= 90 THEN 3
               ELSE 0
             END AS recentUsageBoost,
             CASE
               WHEN source.id = 'photos' AND app.id IN ['instagram', 'kakaotalk', 'drive'] THEN 10
               WHEN source.id = 'youtube' AND app.id IN ['kakaotalk', 'messages', 'gmail'] THEN 8
               WHEN source.id = 'chrome' AND app.id IN ['slack', 'drive', 'gmail', 'notion'] THEN 9
               ELSE 0
             END AS sourceAffinityBoost
        RETURN app.id AS id,
               app.label AS label,
               app.category AS category,
               baseScore,
               scenarioBoost,
               appRecencyBoost,
               appFrequencyBoost,
               recentUsageBoost,
               sourceAffinityBoost,
               (baseScore + scenarioBoost + appRecencyBoost + appFrequencyBoost + recentUsageBoost + sourceAffinityBoost) AS totalScore
        ORDER BY totalScore DESC
        LIMIT 6
      `,
      { scenarioId }
    );

    const directShare = directResult.records.map((record, index) => ({
      rank: index + 1,
      id: record.get("id"),
      label: record.get("label"),
      contactLabel: record.get("contactLabel"),
      channelLabel: record.get("channelLabel"),
      totalScore: Number(record.get("totalScore").toFixed(1)),
      contributions: buildContributionRows(record, {
        "Base candidate prior": "baseScore",
        "Scenario boost": "scenarioBoost",
        "Contact recency": "contactRecencyBoost",
        "Contact frequency": "contactFrequencyBoost",
        "Channel freshness": "channelFreshnessBoost",
        "Location fit": "locationBoost",
      }),
    }));

    const appRanking = appResult.records.map((record, index) => ({
      rank: index + 1,
      id: record.get("id"),
      label: record.get("label"),
      category: record.get("category"),
      totalScore: Number(record.get("totalScore").toFixed(1)),
      contributions: buildContributionRows(record, {
        "Base candidate prior": "baseScore",
        "Scenario boost": "scenarioBoost",
        "App recency": "appRecencyBoost",
        "Share frequency": "appFrequencyBoost",
        "Recent foreground usage": "recentUsageBoost",
        "Source-app affinity": "sourceAffinityBoost",
      }),
    }));

    return {
      scenario,
      eventType,
      noiseErase,
      directShare,
      appRanking,
    };
  } finally {
    await session.close();
  }
}

module.exports = {
  getGraphSnapshot,
  getScenarioList,
  simulateScenario,
};
