# EVENT HORIZON

Een interactief neon deeltjes-experiment. Volledig vanilla: één `index.html`, losse CSS en JS, geen build-stap, geen dependencies.

**Live:** https://katamanl.github.io/event-horizon/

## Wat het doet
- Honderden neon-deeltjes op een `<canvas>` die op je cursor reageren (aantrekken van veraf, afstoten dichtbij).
- Klik ergens op de achtergrond voor een singulariteit-puls: het veld knalt radiaal naar buiten.
- Scroll door drie panelen met neon-glow en een synthwave grid-floor.
- Optionele audio-reactieve modus: deeltjes pulseren mee op je microfoon (vraagt toestemming, staat standaard uit).

## Tech
- Vanilla JS + Canvas 2D, `requestAnimationFrame`, `lighter` compositing voor bloom.
- Deeltjesaantal schaalt met schermoppervlak (gecapt op 420) zodat mobiel soepel blijft.
- Respecteert `prefers-reduced-motion`.
- Fonts: Space Grotesk + Syncopate (Google Fonts).

## Lokaal draaien
Open `index.html` direct, of serveer de map:
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structuur
```
index.html        markup + secties
css/style.css     styling, glitch, grid-floor
js/particles.js   deeltjesveld (Particle + Field)
js/main.js        glue: loop, scroll-reveal, HUD, audio
```
