document.addEventListener("DOMContentLoaded", () => {
  const addFaqBtn = document.getElementById("addFaqBtn");
  const faqModal = document.getElementById("faqModal");
  const faqModalBackdrop = document.getElementById("faqModalBackdrop");
  const closeFaqModalBtn = document.getElementById("closeFaqModalBtn");
  const cancelFaqModalBtn = document.getElementById("cancelFaqModalBtn");
  const faqModalTitle = document.getElementById("faqModalTitle");
  const faqForm = document.getElementById("faqForm");
  const faqIntent = document.getElementById("faqIntent");
  const faqTrainingPhrases = document.getElementById("faqTrainingPhrases");
  const faqAnswer = document.getElementById("faqAnswer");
  const faqTableBody = document.getElementById("faqTableBody");
  const refreshFaqBtn = document.getElementById("refreshFaqBtn");
  const toastContainer = document.getElementById("toastContainer");
  const totalFaqCount = document.getElementById("totalFaqCount");
  const faqSearchInput = document.getElementById("faqSearchInput");
  let allFaqs = [];

  let faqFormMode = "add";
  let editingFaqId = null;
  let lastFocusedElement = null;

  function renderFaqTable(faqs) {
    if (!faqTableBody) return;

    if (faqs.length === 0) {
      faqTableBody.innerHTML = `
      <tr>
        <td colspan="4">No FAQs found.</td>
      </tr>
    `;
      return;
    }

    faqTableBody.innerHTML = faqs
      .map((faq, index) => {
        const rowId = faq.id ?? index + 1;
        const safeIntent = faq.intent || "";
        const safeAnswer = faq.answer || "";

        return `
        <tr>
          <td>${rowId}</td>
          <td>${safeIntent || "-"}</td>
          <td>${safeAnswer || "-"}</td>
          <td>
            <button
              type="button"
              class="admin-secondary-btn faq-edit-btn"
              data-id="${rowId}"
              data-intent="${safeIntent}"
              data-answer="${safeAnswer.replace(/"/g, "&quot;")}"
            >
              Edit
            </button>
            <button
              type="button"
              class="admin-secondary-btn faq-delete-btn"
              data-id="${rowId}"
              data-intent="${safeIntent}"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function showToast(message, type = "success") {
    if (!toastContainer || !message) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  function renderFaqTable(faqs) {
    if (!faqTableBody) return;

    if (faqs.length === 0) {
      faqTableBody.innerHTML = `
      <tr>
        <td colspan="4">No FAQs found.</td>
      </tr>
    `;
      return;
    }

    faqTableBody.innerHTML = faqs
      .map((faq, index) => {
        const rowId = faq.id ?? index + 1;
        const safeIntent = faq.intent || "";
        const safeAnswer = faq.answer || "";

        return `
        <tr>
          <td>${rowId}</td>
          <td>${safeIntent || "-"}</td>
          <td>${safeAnswer || "-"}</td>
          <td>
            <button
              type="button"
              class="admin-secondary-btn faq-edit-btn"
              data-id="${rowId}"
              data-intent="${safeIntent}"
              data-answer="${safeAnswer.replace(/"/g, "&quot;")}"
            >
              Edit
            </button>
            <button
              type="button"
              class="admin-secondary-btn faq-delete-btn"
              data-id="${rowId}"
              data-intent="${safeIntent}"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  async function loadFaqs() {
    if (!faqTableBody) return;

    faqTableBody.innerHTML = `
    <tr>
      <td colspan="4">Loading FAQs...</td>
    </tr>
  `;

    try {
      const response = await fetch("/api/faqs");
      const result = await response.json();

      if (!response.ok) {
        faqTableBody.innerHTML = `
        <tr>
          <td colspan="4">${result.error || "Failed to load FAQs."}</td>
        </tr>
      `;
        showToast(result.error || "Failed to load FAQs.", "error");
        return;
      }

      const faqs = result.faqs || [];
      allFaqs = faqs;

      if (totalFaqCount) {
        totalFaqCount.textContent = faqs.length;
      }

      renderFaqTable(faqs);
    } catch (error) {
      console.error("Load FAQs error:", error);
      faqTableBody.innerHTML = `
      <tr>
        <td colspan="4">Something went wrong while loading FAQs.</td>
      </tr>
    `;
      showToast("Something went wrong while loading FAQs.", "error");
    }
  }

  function openFaqModal(mode = "add") {
    lastFocusedElement = document.activeElement;
    faqFormMode = mode;

    faqModalTitle.textContent = mode === "edit" ? "Edit FAQ" : "Add FAQ";
    faqModal.hidden = false;
    faqModalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    faqModalTitle.focus();
  }

  function closeFaqModal() {
    faqModal.hidden = true;
    faqModalBackdrop.hidden = true;
    document.body.style.overflow = "";
    faqForm.reset();
    faqFormMode = "add";
    editingFaqId = null;

    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  addFaqBtn?.addEventListener("click", () => openFaqModal("add"));
  closeFaqModalBtn?.addEventListener("click", closeFaqModal);
  cancelFaqModalBtn?.addEventListener("click", closeFaqModal);
  faqModalBackdrop?.addEventListener("click", closeFaqModal);

  document.addEventListener("keydown", (event) => {
    if (!faqModal.hidden && event.key === "Escape") {
      closeFaqModal();
    }
  });

  faqForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const trainingPhrases = faqTrainingPhrases.value
      .split(/\r?\n/)
      .map((phrase) => phrase.trim())
      .filter(Boolean);

    const payload = {
      intent: faqIntent.value.trim(),
      trainingPhrases,
      answer: faqAnswer.value.trim()
    };

    if (!payload.intent || !payload.answer) {
      showToast("Intent name and answer are required.", "error");
      return;
    }

    try {
      let response;

      if (faqFormMode === "edit") {
        if (trainingPhrases.length === 0) {
          showToast("Please enter at least one training phrase.", "error");
          return;
        }

        response = await fetch(`/api/faqs/${editingFaqId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            intent: payload.intent,
            trainingPhrases: payload.trainingPhrases,
            answer: payload.answer
          })
        });
      } else {
        if (trainingPhrases.length === 0) {
          showToast("Please enter at least one training phrase.", "error");
          return;
        }

        response = await fetch("/api/faqs/full", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || "Failed to save FAQ.", "error");
        return;
      }

      showToast(result.message || "FAQ saved successfully.", "success");
      closeFaqModal();
      await loadFaqs();
    } catch (error) {
      console.error("Save FAQ error:", error);
      showToast("Something went wrong while saving the FAQ.", "error");
    }
  });

  faqTableBody?.addEventListener("click", async (event) => {
    const editBtn = event.target.closest(".faq-edit-btn");
    const deleteBtn = event.target.closest(".faq-delete-btn");

    if (editBtn) {
      const faqId = editBtn.dataset.id;

      try {
        const response = await fetch(`/api/faqs/${faqId}`);
        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || "Failed to load FAQ details.", "error");
          return;
        }

        const faq = result.faq;
        editingFaqId = faq.id;
        faqIntent.value = faq.intent || "";
        faqAnswer.value = faq.answer || "";
        faqTrainingPhrases.value = (faq.trainingPhrases || []).join("\n");

        openFaqModal("edit");
      } catch (error) {
        console.error("Load FAQ detail error:", error);
        showToast("Something went wrong while loading FAQ details.", "error");
      }

      return;
    }

    if (deleteBtn) {
      const faqId = deleteBtn.dataset.id;
      const faqIntentName = deleteBtn.dataset.intent;

      const confirmed = window.confirm(
        `Are you sure you want to delete the FAQ for intent "${faqIntentName}"? This cannot be undone.`
      );

      if (!confirmed) return;

      showToast(`Deleting "${faqIntentName}"...`, "info");

      try {
        const response = await fetch(`/api/faqs/${faqId}`, {
          method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || "Failed to delete FAQ.", "error");
          return;
        }

        showToast(result.message || "FAQ deleted successfully.", "success");
        await loadFaqs();
      } catch (error) {
        console.error("Delete FAQ error:", error);
        showToast("Something went wrong while deleting the FAQ.", "error");
      }
    }
  });

  faqSearchInput?.addEventListener("input", (event) => {
    const keyword = event.target.value.trim().toLowerCase();

    const filteredFaqs = allFaqs.filter((faq) => {
      const intent = (faq.intent || "").toLowerCase();
      const answer = (faq.answer || "").toLowerCase();
      return intent.includes(keyword) || answer.includes(keyword);
    });

    renderFaqTable(filteredFaqs);
  });

  refreshFaqBtn?.addEventListener("click", loadFaqs);
  loadFaqs();
});