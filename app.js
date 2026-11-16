(() => {
  "use strict";

  const STORAGE_KEYS = {
    SETTINGS: "milkPosSettings",
    TOKEN_COUNTER: "milkPosTokenCounter",
    SESSION: "milkPosSession",
  };

  const DEFAULT_SETTINGS = {
    shopName: "Karachi Pure Milk Shop",
    shopSubtitle: "",
    paperWidth: "80mm",
    footerMsg: "Shukriya! Ye token sirf aaj ke liye qabil-e-qabool hai.",
  };

  const DEFAULT_ITEM = "Fresh Milk";

  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // DOM Elements
  const headerShopName = document.getElementById("header-shop-name");
  const headerShopSubtitle = document.getElementById("header-shop-subtitle");
  const nextTokenDisplay = document.getElementById("next-token-display");

  const amountInput = document.getElementById("amount-input");
  const inputError = document.getElementById("input-error");
  const itemPills = Array.from(document.querySelectorAll(".item-pill"));
  const quickAmtButtons = Array.from(document.querySelectorAll(".quick-amt-btn"));
  const btnClear = document.getElementById("btn-clear");
  const btnPrint = document.getElementById("btn-print");

  // Receipt Elements
  const receiptArea = document.getElementById("receipt-area");
  const previewWidthBadge = document.getElementById("preview-width-badge");
  const receiptShopName = document.getElementById("receipt-shop-name");
  const receiptShopSubtitle = document.getElementById("receipt-shop-subtitle");
  const receiptDatetime = document.getElementById("receipt-datetime");
  const receiptTokenNumber = document.getElementById("receipt-token-number");
  const receiptItemName = document.getElementById("receipt-item-name");
  const receiptAmount = document.getElementById("receipt-amount");
  const receiptFooter = document.getElementById("receipt-footer");

  // Session Summary Elements
  const btnToggleSummary = document.getElementById("btn-toggle-summary");
  const sessionSummaryContent = document.getElementById("session-summary-content");
  const sessionQuickStats = document.getElementById("session-quick-stats");
  const summaryTokenCount = document.getElementById("summary-token-count");
  const summaryTotalCash = document.getElementById("summary-total-cash");
  const btnResetSession = document.getElementById("btn-reset-session");

  // Settings Modal Elements
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const btnCloseSettings = document.getElementById("btn-close-settings");
  const btnCancelSettings = document.getElementById("btn-cancel-settings");
  const settingsModal = document.getElementById("settings-modal");
  const settingsForm = document.getElementById("settings-form");
  const inputShopName = document.getElementById("setting-shop-name");
  const inputShopSubtitle = document.getElementById("setting-shop-subtitle");
  const inputFooterMsg = document.getElementById("setting-footer-msg");
  const modalCurrentToken = document.getElementById("modal-current-token");
  const btnResetCounter = document.getElementById("btn-reset-counter");

  // Dynamic @page style for thermal roll width
  const printPageStyle = document.createElement("style");
  printPageStyle.id = "dynamic-print-page-style";
  document.head.appendChild(printPageStyle);

  // Application State
  let settings = loadSettings();
  let tokenCounter = loadTokenCounter();
  let session = loadSession();
  let selectedItem = DEFAULT_ITEM;
  let pendingPrintAmount = null;

  // =========================================================================
  // Storage Helpers
  // =========================================================================

  function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        shopName: parsed.shopName || DEFAULT_SETTINGS.shopName,
        shopSubtitle: parsed.shopSubtitle || "",
        paperWidth: parsed.paperWidth === "58mm" ? "58mm" : "80mm",
        footerMsg:
          typeof parsed.footerMsg === "string"
            ? parsed.footerMsg
            : DEFAULT_SETTINGS.footerMsg,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(nextSettings) {
    settings = nextSettings;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  function loadTokenCounter() {
    const raw = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_COUNTER), 10);
    return Number.isFinite(raw) && raw >= 1 ? raw : 1;
  }

  function saveTokenCounter(val) {
    tokenCounter = val;
    localStorage.setItem(STORAGE_KEYS.TOKEN_COUNTER, String(tokenCounter));
  }

  function loadSession() {
    const today = getTodayKey();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!raw) return { dateKey: today, count: 0, totalAmount: 0 };
      const parsed = JSON.parse(raw);
      if (parsed.dateKey !== today) {
        return { dateKey: today, count: 0, totalAmount: 0 };
      }
      return {
        dateKey: today,
        count: Number(parsed.count) || 0,
        totalAmount: Number(parsed.totalAmount) || 0,
      };
    } catch {
      return { dateKey: today, count: 0, totalAmount: 0 };
    }
  }

  function saveSession() {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }

  // =========================================================================
  // Formatting Helpers
  // =========================================================================

  function formatTokenNumber(num) {
    return "#" + String(num).padStart(3, "0");
  }

  function formatCurrency(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return "Rs. 0";
    return "Rs. " + n.toLocaleString("en-US");
  }

  function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, "0");
    const minsStr = String(date.getMinutes()).padStart(2, "0");

    return `${day}-${month}-${year} | ${hoursStr}:${minsStr} ${ampm}`;
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  function applyPaperWidth() {
    const is58 = settings.paperWidth === "58mm";
    receiptArea.classList.toggle("width-58mm", is58);
    receiptArea.classList.toggle("width-80mm", !is58);
    previewWidthBadge.textContent = settings.paperWidth;
    printPageStyle.textContent = `@page { size: ${settings.paperWidth} auto; margin: 0; }`;
  }

  function renderHeader() {
    headerShopName.textContent = settings.shopName;
    if (settings.shopSubtitle.trim()) {
      headerShopSubtitle.textContent = settings.shopSubtitle.trim();
      headerShopSubtitle.classList.remove("hidden");
    } else {
      headerShopSubtitle.textContent = "";
      headerShopSubtitle.classList.add("hidden");
    }
    nextTokenDisplay.textContent = formatTokenNumber(tokenCounter);
  }

  function renderItemPills() {
    itemPills.forEach((pill) => {
      const isSelected = pill.dataset.item === selectedItem;
      pill.classList.toggle("active", isSelected);
      pill.setAttribute("aria-checked", isSelected ? "true" : "false");
    });
  }

  function renderReceiptPreview() {
    const tokenText = formatTokenNumber(tokenCounter);
    const parsedAmount = parseInt(amountInput.value, 10);
    const displayAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;

    receiptShopName.textContent = settings.shopName;
    if (settings.shopSubtitle.trim()) {
      receiptShopSubtitle.textContent = settings.shopSubtitle.trim();
      receiptShopSubtitle.classList.remove("hidden");
    } else {
      receiptShopSubtitle.textContent = "";
      receiptShopSubtitle.classList.add("hidden");
    }

    receiptDatetime.textContent = formatDateTime(new Date());
    receiptTokenNumber.textContent = tokenText;

    if (selectedItem) {
      receiptItemName.textContent = selectedItem;
      receiptItemName.classList.remove("hidden");
    } else {
      receiptItemName.textContent = "";
      receiptItemName.classList.add("hidden");
    }

    receiptAmount.textContent = formatCurrency(displayAmount);

    if (settings.footerMsg.trim()) {
      receiptFooter.textContent = settings.footerMsg.trim();
      receiptFooter.classList.remove("hidden");
    } else {
      receiptFooter.textContent = "";
      receiptFooter.classList.add("hidden");
    }
  }

  function renderSessionSummary() {
    const today = getTodayKey();
    if (session.dateKey !== today) {
      session = { dateKey: today, count: 0, totalAmount: 0 };
      saveSession();
    }

    const tokenWord = session.count === 1 ? "token" : "tokens";
    const cashText = formatCurrency(session.totalAmount);

    sessionQuickStats.textContent = `${session.count} ${tokenWord} · ${cashText}`;
    summaryTokenCount.textContent = String(session.count);
    summaryTotalCash.textContent = cashText;
  }

  function renderAll() {
    applyPaperWidth();
    renderHeader();
    renderItemPills();
    renderReceiptPreview();
    renderSessionSummary();
  }

  // =========================================================================
  // Cashier Actions & Print Workflow
  // =========================================================================

  function focusAmountInput() {
    amountInput.focus();
  }

  function clearInput() {
    amountInput.value = "";
    inputError.textContent = "";
    renderReceiptPreview();
    focusAmountInput();
  }

  function handlePrint() {
    const rawVal = amountInput.value.trim();
    const amount = parseInt(rawVal, 10);

    if (!rawVal || !Number.isFinite(amount) || amount <= 0) {
      inputError.textContent = "Please enter a valid amount greater than 0.";
      focusAmountInput();
      return;
    }

    inputError.textContent = "";
    // Refresh exact timestamp and receipt values right before print dialog opens
    renderReceiptPreview();

    pendingPrintAmount = amount;
    window.print();
    // Fallback in case browser does not fire afterprint synchronously or at all
    finalizePrint();
  }

  function finalizePrint() {
    if (pendingPrintAmount === null) return;
    const printedAmount = pendingPrintAmount;
    pendingPrintAmount = null;

    saveTokenCounter(tokenCounter + 1);

    const today = getTodayKey();
    if (session.dateKey !== today) {
      session = { dateKey: today, count: 0, totalAmount: 0 };
    }
    session.count += 1;
    session.totalAmount += printedAmount;
    saveSession();

    amountInput.value = "";
    selectedItem = DEFAULT_ITEM;
    renderAll();
    focusAmountInput();
  }

  // =========================================================================
  // Settings Modal
  // =========================================================================

  function openSettingsModal() {
    inputShopName.value = settings.shopName;
    inputShopSubtitle.value = settings.shopSubtitle;
    inputFooterMsg.value = settings.footerMsg;
    modalCurrentToken.textContent = formatTokenNumber(tokenCounter);

    const widthRadios = settingsForm.querySelectorAll('input[name="paper-width"]');
    widthRadios.forEach((radio) => {
      radio.checked = radio.value === settings.paperWidth;
    });

    settingsModal.classList.remove("hidden");
    inputShopName.focus();
  }

  function closeSettingsModal() {
    settingsModal.classList.add("hidden");
    focusAmountInput();
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================

  // Item pills (click active pill again to deselect if no item label desired)
  itemPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const clickedItem = pill.dataset.item;
      selectedItem = selectedItem === clickedItem ? "" : clickedItem;
      renderItemPills();
      renderReceiptPreview();
      focusAmountInput();
    });
  });

  // Quick amount buttons
  quickAmtButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      amountInput.value = btn.dataset.amount;
      inputError.textContent = "";
      renderReceiptPreview();
      focusAmountInput();
    });
  });

  // Live update preview on typing
  amountInput.addEventListener("input", () => {
    inputError.textContent = "";
    renderReceiptPreview();
  });

  // Enter key in amount input triggers print immediately
  amountInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePrint();
    }
  });

  btnPrint.addEventListener("click", handlePrint);
  btnClear.addEventListener("click", clearInput);

  window.addEventListener("afterprint", finalizePrint);

  // Collapsible Session Summary
  btnToggleSummary.addEventListener("click", () => {
    const isExpanded = btnToggleSummary.getAttribute("aria-expanded") === "true";
    btnToggleSummary.setAttribute("aria-expanded", String(!isExpanded));
    sessionSummaryContent.classList.toggle("hidden", isExpanded);
  });

  btnResetSession.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Reset Today's Session Summary (tokens printed & total cash) to 0?"
    );
    if (!confirmed) return;
    session = { dateKey: getTodayKey(), count: 0, totalAmount: 0 };
    saveSession();
    renderSessionSummary();
    focusAmountInput();
  });

  // Settings Modal Events
  btnOpenSettings.addEventListener("click", openSettingsModal);
  btnCloseSettings.addEventListener("click", closeSettingsModal);
  btnCancelSettings.addEventListener("click", closeSettingsModal);

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });

  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = inputShopName.value.trim() || DEFAULT_SETTINGS.shopName;
    const subtitle = inputShopSubtitle.value.trim();
    const footer = inputFooterMsg.value.trim();
    const widthRadio = settingsForm.querySelector('input[name="paper-width"]:checked');
    const paperWidth = widthRadio && widthRadio.value === "58mm" ? "58mm" : "80mm";

    saveSettings({
      shopName: name,
      shopSubtitle: subtitle,
      paperWidth,
      footerMsg: footer,
    });

    renderAll();
    closeSettingsModal();
  });

  btnResetCounter.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset the Token Counter back to #001?"
    );
    if (!confirmed) return;
    saveTokenCounter(1);
    modalCurrentToken.textContent = formatTokenNumber(1);
    renderHeader();
    renderReceiptPreview();
  });

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!settingsModal.classList.contains("hidden")) {
        closeSettingsModal();
      } else if (amountInput.value) {
        clearInput();
      }
    }
  });

  // Keep preview clock fresh while idle
  setInterval(() => {
    if (pendingPrintAmount === null) {
      receiptDatetime.textContent = formatDateTime(new Date());
    }
  }, 15000);

  // Initial Render & Focus
  renderAll();
  focusAmountInput();
})();

