const healthBanner = document.getElementById("healthBanner");
const seedButton = document.getElementById("seedButton");
const refreshButton = document.getElementById("refreshButton");
const scenarioSelect = document.getElementById("scenarioSelect");
const eventSelect = document.getElementById("eventSelect");
const simulateButton = document.getElementById("simulateButton");
const scenarioCard = document.getElementById("scenarioCard");
const noiseDecision = document.getElementById("noiseDecision");
const directShareList = document.getElementById("directShareList");
const appRankingList = document.getElementById("appRankingList");

let scenarios = [];
let graph;

function setBanner(message, state = "default") {
  healthBanner.textContent = message;
  healthBanner.className = `banner ${state === "default" ? "" : state}`.trim();
}

async function request(url, options = {}, allowLogicalFailure = false) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const payload = await response.json();
  if (!response.ok || (!allowLogicalFailure && payload.ok === false)) {
    const message = payload?.error?.message || payload?.message || "Request failed.";
    throw new Error(message);
  }
  return payload;
}

function renderScenarioCard(scenario) {
  if (!scenario) {
    scenarioCard.innerHTML = "<p class='muted'>시나리오를 불러오지 못했습니다.</p>";
    return;
  }

  scenarioCard.innerHTML = `
    <h3>${scenario.label}</h3>
    <p>${scenario.description}</p>
    <div class="scenario-meta">
      <span>${scenario.locationType}</span>
      <span>${scenario.timeOfDay}</span>
      <span>${scenario.noiseDb} dB</span>
      <span>${scenario.network}</span>
      <span>source: ${scenario.sourceApp.label}</span>
    </div>
  `;
}

function renderNoiseDecision(decision) {
  const pillClass = decision.recommended ? "positive" : "neutral";
  const label = decision.recommended ? "Enable" : "Skip";
  noiseDecision.innerHTML = `
    <div class="status-pill ${pillClass}">${label} · ${decision.confidence} confidence · ${decision.score}pt</div>
    <p>${decision.summary}</p>
    <ul class="reason-list">
      ${decision.reasons.map((reason) => `<li>${reason}</li>`).join("")}
    </ul>
  `;
}

function renderRanking(container, items, emptyLabel) {
  if (!items || items.length === 0) {
    container.innerHTML = `<p class="muted">${emptyLabel}</p>`;
    return;
  }

  container.innerHTML = `
    <ol class="ranking-list">
      ${items
        .map(
          (item) => `
            <li class="ranking-item">
              <div class="ranking-head">
                <span class="ranking-title">${item.rank}. ${item.label}</span>
                <span class="ranking-score">${item.totalScore}</span>
              </div>
              <div class="ranking-sub">
                ${item.contactLabel ? `${item.contactLabel} · ${item.channelLabel}` : item.category}
              </div>
              <ul class="contribution-list">
                ${item.contributions
                  .slice(0, 4)
                  .map(
                    (contribution) =>
                      `<li>${contribution.label}: ${Number(contribution.score.toFixed(1))}</li>`
                  )
                  .join("")}
              </ul>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function graphElements(payload) {
  const palette = {
    Scenario: "#c75a1b",
    App: "#51604c",
    User: "#1d1b18",
    Device: "#7f6a58",
    ShareTarget: "#8e4b85",
    Contact: "#3a6ea5",
    EventType: "#b47a20",
  };

  return [
    ...payload.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        kind: node.kind,
        color: palette[node.kind] || "#7f6a58",
      },
    })),
    ...payload.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type,
      },
    })),
  ];
}

function renderGraph(payload) {
  const container = document.getElementById("graph");
  if (graph) {
    graph.destroy();
  }

  graph = cytoscape({
    container,
    elements: graphElements(payload),
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          label: "data(label)",
          color: "#fffdf8",
          "font-family": "Space Grotesk",
          "font-size": 11,
          "text-wrap": "wrap",
          "text-max-width": 90,
          "text-valign": "center",
          "text-halign": "center",
          width: 58,
          height: 58,
          "overlay-opacity": 0,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "rgba(29,27,24,0.25)",
          "target-arrow-color": "rgba(29,27,24,0.2)",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": 9,
          color: "#5f5a54",
          "text-background-color": "rgba(255,250,241,0.8)",
          "text-background-opacity": 1,
          "text-background-padding": 2,
        },
      },
    ],
    layout: {
      name: "cose",
      animate: true,
      animationDuration: 700,
      nodeRepulsion: 9000,
      idealEdgeLength: 120,
    },
  });
}

async function loadHealth() {
  try {
    const payload = await request("/api/health", {}, true);
    if (payload.ok) {
      setBanner(`Neo4j connected: ${payload.config.uri}`, "ok");
    } else if (payload.configured) {
      setBanner(`${payload.message} (${payload.config.uri})`, "error");
    } else {
      setBanner("Neo4j 환경변수를 먼저 설정하거나 docker compose를 실행하세요.", "error");
    }
  } catch (error) {
    setBanner(error.message, "error");
  }
}

async function loadScenarios() {
  const payload = await request("/api/scenarios");
  scenarios = payload.scenarios;

  scenarioSelect.innerHTML = scenarios
    .map(
      (scenario) =>
        `<option value="${scenario.id}">${scenario.label}</option>`
    )
    .join("");

  renderScenarioCard(scenarios[0]);
}

async function runSimulation() {
  const scenarioId = scenarioSelect.value;
  const eventType = eventSelect.value;

  const [{ simulation }, { graph: graphPayload }] = await Promise.all([
    request("/api/simulate", {
      method: "POST",
      body: JSON.stringify({ scenarioId, eventType }),
    }),
    request(`/api/graph/${scenarioId}`),
  ]);

  renderNoiseDecision(simulation.noiseErase);
  renderRanking(directShareList, simulation.directShare, "No direct share candidates.");
  renderRanking(appRankingList, simulation.appRanking, "No app ranking candidates.");
  renderGraph(graphPayload);
}

seedButton.addEventListener("click", async () => {
  seedButton.disabled = true;
  setBanner("Seeding demo graph into Neo4j...");

  try {
    const payload = await request("/api/seed", { method: "POST" });
    setBanner(
      `Seeded ${payload.counts.scenarios} scenarios, ${payload.counts.apps} apps, ${payload.counts.contacts} contacts.`,
      "ok"
    );
    await loadScenarios();
    await runSimulation();
  } catch (error) {
    setBanner(error.message, "error");
  } finally {
    seedButton.disabled = false;
  }
});

refreshButton.addEventListener("click", async () => {
  await loadHealth();
});

scenarioSelect.addEventListener("change", () => {
  const selected = scenarios.find((scenario) => scenario.id === scenarioSelect.value);
  renderScenarioCard(selected);
});

simulateButton.addEventListener("click", async () => {
  try {
    await runSimulation();
  } catch (error) {
    setBanner(error.message, "error");
  }
});

async function initialize() {
  await loadHealth();

  try {
    await loadScenarios();
    await runSimulation();
  } catch (_error) {
    noiseDecision.innerHTML =
      "<p class='muted'>먼저 `Seed Demo Graph`를 눌러 더미 graph를 적재하세요.</p>";
    directShareList.innerHTML = "<p class='muted'>Seed 이후 ranking이 표시됩니다.</p>";
    appRankingList.innerHTML = "<p class='muted'>Seed 이후 ranking이 표시됩니다.</p>";
  }
}

initialize();
