const statusTone = {
  pass: {
    label: "PASS",
    className: "tone-pass",
    dotClass: "status-pass",
    title: "Sẵn sàng nền tảng",
    message: "Các khóa an toàn đang đạt yêu cầu hiện tại."
  },
  warn: {
    label: "WARN",
    className: "tone-warn",
    dotClass: "status-warn",
    title: "Cần bổ sung dữ liệu thật",
    message: "Hệ thống đang an toàn nhưng chưa đủ cấu hình để chạy live."
  },
  fail: {
    label: "FAIL",
    className: "tone-fail",
    dotClass: "status-fail",
    title: "Chưa được deploy production",
    message: "Có lỗi chặn vận hành. Cần xử lý trước khi chạy thật."
  }
};

const elements = {
  overallTitle: document.getElementById("overall-title"),
  overallMessage: document.getElementById("overall-message"),
  overallPill: document.getElementById("overall-pill"),
  sidebarStatusText: document.getElementById("sidebar-status-text"),
  sidebarDot: document.querySelector(".sidebar-status .status-dot"),
  readinessList: document.getElementById("readiness-list"),
  safetyBadge: document.getElementById("safety-badge"),
  botcakeState: document.getElementById("botcake-state"),
  posState: document.getElementById("pos-state"),
  draftState: document.getElementById("draft-state"),
  refreshButton: document.getElementById("refresh-button")
};

async function loadReadiness() {
  setLoading(true);
  try {
    const response = await fetch("/api/readiness", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Readiness API returned ${response.status}`);
    }
    const payload = await response.json();
    renderReadiness(payload);
  } catch (error) {
    renderError(error);
  } finally {
    setLoading(false);
  }
}

function renderReadiness(payload) {
  const tone = statusTone[payload.overallStatus] ?? statusTone.warn;
  elements.overallTitle.textContent = tone.title;
  elements.overallMessage.textContent = tone.message;
  elements.overallPill.textContent = tone.label;
  elements.overallPill.className = `readiness-pill ${tone.className}`;
  elements.sidebarStatusText.textContent = `Trạng thái: ${tone.label}`;
  elements.sidebarDot.className = `status-dot ${tone.dotClass}`;
  elements.safetyBadge.textContent = tone.label;
  elements.safetyBadge.className = `badge ${tone.className}`;

  elements.readinessList.innerHTML = "";
  for (const item of payload.items ?? []) {
    elements.readinessList.appendChild(createStatusRow(item));
  }

  renderServiceState(elements.botcakeState, payload.services?.botcake);
  renderServiceState(elements.posState, payload.services?.pancakePos);
  renderServiceState(elements.draftState, payload.services?.draftOrder);
}

function createStatusRow(item) {
  const tone = statusTone[item.status] ?? statusTone.warn;
  const row = document.createElement("div");
  row.className = "status-row";

  const dot = document.createElement("span");
  dot.className = `status-dot ${tone.dotClass}`;

  const content = document.createElement("div");
  const label = document.createElement("strong");
  label.textContent = item.label;
  const message = document.createElement("span");
  message.textContent = item.message;

  content.append(label, message);
  row.append(dot, content);
  return row;
}

function renderServiceState(target, service) {
  if (!service) {
    target.textContent = "Chưa đọc được trạng thái";
    return;
  }
  const tone = statusTone[service.status] ?? statusTone.warn;
  target.textContent = `${tone.label} · ${service.message}`;
  target.className = `service-state ${tone.className}`;
}

function renderError(error) {
  elements.overallTitle.textContent = "Không đọc được backend";
  elements.overallMessage.textContent = error instanceof Error ? error.message : "Readiness API không phản hồi.";
  elements.overallPill.textContent = "FAIL";
  elements.overallPill.className = "readiness-pill tone-fail";
  elements.sidebarStatusText.textContent = "Trạng thái: FAIL";
  elements.sidebarDot.className = "status-dot status-fail";
  elements.readinessList.innerHTML = "";
  elements.readinessList.appendChild(createStatusRow({
    label: "Readiness API",
    status: "fail",
    message: "Backend UI server chưa phản hồi đúng."
  }));
}

function setLoading(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.textContent = isLoading ? "Đang kiểm tra" : "Kiểm tra lại";
}

elements.refreshButton.addEventListener("click", () => {
  void loadReadiness();
});

void loadReadiness();
