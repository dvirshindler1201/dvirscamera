/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const SIZES = [
  { label: "21 × 30 CM",  price: 150 },
  { label: "30 × 40 CM",  price: 240 },
  { label: "50 × 70 CM",  price: 360 },
  { label: "70 × 100 CM", price: 690 },
];

const ORDER_FORM = "https://docs.google.com/forms/d/e/1FAIpQLScQJk177SkQuVrCWkcG29DllBctvYI1D_Na6PrVDUDuiTzxig/viewform?usp=pp_url";

const cn = (...xs) => xs.filter(Boolean).join(" ");
const seriesById  = (list, id) => list.find(s => s.id === id);
const photosOf    = (photos, id) => photos.filter(p => p.series === id);

// ---- Film grain ----
function Grain() {
  return <div className="grain" aria-hidden="true" />;
}

// ---- Top bar ----
function TopBar({ onHome }) {
  return (
    <header className="topbar">
      <a className="logo" href="/" aria-label="Dvir Shindler home">
        <span className="logo-mark">Dvir Shindler</span>
        <span className="logo-word">Photography</span>
      </a>
      <nav className="nav">
        <a href="/">Home</a>
        <a href="/gallery.html" className="nav-current">Gallery</a>
        <a href="/#contact">Contact</a>
      </nav>
    </header>
  );
}

// ---- Typewriter ----
function Typewriter({ text, delay = 0, speed = 80 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let t2;
    const t1 = setTimeout(() => {
      let i = 0;
      const tick = () => { i++; setN(i); if (i < text.length) t2 = setTimeout(tick, speed); };
      t2 = setTimeout(tick, speed);
    }, delay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [text, delay, speed]);
  return <span>{text.slice(0, n)}<span className="caret" /></span>;
}

// ---- Three Doors ----
function ThreeDoors({ series, photos, onEnter }) {
  const [hover, setHover] = useState(null);
  const [hint, setHint]   = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHint(true), 3200);
    const t2 = setTimeout(() => setReady(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <section className="doors">
      {series.map((s, i) => {
        const isHover = hover === s.id;
        const dim     = hover && !isHover;
        return (
          <button
            key={s.id}
            className={cn("door", isHover && "door--hover", dim && "door--dim")}
            onMouseEnter={() => setHover(s.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onEnter(s.id)}
            style={{ "--door-img": `url(${s.hero})` }}
          >
            <div className="door-img" />
            <div className="door-veil" />
            <div className="door-text">
              <span className="door-num">{String(i + 1).padStart(2, "0")} / 03</span>
              <h2 className="door-name">
                {ready
                  ? <span>{s.name}</span>
                  : <Typewriter text={s.name} delay={300 + i * 280} speed={90} />
                }
              </h2>
              <span className="door-meta">
                {photosOf(photos, s.id).length} PRINTS · {s.countries}
              </span>
              <span className="door-cta">
                <span>Walk the room</span>
                <span className="arrow">↗</span>
              </span>
            </div>
          </button>
        );
      })}
      <div className={cn("doors-hint", hint && "doors-hint--show")}>
        ↓ &nbsp; SCROLL TO WALK THE GALLERY
      </div>
    </section>
  );
}

// ---- Gallery Walk ----
function GalleryWalk({ seriesId, series, photos, onPickPhoto, onSwitchSeries, onJumpSeries }) {
  const list      = useMemo(() => photosOf(photos, seriesId), [photos, seriesId]);
  const cur       = seriesById(series, seriesId);
  const others    = series.filter(s => s.id !== seriesId);
  const trackRef  = useRef(null);
  const [progress, setProgress] = useState({ idx: 1, total: list.length });
  const [reduced, setReduced]   = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    mq.addEventListener?.("change", () => setReduced(mq.matches));
  }, []);

  // Vertical wheel → horizontal scroll with rAF momentum
  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) return;
    let vel = 0, rafId;
    const decay = 0.88;
    const animate = () => {
      if (Math.abs(vel) > 0.3) { el.scrollLeft += vel; vel *= decay; rafId = requestAnimationFrame(animate); }
      else vel = 0;
    };
    const onWheel = e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        vel += e.deltaY * 1.2;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); cancelAnimationFrame(rafId); };
  }, [seriesId, reduced]);

  // Arrow keys
  useEffect(() => {
    const onKey = e => {
      if (!trackRef.current) return;
      if (e.key === "ArrowRight") trackRef.current.scrollBy({ left:  window.innerWidth * 0.5, behavior: "smooth" });
      if (e.key === "ArrowLeft")  trackRef.current.scrollBy({ left: -window.innerWidth * 0.5, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // IntersectionObserver for fade-in + progress
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const items = [...el.querySelectorAll(".walk-item")];
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("walk-item--in");
          const i = Number(en.target.dataset.idx);
          setProgress(p => ({ ...p, idx: Math.max(p.idx, i + 1) }));
        }
      });
    }, { root: el, threshold: 0.4 });
    items.forEach((it, i) => { it.style.transitionDelay = `${(i % 6) * 60}ms`; obs.observe(it); });
    return () => obs.disconnect();
  }, [seriesId]);

  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: "auto" });
    setProgress({ idx: 1, total: list.length });
  }, [seriesId, list.length]);

  return (
    <section className="walk">
      <aside className="walk-rail">
        <div className="rail-row rail-row--active">
          <span className="rail-dot" />
          <span className="rail-name">{cur.name}</span>
          <span className="rail-count">{String(progress.idx).padStart(2,"0")} / {String(list.length).padStart(2,"0")}</span>
        </div>
        {others.map(s => (
          <button key={s.id} className="rail-row rail-row--other" onClick={() => onSwitchSeries(s.id)}>
            <span className="rail-dot rail-dot--ghost" />
            <span className="rail-name">{s.name}</span>
          </button>
        ))}
      </aside>

      <div className="walk-room-label">ROOM &nbsp;·&nbsp; {cur.name.toUpperCase()} &nbsp;·&nbsp; {list.length} PRINTS</div>
      <div className="walk-hint">↔ &nbsp; scroll horizontally</div>

      <div className="walk-track" ref={trackRef}>
        <div className="walk-opener">
          <div className="walk-opener-num">SERIES 0{series.findIndex(s => s.id === seriesId) + 1}</div>
          <div className="walk-opener-name">{cur.name}</div>
          <div className="walk-opener-line" />
          <div className="walk-opener-blurb">{cur.blurb}</div>
          <div className="walk-opener-meta">{cur.countries}</div>
        </div>

        {list.map((p, i) => (
          <div key={p.src} className={cn("walk-item", `walk-item--${p.orientation}`)} data-idx={i}>
            <button className={cn("walk-photo", p.sold && "walk-photo--sold")} onClick={() => onPickPhoto(p)}>
              <img src={p.src} alt={p.title} loading="lazy" draggable="false" />
              {p.sold && <span className="sold-overlay">SOLD</span>}
              <div className="photo-shield" />
            </button>
            <div className="placard">
              <div className={cn("placard-title", p.sold && "placard-title--sold")}>{p.title}</div>
              <div className="placard-meta">{p.year}{p.country ? ` · ${p.country}` : ""}</div>
              <button className="placard-link" onClick={() => onPickPhoto(p)}>
                {p.sold ? "Sold · edition closed" : "View print →"}
              </button>
            </div>
            <div className="walk-num">№ {String(i + 1).padStart(2,"0")} / {String(list.length).padStart(2,"0")}</div>
          </div>
        ))}

        <div className="walk-end">
          <div className="walk-end-eyebrow">END OF</div>
          <div className="walk-end-name">{cur.name}</div>
          <div className="walk-end-rule" />
          <div className="walk-end-doors">
            {others.map((s, i) => (
              <button key={s.id} className="walk-end-door" onClick={() => onJumpSeries(s.id)}>
                <span className="walk-end-arrow">{i === 0 ? "←" : "→"}</span>
                <span className="walk-end-door-name">{s.name}</span>
                <span className="walk-end-door-meta">{photosOf(photos, s.id).length} prints</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="walk-progress">
        <div className="walk-progress-num">{String(progress.idx).padStart(2,"0")} / {String(list.length).padStart(2,"0")}</div>
        <div className="walk-progress-track">
          <div className="walk-progress-fill" style={{ width: `${(progress.idx / list.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

// ---- Lightbox ----
function Lightbox({ photo, allPhotos, allSeries, onClose, onPickPhoto }) {
  const [size, setSize]     = useState(1);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setFocused(false);
    const t = setTimeout(() => setFocused(true), 80);
    return () => clearTimeout(t);
  }, [photo.src]);

  useEffect(() => {
    const sib = photosOf(allPhotos, photo.series);
    const onKey = e => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i    = sib.findIndex(p => p.src === photo.src);
        const next = sib[(i + (e.key === "ArrowRight" ? 1 : -1) + sib.length) % sib.length];
        onPickPhoto(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo, onClose, onPickPhoto, allPhotos]);

  const sib     = photosOf(allPhotos, photo.series);
  const sIdx    = sib.findIndex(p => p.src === photo.src);
  const prev    = sib[(sIdx - 1 + sib.length) % sib.length];
  const next    = sib[(sIdx + 1) % sib.length];
  const more    = sib.filter(p => p.src !== photo.src).slice(0, 3);
  const series  = seriesById(allSeries, photo.series);
  const cur     = SIZES[size];

  const formUrl = `${ORDER_FORM}&entry.1=`
    + encodeURIComponent(photo.title)
    + "&entry.2=" + encodeURIComponent(cur.label);

  return (
    <div className="lightbox">
      <button className="lightbox-bg" onClick={onClose} aria-label="Close" />
      <button className="lb-close" onClick={onClose}>
        <span className="lb-close-x">×</span>
        <span className="lb-close-label">CLOSE</span>
      </button>
      <button className="lb-nav lb-nav--prev" onClick={() => onPickPhoto(prev)} aria-label="Previous">‹</button>
      <button className="lb-nav lb-nav--next" onClick={() => onPickPhoto(next)} aria-label="Next">›</button>
      <div className="lb-counter">
        {String(sIdx + 1).padStart(2,"0")} / {String(sib.length).padStart(2,"0")} · {series.name.toUpperCase()}
      </div>

      <div className="lb-stage">
        <div className="lb-clean">
          <div className={cn("lb-photo", focused && "lb-photo--focused")}>
            <img src={photo.src} alt={photo.title} draggable="false" />
            <div className="photo-shield" />
          </div>
          <div className="lb-caption">
            <h1 className="lb-title">{photo.title}</h1>
            <div className="lb-sub">
              {photo.country && <><span>{photo.country}</span><span className="lb-sub-dot">·</span></>}
              <span>{series.name.toUpperCase()}</span>
              <span className="lb-sub-dot">·</span>
              <span>{photo.year}</span>
            </div>
          </div>
          <div className="lb-more">
            <div className="lb-more-label">MORE FROM {series.name.toUpperCase()}</div>
            <div className="lb-more-grid">
              {more.map(m => (
                <button key={m.src} className="lb-more-thumb" onClick={() => onPickPhoto(m)}>
                  <img src={m.src} alt={m.title} draggable="false" />
                  <div className="photo-shield" />
                  <span className="lb-more-title">{m.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="lb-rail">
        <div className="lb-rail-eyebrow">FROM THE ARCHIVE · № {String(sIdx + 1).padStart(3,"0")}</div>
        <h2 className="lb-rail-title">{photo.title}</h2>
        <div className="lb-rail-meta">
          {photo.country && `${photo.country} · `}{series.name.toUpperCase()} · {photo.year}
        </div>

        <div className="lb-rail-section">
          <div className="lb-rail-label">SIZES & PRICES</div>
          <ul className="size-list">
            {SIZES.map((s, i) => (
              <li key={s.label}>
                <button className={cn("size-row", size === i && "size-row--active")} onClick={() => setSize(i)}>
                  <span className="size-row-label">{s.label}</span>
                  <span className="size-row-price">₪{s.price}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="lb-rail-note">UNFRAMED · ARCHIVAL FINE-ART PAPER · SIGNED BY THE ARTIST</div>
        </div>

        <a className="order-btn" href={formUrl} target="_blank" rel="noopener noreferrer">
          <span className="order-btn-label">Order print</span>
          <span className="order-btn-meta">{cur.label} · ₪{cur.price}</span>
        </a>
        <div className="order-note">PAYMENT VIA BIT AT END OF FORM</div>
      </aside>
    </div>
  );
}

// ---- About / Footer ----
function AboutFooter() {
  return (
    <section className="about">
      <div className="about-rule" />
      <p className="about-paragraph">
        "These prints are pieces of journeys — Nepal at dawn, Thailand under monsoon,
        deserts I came back from changed. Each is printed on archival fine-art paper
        and signed."
      </p>
      <div className="about-sign">— Dvir Shindler</div>
      <div className="footer-rule" />
      <footer className="footer">
        <div className="footer-left">
          <a href="https://www.instagram.com/dvirscamera/" target="_blank" rel="noopener noreferrer">INSTAGRAM</a>
          <span className="footer-dot">·</span>
          <span>DVIRSCAMERA.COM</span>
        </div>
        <div className="footer-right">© 2026 DVIR SHINDLER · ALL RIGHTS RESERVED</div>
      </footer>
    </section>
  );
}

// ---- Custom Cursor (rAF lerp) ----
function CustomCursor() {
  const ref = useRef(null);
  const [mode, setMode] = useState("default");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy, rafId;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      cx = lerp(cx, tx, 0.14); cy = lerp(cy, ty, 0.14);
      el.style.transform = `translate(${cx}px,${cy}px)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    const onMove = e => {
      tx = e.clientX; ty = e.clientY;
      const t = e.target;
      if (t.closest(".walk-photo, .lb-more-thumb, .door, .lb-stage")) setMode("plus");
      else if (t.closest("a, button")) setMode("arrow");
      else setMode("default");
    };
    const onLeave = () => setMode("hidden");
    const onEnter = () => setMode("default");
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);
  return (
    <div ref={ref} className={cn("cursor", `cursor--${mode}`)} aria-hidden="true">
      <span className="cursor-plus">+</span>
      <span className="cursor-arrow">↗</span>
      <span className="cursor-dot" />
    </div>
  );
}

// ---- App ----
function App() {
  const [data, setData]         = useState(null);
  const [phase, setPhase]       = useState("doors");
  const [seriesId, setSeriesId] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetch("/data/prints.json")
      .then(r => r.json())
      .then(d => {
        setData(d);
        // hide boot splash
        const b = document.getElementById("boot");
        if (b) { b.classList.add("boot--gone"); setTimeout(() => b.remove(), 800); }
      });
  }, []);

  if (!data) return null;

  const enterSeries = id => {
    setSeriesId(id); setPhase("walk");
    history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const goHome = () => {
    setPhase("doors"); setSeriesId(null); setLightbox(null);
    history.replaceState(null, "", "#");
  };

  return (
    <div className="app">
      <Grain />
      <CustomCursor />
      <TopBar onHome={goHome} />

      {phase === "doors" && (
        <ThreeDoors series={data.series} photos={data.photos} onEnter={enterSeries} />
      )}

      {phase === "walk" && seriesId && (
        <>
          <GalleryWalk
            seriesId={seriesId}
            series={data.series}
            photos={data.photos}
            onPickPhoto={p => setLightbox(p)}
            onSwitchSeries={id => enterSeries(id)}
            onJumpSeries={id => enterSeries(id)}
          />
          <AboutFooter />
        </>
      )}

      {lightbox && (
        <Lightbox
          photo={lightbox}
          allPhotos={data.photos}
          allSeries={data.series}
          onClose={() => setLightbox(null)}
          onPickPhoto={p => setLightbox(p)}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
