# Changelog

## [1.1.0] - 2026-06-20
- Constellation-web: neon lijntjes tussen nabije deeltjes, verbindt mee met je cursor (@herriaan)
- Cursor-glow: zachte lichtbron die je muis volgt, pulseert mee op audio (@herriaan)
- Shockwave-ringen bij klik (dubbele magenta/cyan ring die expandeert) (@herriaan)
- Title-parallax: 3D-kanteling van de hero-titel op cursorbeweging (@herriaan)
- CRT-laag: vignette + animerende scanlines voor retro-futuristische look (@herriaan)
- Blijft 120fps in test, geen console-fouten (@herriaan)

## [1.0.1] - 2026-06-20
- Fix: ernstige framedrops/vastlopen verholpen. `shadowBlur` per deeltje vervangen door vooraf-getekende glow-sprites met `lighter`-compositing (19fps → 121fps in test) (@herriaan)
- Fix: klik-burst explodeerde deeltjessnelheid (dubbele deling door afstand); nu begrensde radiale impuls met falloff + snelheidsplafond (@herriaan)
- Perf: DPR gecapt op 1.5 en deeltjesaantal verlaagd (cap 260) voor soepele framerate (@herriaan)
- Robuustheid: klik-handler hardt af tegen events zonder DOM-target (@herriaan)

## [1.0.0] - 2026-06-20
- Eerste versie: interactief neon deeltjesveld op canvas met cursor-zwaartekracht en klik-singulariteit (@herriaan)
- Glitch hero-titel, drie glow-panels met scroll-reveal en synthwave grid-floor (@herriaan)
- Optionele audio-reactieve modus via microfoon, standaard uit (@herriaan)
- Responsive deeltjesschaling + `prefers-reduced-motion` support (@herriaan)
- Deploy op GitHub Pages (@herriaan)
