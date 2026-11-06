/* Bulutkent animasyon çalışma zamanı (HyperFrames + GSAP). Tamamen deterministik: rastgelelik yok. */
(function () {
  const MOUTHS = [".m-smile", ".m-open", ".m-sad", ".m-o", ".m-grin", ".m-flat"];
  const EYES = [".eyes-open", ".eyes-happy", ".eyes-closed"];
  const EMO = {
    happy: { m: ".m-smile", e: ".eyes-open" },
    excited: { m: ".m-grin", e: ".eyes-happy", by: -6 },
    laughing: { m: ".m-grin", e: ".eyes-happy", by: -6 },
    sad: { m: ".m-sad", e: ".eyes-open", bl: -16, br: 16, by: 2 },
    surprised: { m: ".m-o", e: ".eyes-open", by: -12 },
    scared: { m: ".m-o", e: ".eyes-open", bl: -10, br: 10, by: -12 },
    grumpy: { m: ".m-flat", e: ".eyes-open", bl: 18, br: -18, by: 4 },
    sleepy: { m: ".m-o", e: ".eyes-closed" },
    thinking: { m: ".m-flat", e: ".eyes-open", br: -12, by: -6 },
    shy: { m: ".m-smile", e: ".eyes-happy" },
    calm: { m: ".m-smile", e: ".eyes-closed" },
  };
  const all = (r, list) => list.map((s) => r + s).join(",");

  function emo(tl, inst, name, t) {
    const c = EMO[name] || EMO.happy, r = "#" + inst + " ";
    tl.set(all(r, MOUTHS), { opacity: 0 }, t);
    tl.set(r + c.m, { opacity: 1 }, t);
    tl.set(all(r, EYES), { opacity: 0 }, t);
    tl.set(r + c.e, { opacity: 1 }, t);
    tl.set(r + ".brow-l", { rotation: c.bl || 0, y: c.by || 0, transformOrigin: "50% 50%" }, t);
    tl.set(r + ".brow-r", { rotation: c.br || 0, y: c.by || 0, transformOrigin: "50% 50%" }, t);
  }

  function talk(tl, inst, env, t0, fps, emoName) {
    const r = "#" + inst + " ";
    const dur = env.length / fps;
    tl.set(all(r, MOUTHS), { opacity: 0 }, t0);
    tl.set(r + ".m-open", { opacity: 1, scaleY: 0.2, transformOrigin: "50% 0%" }, t0);
    for (let i = 0; i < env.length; i++) tl.set(r + ".m-open", { scaleY: 0.15 + 0.85 * env[i] }, t0 + i / fps);
    const end = t0 + dur;
    tl.set(r + ".m-open", { opacity: 0, scaleY: 1 }, end);
    tl.set(r + (EMO[emoName] || EMO.happy).m, { opacity: 1 }, end);
    const n = Math.max(1, Math.floor(dur / 0.4));
    tl.to(r + ".head", { rotation: 3, transformOrigin: "50% 100%", duration: 0.4, yoyo: true, repeat: n - 1, ease: "sine.inOut" }, t0);
    tl.set(r + ".head", { rotation: 0 }, end + 0.01);
  }

  function blink(tl, inst, t) {
    tl.to("#" + inst + " .eyes-open", { scaleY: 0.08, transformOrigin: "50% 50%", duration: 0.07, yoyo: true, repeat: 1 }, t);
  }

  function breathe(tl, inst, t, d) {
    const n = Math.max(1, Math.floor(d / 1.3));
    tl.to("#" + inst + " .bob", { scaleY: 1.025, transformOrigin: "50% 100%", duration: 1.3, yoyo: true, repeat: n - 1, ease: "sine.inOut" }, t);
  }

  function face(tl, inst, dir, t) {
    tl.set("#" + inst + " .flip", { attr: { transform: dir === "left" ? "scale(-1 1)" : "scale(1 1)" } }, t);
  }

  function rep(d, step) { return Math.max(1, Math.floor(d / step)); }

  function act(tl, inst, a, t, d, o) {
    const r = "#" + inst + " ", A = r + ".act", AR = r + ".arm-r", AL = r + ".arm-l", H = r + ".head";
    const arm = { transformOrigin: "50% 8%" };
    d = Math.max(0.8, d);
    switch (a) {
      case "wave":
        tl.to(AR, { ...arm, rotation: -150, duration: 0.25 }, t);
        tl.to(AR, { rotation: -115, duration: 0.22, yoyo: true, repeat: rep(d - 0.5, 0.22) * 2 - 1, ease: "sine.inOut" }, t + 0.25);
        tl.to(AR, { rotation: 0, duration: 0.3 }, t + d);
        break;
      case "jump":
        tl.to(A, { y: -110, duration: 0.3, ease: "power2.out" }, t);
        tl.to(A, { y: 0, duration: 0.28, ease: "power2.in" }, t + 0.3);
        tl.to(A, { scaleY: 0.9, transformOrigin: "50% 100%", duration: 0.08, yoyo: true, repeat: 1 }, t + 0.58);
        tl.to([AL, AR], { ...arm, rotation: (i) => (i ? -140 : 140), duration: 0.2 }, t);
        tl.to([AL, AR], { rotation: 0, duration: 0.3 }, t + 0.6);
        break;
      case "hop":
        for (let i = 0; i < 3; i++) {
          tl.to(A, { y: -38, duration: 0.15, ease: "power1.out" }, t + i * 0.32);
          tl.to(A, { y: 0, duration: 0.15, ease: "power1.in" }, t + i * 0.32 + 0.15);
        }
        break;
      case "walk_in":
      case "walk_out": {
        const dist = Math.abs(o.to - o.from), dur = Math.min(1.6, Math.max(0.9, dist / 700));
        tl.fromTo("#" + inst, { x: o.from }, { x: o.to, duration: dur, ease: "none" }, t);
        const steps = Math.floor(dur / 0.25);
        for (let i = 0; i < steps; i++) {
          tl.to(A, { y: -22, duration: 0.12, ease: "sine.out" }, t + i * 0.25);
          tl.to(A, { y: 0, duration: 0.12, ease: "sine.in" }, t + i * 0.25 + 0.12);
        }
        break;
      }
      case "dance": {
        const n = rep(d, 0.3);
        tl.to(A, { rotation: 8, transformOrigin: "50% 100%", duration: 0.3, yoyo: true, repeat: n - 1, ease: "sine.inOut" }, t);
        tl.to(AL, { ...arm, rotation: 140, duration: 0.3, yoyo: true, repeat: n - 1 }, t);
        tl.to(AR, { ...arm, rotation: -140, duration: 0.3, yoyo: true, repeat: n - 1 }, t + 0.15);
        tl.to([A, AL, AR], { rotation: 0, duration: 0.25 }, t + n * 0.3 + 0.15);
        break;
      }
      case "point":
        tl.to(AR, { ...arm, rotation: -100, duration: 0.25, ease: "back.out(2)" }, t);
        tl.to(AR, { rotation: 0, duration: 0.3 }, t + d);
        break;
      case "think":
        tl.to(AR, { ...arm, rotation: 150, duration: 0.35 }, t);
        tl.to(H, { rotation: 8, transformOrigin: "50% 100%", duration: 0.4 }, t);
        tl.to([AR, H], { rotation: 0, duration: 0.3 }, t + d);
        break;
      case "clap": {
        const n = rep(d, 0.2);
        tl.to(AL, { ...arm, rotation: -55, duration: 0.2, yoyo: true, repeat: n - 1 }, t);
        tl.to(AR, { ...arm, rotation: 55, duration: 0.2, yoyo: true, repeat: n - 1 }, t);
        tl.to([AL, AR], { rotation: 0, duration: 0.2 }, t + n * 0.2 + 0.05);
        break;
      }
      case "laugh": {
        const n = rep(d, 0.14);
        tl.to(A, { scaleY: 0.95, transformOrigin: "50% 100%", duration: 0.14, yoyo: true, repeat: n - 1 }, t);
        tl.set(A, { scaleY: 1 }, t + n * 0.14 + 0.01);
        break;
      }
      case "cry":
        tl.to(H, { rotation: 9, transformOrigin: "50% 100%", duration: 0.5 }, t);
        tl.to(A, { y: 6, duration: 0.5 }, t);
        tl.to([H, A], { rotation: 0, y: 0, duration: 0.4 }, t + d);
        break;
      case "sleep":
        tl.to(H, { rotation: 12, transformOrigin: "50% 100%", duration: 0.8 }, t);
        break;
      case "spin":
        for (let i = 1; i <= 4; i++) tl.set(r + ".flip", { attr: { transform: i % 2 ? "scale(-1 1)" : "scale(1 1)" } }, t + i * 0.12);
        tl.to(A, { y: -30, duration: 0.24, yoyo: true, repeat: 1 }, t);
        break;
      case "nod":
        tl.to(H, { y: 8, duration: 0.18, yoyo: true, repeat: 3 }, t);
        break;
      case "shake_head":
        tl.to(H, { rotation: 9, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 5 }, t);
        tl.set(H, { rotation: 0 }, t + 0.75);
        break;
      case "look_around":
        tl.to(H, { rotation: -9, transformOrigin: "50% 100%", duration: 0.4 }, t);
        tl.to(H, { rotation: 9, duration: 0.6 }, t + 0.4);
        tl.to(H, { rotation: 0, duration: 0.4 }, t + 1.0);
        break;
      case "sneeze":
        tl.to(H, { rotation: -12, transformOrigin: "50% 100%", duration: 0.5 }, t);
        tl.to(H, { rotation: 10, duration: 0.08 }, t + 0.55);
        tl.to(A, { scaleY: 0.86, transformOrigin: "50% 100%", duration: 0.08, yoyo: true, repeat: 1 }, t + 0.55);
        tl.to(H, { rotation: 0, duration: 0.3 }, t + 0.8);
        break;
      default:
        break;
    }
  }

  function pop(tl, sel, t) {
    tl.fromTo(sel, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.45, ease: "back.out(2.2)" }, t);
  }

  function float(tl, sel, t, d) {
    const n = Math.max(1, Math.floor(d / 1.1));
    tl.to(sel, { y: -10, duration: 1.1, yoyo: true, repeat: n - 1, ease: "sine.inOut" }, t);
  }

  function ambient(tl0, scene, t, d) {
    const s = "#" + scene + " ";
    const tl = { to: (sel, v, at) => { if (document.querySelector(sel)) tl0.to(sel, v, at); } };
    tl.to(s + ".cloud", { x: "+=140", duration: d, ease: "none" }, t);
    const tw = Math.max(1, Math.floor(d / 0.9));
    tl.to(s + ".star", { opacity: 0.35, duration: 0.9, yoyo: true, repeat: tw - 1, stagger: { each: 0.13, from: "start" } }, t);
    tl.to(s + ".firefly", { y: -24, opacity: 0.4, duration: 1.4, yoyo: true, repeat: Math.max(1, Math.floor(d / 1.4)) - 1, stagger: 0.2 }, t);
    tl.to(s + ".wave", { x: 30, duration: 1.6, yoyo: true, repeat: Math.max(1, Math.floor(d / 1.6)) - 1, ease: "sine.inOut" }, t);
    tl.to(s + ".sway", { rotation: 1.5, transformOrigin: "50% 100%", duration: 2.2, yoyo: true, repeat: Math.max(1, Math.floor(d / 2.2)) - 1, ease: "sine.inOut" }, t);
  }

  window.BK = { emo, talk, blink, breathe, face, act, pop, float, ambient };
})();
