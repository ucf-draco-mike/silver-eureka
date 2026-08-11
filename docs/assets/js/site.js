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

  var intent = document.getElementById("f-intent");
  var subject = document.getElementById("f-subject");
  var successPanel = document.getElementById("form-success");
  var errorPanel = document.getElementById("form-error");
  var submitButton = form.querySelector(".submit");

  // Equipment lives in the cards above the form, joined to it by form="offer-form".
  var equipmentBoxes = document.querySelectorAll('input[name="equipment"]');
  var summary = document.getElementById("selection-summary");
  var equipmentError = document.getElementById("equipment-error");

  function selectedEquipment() {
    return Array.prototype.filter
      .call(equipmentBoxes, function (box) { return box.checked; })
      .map(function (box) { return box.value; });
  }

  /* --- Subject line ------------------------------------------------------- */

  function chosen(element) {
    return element && element.selectedIndex >= 0 ? element.options[element.selectedIndex] : null;
  }

  /**
   * Prefix by intent so a lead does not land in the inbox looking like a firm offer.
   * One item is named outright; several are counted, because a subject line carrying
   * five instrument names is unreadable in a mail client.
   */
  function syncSubject() {
    if (!subject) return;
    var option = chosen(intent);
    var prefix = (option && option.getAttribute("data-subject")) || "Equipment loan offer";
    var picks = selectedEquipment();
    var tail =
      picks.length === 0 ? "nothing selected yet"
      : picks.length === 1 ? picks[0]
      : picks.length + " items";
    subject.value = prefix + ": " + tail;
  }

  /* --- Selection summary --------------------------------------------------- */

  function syncSummary() {
    if (!summary) return;
    var picks = selectedEquipment();
    summary.classList.toggle("has-picks", picks.length > 0);
    if (picks.length === 0) {
      summary.innerHTML =
        '<a href="#equip-h">Select one or more cards above</a>, or tick the catch-all below.';
      return;
    }
    // textContent, not innerHTML: these strings come from the equipment data.
    summary.textContent =
      (picks.length === 1 ? "Offering: " : picks.length + " selected: ") + picks.join(", ");
  }

  Array.prototype.forEach.call(equipmentBoxes, function (box) {
    box.addEventListener("change", function () {
      syncSummary();
      syncSubject();
      if (equipmentError && selectedEquipment().length > 0) equipmentError.hidden = true;
    });
  });
  syncSummary();

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

  /* --- "At least one instrument" ------------------------------------------ */

  /**
   * A checkbox group cannot express "at least one" in HTML — `required` on a checkbox
   * demands that particular box. So this runs in script only, and without script the
   * constraint is unenforced: a submission with nothing ticked still reaches the inbox,
   * which is a better outcome than a form that cannot be sent.
   */
  function equipmentChosen() {
    if (selectedEquipment().length > 0) return true;
    if (equipmentError) {
      equipmentError.hidden = false;
      equipmentError.scrollIntoView({ block: "center" });
      var first = document.querySelector('input[name="equipment"]');
      if (first) first.focus({ preventScroll: true });
    }
    return false;
  }

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
    if (!equipmentChosen()) return;
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
