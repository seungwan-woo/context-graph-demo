const { seedData } = require("./data");
const { getSession } = require("./neo4j");

async function runConstraints(tx) {
  const statements = [
    "CREATE CONSTRAINT demo_user_id IF NOT EXISTS FOR (n:User) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT demo_device_id IF NOT EXISTS FOR (n:Device) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT demo_app_id IF NOT EXISTS FOR (n:App) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT demo_contact_id IF NOT EXISTS FOR (n:Contact) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT demo_target_id IF NOT EXISTS FOR (n:ShareTarget) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT demo_scenario_id IF NOT EXISTS FOR (n:Scenario) REQUIRE n.id IS UNIQUE",
    "CREATE CONSTRAINT demo_event_id IF NOT EXISTS FOR (n:EventType) REQUIRE n.id IS UNIQUE"
  ];

  for (const statement of statements) {
    await tx.run(statement);
  }
}

async function seedDemoData(driver) {
  const session = getSession(driver);
  const scenarioProperties = seedData.scenarios.map(
    ({ recentApps, directBoosts, appBoosts, ...scenario }) => scenario
  );

  try {
    await session.executeWrite(async (tx) => {
      await runConstraints(tx);
    });

    await session.executeWrite(async (tx) => {
      await tx.run("MATCH (n:Demo) DETACH DELETE n");

      await tx.run(
        `
          MERGE (u:Demo:User {id: $user.id})
          SET u += $user
        `,
        { user: seedData.user }
      );

      await tx.run(
        `
          MERGE (d:Demo:Device {id: $device.id})
          SET d += $device
          WITH d
          MATCH (u:Demo:User {id: $userId})
          MERGE (u)-[:USES_DEVICE]->(d)
        `,
        {
          device: seedData.device,
          userId: seedData.user.id,
        }
      );

      await tx.run(
        `
          UNWIND $events AS event
          MERGE (e:Demo:EventType {id: event.id})
          SET e += event
        `,
        { events: seedData.events }
      );

      await tx.run(
        `
          UNWIND $apps AS app
          MERGE (a:Demo:App {id: app.id})
          SET a += app
        `,
        { apps: seedData.apps }
      );

      await tx.run(
        `
          UNWIND $contacts AS contact
          MERGE (c:Demo:Contact {id: contact.id})
          SET c += contact
        `,
        { contacts: seedData.contacts }
      );

      await tx.run(
        `
          UNWIND $targets AS target
          MERGE (t:Demo:ShareTarget {id: target.id})
          SET t += target
          WITH t, target
          MATCH (c:Demo:Contact {id: target.contactId})
          MATCH (a:Demo:App {id: target.appId})
          MERGE (t)-[:TO_CONTACT]->(c)
          MERGE (t)-[:VIA_APP]->(a)
        `,
        { targets: seedData.directTargets }
      );

      await tx.run(
        `
          UNWIND $history AS item
          MATCH (u:Demo:User {id: $userId})
          MATCH (c:Demo:Contact {id: item.contactId})
          MERGE (u)-[r:INTERACTED_WITH]->(c)
          SET r.count7d = item.count7d,
              r.count30d = item.count30d,
              r.lastHoursAgo = item.lastHoursAgo
        `,
        {
          history: seedData.userContactHistory,
          userId: seedData.user.id,
        }
      );

      await tx.run(
        `
          UNWIND $history AS item
          MATCH (u:Demo:User {id: $userId})
          MATCH (a:Demo:App {id: item.appId})
          MERGE (u)-[r:SHARED_VIA]->(a)
          SET r.shareCount7d = item.shareCount7d,
              r.shareCount30d = item.shareCount30d,
              r.lastHoursAgo = item.lastHoursAgo
        `,
        {
          history: seedData.userAppHistory,
          userId: seedData.user.id,
        }
      );

      await tx.run(
        `
          UNWIND $scenarios AS scenario
          MERGE (s:Demo:Scenario {id: scenario.id})
          SET s += scenario
          WITH s, scenario
          MATCH (u:Demo:User {id: $userId})
          MATCH (d:Demo:Device {id: $deviceId})
          MATCH (source:Demo:App {id: scenario.sourceAppId})
          MERGE (u)-[:EXPERIENCES]->(s)
          MERGE (d)-[:CAPTURED_CONTEXT]->(s)
          MERGE (s)-[:SOURCE_APP]->(source)
        `,
        {
          scenarios: scenarioProperties,
          userId: seedData.user.id,
          deviceId: seedData.device.id,
        }
      );

      await tx.run(
        `
          UNWIND $scenarios AS scenario
          MATCH (s:Demo:Scenario {id: scenario.id})
          UNWIND scenario.recentApps AS recent
          MATCH (a:Demo:App {id: recent.appId})
          MERGE (s)-[r:RECENT_APP]->(a)
          SET r.minutesAgo = recent.minutesAgo,
              r.foreground = recent.foreground
        `,
        { scenarios: seedData.scenarios }
      );

      await tx.run(
        `
          UNWIND $scenarios AS scenario
          MATCH (s:Demo:Scenario {id: scenario.id})
          UNWIND scenario.directBoosts AS boost
          MATCH (t:Demo:ShareTarget {id: boost.targetId})
          MERGE (s)-[r:BOOSTS {eventType: 'sharesheet_open'}]->(t)
          SET r.score = boost.score,
              r.reason = boost.reason
        `,
        { scenarios: seedData.scenarios }
      );

      await tx.run(
        `
          UNWIND $scenarios AS scenario
          MATCH (s:Demo:Scenario {id: scenario.id})
          UNWIND scenario.appBoosts AS boost
          MATCH (a:Demo:App {id: boost.appId})
          MERGE (s)-[r:BOOSTS {eventType: 'sharesheet_open'}]->(a)
          SET r.score = boost.score,
              r.reason = boost.reason
        `,
        { scenarios: seedData.scenarios }
      );

      await tx.run(
        `
          UNWIND $candidates AS candidate
          MATCH (e:Demo:EventType {id: candidate.eventId})
          MATCH (t:Demo:ShareTarget {id: candidate.targetId})
          MERGE (e)-[r:HAS_DIRECT_CANDIDATE]->(t)
          SET r.baseScore = candidate.baseScore
        `,
        { candidates: seedData.shareCandidates.direct }
      );

      await tx.run(
        `
          UNWIND $candidates AS candidate
          MATCH (e:Demo:EventType {id: candidate.eventId})
          MATCH (a:Demo:App {id: candidate.appId})
          MERGE (e)-[r:HAS_APP_CANDIDATE]->(a)
          SET r.baseScore = candidate.baseScore
        `,
        { candidates: seedData.shareCandidates.apps }
      );
    });

    return {
      message: "Demo graph seeded into Neo4j.",
      counts: {
        scenarios: seedData.scenarios.length,
        apps: seedData.apps.length,
        contacts: seedData.contacts.length,
        directTargets: seedData.directTargets.length,
      },
    };
  } finally {
    await session.close();
  }
}

module.exports = {
  seedDemoData,
};
