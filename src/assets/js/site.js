/* ==========================================================================
   Progressive enhancement only.
   With this file blocked or broken the page still works: the equipment list and
   the select options are rendered at build time, and the form posts natively to
   Formspree. Everything below is an upgrade on top of that.
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("offer-form");
  if (!form) return;

  var select = document.getElementById("f-equip");
  var intent = document.getElementById("f-intent");
  var subject = document.getElementById("f-subject");
  var nameField = document.getElementById("f-name");
  var successPanel = document.getElementById("form-success");
  var errorPanel = document.getElementById("form-error");
  var liveRegion = document.getElementById("offer-live");
  var submitButton = form.querySelector(".submit");

  /* --- Subject line ------------------------------------------------------- */

  function chosen(element) {
    return element && element.selectedIndex >= 0 ? element.options[element.selectedIndex] : null;
  }

  /** Prefix by intent so a lead does not land in the inbox looking like a firm offer. */
  function syncSubject() {
    if (!subject || !select) return;
    var option = chosen(intent);
    var prefix = (option && option.getAttribute("data-subject")) || "Equipment loan offer";
    subject.value = prefix + ": " + select.value;
  }

  if (select) {
    select.addEventListener("change", syncSubject);
  }

  /* --- Loan conditions only matter for an actual loan --------------------- */

  var conditionsField = document.getElementById("conditions-field");
  var conditions = document.getElementById("f-cond");

  function syncConditions() {
    if (!conditionsField || !conditions || !intent) return;
    var option = chosen(intent);
    var needed = !option || option.getAttribute("data-needs-conditions") !== "no";
    // Clear `required` before hiding: a hidden required control blocks submission
    // with an error the visitor cannot see or reach.
    if (needed) conditions.setAttribute("required", "");
    else conditions.removeAttribute("required");
    conditionsField.hidden = !needed;
  }

  if (intent) {
    intent.addEventListener("change", function () {
      syncSubject();
      syncConditions();
    });
    syncConditions();
  }

  syncSubject();

  /* --- "Offer this" links ------------------------------------------------- */

  var flashTimer = null;

  function flashSelect() {
    var field = select && select.closest(".field");
    if (!field) return;
    field.classList.add("field-flash");
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () {
      field.classList.remove("field-flash");
    }, 4000);
  }

  function preselect(itemName) {
    if (!select) return false;
    var matched = Array.prototype.some.call(select.options, function (option) {
      if (option.value !== itemName) return false;
      select.value = itemName;
      return true;
    });
    if (!matched) return false;

    syncSubject();
    flashSelect();
    if (liveRegion) liveRegion.textContent = "Equipment offered set to " + itemName + ".";
    return true;
  }

  document.querySelectorAll("[data-offer]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var heading = document.getElementById("form-h");
      if (!preselect(link.getAttribute("data-offer")) || !heading) return;

      event.preventDefault();
      // CSS decides smooth vs instant via prefers-reduced-motion.
      heading.scrollIntoView({ block: "start" });
      if (nameField) nameField.focus({ preventScroll: true });
    });
  });

  /* --- Acknowledgement: only ask for wording when it will be used --------- */

  var creditField = document.getElementById("credit-field");
  var ackRadios = form.querySelectorAll('input[name="acknowledgement"]');

  function syncCreditField() {
    if (!creditField || !ackRadios.length) return;
    var wantsName = Array.prototype.some.call(ackRadios, function (radio) {
      return radio.checked && radio.getAttribute("data-wants-name") === "yes";
    });
    creditField.hidden = !wantsName;
  }

  ackRadios.forEach(function (radio) {
    radio.addEventListener("change", syncCreditField);
  });
  syncCreditField();

  /* --- Submission --------------------------------------------------------- */

  var idleLabel = submitButton ? submitButton.textContent : "";

  function setBusy(isBusy) {
    if (!submitButton) return;
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Sending…" : idleLabel;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (errorPanel) errorPanel.hidden = true;
    setBusy(true);

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Formspree responded " + response.status);
        form.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
          successPanel.focus();
        }
      })
      .catch(function () {
        // The copy carries a direct email address, which is the real fallback.
        if (errorPanel) errorPanel.hidden = false;
        setBusy(false);
      });
  });
})();
