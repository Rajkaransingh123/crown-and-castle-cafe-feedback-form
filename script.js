/* =========================================================================
   Crown & Castle Café — Feedback Form logic
   Plain JS, no dependencies. Submits directly to a Google Apps Script Web
   App (APPS_SCRIPT_URL below), which writes each response into a Google
   Sheet. No separate backend server involved — see apps-script/Code.gs.
   ========================================================================= */

(function () {
  'use strict';

  /* -----------------------------------------------------------------------
     0. Google Apps Script Web App URL.
     This IS the backend — Google hosts it, always on, no server for you
     to run or deploy. Get this from: Extensions → Apps Script → Deploy →
     New deployment → Web app → copy the URL ending in /exec.
     ----------------------------------------------------------------------- */
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJMZQTpt6zYLdj87hZp4PJkKMqdycQyiY2GwdffR6kPJNJEUv9E0VQ6Q6TU0OVUKqv/exec';   

  /* -----------------------------------------------------------------------
     1. Question ids used for validation.
     The questions themselves are now written directly in index.html
     (fieldset[data-question-id] blocks) rather than generated here.
     ----------------------------------------------------------------------- */
  const REQUIRED_QUESTION_IDS = [
    'taste', 'presentation', 'service', 'cleanliness', 'value_for_money',
    'favorite_item', 'recommend', 'satisfaction', 'revisit'
  ];

  /* -----------------------------------------------------------------------
     2. Selection visuals — highlight the chosen chip/star row
     ----------------------------------------------------------------------- */
  function wireSelectionHighlighting() {
    document.addEventListener('change', function (e) {
      const target = e.target;
      if (target.matches('.option-choice input[type="radio"]')) {
        const fieldset = target.closest('.question');
        fieldset.querySelectorAll('.option-choice').forEach(function (el) {
          el.classList.toggle('selected', el.contains(target) === false ? false : target.checked);
        });
        fieldset.classList.remove('has-error');
        const err = fieldset.querySelector('.field-error');
        if (err) err.hidden = true;
      }

      if (target.matches('.rating-choice input[type="radio"]')) {
        const group = document.getElementById('ratingOptions');
        group.querySelectorAll('.rating-choice').forEach(function (el) {
          el.classList.remove('selected');
        });
        target.closest('.rating-choice').classList.add('selected');
        document.getElementById('ratingError').hidden = true;
      }
    });
  }

  /* -----------------------------------------------------------------------
     4. Character counter for suggestions textarea
     ----------------------------------------------------------------------- */
  function wireCharCount() {
    const textarea = document.getElementById('suggestions');
    const counter = document.getElementById('charCount');
    textarea.addEventListener('input', function () {
      counter.textContent = String(textarea.value.length);
    });
  }

  /* -----------------------------------------------------------------------
     5. Validation
     ----------------------------------------------------------------------- */
  function validateForm(form) {
    let isValid = true;
    const firstInvalid = { el: null };

    // Required question groups
    REQUIRED_QUESTION_IDS.forEach(function (id) {
      const fieldset = form.querySelector('[data-question-id="' + id + '"]');
      const checked = form.querySelector('input[name="' + id + '"]:checked');
      const err = document.getElementById(id + 'Error');
      if (!checked) {
        isValid = false;
        fieldset.classList.add('has-error');
        if (err) err.hidden = false;
        if (!firstInvalid.el) firstInvalid.el = fieldset;
      } else {
        fieldset.classList.remove('has-error');
        if (err) err.hidden = true;
      }
    });

    // Overall rating required
    const overallChecked = form.querySelector('input[name="overall_rating"]:checked');
    const ratingError = document.getElementById('ratingError');
    const ratingGroup = document.getElementById('ratingOptions');
    if (!overallChecked) {
      isValid = false;
      ratingError.hidden = false;
      ratingGroup.classList.add('has-error');
      if (!firstInvalid.el) firstInvalid.el = ratingGroup;
    } else {
      ratingError.hidden = true;
      ratingGroup.classList.remove('has-error');
    }

    // Contact number: optional, but if filled must look valid
    const contact = form.contact_number.value.trim();
    const contactError = document.getElementById('contactError');
    if (contact.length > 0 && !/^[0-9+\-\s]{7,15}$/.test(contact)) {
      isValid = false;
      contactError.hidden = false;
      form.contact_number.classList.add('has-error');
      if (!firstInvalid.el) firstInvalid.el = form.contact_number;
    } else {
      contactError.hidden = true;
      form.contact_number.classList.remove('has-error');
    }

    if (firstInvalid.el) {
      firstInvalid.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Move keyboard/screen-reader focus to the field too, not just scroll
      // to it visually. Fieldsets/divs aren't focusable by default, so give
      // them a temporary tabindex if they don't already have one.
      var focusTarget = firstInvalid.el;
      if (focusTarget.tabIndex === undefined || focusTarget.tabIndex < 0) {
        focusTarget.setAttribute('tabindex', '-1');
      }
      focusTarget.focus({ preventScroll: true });

      // Blink/glow the field so it's unmistakable which one was missed.
      // Class is removed and re-added on a delay so the animation replays
      // even if the same field is still invalid on a repeat submit.
      firstInvalid.el.classList.remove('field-blink');
      // eslint-disable-next-line no-unused-expressions
      void firstInvalid.el.offsetWidth; // force reflow so the animation restarts
      firstInvalid.el.classList.add('field-blink');
    }

    return isValid;
  }

  /* -----------------------------------------------------------------------
     6. Collect payload — ready to hand to fetch() as JSON or FormData
     ----------------------------------------------------------------------- */
  function collectPayload(form) {
    const data = new FormData(form);
    const payload = {};
    data.forEach(function (value, key) {
      payload[key] = value;
    });
    payload.submitted_at = new Date().toISOString();
    return payload;
  }

  /* -----------------------------------------------------------------------
     7. Status banner helper
     ----------------------------------------------------------------------- */
  function showStatus(message, type, skipScroll) {
    const banner = document.getElementById('statusBanner');
    banner.textContent = message;
    banner.className = 'status-banner status-' + type;
    banner.hidden = false;
    // When a specific field is already being scrolled to (missed-field
    // validation case), skip the banner's own scroll so it doesn't
    // override and pull the page back up to the top.
    if (!skipScroll) {
      banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function hideStatus() {
    const banner = document.getElementById('statusBanner');
    banner.hidden = true;
  }

  /* -----------------------------------------------------------------------
     7b. Thank-you screen — swaps the form out, Google-Forms style
     ----------------------------------------------------------------------- */
  function showThankYou() {
    const form = document.getElementById('feedbackForm');
    const thankYou = document.getElementById('thankYouScreen');
    hideStatus();
    form.hidden = true;
    thankYou.hidden = false;
    thankYou.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showFormAgain() {
    const form = document.getElementById('feedbackForm');
    const thankYou = document.getElementById('thankYouScreen');
    thankYou.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireThankYouScreen() {
    const again = document.getElementById('submitAnotherBtn');
    again.addEventListener('click', showFormAgain);
  }

  /* -----------------------------------------------------------------------
     8. Submit handling — posts straight to the Apps Script Web App.
     ----------------------------------------------------------------------- */
  function submitFeedback(payload) {
    const submitBtn = document.getElementById('submitBtn');
    const label = submitBtn.querySelector('.btn-label');
    const spinner = submitBtn.querySelector('.btn-spinner');

    submitBtn.disabled = true;
    label.textContent = 'Sending…';
    spinner.hidden = false;

    // NOTE on mode: 'no-cors'
    // Google Apps Script Web Apps respond to POST requests via an internal
    // redirect to a content.googleusercontent.com URL. Browsers apply CORS
    // rules to that redirect during a normal fetch(), which is what causes
    // console errors like "404" or "Failed to load resource" even though
    // the deployment itself is working fine. 'no-cors' avoids this
    // entirely — the request is still delivered and Code.gs still runs and
    // writes the row — we simply can't read the JSON response back. That's
    // an acceptable trade-off for a feedback form: we treat "the network
    // request didn't throw" as success.
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function () {
        // Opaque response under no-cors — status/body aren't readable.
        // Reaching here without a thrown network error means the request
        // was sent successfully.
        return { success: true };
      })
      .finally(function () {
        submitBtn.disabled = false;
        label.textContent = 'Submit Feedback';
        spinner.hidden = true;
      });
  }

  /* -----------------------------------------------------------------------
     9. Wire up form submit + reset
     ----------------------------------------------------------------------- */
  function wireForm() {
    const form = document.getElementById('feedbackForm');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideStatus();

      if (!validateForm(form)) {
        showStatus('Please complete the required fields highlighted below.', 'error', true);
        return;
      }

      const payload = collectPayload(form);

      submitFeedback(payload)
        .then(function (result) {
          if (result && result.success) {
            form.reset();
            document.querySelectorAll('.option-choice.selected, .rating-choice.selected')
              .forEach(function (el) { el.classList.remove('selected'); });
            document.getElementById('charCount').textContent = '0';
            showThankYou();
          } else {
            showStatus('Something went wrong. Please try again.', 'error');
          }
        })
        .catch(function (err) {
          const detail = (err && err.message) ? ' (' + err.message + ')' : '';
          showStatus('We could not save your feedback right now. Please try again shortly.' + detail, 'error');
        });
    });

    form.addEventListener('reset', function () {
      hideStatus();
      document.querySelectorAll('.option-choice.selected, .rating-choice.selected')
        .forEach(function (el) { el.classList.remove('selected'); });
      document.querySelectorAll('.field-error').forEach(function (el) { el.hidden = true; });
      document.querySelectorAll('.has-error').forEach(function (el) { el.classList.remove('has-error'); });
      setTimeout(function () {
        document.getElementById('charCount').textContent = '0';
      }, 0);
    });
  }

  /* -----------------------------------------------------------------------
     Init
     ----------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    wireSelectionHighlighting();
    wireCharCount();
    wireForm();
    wireThankYouScreen();
  });
})();
