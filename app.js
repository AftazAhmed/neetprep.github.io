// app.js
// Mirrors TurboScribe’s “Copy ChatGPT Prompt” then “Open ChatGPT” UX with CSP-safe bindings and popup-safe user activation. [TurboScribe guide][MDN window.open][MDN CSP]

// --- Data (sample; extend as needed) ---
const chaptersData = {
  "11": [
    { id: "ch1",  name: "Chapter 1: The Living World", startPage: 3, endPage: 9 },
    { id: "ch2",  name: "Chapter 2: Biological Classification", startPage: 10, endPage: 22 },
    { id: "ch3",  name: "Chapter 3: Plant Kingdom", startPage: 23, endPage: 36 },
    { id: "ch4",  name: "Chapter 4: Animal Kingdom", startPage: 37, endPage: 54 }
  ],
  "12": [
    { id: "ch1",  name: "Chapter 1: Sexual Reproduction in Flowering Plants", startPage: 3, endPage: 25 }
  ]
};

const questionsData = {
  "11": {
    "ch1": {
      "3": {
        topics: "Characteristics of life, growth, reproduction, metabolism",
        questions: [
          {
            year: "NEET 2011",
            question: "Which aspect is an exclusive characteristic of living things?",
            options: [
              "(a) Isolated metabolic reactions in vitro",
              "(b) Increase in mass from inside only",
              "(c) Perception of environmental events and memory",
              "(d) Increase in mass by accumulation"
            ],
            answer: "(c) Perception of environmental events and memory"
          },
          {
            year: "NEET 2016",
            question: "Study the four statements (A-D) and select the two correct ones: (A) Definition of biological species was given by Ernst Mayr (B) Photoperiod does not affect reproduction in plants (C) Binomial nomenclature system was given by R.H. Whittaker (D) In unicellular organisms, reproduction is synonymous with growth",
            options: ["(a) B and C","(b) C and D","(c) A and D","(d) A and B"],
            answer: "(c) A and D"
          }
        ]
      }
    }
  },
  "12": {}
};

// --- Elements ---
let classSelect, chapterSelect, pageSelect, contentArea, editionNote;

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  classSelect  = document.getElementById('class-select');
  chapterSelect= document.getElementById('chapter-select');
  pageSelect   = document.getElementById('page-select');
  contentArea  = document.getElementById('content-area');
  editionNote  = document.getElementById('edition-note');

  // Dropdown wiring (no inline handlers; CSP-safe)
  classSelect.addEventListener('change', loadChapters);
  chapterSelect.addEventListener('change', loadPages);
  pageSelect.addEventListener('change', loadQuestions);

  // Delegate question button clicks
  contentArea.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-answer')) {
      const answerArea = btn.closest('.question-container')?.querySelector('.answer-area');
      if (answerArea) answerArea.style.display = answerArea.style.display === 'block' ? 'none' : 'block';
      return;
    }

    if (btn.classList.contains('btn-copy')) {
      const year = btn.dataset.year || '';
      const question = btn.dataset.question || '';
      let options = [];
      try { options = JSON.parse(btn.dataset.options || '[]'); } catch {}
      const text = buildPrompt(year, question, options);
      copyToClipboard(btn, text); // Clipboard API with fallback for robust UX. [MDN Clipboard API]
      return;
    }

    if (btn.classList.contains('btn-explain')) {
      // Open only within click handler to satisfy transient user activation. [MDN window.open]
      window.open('https://chat.openai.com/', '_blank', 'noopener');
      return;
    }
  });
});

// --- Loaders ---
function loadChapters() {
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  pageSelect.innerHTML = '<option value="">Select Page</option>';
  chapterSelect.disabled = true;
  pageSelect.disabled = true;
  contentArea.style.display = 'none';
  editionNote.style.display = classSelect.value ? 'block' : 'none';

  if (classSelect.value) {
    const chapters = chaptersData[classSelect.value] || [];
    chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = `${ch.name} (p. ${ch.startPage}–${ch.endPage})`;
      chapterSelect.appendChild(opt);
    });
    chapterSelect.disabled = false;
  }
}

function loadPages() {
  pageSelect.innerHTML = '<option value="">Select Page</option>';
  pageSelect.disabled = true;
  contentArea.style.display = 'none';

  if (chapterSelect.value) {
    const selectedClass = classSelect.value;
    const chapters = chaptersData[selectedClass] || [];
    const ch = chapters.find(c => c.id === chapterSelect.value);
    if (ch) {
      for (let p = ch.startPage; p <= ch.endPage; p++) {
        const opt = document.createElement('option');
        opt.value = String(p);
        opt.textContent = `Page ${p}`;
        pageSelect.appendChild(opt);
      }
      pageSelect.disabled = false;
    }
  }
}

function loadQuestions() {
  if (!pageSelect.value) { contentArea.style.display = 'none'; return; }

  const cls = classSelect.value;
  const ch  = chapterSelect.value;
  const pg  = pageSelect.value;

  contentArea.innerHTML = '';
  contentArea.style.display = 'block';

  const pageData = questionsData[cls] && questionsData[cls][ch] && questionsData[cls][ch][pg];

  if (!pageData) {
    const info = document.createElement('div');
    info.className = 'page-info';
    info.innerHTML = `
      <h3>Page ${pg}</h3>
      <p><strong>Topics covered:</strong> Content analysis pending</p>
      <p><strong>No. of questions found:</strong> No questions detected</p>
    `;
    contentArea.appendChild(info);

    const noQ = document.createElement('div');
    noQ.className = 'no-questions';
    noQ.innerHTML = '<h3>No questions detected for this page</h3><p>Questions data will be added in future updates.</p>';
    contentArea.appendChild(noQ);
    return;
    }

  const info = document.createElement('div');
  info.className = 'page-info';
  info.innerHTML = `
    <h3>Page ${pg}</h3>
    <p><strong>Topics covered:</strong> ${pageData.topics}</p>
    <p><strong>No. of questions found:</strong> ${pageData.questions.length}</p>
  `;
  contentArea.appendChild(info);

  pageData.questions.forEach((q, idx) => {
    const qId = `answer-${cls}-${ch}-${pg}-${idx}`;
    const block = document.createElement('div');
    block.className = 'question-container';

    const optsHTML = q.options.map(o => `<div class="option">${o}</div>`).join('');
    block.innerHTML = `
      <div class="question-year">${q.year}</div>
      <div class="question-text">${q.question}</div>
      <div class="options">${optsHTML}</div>
      <div class="button-group">
        <button class="btn btn-answer" aria-controls="${qId}">Get Answer</button>
        <span class="arrow-indicator" aria-hidden="true">→</span>
        <button class="btn btn-copy" title="Copy question with choices">Copy ChatGPT Prompt</button>
        <span class="arrow-indicator" aria-hidden="true">→</span>
        <button class="btn btn-explain" title="Open ChatGPT in a new tab">Open ChatGPT</button>
      </div>
      <div id="${qId}" class="answer-area" role="region" aria-label="Answer">
        <strong>Answer:</strong> ${q.answer}
      </div>
    `;

    // Attach data for Copy (no inline attributes; CSP-safe)
    const copyBtn = block.querySelector('.btn-copy');
    copyBtn.dataset.year = q.year;
    copyBtn.dataset.question = q.question;
    copyBtn.dataset.options = JSON.stringify(q.options);

    contentArea.appendChild(block);
  });
}

// --- Prompt + Clipboard ---
function buildPrompt(year, question, options) {
  return [year, `Question: ${question}`, 'Choices:', ...options].join('
');
}

function copyToClipboard(btn, text) {
  const original = btn.textContent;
  const done = () => {
    btn.textContent = 'Copied!';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1500);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)); // Clipboard API primary path. [MDN Clipboard API]
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } finally {
    document.body.removeChild(ta);
    done();
  }
}