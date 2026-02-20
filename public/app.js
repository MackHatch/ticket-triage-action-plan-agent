const SAMPLE_GOOD = `Subject: Payments stuck after submit

When I click "Submit Payment" on the checkout page, the spinner appears for about 30 seconds and then nothing happens. No confirmation, no error message. The payment does not appear in my order history.

Expected: After clicking Submit, I should see a confirmation page and receive an email receipt.

Steps I took:
1. Added items to cart
2. Went to checkout
3. Entered payment details (test card 4242...)
4. Clicked "Submit Payment"
5. Waited - spinner never stopped

This started happening today. I'm on Chrome 120, Windows 11.`;

const SAMPLE_VAGUE = `Hi,

A student in my class says they can't get into the application. Can someone look into this?

Thanks`;

const titleEl = document.getElementById("title");
const toneEl = document.getElementById("tone");
const sourceEl = document.getElementById("source");
const modelEl = document.getElementById("model");
const ticketTextEl = document.getElementById("ticketText");
const triageBtn = document.getElementById("triageBtn");
const loadGoodBtn = document.getElementById("loadGood");
const loadVagueBtn = document.getElementById("loadVague");
const statusEl = document.getElementById("status");
const markdownEl = document.getElementById("markdown");
const jsonEl = document.getElementById("json");
const traceEl = document.getElementById("trace");

function setStatus(msg, isError = false, isLoading = false) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (isError ? " error" : "") + (isLoading ? " loading" : "");
}

function clearOutputs() {
  markdownEl.textContent = "";
  jsonEl.textContent = "";
  traceEl.textContent = "";
}

async function triage() {
  const title = titleEl.value.trim() || "Ticket";
  const ticketText = ticketTextEl.value.trim();
  if (!ticketText) {
    setStatus("Please enter ticket text.", true);
    return;
  }

  triageBtn.disabled = true;
  setStatus("Running…", false, true);
  clearOutputs();

  const body = {
    title,
    ticketText,
    tone: toneEl.value,
    source: sourceEl.value,
  };
  if (modelEl.value.trim()) {
    body.model = modelEl.value.trim();
  }

  try {
    const res = await fetch("/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 400 || res.status === 422) {
        const details = data.details ? "\n" + data.details.join("\n") : "";
        setStatus((data.error || "Error") + details, true);
      } else {
        setStatus(data.error || "Internal error", true);
      }
      return;
    }

    setStatus("Done.");

    markdownEl.textContent = data.markdown ?? "";
    jsonEl.textContent = JSON.stringify(data.result ?? data, null, 2);
    const trace = data.trace ?? {};
    const flagsLine = trace.flags?.length
      ? "Flags: " + trace.flags.join(", ") + "\n\n"
      : "";
    traceEl.textContent = flagsLine + JSON.stringify(trace, null, 2);
  } catch (err) {
    setStatus("Network error: " + (err.message || "Unknown"), true);
  } finally {
    triageBtn.disabled = false;
  }
}

function loadSample(text, title) {
  ticketTextEl.value = text;
  titleEl.value = title;
  clearOutputs();
  setStatus("");
}

loadGoodBtn.addEventListener("click", () =>
  loadSample(SAMPLE_GOOD, "Payments stuck after submit")
);
loadVagueBtn.addEventListener("click", () =>
  loadSample(SAMPLE_VAGUE, "Student can't access application")
);
triageBtn.addEventListener("click", triage);
