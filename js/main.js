/* App-glue: start het veld, scroll-reveal, coords-HUD, audio-toggle. */

const canvas = document.getElementById('field');
const field = new window.EventHorizon.Field(canvas);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop() {
  field.frame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---- HUD coords volgen de cursor ---- */
const coords = document.getElementById('coords');
window.addEventListener('mousemove', (e) => {
  const x = ((e.clientX / window.innerWidth) * 100).toFixed(2);
  const y = ((e.clientY / window.innerHeight) * 100).toFixed(2);
  coords.textContent = `${x} / ${y}`;
});

/* ---- Scroll-reveal voor panels ---- */
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  }
}, { threshold: 0.25 });
document.querySelectorAll('.panel').forEach((p) => io.observe(p));

/* ---- Audio-reactief (optioneel, vraagt mic-toestemming) ---- */
const audioToggle = document.getElementById('audioToggle');
let audioCtx, analyser, dataArray, rafAudio, micStream;

async function enableAudio() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    pollAudio();
    setToggle(true);
  } catch (err) {
    audioToggle.textContent = 'mic geweigerd';
    setTimeout(() => setToggle(false), 1600);
  }
}

function pollAudio() {
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
  const avg = sum / dataArray.length / 255; // 0..1
  field.audioBoost = Math.max(field.audioBoost, avg * 0.9);
  rafAudio = requestAnimationFrame(pollAudio);
}

function disableAudio() {
  if (rafAudio) cancelAnimationFrame(rafAudio);
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  if (audioCtx) audioCtx.close();
  field.audioBoost = 0;
  setToggle(false);
}

function setToggle(on) {
  audioToggle.setAttribute('aria-pressed', String(on));
  audioToggle.innerHTML =
    `<span class="audio-toggle__dot"></span> audio-reactief: ${on ? 'aan' : 'uit'}`;
}

audioToggle.addEventListener('click', () => {
  const on = audioToggle.getAttribute('aria-pressed') === 'true';
  on ? disableAudio() : enableAudio();
});
