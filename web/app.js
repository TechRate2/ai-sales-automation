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
  liveBotcakeSummary: document.getElementById("live-botcake-summary"),
  liveBotcakeTags: document.getElementById("live-botcake-tags"),
  livePosSummary: document.getElementById("live-pos-summary"),
  liveWarehouses: document.getElementById("live-warehouses"),
  liveProductCount: document.getElementById("live-product-count"),
  liveProductsTable: document.getElementById("live-products-table"),
  nextRequiredInputs: document.getElementById("next-required-inputs"),
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

async function loadLiveIntegrations() {
  renderLiveLoading();
  try {
    const response = await fetch("/api/integrations/live", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Live API returned ${response.status}`);
    }

    renderLiveIntegrations(await response.json());
  } catch (error) {
    renderLiveError(error);
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

function renderLiveIntegrations(payload) {
  renderLiveBotcake(payload.botcake);
  renderLivePos(payload.pancakePos);
  renderNextRequiredInputs(payload.nextRequiredInputs ?? []);
}

function renderLiveBotcake(botcake) {
  const tone = statusTone[botcake?.status] ?? statusTone.warn;
  elements.liveBotcakeSummary.textContent = `${tone.label} · ${botcake?.message ?? "Chưa có dữ liệu"}`;
  elements.liveBotcakeTags.innerHTML = "";

  const tags = botcake?.sampleTags ?? [];
  if (tags.length === 0) {
    elements.liveBotcakeTags.appendChild(createMutedLine("Chưa đọc được tag nào."));
    return;
  }

  for (const tag of tags) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = tag.name;
    elements.liveBotcakeTags.appendChild(chip);
  }
}

function renderLivePos(pos) {
  const tone = statusTone[pos?.status] ?? statusTone.warn;
  const shopName = pos?.shop?.name ?? "Chưa xác định shop";
  const total = typeof pos?.productTotalEntries === "number" ? `${pos.productTotalEntries} biến thể` : "chưa rõ tổng";
  elements.livePosSummary.textContent = `${tone.label} · ${shopName} · ${total}`;

  elements.liveWarehouses.innerHTML = "";
  for (const warehouse of pos?.warehouses ?? []) {
    const row = document.createElement("div");
    row.className = "compact-row";
    const title = document.createElement("strong");
    title.textContent = warehouse.name;
    const meta = document.createElement("span");
    meta.textContent = [
      warehouse.isDefault ? "Kho mặc định" : "Kho",
      warehouse.allowCreateOrder === true ? "cho tạo đơn" : "cần kiểm tra tạo đơn"
    ].join(" · ");
    row.append(title, meta);
    elements.liveWarehouses.appendChild(row);
  }

  if ((pos?.warehouses ?? []).length === 0) {
    elements.liveWarehouses.appendChild(createMutedLine("Chưa đọc được kho."));
  }

  renderLiveProducts(pos?.sampleProducts ?? [], total);
}

function renderLiveProducts(products, totalLabel) {
  elements.liveProductCount.textContent = totalLabel;
  elements.liveProductsTable.innerHTML = "";

  if (products.length === 0) {
    elements.liveProductsTable.appendChild(createMutedLine("Chưa đọc được sản phẩm mẫu."));
    return;
  }

  for (const product of products) {
    const row = document.createElement("div");
    row.className = "product-row";

    const image = document.createElement("div");
    image.className = "product-thumb";
    if (product.imageUrl) {
      image.style.backgroundImage = `url("${product.imageUrl}")`;
    } else {
      image.textContent = "POS";
    }

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = product.variantName;
    const meta = document.createElement("span");
    meta.textContent = [
      product.size ? `Size ${product.size}` : undefined,
      product.color,
      formatMoney(product.price)
    ].filter(Boolean).join(" · ");
    info.append(name, meta);

    const stock = document.createElement("div");
    stock.className = `stock-pill stock-${product.inventoryStatus}`;
    stock.textContent = `${renderInventoryStatus(product.inventoryStatus)} · ${product.availableQuantity ?? "?"}`;

    row.append(image, info, stock);
    elements.liveProductsTable.appendChild(row);
  }
}

function renderNextRequiredInputs(items) {
  elements.nextRequiredInputs.innerHTML = "";
  for (const item of items) {
    elements.nextRequiredInputs.appendChild(createMutedLine(item));
  }
}

function renderLiveLoading() {
  elements.liveBotcakeSummary.textContent = "Đang đọc Botcake thật";
  elements.livePosSummary.textContent = "Đang đọc Pancake POS thật";
  elements.liveProductCount.textContent = "Đang đồng bộ";
  elements.liveBotcakeTags.innerHTML = "";
  elements.liveWarehouses.innerHTML = "";
  elements.liveProductsTable.innerHTML = "";
  elements.nextRequiredInputs.innerHTML = "";
}

function renderLiveError(error) {
  const message = error instanceof Error ? error.message : "Không đọc được API live.";
  elements.liveBotcakeSummary.textContent = message;
  elements.livePosSummary.textContent = message;
  elements.liveProductCount.textContent = "Lỗi";
}

function createMutedLine(text) {
  const row = document.createElement("div");
  row.className = "compact-row";
  const span = document.createElement("span");
  span.textContent = text;
  row.appendChild(span);
  return row;
}

function formatMoney(value) {
  if (typeof value !== "number") {
    return undefined;
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

function renderInventoryStatus(status) {
  switch (status) {
    case "in_stock":
      return "Còn hàng";
    case "low_stock":
      return "Còn ít";
    case "out_of_stock":
      return "Hết hàng";
    case "unknown":
    default:
      return "Chưa rõ";
  }
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
  void loadLiveIntegrations();
});

void loadReadiness();
void loadLiveIntegrations();
