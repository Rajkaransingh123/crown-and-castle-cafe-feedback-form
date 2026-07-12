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
     1. Question data — drives the questions-grid markup.
     Each id becomes the <input name="..."> used in FormData / JSON payload.
     ----------------------------------------------------------------------- */
  const FEEDBACK_QUESTIONS = [
    { id: 'taste', icon: '👑', num: 1, label: 'How did you like the taste of our food?', options: ['Loved It', 'Liked It', 'It Was Nice'] },
    { id: 'presentation', icon: '👑', num: 2, label: 'How was the presentation of the food?', options: ['Beautiful', 'Nice', 'Good'] },
    { id: 'service', icon: '👑', num: 3, label: 'How was our service?', options: ['Excellent', 'Very Good', 'Good'] },
    { id: 'cleanliness', icon: '👑', num: 4, label: 'How was the cleanliness of our café?', options: ['Excellent', 'Very Good', 'Good'] },
    { id: 'value_for_money', icon: '👑', num: 5, label: 'How would you rate the value for money?', options: ['Excellent', 'Very Good', 'Good'] },
    { id: 'favorite_item', icon: '👑', num: 6, label: 'Which item did you enjoy the most?', options: ['Sandwich', 'Wrap', 'Drink / Snack'] },
    { id: 'recommend', icon: '👑', num: 7, label: 'Would you recommend Crown & Castle Café to your friends?', options: ['Definitely', 'Sure', 'Maybe'] },
    { id: 'satisfaction', icon: '👑', num: 8, label: 'How satisfied are you with your overall experience?', options: ['Very Satisfied', 'Satisfied', 'Happy'] },
    { id: 'revisit', icon: '👑', num: 9, label: 'Would you visit us again?', options: ['Yes, Definitely', 'Yes', 'Maybe'] }
  ];

  const REQUIRED_QUESTION_IDS = FEEDBACK_QUESTIONS.map(function (q) { return q.id; });

  /* -----------------------------------------------------------------------
     2. Render question groups into #questionsGrid
     ----------------------------------------------------------------------- */
  function slug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function renderQuestions() {
    const grid = document.getElementById('questionsGrid');
    const frag = document.createDocumentFragment();

    FEEDBACK_QUESTIONS.forEach(function (q) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'question';
      fieldset.setAttribute('data-question-id', q.id);

      const legend = document.createElement('legend');
      legend.className = 'question-label';
      legend.innerHTML =
        '<span class="q-icon" aria-hidden="true">' + q.icon + '</span>' +
        q.num + '. ' + q.label + ' <span class="required">*</span>';
      fieldset.appendChild(legend);

      const optionsWrap = document.createElement('div');
      optionsWrap.className = 'option-row';

      q.options.forEach(function (optionLabel, i) {
        const optId = q.id + '_' + slug(optionLabel);
        const wrapper = document.createElement('label');
        wrapper.className = 'option-choice';
        wrapper.setAttribute('for', optId);

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = q.id;
        input.id = optId;
        input.value = slug(optionLabel);
        input.required = true;

        const box = document.createElement('span');
        box.className = 'checkbox-visual';
        box.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.className = 'option-text';
        text.textContent = optionLabel;

        wrapper.appendChild(input);
        wrapper.appendChild(box);
        wrapper.appendChild(text);
        optionsWrap.appendChild(wrapper);
      });

      const err = document.createElement('small');
      err.className = 'field-error';
      err.id = q.id + 'Error';
      err.hidden = true;
      err.textContent = 'Please choose an option.';

      fieldset.appendChild(optionsWrap);
      fieldset.appendChild(err);
      frag.appendChild(fieldset);
    });

    grid.appendChild(frag);
  }

  /* -----------------------------------------------------------------------
     3. Selection visuals — highlight the chosen chip/star row
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
    if (!overallChecked) {
      isValid = false;
      ratingError.hidden = false;
      if (!firstInvalid.el) firstInvalid.el = document.getElementById('ratingOptions');
    } else {
      ratingError.hidden = true;
    }

    // Contact number: optional, but if filled must look valid
    const contact = form.contact_number.value.trim();
    const contactError = document.getElementById('contactError');
    if (contact.length > 0 && !/^[0-9+\-\s]{7,15}$/.test(contact)) {
      isValid = false;
      contactError.hidden = false;
      if (!firstInvalid.el) firstInvalid.el = form.contactNumber;
    } else {
      contactError.hidden = true;
    }

    if (firstInvalid.el) {
      firstInvalid.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  function showStatus(message, type) {
    const banner = document.getElementById('statusBanner');
    banner.textContent = message;
    banner.className = 'status-banner status-' + type;
    banner.hidden = false;
    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideStatus() {
    const banner = document.getElementById('statusBanner');
    banner.hidden = true;
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
        showStatus('Please complete the required fields highlighted below.', 'error');
        return;
      }

      const payload = collectPayload(form);

      submitFeedback(payload)
        .then(function (result) {
          if (result && result.success) {
            showStatus('Thank you! Your feedback has been sent to Crown & Castle Café. ♥', 'success');
            form.reset();
            document.querySelectorAll('.option-choice.selected, .rating-choice.selected')
              .forEach(function (el) { el.classList.remove('selected'); });
            document.getElementById('charCount').textContent = '0';
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
    renderQuestions();
    wireSelectionHighlighting();
    wireCharCount();
    wireForm();
  });
})();