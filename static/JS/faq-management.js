const faqForm = document.getElementById("faqForm");
const faqList = document.getElementById("faqList");
const faqSearch = document.getElementById("faqSearch");
const faqFormTitle = document.getElementById("faqFormTitle");
const newFaqBtn = document.getElementById("newFaqBtn");
const cancelFaqEdit = document.getElementById("cancelFaqEdit");

let allFaqs = [];

async function loadFaqs() {
  try {
    const response = await fetch("/api/faqs");
    const data = await response.json();
    allFaqs = Array.isArray(data) ? data : [];
    renderFaqs(allFaqs);
  } catch (error) {
    console.error("Failed to load FAQs:", error);
    faqList.innerHTML = `<div class="faq-empty-state">Failed to load FAQs.</div>`;
  }
}

function renderFaqs(faqs) {
  if (!faqList) return;

  if (!faqs.length) {
    faqList.innerHTML = `<div class="faq-empty-state">No FAQs found.</div>`;
    return;
  }

  faqList.innerHTML = faqs
    .map(
      (faq) => `
        <article class="faq-item">
          <div class="faq-item-top">
            <div>
              <h3 class="faq-intent">${escapeHtml(faq.intent || "")}</h3>
            </div>
            <span class="faq-badge ${faq.is_active ? "active" : "inactive"}">
              ${faq.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <p class="faq-answer">${escapeHtml(faq.answer || "")}</p>

          <div class="faq-meta">
            <span><strong>Category:</strong> ${escapeHtml(faq.category || "-")}</span>
            <span><strong>ID:</strong> ${faq.id}</span>
          </div>

          <div class="faq-item-actions">
            <button type="button" class="faq-edit-btn" data-id="${faq.id}">Edit</button>
            <button type="button" class="faq-toggle-btn" data-id="${faq.id}">
              ${faq.is_active ? "Deactivate" : "Activate"}
            </button>
            <button type="button" class="faq-delete-btn" data-id="${faq.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");
}

function fillFaqForm(faq) {
  document.getElementById("faqId").value = faq.id || "";
  document.getElementById("faqIntent").value = faq.intent || "";
  document.getElementById("faqCategory").value = faq.category || "";
  document.getElementById("faqAnswer").value = faq.answer || "";
  document.getElementById("faqActive").checked = !!faq.is_active;

  if (faqFormTitle) {
    faqFormTitle.textContent = "Edit FAQ";
  }
}

function resetFaqForm() {
  if (faqForm) faqForm.reset();
  document.getElementById("faqId").value = "";
  document.getElementById("faqActive").checked = true;

  if (faqFormTitle) {
    faqFormTitle.textContent = "Add FAQ";
  }
}

async function handleFaqSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("faqId").value.trim();
  const intent = document.getElementById("faqIntent").value.trim();
  const category = document.getElementById("faqCategory").value.trim();
  const answer = document.getElementById("faqAnswer").value.trim();
  const is_active = document.getElementById("faqActive").checked;

  if (!intent || !answer) {
    alert("Intent name and answer are required.");
    return;
  }

  const payload = {
    intent,
    category,
    answer,
    is_active
  };

  try {
    const response = await fetch(id ? `/api/faqs/${id}` : "/api/faqs", {
      method: id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save FAQ.");
    }

    resetFaqForm();
    await loadFaqs();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save FAQ.");
  }
}

async function handleFaqActions(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  if (!id) return;

  const faq = allFaqs.find((item) => String(item.id) === String(id));
  if (!faq) return;

  if (button.classList.contains("faq-edit-btn")) {
    fillFaqForm(faq);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (button.classList.contains("faq-delete-btn")) {
    const confirmed = confirm(`Delete FAQ "${faq.intent}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/faqs/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete FAQ.");
      }

      await loadFaqs();
      resetFaqForm();
    } catch (error) {
      console.error(error);
      alert("Failed to delete FAQ.");
    }

    return;
  }

  if (button.classList.contains("faq-toggle-btn")) {
    try {
      const response = await fetch(`/api/faqs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          is_active: !faq.is_active
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update FAQ status.");
      }

      await loadFaqs();
    } catch (error) {
      console.error(error);
      alert("Failed to update FAQ status.");
    }
  }
}

function handleFaqSearch() {
  const keyword = faqSearch.value.toLowerCase().trim();

  const filtered = allFaqs.filter((faq) =>
    (faq.intent || "").toLowerCase().includes(keyword) ||
    (faq.answer || "").toLowerCase().includes(keyword) ||
    (faq.category || "").toLowerCase().includes(keyword)
  );

  renderFaqs(filtered);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initFaqManagementPage() {
  if (faqForm) {
    faqForm.addEventListener("submit", handleFaqSubmit);
  }

  if (faqList) {
    faqList.addEventListener("click", handleFaqActions);
  }

  if (faqSearch) {
    faqSearch.addEventListener("input", handleFaqSearch);
  }

  if (newFaqBtn) {
    newFaqBtn.addEventListener("click", () => {
      resetFaqForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (cancelFaqEdit) {
    cancelFaqEdit.addEventListener("click", resetFaqForm);
  }

  loadFaqs();
}