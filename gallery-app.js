/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;
const e = React.createElement;

const SIZES = [
  { label: "21 \xd7 30 CM",  price: 150, w: 21, h: 30  },
  { label: "30 \xd7 40 CM",  price: 240, w: 30, h: 40  },
  { label: "50 \xd7 70 CM",  price: 360, w: 50, h: 70  },
  { label: "70 \xd7 100 CM", price: 690, w: 70, h: 100 },
];

const FORM_ACTION = "https://formspree.io/f/xdabylky";

const cn = (...xs) => xs.filter(Boolean).join(" ");
const seriesById = (list, id) => list.find(s => s.id === id);
const photosOf   = (photos, id) => photos.filter(p => p.series === id);

const SERIES_CODE = { adventure: "A", escape: "E", story: "S" };
const getCode = (photos, photo) => {
  const sib = photosOf(photos, photo.series);
  const i   = sib.findIndex(p => p.src === photo.src);
  return (SERIES_CODE[photo.series] || photo.series[0].toUpperCase()) + String(i + 1).padStart(2, "0");
};

const shuffleArray = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function Grain() {
  return e("div", { className: "grain", "aria-hidden": "true" });
}

function TopBar() {
  return e("header", { className: "topbar" },
    e("a", { className: "logo", href: "/", "aria-label": "Dvir Shindler home" },
      e("span", { className: "logo-mark" }, "Dvir Shindler"),
      e("span", { className: "logo-word" }, "Photography")
    ),
    e("nav", { className: "nav" },
      e("a", { href: "/" }, "Home"),
      e("a", { href: "/gallery.html", className: "nav-current" }, "Gallery"),
      e("a", { href: "/#contact" }, "Contact")
    )
  );
}

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
  return e("span", null, text.slice(0, n), e("span", { className: "caret" }));
}

function DoorImage({ src, blurSrc, alt, eager }) {
  const [loaded, setLoaded] = useState(false);
  return e(React.Fragment, null,
    blurSrc ? e("img", {
      className: "door-blur",
      src: blurSrc,
      alt: "",
      "aria-hidden": "true",
      draggable: "false"
    }) : null,
    e("img", {
      className: cn("door-img", loaded && "door-img--loaded"),
      src,
      alt,
      draggable: "false",
      loading: "eager",
      decoding: "async",
      fetchpriority: eager ? "high" : "auto",
      onLoad: () => setLoaded(true)
    })
  );
}

function ThreeDoors({ series, photos, onEnter }) {
  const [hover, setHover] = useState(null);
  const [hint, setHint]   = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHint(true), 3200);
    const t2 = setTimeout(() => setReady(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const doors = series.map((s, i) => {
    const isHover = hover === s.id;
    const dim     = hover && !isHover;
    return e("button", {
      key: s.id,
      className: cn("door", isHover && "door--hover", dim && "door--dim"),
      onMouseEnter: () => setHover(s.id),
      onMouseLeave: () => setHover(null),
      onClick: () => onEnter(s.id)
    },
      e("div", { className: "door-img-wrap" },
        e(DoorImage, {
          src: s.hero,
          blurSrc: s.heroBlur,
          alt: s.name,
          eager: i === 0
        })
      ),
      e("div", { className: "door-veil" }),
      e("div", { className: "door-text" },
        e("span", { className: "door-num" }, String(i + 1).padStart(2, "0") + " / 03"),
        e("h2", { className: "door-name" },
          ready
            ? e("span", null, s.name)
            : e(Typewriter, { text: s.name, delay: 300 + i * 280, speed: 90 })
        ),
        e("span", { className: "door-meta" },
          photosOf(photos, s.id).length + " PRINTS \xb7 " + s.countries
        ),
        e("span", { className: "door-cta" },
          e("span", null, "Walk the room"),
          e("span", { className: "arrow" }, "↗")
        )
      )
    );
  });

  return e("section", { className: "doors" },
    doors,
    e("div", { className: cn("doors-hint", hint && "doors-hint--show") },
      "↓   SCROLL FOR THE COMPLETE ARCHIVE"
    )
  );
}

function GalleryWalk({ seriesId, series, photos, onPickPhoto, onSwitchSeries, onJumpSeries }) {
  const list     = useMemo(() => photosOf(photos, seriesId), [photos, seriesId]);
  const cur      = seriesById(series, seriesId);
  const others   = series.filter(s => s.id !== seriesId);
  const trackRef = useRef(null);
  const [progress, setProgress] = useState({ idx: 1, total: list.length });
  const [reduced, setReduced]   = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", () => setReduced(mq.matches));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) return;
    let vel = 0, rafId;
    const decay = 0.88;
    const animate = () => {
      if (Math.abs(vel) > 0.3) {
        el.scrollLeft += vel;
        vel *= decay;
        rafId = requestAnimationFrame(animate);
      } else {
        vel = 0;
      }
    };
    const onWheel = ev => {
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        ev.preventDefault();
        vel += ev.deltaY * 1.2;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); cancelAnimationFrame(rafId); };
  }, [seriesId, reduced]);

  useEffect(() => {
    const onKey = ev => {
      if (!trackRef.current) return;
      if (ev.key === "ArrowRight") trackRef.current.scrollBy({ left:  window.innerWidth * 0.5, behavior: "smooth" });
      if (ev.key === "ArrowLeft")  trackRef.current.scrollBy({ left: -window.innerWidth * 0.5, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll(".walk-item"));
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("walk-item--in");
          const i = Number(en.target.dataset.idx);
          setProgress(p => ({ ...p, idx: Math.max(p.idx, i + 1) }));
        }
      });
    }, { root: el, threshold: 0.4 });
    items.forEach((it, i) => { it.style.transitionDelay = (i % 6) * 60 + "ms"; obs.observe(it); });
    return () => obs.disconnect();
  }, [seriesId]);

  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: "auto" });
    setProgress({ idx: 1, total: list.length });
  }, [seriesId, list.length]);

  const seriesIdx = series.findIndex(s => s.id === seriesId);

  return e("section", { className: "walk" },
    e("aside", { className: "walk-rail" },
      e("div", { className: "rail-row rail-row--active" },
        e("span", { className: "rail-dot" }),
        e("span", { className: "rail-name" }, cur.name),
        e("span", { className: "rail-count" },
          String(progress.idx).padStart(2, "0") + " / " + String(list.length).padStart(2, "0")
        )
      ),
      others.map(s =>
        e("button", {
          key: s.id,
          className: "rail-row rail-row--other",
          onClick: () => onSwitchSeries(s.id)
        },
          e("span", { className: "rail-dot rail-dot--ghost" }),
          e("span", { className: "rail-name" }, s.name)
        )
      )
    ),
    e("div", { className: "walk-room-label" },
      "ROOM  \xb7  " + cur.name.toUpperCase() + "  \xb7  " + list.length + " PRINTS"
    ),
    e("div", { className: "walk-hint" }, "↔   scroll horizontally"),
    e("div", { className: "walk-track", ref: trackRef },
      e("div", { className: "walk-opener" },
        e("div", { className: "walk-opener-num" }, "SERIES 0" + (seriesIdx + 1)),
        e("div", { className: "walk-opener-name" }, cur.name),
        e("div", { className: "walk-opener-line" }),
        e("div", { className: "walk-opener-blurb" }, cur.blurb),
        e("div", { className: "walk-opener-meta" }, cur.countries)
      ),
      list.map((p, i) =>
        e("div", {
          key: p.src,
          className: cn("walk-item", "walk-item--" + p.orientation),
          "data-idx": i
        },
          e("button", {
            className: cn("walk-photo", p.sold && "walk-photo--sold"),
            onClick: () => onPickPhoto(p)
          },
            e("img", { src: p.src, alt: p.title, loading: "lazy", draggable: "false" }),
            p.sold ? e("span", { className: "sold-overlay" }, "SOLD") : null,
            e("div", { className: "photo-shield" })
          ),
          e("div", { className: "placard" },
            e("span", { className: "placard-code" }, SERIES_CODE[seriesId] + String(i + 1).padStart(2, "0")),
            e("div", { className: cn("placard-title", p.sold && "placard-title--sold") }, p.title),
            e("div", { className: "placard-meta" }, p.year + (p.country ? " \xb7 " + p.country : "")),
            e("button", { className: "placard-link", onClick: () => onPickPhoto(p) },
              p.sold ? "Sold \xb7 edition closed" : "View print →"
            )
          ),
          e("div", { className: "walk-num" },
            "№ " + String(i + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0")
          )
        )
      ),
      e("div", { className: "walk-end" },
        e("div", { className: "walk-end-eyebrow" }, "END OF"),
        e("div", { className: "walk-end-name" }, cur.name),
        e("div", { className: "walk-end-rule" }),
        e("div", { className: "walk-end-doors" },
          others.map((s, i) =>
            e("button", {
              key: s.id,
              className: "walk-end-door",
              onClick: () => onJumpSeries(s.id)
            },
              e("span", { className: "walk-end-arrow" }, i === 0 ? "←" : "→"),
              e("span", { className: "walk-end-door-name" }, s.name),
              e("span", { className: "walk-end-door-meta" }, photosOf(photos, s.id).length + " prints")
            )
          )
        )
      )
    ),
    e("div", { className: "walk-progress" },
      e("div", { className: "walk-progress-num" },
        String(progress.idx).padStart(2, "0") + " / " + String(list.length).padStart(2, "0")
      ),
      e("div", { className: "walk-progress-track" },
        e("div", {
          className: "walk-progress-fill",
          style: { width: ((progress.idx / list.length) * 100) + "%" }
        })
      )
    )
  );
}

function Lightbox({ photo, allPhotos, allSeries, onClose, onPickPhoto, onOrder }) {
  const [size, setSize]       = useState(1);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setFocused(false);
    const t = setTimeout(() => setFocused(true), 80);
    return () => clearTimeout(t);
  }, [photo.src]);

  useEffect(() => {
    const sib = photosOf(allPhotos, photo.series);
    const onKey = ev => {
      if (ev.key === "Escape") { onClose(); return; }
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        const i    = sib.findIndex(p => p.src === photo.src);
        const next = sib[(i + (ev.key === "ArrowRight" ? 1 : -1) + sib.length) % sib.length];
        onPickPhoto(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo, onClose, onPickPhoto, allPhotos]);

  const sib      = photosOf(allPhotos, photo.series);
  const sIdx     = sib.findIndex(p => p.src === photo.src);
  const prev     = sib[(sIdx - 1 + sib.length) % sib.length];
  const next     = sib[(sIdx + 1) % sib.length];
  const more     = sib.filter(p => p.src !== photo.src).slice(0, 3);
  const series   = seriesById(allSeries, photo.series);
  const cur      = SIZES[size];
  const photoCode = getCode(allPhotos, photo);

  return e("div", { className: "lightbox" },
    e("button", { className: "lightbox-bg", onClick: onClose, "aria-label": "Close" }),
    e("button", { className: "lb-close", onClick: onClose },
      e("span", { className: "lb-close-x" }, "\xd7"),
      e("span", { className: "lb-close-label" }, "CLOSE")
    ),
    e("button", { className: "lb-nav lb-nav--prev", onClick: () => onPickPhoto(prev), "aria-label": "Previous" }, "‹"),
    e("button", { className: "lb-nav lb-nav--next", onClick: () => onPickPhoto(next), "aria-label": "Next" }, "›"),
    e("div", { className: "lb-counter" },
      String(sIdx + 1).padStart(2, "0") + " / " + String(sib.length).padStart(2, "0") + " \xb7 " + series.name.toUpperCase()
    ),
    e("div", { className: "lb-stage" },
      e("div", { className: "lb-clean" },
        e("div", { className: cn("lb-photo", focused && "lb-photo--focused") },
          e("img", { src: photo.src, alt: photo.title, draggable: "false" }),
          e("div", { className: "photo-shield" })
        ),
        e("div", { className: "lb-caption" },
          e("h1", { className: "lb-title" }, photo.title),
          e("div", { className: "lb-sub" },
            photo.country ? e(React.Fragment, null,
              e("span", null, photo.country),
              e("span", { className: "lb-sub-dot" }, "\xb7")
            ) : null,
            e("span", null, series.name.toUpperCase()),
            e("span", { className: "lb-sub-dot" }, "\xb7"),
            e("span", null, photo.year)
          )
        ),
        e("div", { className: "lb-more" },
          e("div", { className: "lb-more-label" }, "MORE FROM " + series.name.toUpperCase()),
          e("div", { className: "lb-more-grid" },
            more.map(m =>
              e("button", { key: m.src, className: "lb-more-thumb", onClick: () => onPickPhoto(m) },
                e("img", { src: m.src, alt: m.title, draggable: "false" }),
                e("div", { className: "photo-shield" }),
                e("span", { className: "lb-more-title" }, m.title)
              )
            )
          )
        )
      )
    ),
    e("aside", { className: "lb-rail" },
      e("div", { className: "lb-rail-eyebrow" },
        "FROM THE ARCHIVE \xb7 № " + String(sIdx + 1).padStart(3, "0")
      ),
      e("h2", { className: "lb-rail-title" }, photo.title),
      e("div", { className: "lb-rail-code" }, photoCode),
      e("div", { className: "lb-rail-meta" },
        (photo.country ? photo.country + " \xb7 " : "") + series.name.toUpperCase() + " \xb7 " + photo.year
      ),
      e("div", { className: "lb-rail-section" },
        e("div", { className: "lb-rail-label" }, "SIZES & PRICES"),
        e("ul", { className: "size-list" },
          SIZES.map((s, i) =>
            e("li", { key: s.label },
              e("button", {
                className: cn("size-row", size === i && "size-row--active"),
                onClick: () => setSize(i)
              },
                e("span", { className: "size-row-label" }, s.label),
                e("span", { className: "size-row-price" }, "₪" + s.price)
              )
            )
          )
        ),
        e("div", { className: "lb-rail-note" },
          "UNFRAMED \xb7 ARCHIVAL FINE-ART PAPER \xb7 SIGNED BY THE ARTIST"
        )
      ),
      e("button", {
        className: "order-btn",
        onClick: () => onOrder(photo, size)
      },
        e("span", { className: "order-btn-label" }, "Order print"),
        e("span", { className: "order-btn-meta" }, cur.label + " \xb7 ₪" + cur.price)
      ),
      e("div", { className: "order-note" }, "UNFRAMED · ARCHIVAL FINE-ART PAPER · SIGNED")
    )
  );
}

function AboutFooter() {
  return e("section", { className: "about" },
    e("div", { className: "about-rule" }),
    e("p", { className: "about-paragraph" },
      "“These prints are pieces of journeys — Nepal at dawn, Thailand under monsoon, deserts I came back from changed. Each is printed on archival fine-art paper and signed.”"
    ),
    e("div", { className: "about-sign" }, "— Dvir Shindler"),
    e("div", { className: "footer-rule" }),
    e("footer", { className: "footer" },
      e("div", { className: "footer-left" },
        e("a", { href: "https://www.instagram.com/dvirscamera/", target: "_blank", rel: "noopener noreferrer" }, "INSTAGRAM"),
        e("span", { className: "footer-dot" }, "\xb7"),
        e("span", null, "DVIRSCAMERA.COM")
      ),
      e("div", { className: "footer-right" }, "\xa9 2026 DVIR SHINDLER \xb7 ALL RIGHTS RESERVED")
    )
  );
}

function CustomCursor() {
  const ref = useRef(null);
  const [mode, setMode] = useState("default");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy, rafId;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      cx = lerp(cx, tx, 0.14);
      cy = lerp(cy, ty, 0.14);
      el.style.transform = "translate(" + cx + "px," + cy + "px)";
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    const onMove = ev => {
      tx = ev.clientX; ty = ev.clientY;
      const t = ev.target;
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
  return e("div", { ref, className: cn("cursor", "cursor--" + mode), "aria-hidden": "true" },
    e("span", { className: "cursor-plus" }, "+"),
    e("span", { className: "cursor-arrow" }, "↗"),
    e("span", { className: "cursor-dot" })
  );
}

function AllGalleryWalk({ photos, allPhotos, series, onPickPhoto, onEnterSeries }) {
  const trackRef = useRef(null);
  const [progress, setProgress] = useState({ idx: 1, total: photos.length });
  const [reduced, setReduced]   = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", () => setReduced(mq.matches));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) return;
    let vel = 0, rafId;
    const decay = 0.88;
    const animate = () => {
      if (Math.abs(vel) > 0.3) { el.scrollLeft += vel; vel *= decay; rafId = requestAnimationFrame(animate); }
      else vel = 0;
    };
    const onWheel = ev => {
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
        ev.preventDefault();
        vel += ev.deltaY * 1.2;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); cancelAnimationFrame(rafId); };
  }, [reduced]);

  useEffect(() => {
    const onKey = ev => {
      if (!trackRef.current) return;
      if (ev.key === "ArrowRight") trackRef.current.scrollBy({ left:  window.innerWidth * 0.5, behavior: "smooth" });
      if (ev.key === "ArrowLeft")  trackRef.current.scrollBy({ left: -window.innerWidth * 0.5, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll(".walk-item"));
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("walk-item--in");
          const i = Number(en.target.dataset.idx);
          setProgress(p => ({ ...p, idx: Math.max(p.idx, i + 1) }));
        }
      });
    }, { root: el, threshold: 0.4 });
    items.forEach((it, i) => { it.style.transitionDelay = (i % 6) * 60 + "ms"; obs.observe(it); });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (trackRef.current) trackRef.current.scrollTo({ left: 0, behavior: "auto" });
    setProgress({ idx: 1, total: photos.length });
  }, [photos.length]);

  return e("section", { className: "walk" },
    e("aside", { className: "walk-rail" },
      e("div", { className: "rail-row rail-row--active" },
        e("span", { className: "rail-dot" }),
        e("span", { className: "rail-name" }, "The Archive"),
        e("span", { className: "rail-count" },
          String(progress.idx).padStart(2, "0") + " / " + String(photos.length).padStart(2, "0")
        )
      ),
      series.map(s =>
        e("button", { key: s.id, className: "rail-row rail-row--other", onClick: () => onEnterSeries(s.id) },
          e("span", { className: "rail-dot rail-dot--ghost" }),
          e("span", { className: "rail-name" }, s.name)
        )
      )
    ),
    e("div", { className: "walk-room-label" },
      "THE ARCHIVE  \xb7  ALL " + photos.length + " PRINTS  \xb7  RANDOMIZED"
    ),
    e("div", { className: "walk-hint" }, "↔   scroll horizontally"),
    e("div", { className: "walk-track", ref: trackRef },
      e("div", { className: "walk-opener" },
        e("div", { className: "walk-opener-num" }, "THE ARCHIVE"),
        e("div", { className: "walk-opener-name" }, "All Prints"),
        e("div", { className: "walk-opener-line" }),
        e("div", { className: "walk-opener-blurb" }, "Every photograph from Adventure, Escape, and Story — shuffled."),
        e("div", { className: "walk-opener-meta" }, "NEPAL \xb7 THAILAND \xb7 SRI LANKA \xb7 ISRAEL")
      ),
      photos.map((p, i) => {
        const code = getCode(allPhotos, p);
        return e("div", {
          key: p.src + i,
          className: cn("walk-item", "walk-item--" + p.orientation),
          "data-idx": i
        },
          e("button", {
            className: cn("walk-photo", p.sold && "walk-photo--sold"),
            onClick: () => onPickPhoto(p)
          },
            e("img", { src: p.src, alt: p.title, loading: "lazy", draggable: "false" }),
            p.sold ? e("span", { className: "sold-overlay" }, "SOLD") : null,
            e("div", { className: "photo-shield" })
          ),
          e("div", { className: "placard" },
            e("span", { className: "placard-code" }, code),
            e("div", { className: cn("placard-title", p.sold && "placard-title--sold") }, p.title),
            e("div", { className: "placard-meta" }, p.year + (p.country ? " \xb7 " + p.country : "")),
            e("button", { className: "placard-link", onClick: () => onPickPhoto(p) },
              p.sold ? "Sold \xb7 edition closed" : "View print →"
            )
          ),
          e("div", { className: "walk-num" },
            "№ " + String(i + 1).padStart(2, "0") + " / " + String(photos.length).padStart(2, "0")
          )
        );
      }),
      e("div", { className: "walk-end" },
        e("div", { className: "walk-end-eyebrow" }, "END OF"),
        e("div", { className: "walk-end-name" }, "The Archive"),
        e("div", { className: "walk-end-rule" }),
        e("div", { className: "walk-end-doors" },
          series.map((s, i) =>
            e("button", { key: s.id, className: "walk-end-door", onClick: () => onEnterSeries(s.id) },
              e("span", { className: "walk-end-arrow" }, i === 0 ? "←" : "→"),
              e("span", { className: "walk-end-door-name" }, s.name),
              e("span", { className: "walk-end-door-meta" }, photosOf(allPhotos, s.id).length + " prints")
            )
          )
        )
      )
    ),
    e("div", { className: "walk-progress" },
      e("div", { className: "walk-progress-num" },
        String(progress.idx).padStart(2, "0") + " / " + String(photos.length).padStart(2, "0")
      ),
      e("div", { className: "walk-progress-track" },
        e("div", {
          className: "walk-progress-fill",
          style: { width: ((progress.idx / photos.length) * 100) + "%" }
        })
      )
    )
  );
}

function OrderField({ label, children }) {
  return e("div", { className: "of-field" },
    e("label", { className: "of-label" }, label),
    children
  );
}

function OrderForm({ photo, sizeIdx, allPhotos, allSeries, onClose }) {
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]         = useState("");
  const [email,           setEmail]            = useState("");
  const [phone,           setPhone]            = useState("");
  const [whiteBorder,     setWhiteBorder]      = useState(false);
  const [specialRequests, setSpecialRequests]  = useState("");
  const [phase,           setPhase]            = useState("form"); // "form"|"submitting"|"success"

  const photoCode  = getCode(allPhotos, photo);
  const size       = SIZES[sizeIdx];
  const series     = seriesById(allSeries, photo.series);
  const borderCm    = size.h / 20;
  const borderCmStr = (borderCm % 1 === 0 ? borderCm.toFixed(0) : borderCm.toFixed(1));
  const dominant    = photo.orientation === "landscape" ? size.h : size.w;
  const borderPct   = ((borderCm / dominant) * 100).toFixed(2) + "%";
  const BIT_URL     = "https://www.bitpay.co.il/app/me/C2EE9C41-8846-5F01-BECB-DFB850342E76EDDC";
  const qrSrc       = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data="
                    + encodeURIComponent(BIT_URL);
  const isMobile    = typeof navigator !== "undefined"
                    && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    const onKey = ev => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = ev => {
    ev.preventDefault();
    setPhase("submitting");
    fetch(FORM_ACTION, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        "First Name":      firstName,
        "Last Name":       lastName,
        "Email":           email,
        "Phone":           phone,
        "Photo":           photoCode + " — " + photo.title,
        "Size":            size.label,
        "Price":           "₪" + size.price,
        "White Border":    whiteBorder ? ("Yes, " + borderCmStr + "cm") : "No",
        "Special Requests": specialRequests || "—",
      }),
    })
    .finally(() => setPhase("success"));
  };

  if (phase === “success”) {
    return e(“div”, { className: “of-overlay” },
      e(“button”, { className: “lb-close of-close”, onClick: onClose },
        e(“span”, { className: “lb-close-x” }, “\xd7”),
        e(“span”, { className: “lb-close-label” }, “CLOSE”)
      ),
      e(“div”, { className: “of-success” },
        e(“div”, { className: “of-success-eyebrow” }, “ORDER CONFIRMED”),
        e(“h1”, { className: “of-success-title” }, “Thank you.”),
        e(“p”, { className: “of-success-sub” },
          “Your order for “” + photo.title + “” [“ + photoCode + “] has been received. “
          + “We’ll confirm by email within 24 hours.”
        ),
        e(“div”, { className: “of-payment” },
          e(“div”, { className: “of-payment-eyebrow” }, “PAYMENT DUE”),
          e(“div”, { className: “of-payment-amount” }, “₪” + size.price),
          e(“div”, { className: “of-qr-wrap” },
            e(“img”, { src: qrSrc, alt: “Scan to open Bit”, width: 240, height: 240 })
          ),
          e(“p”, { className: “of-qr-hint” },
            isMobile
              ? “Tap to open Bit \xb7 send ₪” + size.price + “ \xb7 include your name as the note”
              : “Scan to open Bit on your phone \xb7 send ₪” + size.price + “ \xb7 include your name as the note”
          ),
          isMobile
            ? e(“a”, {
                className: “of-bit-btn”,
                href: BIT_URL,
                target: “_blank”,
                rel: “noopener noreferrer”
              }, “Open Bit “, e(“span”, { className: “arrow” }, “↗”))
            : null
        )
      )
    );
  }

  return e("div", { className: "of-overlay" },
    e("button", { className: "lb-close of-close", onClick: onClose },
      e("span", { className: "lb-close-x" }, "\xd7"),
      e("span", { className: "lb-close-label" }, "CLOSE")
    ),

    e("div", { className: "of-photo-panel" },
      e("div", {
        className: cn("of-photo-mat", whiteBorder && "of-photo-mat--bordered"),
        style: {
          "--border-pct": borderPct,
          aspectRatio: photo.orientation === "portrait"
            ? size.w + " / " + size.h
            : size.h + " / " + size.w
        }
      },
        e("img", { src: photo.src, alt: photo.title, draggable: "false" }),
        e("div", { className: "photo-shield" })
      ),
      e("div", { className: "of-photo-info" },
        e("span", { className: "of-photo-code" }, photoCode),
        e("span", { className: "of-photo-title" }, photo.title),
        e("span", { className: "of-photo-size" }, size.label + " \xb7 ₪" + size.price)
      )
    ),

    e("div", { className: "of-form-panel" },
      e("div", { className: "of-header" },
        e("div", { className: "of-eyebrow" }, "PLACE YOUR ORDER"),
        e("h1", { className: "of-title" }, "Reserve this print.")
      ),

      e("form", { className: "of-fields", onSubmit: handleSubmit },
        e("div", { className: "of-row" },
          e(OrderField, { label: "First name" },
            e("input", { className: "of-input", type: "text", required: true,
              value: firstName, onChange: ev => setFirstName(ev.target.value) })
          ),
          e(OrderField, { label: "Last name" },
            e("input", { className: "of-input", type: "text", required: true,
              value: lastName, onChange: ev => setLastName(ev.target.value) })
          )
        ),
        e(OrderField, { label: "Email" },
          e("input", { className: "of-input", type: "email", required: true,
            value: email, onChange: ev => setEmail(ev.target.value) })
        ),
        e(OrderField, { label: "Phone" },
          e("input", { className: "of-input", type: "tel", required: true,
            value: phone, onChange: ev => setPhone(ev.target.value) })
        ),

        e("div", { className: "of-field" },
          e("label", { className: "of-label" }, "White border"),
          e("div", { className: "of-toggle" },
            e("button", { type: "button",
              className: cn("of-toggle-btn", !whiteBorder && "of-toggle-btn--on"),
              onClick: () => setWhiteBorder(false) }, "No"),
            e("button", { type: "button",
              className: cn("of-toggle-btn", whiteBorder && "of-toggle-btn--on"),
              onClick: () => setWhiteBorder(true) }, "Yes")
          ),
          e("p", { className: "of-toggle-hint" },
            whiteBorder
              ? "White mat added — preview updated on the left"
              : "Print fills the paper edge to edge"
          )
        ),

        e(OrderField, { label: "Special requests" },
          e("textarea", { className: "of-input of-textarea", rows: 3,
            placeholder: "Anything we should know…",
            value: specialRequests, onChange: ev => setSpecialRequests(ev.target.value) })
        ),

        e("button", { type: "submit", className: "of-submit", disabled: phase === "submitting" },
          phase === "submitting"
            ? "Sending…"
            : e(React.Fragment, null,
                e("span", { className: "order-btn-label" }, "Place order"),
                e("span", { className: "order-btn-meta" }, size.label + " \xb7 ₪" + size.price)
              )
        )
      )
    )
  );
}

function App() {
  const [data, setData]         = useState(null);
  const [phase, setPhase]       = useState("doors");
  const [seriesId, setSeriesId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [order,    setOrder]    = useState(null); // { photo, sizeIdx }
  const [veil, setVeil]         = useState(null); // null | "in" | "out"
  const [shuffled, setShuffled] = useState([]);

  useEffect(() => {
    fetch("/data/prints.json")
      .then(r => r.json())
      .then(d => {
        setData(d);
        setShuffled(shuffleArray(d.photos));
        const b = document.getElementById("boot");
        if (b) { b.classList.add("boot--gone"); setTimeout(() => b.remove(), 800); }
      });
  }, []);

  // Wheel/swipe down on landing → white fade → archive walk
  useEffect(() => {
    if (phase !== "doors") return;
    let triggered = false;
    let touchStartY = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setVeil("in");
      setTimeout(() => {
        setPhase("all");
        history.pushState({ phase: "all" }, "", "#all");
        window.scrollTo({ top: 0, behavior: "auto" });
        setVeil("out");
        setTimeout(() => setVeil(null), 380);
      }, 380);
    };

    const onWheel      = ev => { if (ev.deltaY > 30) trigger(); };
    const onTouchStart = ev => { touchStartY = ev.touches[0].clientY; };
    const onTouchEnd   = ev => { if (touchStartY - ev.changedTouches[0].clientY > 50) trigger(); };

    window.addEventListener("wheel",      onWheel,      { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend",   onTouchEnd);
    };
  }, [phase]);

  // Browser back button
  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) {
        setPhase("doors"); setSeriesId(null); setLightbox(null);
      } else if (hash === "all") {
        setPhase("all"); setSeriesId(null); setLightbox(null);
      } else if (["adventure", "escape", "story"].includes(hash)) {
        setSeriesId(hash); setPhase("walk"); setLightbox(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!data) return null;

  const enterSeries = id => {
    setSeriesId(id); setPhase("walk");
    history.pushState({ phase: "walk", id }, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const goHome = () => {
    setPhase("doors"); setSeriesId(null); setLightbox(null);
    history.pushState({ phase: "doors" }, "", "#");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return e("div", { className: "app" },
    e(Grain, null),
    e(CustomCursor, null),
    e(TopBar, { onHome: goHome }),
    veil ? e("div", { className: "veil veil--" + veil }) : null,
    phase === "doors" ? e(ThreeDoors, {
      series: data.series,
      photos: data.photos,
      onEnter: enterSeries
    }) : null,
    phase === "walk" && seriesId ? e(React.Fragment, null,
      e(GalleryWalk, {
        seriesId,
        series: data.series,
        photos: data.photos,
        onPickPhoto: p => setLightbox(p),
        onSwitchSeries: id => enterSeries(id),
        onJumpSeries: id => enterSeries(id)
      }),
      e(AboutFooter, null)
    ) : null,
    phase === "all" ? e(React.Fragment, null,
      e(AllGalleryWalk, {
        photos: shuffled,
        allPhotos: data.photos,
        series: data.series,
        onPickPhoto: p => setLightbox(p),
        onEnterSeries: id => enterSeries(id)
      }),
      e(AboutFooter, null)
    ) : null,
    lightbox ? e(Lightbox, {
      photo: lightbox,
      allPhotos: data.photos,
      allSeries: data.series,
      onClose: () => setLightbox(null),
      onPickPhoto: p => setLightbox(p),
      onOrder: (photo, sizeIdx) => { setLightbox(null); setOrder({ photo, sizeIdx }); }
    }) : null,
    order ? e(OrderForm, {
      photo: order.photo,
      sizeIdx: order.sizeIdx,
      allPhotos: data.photos,
      allSeries: data.series,
      onClose: () => setOrder(null)
    }) : null
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(e(App, null));
