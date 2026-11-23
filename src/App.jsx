
import { useEffect, useState } from "react";
import Registration from "./Registration";
import Admin from "./Admin";
import { BrochurePage, EventsPage, ResultsPage } from "./FestivalPages";

const REGISTRATION_DEADLINE = new Date(
  "2026-11-29T23:59:00+05:30"
).getTime();

const actions = [
  {
    number: "01",
    title: "Student Registration",
    subtitle: "Be part of the celebration",
    icon: "↗",
    href: "#register",
    theme: "register",
  },
  {
    number: "02",
    title: "Download Brochure",
    subtitle: "Discover the festival",
    icon: "↓",
    href: "#brochure",
    theme: "dark",
  },
  {
    number: "03",
    title: "Explore Events",
    subtitle: "Discover competitions",
    icon: "✦",
    href: "#events",
    theme: "light",
  },
  {
    number: "04",
    title: "Results & Points",
    subtitle: "View the leaderboard",
    icon: "🏆",
    href: "#results",
    theme: "dark",
  },
];

export default function App() {
 
const [showAdmin, setShowAdmin] = useState(false);

const [activePage, setActivePage] = useState(() => {
  const page = window.location.hash.replace("#", "");

  return ["register", "brochure", "events", "results"].includes(page)
    ? page
    : "home";
});

const navigate = (page) => {
  window.history.pushState(null, "", `#${page}`);
  setActivePage(page);
};

useEffect(() => {
  const handleBack = () => {
    const page = window.location.hash.replace("#", "");

    setActivePage(
      ["register", "brochure", "events", "results"].includes(page)
        ? page
        : "home"
    );
  };

  window.addEventListener("popstate", handleBack);

  return () => window.removeEventListener("popstate", handleBack);
}, []);
  const [registrationOpen, setRegistrationOpen] = useState(
    () => Date.now() <= REGISTRATION_DEADLINE
  );

  useEffect(() => {
    const remaining = REGISTRATION_DEADLINE - Date.now();

    if (remaining <= 0) {
      setRegistrationOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      setRegistrationOpen(false);
    }, remaining + 1);

    return () => clearTimeout(timer);
  }, []);

  // Mouse-following golden light
  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    e.currentTarget.style.setProperty("--glow-x", `${x}px`);
    e.currentTarget.style.setProperty("--glow-y", `${y}px`);
  };
if (showAdmin) {
  return <Admin onBack={() => setShowAdmin(false)} />;
}

  if (activePage === "brochure") {
    return <BrochurePage onBack={() => navigate("home")} />;
  }

  if (activePage === "events") {
    return <EventsPage onBack={() => navigate("home")} />;
  }

  if (activePage === "results") {
    return <ResultsPage onBack={() => navigate("home")} />;
  }

  if (activePage === "register") {
  return <Registration />;
}

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f7ef] text-[#173d32]">

      <style>{`
        * {
          box-sizing: border-box;
        }

        /* PREMIUM IVORY BACKGROUND */
        .premium-bg {
          background-image:
            radial-gradient(
              ellipse at 85% 12%,
              rgba(181,139,67,0.11),
              transparent 32%
            ),
            radial-gradient(
              ellipse at 5% 75%,
              rgba(23,75,61,0.06),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #fbfaf4 0%,
              #f5f2e8 50%,
              #faf8f0 100%
            );
        }

        /* AMBIENT DECORATION */
        .ambient-orb {
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(181,139,67,0.10),
            transparent 70%
          );
          pointer-events: none;
        }

        /* HERO REVEAL */
        @keyframes heroReveal {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-reveal {
          animation: heroReveal 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .hero-delay-1 {
          animation-delay: 100ms;
        }

        .hero-delay-2 {
          animation-delay: 220ms;
        }

        .hero-delay-3 {
          animation-delay: 340ms;
        }

        /* PREMIUM 3D CARD UNFOLD */
        @keyframes cardUnfold {
          0% {
            opacity: 0;
            transform:
              perspective(1100px)
              rotateX(-18deg)
              scale(0.93)
              translateY(-20px);
          }

          65% {
            opacity: 1;
            transform:
              perspective(1100px)
              rotateX(3deg)
              scale(1.005)
              translateY(2px);
          }

          85% {
            transform:
              perspective(1100px)
              rotateX(-1deg)
              scale(1)
              translateY(0);
          }

          100% {
            opacity: 1;
            transform: none;
          }
        }

        .card-reveal {
          opacity: 0;
          perspective: 1100px;
          transform-origin: top center;
          backface-visibility: hidden;

          animation-name: cardUnfold;
          animation-duration: 1250ms;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-fill-mode: both;
        }

        /* CARD INTERACTION */
        .card-interactive {
          position: relative;
          isolation: isolate;

          transition:
            transform 350ms ease,
            box-shadow 350ms ease,
            border-color 350ms ease;
        }

        /* MOUSE FOLLOWING GOLDEN LIGHT */
        .card-light-follow::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          border-radius: inherit;

          background: radial-gradient(
            210px circle at var(--glow-x, 50%) var(--glow-y, 50%),
            rgba(255, 226, 157, 0.25),
            rgba(218, 177, 96, 0.10) 38%,
            transparent 72%
          );

          opacity: 0;
          transition: opacity 350ms ease;
        }

        /* GOLDEN BORDER GLOW */
        @media (hover: hover) and (pointer: fine) {
          .card-light-follow:hover::after {
            opacity: 1;
          }

          .card-interactive:not(.registration-closed):hover {
            transform: translateY(-6px) scale(1.008);

            border-color: rgba(201, 164, 91, 0.85);

            box-shadow:
              0 0 0 1px rgba(181, 139, 67, 0.16),
              0 0 18px rgba(181, 139, 67, 0.15),
              0 22px 38px rgba(23, 61, 50, 0.13),
              0 7px 14px rgba(23, 61, 50, 0.06);
          }

          .card-interactive:not(.registration-closed):hover .card-icon {
            transform: translateY(-3px) rotate(-3deg) scale(1.06);
          }

          .card-interactive:not(.registration-closed):hover .card-arrow {
            transform: translateX(5px);
          }
        }

        /* ICON */
        .card-icon {
          transition:
            transform 350ms ease,
            box-shadow 350ms ease;
        }

        /* ARROW */
        .card-arrow {
          transition: transform 300ms ease;
        }

        /* ANNIVERSARY PILL */
        .anniversary-pill {
          box-shadow: 0 5px 16px rgba(23,61,50,0.035);
        }

        /* FOOTER */
        .footer-line {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(181,139,67,0.55),
            transparent
          );
        }

        /* REDUCED MOTION */
        @media (prefers-reduced-motion: reduce) {
          .card-reveal,
          .hero-reveal {
            opacity: 1;
            animation: none;
            transform: none;
          }

          .card-interactive,
          .card-icon,
          .card-arrow {
            transition: none;
          }
        }
      `}</style>

      {/* BACKGROUND */}
      <div className="premium-bg absolute inset-0 z-0" />

      {/* COLLEGE BUILDING WATERMARK */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src="/college-building.png"
          alt=""
          aria-hidden="true"
          

className="absolute top-[27rem] -right-16 bottom-auto w-[100%] max-w-[900px] object-contain object-right opacity-[0.12] mix-blend-multiply sm:top-auto sm:bottom-4 sm:right-0 sm:w-[75%] sm:object-right-bottom md:w-[65%] lg:w-[60%]"


        />
      </div>

      {/* AMBIENT DECORATION */}
      <div className="ambient-orb -right-40 top-20 z-0" />
      <div className="ambient-orb -left-40 bottom-20 z-0" />

      {/* HEADER */}
      <header className="relative z-10 mx-auto max-w-7xl px-5 pt-6 sm:px-8 lg:px-12">

        <div className="flex items-center justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d9c9a8] bg-white/70 p-1.5 shadow-sm sm:h-16 sm:w-16">
              <img
                src="/college-logo.png"
                alt="College Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-xs font-black leading-snug tracking-wide text-[#173d32] sm:text-base">
                Madeenathul Uloom Arabic College, Pulikkal
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b58b43]" />

                <p className="text-[9px] font-semibold tracking-wide text-[#806d50] sm:text-xs">
                  Accredited by NAAC with A+ (CGPA 3.36)
                </p>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[9px] font-bold tracking-[0.2em] text-[#98743c]">
              ESTABLISHED
            </p>

            <p className="text-xl font-black text-[#174b3d]">
              1947
            </p>
          </div>

        </div>

        <div className="mt-6 footer-line" />
      </header>

      {/* MAIN HERO */}
      <section className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 items-center gap-12 overflow-x-clip px-5 py-12 sm:px-8 md:min-h-[76vh] md:grid-cols-[0.95fr_1.05fr] md:gap-10 lg:px-12 lg:py-16">

        {/* LEFT SIDE */}
        <div className="w-full min-w-0 max-w-xl">

          {/* ANNIVERSARY IDENTITY */}
          <div className="hero-reveal mb-9 flex items-center gap-4 sm:gap-5">

            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center sm:h-32 sm:w-32">
              <div className="absolute inset-0 rounded-full border border-[#d9c9a8]/70" />

              <img
                src="/anniversary-80.png"
                alt="80 Years of Excellence"
                className="relative h-[92%] w-[92%] object-contain"
              />
            </div>

            <div>
              <p className="text-[10px] font-black tracking-[0.24em] text-[#a45a31] sm:text-xs">
                CELEBRATING
              </p>

              <h2 className="mt-1 text-3xl font-black leading-none tracking-tight text-[#9c321b] sm:text-4xl">
                80 YEARS
              </h2>

              <p className="mt-2 text-[10px] font-bold tracking-[0.12em] text-[#76503c] sm:text-xs">
                A LEGACY OF EXCELLENCE
              </p>

              <p className="mt-1 text-[9px] font-semibold tracking-widest text-gray-500">
                SINCE 1947
              </p>
            </div>

          </div>

          {/* FESTIVAL LABEL */}
          <div className="hero-reveal hero-delay-1 mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-[#b58b43]" />

            <span className="text-[9px] font-black tracking-[0.2em] text-[#98743c] sm:text-xs">
              THE GRAND LITERARY CELEBRATION · 2026
            </span>
          </div>

          {/* MAIN TITLE */}
          <div className="hero-reveal hero-delay-1">

           
<h1 className="text-[clamp(2.8rem,7vw,6rem)] font-black leading-[1.02] tracking-[-0.055em] text-[#173d32]">
 
  MCC
  <br />

  <span className="text-[#174b3d]">
    LITERATURE
  </span>

  <br />

  FESTIVAL<span className="text-[#b58b43]">.</span>
</h1>

          </div>

          {/* SUPPORTED BY */}
          <div className="hero-reveal hero-delay-2 mt-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#98743c] sm:text-[10px]">
              SUPPORTED BY
            </p>

            <p className="mt-1 text-sm font-bold tracking-wide text-[#174b3d] sm:text-base">
              Families of MCC Brothers
            </p>
          </div>

          {/* GOLD DECORATIVE LINE */}
          <div className="hero-reveal hero-delay-2 mt-6 flex items-center gap-3">
            <span className="h-[3px] w-14 rounded-full bg-[#b58b43]" />
            <span className="h-[3px] w-5 rounded-full bg-[#d9c9a8]" />
            <span className="h-[3px] w-2 rounded-full bg-[#d9c9a8]" />
          </div>

          {/* TAGLINE */}
          <div className="hero-reveal hero-delay-3">
            <h2 className="mb-4 mt-7 max-w-lg text-xl font-semibold leading-snug text-[#98743c] sm:text-2xl">
              Celebrating Knowledge, Creativity and Excellence.
            </h2>
          </div>

          {/* ANNIVERSARY PILL */}
          <div className="anniversary-pill hero-reveal hero-delay-3 mt-6 inline-flex max-w-full flex-col items-center gap-1 rounded-full border border-[#d9c9a8] bg-white/70 px-5 py-3 sm:px-6">

            <p className="text-center text-[10px] font-semibold tracking-wide text-[#173d32] sm:text-xs">
              PART OF THE COLLEGE'S 80TH ANNIVERSARY
            </p>

            <p className="text-center text-[10px] font-bold tracking-wide text-[#173d32] sm:text-xs">
              2026 DECEMBER 9, 10, 11, 12, 13 · MCC NAGAR, PULIKKAL
            </p>

          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="mx-auto w-full min-w-0 max-w-lg">

          {/* REGISTRATION DEADLINE */}
          <div className="mb-6 px-1">

            <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#98743c]">
              <span>◷</span>
              REGISTRATION DEADLINE
            </p>

            {registrationOpen ? (
              <p className="text-base font-black tracking-wide text-[#174b3d] sm:text-lg">
                29 NOVEMBER 2026
                <span className="text-[#b58b43]"> | </span>
                11:59 PM
              </p>
            ) : (
              <p className="text-base font-black tracking-wide text-[#9c321b] sm:text-lg">
                REGISTRATION CLOSED
              </p>
            )}

          </div>

          {/* ACTION CARDS */}
          <div className="w-full min-w-0 space-y-4">

            {actions.map((action, index) => {
              const isRegistration = action.theme === "register";
              const isClosed = isRegistration && !registrationOpen;

              return (
                <div
                  key={action.number}
                  className="card-reveal"
                  style={{
                    animationDelay: `${0.35 + index * 0.75}s`,
                  }}
                >

                  <a
                    href={isClosed ? undefined : action.href}
                    aria-disabled={isClosed}
                    onClick={(e) => {
                      if (isClosed) {
                        e.preventDefault();
                        return;
                      }
                      if (isRegistration) {
  e.preventDefault();
  navigate("register");
} else if (action.number === "02") {
  e.preventDefault();
  navigate("brochure");
} else if (action.number === "03") {
  e.preventDefault();
  navigate("events");
} else if (action.number === "04") {
  e.preventDefault();
  navigate("results");
}
                    }}
                    onMouseMove={handleCardMouseMove}
                    className={`card-interactive card-light-follow group relative flex w-full min-w-0 items-center gap-4 overflow-hidden rounded-2xl border p-4 sm:gap-5 sm:p-6 ${
                      isClosed
                        ? "registration-closed cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500"
                        : action.theme === "dark"
                        ? "border-[#376657] bg-gradient-to-br from-[#205747] via-[#174b3d] to-[#10392f] text-white shadow-[0_10px_25px_rgba(23,61,50,0.14)]"
                        : action.theme === "register"
                        ? "border-[#b58b43] bg-gradient-to-br from-[#e2cc9c] via-[#c6a66b] to-[#b58b43] text-[#173d32] shadow-[0_12px_28px_rgba(137,100,44,0.17)]"
                        : "border-[#e5dcc9] bg-gradient-to-br from-[#fffefb] via-[#f7f3e9] to-[#eee8d9] text-[#173d32] shadow-[0_10px_24px_rgba(23,61,50,0.07)]"
                    }`}
                  >

                    {/* TOP LIGHT REFLECTION */}
                    {!isClosed && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-white/70" />
                    )}

                    {/* SOFT CARD GLOW */}
                    {!isClosed && (
                      <div className="pointer-events-none absolute -right-10 -top-10 z-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    )}

                    {/* ICON */}
                    <div
                      className={`card-icon relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold shadow-inner sm:h-16 sm:w-16 ${
                        action.theme === "dark" && !isClosed
                          ? "bg-white/10 text-white ring-1 ring-white/10"
                          : "bg-white/50 text-[#173d32] ring-1 ring-white/50"
                      }`}
                    >
                      {isClosed ? "🔒" : action.icon}
                    </div>

                    {/* CARD TEXT */}
                    <div className="relative z-10 min-w-0 flex-1">

                      <p className="mb-1 text-[9px] font-black tracking-[0.22em] opacity-60">
                        {action.number}
                      </p>

                      <h3 className="text-base font-bold tracking-tight sm:text-lg">
                        {isClosed
                          ? "Registration Closed"
                          : action.title}
                      </h3>

                      <p className="mt-1 text-xs opacity-70">
                        {isClosed
                          ? "Registration deadline has passed"
                          : action.subtitle}
                      </p>

                    </div>

                    {/* ARROW */}
                    <span className="card-arrow relative z-10 text-2xl">
                      {isClosed ? "×" : "↗"}
                    </span>

                  </a>
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* FOOTER */}
<footer className="relative z-20 border-t border-[#d6c9ae] bg-[#eee9dc] px-5 py-7 sm:px-8">

  <div className="mx-auto max-w-7xl text-center">

    <p className="text-[12px] font-bold tracking-wide text-[#173d32]">
  Designed by Navas Kolathikkal
</p>

<button
  onClick={() => setShowAdmin(true)}
  className="mt-3 text-xs font-semibold text-[#98743c] underline"
>
  Admin Login
</button>

<p className="mt-2 text-[10px] font-medium tracking-wide text-[#665b49]">
  © 2026 MCC LITERATURE FESTIVAL. All rights reserved.
</p>

  </div>
</footer>

    </main>
  );
}
