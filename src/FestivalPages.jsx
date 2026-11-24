import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const shell = "min-h-screen bg-[#f8f7ef] text-[#173d32]";
const gold = "#b58b43";

function PageHeader({ title, subtitle, onBack }) {
  return (
    <header className="mx-auto max-w-7xl px-5 pt-6 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d9c9a8] bg-white/70 p-1.5 shadow-sm sm:h-16 sm:w-16">
            <img src="/college-logo.png" alt="College Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-black leading-snug tracking-wide text-[#173d32] sm:text-base">
              Madeenathul Uloom Arabic College, Pulikkal
            </h2>
            <p className="mt-1 text-[9px] font-semibold tracking-wide text-[#806d50] sm:text-xs">
              Accredited by NAAC with A+ (CGPA 3.36)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-full border border-[#b58b43] px-4 py-2 text-xs font-bold text-[#173d32] transition hover:bg-[#173d32] hover:text-white sm:px-5 sm:py-3 sm:text-sm"
        >
          ← Back to Home
        </button>
      </div>
      <div className="mt-6 h-px bg-gradient-to-r from-transparent via-[#b58b43]/70 to-transparent" />
      <div className="py-8 sm:py-10">
        <p className="text-[10px] font-black tracking-[0.22em] text-[#98743c] sm:text-xs">
          MCC LITERATURE FESTIVAL 2026
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#173d32] sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-[#756b59] sm:text-base">{subtitle}</p>}
      </div>
    </header>
  );
}

function PageFooter() {
  return (
    <footer className="mt-12 border-t border-[#d6c9ae] bg-[#eee9dc] px-5 py-6 text-center">
      <p className="text-xs font-bold text-[#173d32]">Madeenathul Uloom Arabic College, Pulikkal</p>
      <p className="mt-2 text-[10px] text-[#665b49]">© 2026 MCC Literature Festival. All rights reserved.</p>
    </footer>
  );
}

function PDFReader({ fileUrl }) {
  const containerRef = useRef(null);
  const canvasRefs = useRef([]);
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const task = pdfjsLib.getDocument({ url: fileUrl });

    task.promise
      .then((document) => {
        if (cancelled) {
          document.destroy();
          return;
        }
        setPdf(document);
        setNumPages(document.numPages);
        setLoading(false);
      })
      .catch((error) => {
  console.error("PDF loading error:", error);

  if (!cancelled) {
    setError(error?.message || "Unknown PDF loading error");
    setLoading(false);
  }
});

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdf || !containerRef.current) return;

    let cancelled = false;

    const renderPages = async () => {
      const containerWidth = containerRef.current.clientWidth - 16;
      const dpr = window.devicePixelRatio || 1;

      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        if (cancelled) return;

        const page = await pdf.getPage(pageNumber);
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth / originalViewport.width) * zoom;
        const viewport = page.getViewport({ scale });
        const renderViewport = page.getViewport({ scale: scale * dpr });

        const canvas = canvasRefs.current[pageNumber - 1];
        if (!canvas) continue;

        const context = canvas.getContext("2d");
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        await page.render({
          canvasContext: context,
          viewport: renderViewport,
        }).promise;
      }
    };

    renderPages().catch((err) => {
      if (!cancelled) console.error("PDF rendering error:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, numPages, zoom]);

  const handleScroll = () => {
    if (!containerRef.current) return;

    const pages = containerRef.current.querySelectorAll(".pdf-page");
    let closestPage = 1;
    let closestDistance = Infinity;

    pages.forEach((page, index) => {
      const distance = Math.abs(page.getBoundingClientRect().top - 160);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = index + 1;
      }
    });

    setCurrentPage(closestPage);
  };

  const goToPage = (pageNumber) => {
    const page = containerRef.current?.querySelector(
      `[data-page="${pageNumber}"]`
    );
    page?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d9c9a8] bg-[#202020] shadow-lg">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[75vh] min-h-[560px] overflow-auto px-2 py-4"
      >
        {loading && (
          <p className="py-12 text-center text-sm text-white">
            Loading brochure...
          </p>
        )}

        {error && (
          <p className="py-12 text-center text-sm text-red-300">{error}</p>
        )}

        {Array.from({ length: numPages }, (_, index) => (
          <div
            key={index}
            data-page={index + 1}
            className="pdf-page mb-4 flex justify-center"
          >
            <canvas
              ref={(element) => {
                canvasRefs.current[index] = element;
              }}
              className="max-w-none bg-white shadow-md"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-[#064334] px-3 py-3 text-white">
        <button
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg bg-white/10 px-3 py-2 disabled:opacity-30"
        >
          ←
        </button>

        <div className="flex items-center gap-2 text-sm font-bold">
          <span>Page</span>
          <input
            type="number"
            min="1"
            max={numPages}
            value={currentPage}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 1 && value <= numPages) goToPage(value);
            }}
            className="w-12 rounded bg-white px-1 py-1 text-center text-[#173d32]"
          />
          <span>/ {numPages || "—"}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))}
            className="rounded-lg bg-white/10 px-3 py-2"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => setZoom((value) => Math.min(2, value + 0.15))}
            className="rounded-lg bg-white/10 px-3 py-2"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => goToPage(numPages)}
            className="rounded-lg bg-white/10 px-3 py-2"
            aria-label="Last page"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrochurePage({ onBack }) {
  return (
    <main className={shell}>
      <PageHeader
        title="Festival Brochure"
        subtitle="Read the official MCC Literature Festival 2026 brochure or download the PDF."
        onBack={onBack}
      />
      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3d8c4] bg-white p-4 shadow-sm">
          <div>
            <p className="font-bold text-[#173d32]">MCC Literature Festival 2026</p>
            <p className="mt-1 text-xs text-[#756b59]">Official 8-page brochure · PDF</p>
          </div>
          <a
            href="/mcc-literature-festival-brochure-2026.pdf"
            download
            className="rounded-xl bg-[#173d32] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#245846]"
          >
            ↓ Download Brochure
          </a>
        </div>
        <PDFReader
  fileUrl="/mcc-literature-festival-brochure-2026.pdf"
/>
        
      </section>
      <PageFooter />
    </main>
  );
}

const competitions = [
  {
    number: "01",
    title: "MCC National Elocution",
    language: "Arabic",
    prizes: ["₹10,000", "₹5,000", "₹3,000"],
  },
  {
    number: "02",
    title: "Paper Presentation",
    language: "Arabic",
    prizes: ["₹5,000", "₹3,000", "₹2,000"],
  },
  {
    number: "03",
    title: "Vlog-Making",
    language: "Arabic",
    prizes: ["₹5,000", "₹3,000", "₹2,000"],
  },
  {
    number: "04",
    title: "Calligraphy",
    language: "Arabic",
    prizes: ["₹5,000", "₹3,000", "₹2,000"],
  },
  {
    number: "05",
    title: "Quiz",
    language: "General",
    prizes: ["₹5,000", "₹3,000", "₹2,000"],
    perTeam: true,
  },
];

export function EventsPage({ onBack }) {
  const setEventGlowPosition = (element, clientX, clientY) => {
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--event-glow-x", `${clientX - rect.left}px`);
    element.style.setProperty("--event-glow-y", `${clientY - rect.top}px`);
  };

  const handleEventTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    setEventGlowPosition(e.currentTarget, touch.clientX, touch.clientY);
    e.currentTarget.classList.add("event-touch-active");
  };

  const handleEventTouchMove = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    setEventGlowPosition(e.currentTarget, touch.clientX, touch.clientY);
  };

  const handleEventTouchEnd = (e) => {
    e.currentTarget.classList.remove("event-touch-active");
  };

  const prizeLabels = ["FIRST PRIZE", "SECOND PRIZE", "THIRD PRIZE"];
  const prizeStyles = [
    {
      rank: "01",
      label: "FIRST",
      frame: "border-[#c7a45e] bg-gradient-to-br from-[#fff8e7] via-[#f8edcf] to-[#ead6a8]",
      medal: "bg-[#b58b43] text-white",
      amount: "text-[#173d32]",
    },
    {
      rank: "02",
      label: "SECOND",
      frame: "border-[#d9d9d2] bg-gradient-to-br from-white to-[#eeeee9]",
      medal: "bg-[#7d8982] text-white",
      amount: "text-[#173d32]",
    },
    {
      rank: "03",
      label: "THIRD",
      frame: "border-[#d9b99a] bg-gradient-to-br from-[#fff8f1] to-[#f0dfce]",
      medal: "bg-[#a8734b] text-white",
      amount: "text-[#173d32]",
    },
  ];

  return (
    <main className={shell}>
      <style>{`
        .event-touch-card {
          position: relative;
          isolation: isolate;
          transition: transform 350ms ease, box-shadow 350ms ease, border-color 350ms ease;
        }

        .event-touch-card::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          border-radius: inherit;
          background: radial-gradient(
            220px circle at var(--event-glow-x, 50%) var(--event-glow-y, 50%),
            rgba(255, 226, 157, 0.26),
            rgba(218, 177, 96, 0.10) 38%,
            transparent 72%
          );
          opacity: 0;
          transition: opacity 300ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .event-touch-card:hover::after { opacity: 1; }
        }

        @media (hover: none) and (pointer: coarse) {
          .event-touch-card.event-touch-active {
            transform: translateY(-3px) scale(1.003);
            border-color: rgba(181, 139, 67, 0.9);
            box-shadow: 0 0 0 1px rgba(181, 139, 67, 0.16), 0 0 18px rgba(181, 139, 67, 0.15), 0 18px 34px rgba(23, 61, 50, 0.13);
          }

          .event-touch-card.event-touch-active::after { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .event-touch-card { transition: none; }
          .event-touch-card::after { transition: none; }
        }
      `}</style>
      <PageHeader
        title="Explore Events"
        subtitle="Five national-level competitions. Explore the events and their cash prizes."
        onBack={onBack}
      />

      <section className="mx-auto max-w-7xl px-5 pb-2 sm:px-8 lg:px-12">
        <div className="relative mb-7 overflow-hidden rounded-3xl border border-[#cdb783] bg-gradient-to-r from-[#123c31] via-[#1d5947] to-[#123c31] px-5 py-6 text-white shadow-[0_18px_45px_rgba(18,60,49,0.16)] sm:mb-9 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-[#d9bd7d]/20" />
          <div className="pointer-events-none absolute -right-1 top-0 h-40 w-40 rounded-full border border-[#d9bd7d]/20" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.28em] text-[#e8ce91] sm:text-xs">
                THE FESTIVAL LINE-UP
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Five competitions. One stage.
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-white/75 sm:text-sm">
                Discover the competitions and prize awards of MCC Literature Festival 2026.
              </p>
            </div>
            <div className="flex w-fit items-center gap-3 rounded-2xl border border-[#e8ce91]/30 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
              <span className="text-3xl font-black leading-none text-[#e8ce91]">05</span>
              <span className="text-[9px] font-bold uppercase leading-4 tracking-[0.18em] text-white/80">
                Featured<br />Competitions
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
          {competitions.map((event, eventIndex) => (
            <article
              key={event.number}
              onTouchStart={handleEventTouchStart}
              onTouchMove={handleEventTouchMove}
              onTouchEnd={handleEventTouchEnd}
              onTouchCancel={handleEventTouchEnd}
              className="event-touch-card group relative isolate overflow-hidden rounded-[1.6rem] border border-[#dfd2b8] bg-[#fffefa] shadow-[0_10px_30px_rgba(23,61,50,0.07)] transition-all duration-500 hover:-translate-y-1 hover:border-[#b58b43]/70 hover:shadow-[0_20px_42px_rgba(23,61,50,0.13)]"
            >
              <div className="relative z-10 overflow-hidden bg-gradient-to-br from-[#205747] via-[#174b3d] to-[#10392f] px-5 py-5 text-white sm:px-6 sm:py-6">
                <div className="pointer-events-none absolute -right-5 -top-10 select-none text-[8rem] font-black leading-none text-white/[0.045] transition-transform duration-700 group-hover:scale-110">
                  {event.number}
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#e5c98f]/70 to-transparent" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-[#e5c98f]/40 bg-[#e5c98f]/10 px-2 text-[10px] font-black tracking-wider text-[#f0d99f]">
                        {event.number}
                      </span>
                      <p className="text-[9px] font-black tracking-[0.22em] text-[#e5c98f] sm:text-[10px]">
                        COMPETITION
                      </p>
                    </div>
                    <h2 className="mt-3 text-xl font-black leading-tight tracking-tight sm:text-2xl">
                      {event.title}
                    </h2>
                    <p className="mt-1.5 text-xs font-semibold tracking-wide text-white/65 sm:text-sm">
                      {event.language}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e5c98f]/30 bg-white/[0.07] text-lg text-[#e5c98f] shadow-inner sm:h-12 sm:w-12">
                    {eventIndex === 0 ? "✦" : eventIndex === 1 ? "✎" : eventIndex === 2 ? "▶" : eventIndex === 3 ? "✒" : "♛"}
                  </div>
                </div>
              </div>

              <div className="relative z-10 p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black tracking-[0.24em] text-[#98743c]">
                      AWARDS & RECOGNITION
                    </p>
                    <h3 className="mt-1 text-sm font-extrabold tracking-wide text-[#173d32] sm:text-base">
                      Cash Prizes
                    </h3>
                  </div>
                  {event.perTeam && (
                    <span className="rounded-full border border-[#d8c28f] bg-[#f8f0dc] px-3 py-1.5 text-[9px] font-black tracking-[0.12em] text-[#80612f]">
                      PER TEAM
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {event.prizes.map((prize, index) => {
                    const style = prizeStyles[index];
                    return (
                      <div
                        key={prizeLabels[index]}
                        className={`relative flex min-w-0 flex-col items-center justify-center rounded-2xl border px-2 py-4 text-center transition-transform duration-300 group-hover:translate-y-[-2px] sm:py-5 ${style.frame}`}
                      >
                        <span className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black shadow-sm ${style.medal}`}>
                          {style.rank}
                        </span>
                        <p className="text-[8px] font-black tracking-[0.12em] text-[#806d50] sm:text-[9px]">
                          {style.label}
                        </p>
                        <p className={`mt-1.5 whitespace-nowrap text-sm font-black tracking-tight sm:text-lg ${style.amount}`}>
                          {prize}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-center gap-3 pb-2 text-center">
          <span className="h-px w-10 bg-[#cbb47f]" />
          <p className="text-[9px] font-black tracking-[0.22em] text-[#98743c]">
            MCC LITERATURE FESTIVAL 2026
          </p>
          <span className="h-px w-10 bg-[#cbb47f]" />
        </div>
      </section>

      <PageFooter />
    </main>
  );
}

const RESULT_EVENTS = [
  { id: "elocution", title: "MCC NATIONAL ELOCUTION (ARABIC)", language: "Arabic", icon: "🎙️" },
  { id: "paper-presentation", title: "PAPER PRESENTATION (ARABIC)", language: "Arabic", icon: "📄" },
  { id: "vlog-making", title: "VLOG-MAKING (ARABIC)", language: "Arabic", icon: "🎬" },
  { id: "calligraphy", title: "CALLIGRAPHY (ARABIC)", language: "Arabic", icon: "✒️" },
  { id: "quiz", title: "QUIZ COMPETITION (GENERAL)", language: "General", icon: "🧠" },
];

const RESULT_PLACES = [
  { key: "first", label: "FIRST PRIZE", rank: "01", medal: "bg-[#b58b43]", frame: "border-[#d8c18d] bg-gradient-to-br from-[#fff8e7] to-[#f1e2bd]" },
  { key: "second", label: "SECOND PRIZE", rank: "02", medal: "bg-[#7d8982]", frame: "border-[#d9ddd8] bg-gradient-to-br from-white to-[#eff1ed]" },
  { key: "third", label: "THIRD PRIZE", rank: "03", medal: "bg-[#a8734b]", frame: "border-[#dfc5ad] bg-gradient-to-br from-[#fff8f1] to-[#f1e2d5]" },
];

export function ResultsPage({ onBack }) {
  const [results, setResults] = useState({});
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "festivalResults"),
      (snapshot) => {
        const nextResults = {};
        snapshot.forEach((item) => {
          nextResults[item.id] = item.data();
        });
        setResults(nextResults);
        setLoadingResults(false);
        setResultsError("");
      },
      (error) => {
        console.error("Results loading error:", error);
        setResultsError("Results are temporarily unavailable. Please try again later.");
        setLoadingResults(false);
      }
    );
    return unsubscribe;
  }, []);

  const publishedEvents = RESULT_EVENTS.filter((event) => {
    const result = results[event.id];
    return result && result.published !== false && ["first", "second", "third"].some(
      (place) => result[place]?.name?.trim()
    );
  });

  return (
    <main className={shell}>
      <PageHeader
        title="Results & Points"
        subtitle="Official competition results of MCC Literature Festival 2026."
        onBack={onBack}
      />

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-12">
        <div className="mb-8 overflow-hidden rounded-3xl border border-[#cdb783] bg-gradient-to-r from-[#123c31] via-[#1d5947] to-[#123c31] px-6 py-7 text-white shadow-[0_18px_45px_rgba(18,60,49,0.14)] sm:px-9 sm:py-9">
          <p className="text-[10px] font-black tracking-[0.28em] text-[#e8ce91] sm:text-xs">
            OFFICIAL FESTIVAL ANNOUNCEMENTS
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Celebrating Excellence</h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-white/75 sm:text-sm">
                Recognizing the outstanding achievements of our participants across the festival competitions.
              </p>
            </div>
            <div className="w-fit rounded-2xl border border-[#e8ce91]/30 bg-white/[0.07] px-4 py-3">
              <p className="text-2xl font-black text-[#e8ce91]">{publishedEvents.length.toString().padStart(2, "0")} / 05</p>
              <p className="text-[9px] font-bold tracking-[0.16em] text-white/75">RESULTS PUBLISHED</p>
            </div>
          </div>
        </div>

        {loadingResults && (
          <div className="rounded-3xl border border-[#e2d7c2] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d9c9a8] border-t-[#173d32]" />
            <p className="mt-4 text-sm font-semibold text-[#756b59]">Loading official results...</p>
          </div>
        )}

        {!loadingResults && resultsError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
            {resultsError}
          </div>
        )}

        {!loadingResults && !resultsError && publishedEvents.length === 0 && (
          <div className="rounded-3xl border border-[#e2d7c2] bg-white px-6 py-12 text-center shadow-sm sm:px-10">
            <div className="text-5xl">🏆</div>
            <h2 className="mt-5 text-2xl font-black text-[#173d32]">Results Coming Soon</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#756b59]">
              The organizing committee has not published the competition results yet. Please visit this page again for official updates.
            </p>
          </div>
        )}

        {!loadingResults && !resultsError && publishedEvents.length > 0 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {publishedEvents.map((event) => {
              const result = results[event.id];
              return (
                <article key={event.id} className="overflow-hidden rounded-3xl border border-[#dfd2b8] bg-[#fffefa] shadow-[0_10px_30px_rgba(23,61,50,0.07)]">
                  <div className="flex items-center gap-4 bg-gradient-to-r from-[#205747] to-[#10392f] px-5 py-5 text-white sm:px-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e5c98f]/30 bg-white/[0.08] text-2xl">
                      {event.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black tracking-[0.2em] text-[#e5c98f]">OFFICIAL RESULTS</p>
                      <h2 className="mt-1 text-sm font-black leading-snug sm:text-base">{event.title}</h2>
                      <p className="mt-1 text-[10px] font-semibold text-white/65">{event.language}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    {RESULT_PLACES.map((place) => {
                      const winner = result[place.key];
                      return (
                        <div key={place.key} className={`rounded-2xl border p-4 text-center ${place.frame}`}>
                          <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${place.medal}`}>
                            {place.rank}
                          </span>
                          <p className="mt-2 text-[8px] font-black tracking-[0.13em] text-[#806d50]">
                            {place.label}
                          </p>
                          {winner?.name?.trim() ? (
                            <>
                              <p className="mt-2 break-words text-sm font-black leading-snug text-[#173d32]">
                                {winner.name}
                              </p>
                              {winner.college?.trim() && (
                                <p className="mt-1 break-words text-[10px] font-semibold leading-4 text-[#756b59]">
                                  {winner.college}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="mt-3 text-xs font-medium text-[#9b907d]">To be announced</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3 text-center">
          <span className="h-px w-10 bg-[#cbb47f]" />
          <p className="text-[9px] font-black tracking-[0.22em] text-[#98743c]">MCC LITERATURE FESTIVAL 2026</p>
          <span className="h-px w-10 bg-[#cbb47f]" />
        </div>
      </section>
      <PageFooter />
    </main>
  );
}
