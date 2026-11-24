import { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const ADMIN_UID = "DcLnjvKxAWNyOtycZSieSgImK0C3";

const EVENT_OPTIONS = [
  "MCC NATIONAL ELOCUTION (ARABIC)",
  "PAPER PRESENTATION (ARABIC)",
  "VLOG-MAKING (ARABIC)",
  "CALLIGRAPHY (ARABIC)",
  "QUIZ COMPETITION (GENERAL)",
];

const inputClass =
  "w-full rounded-xl border border-[#d8cfbd] bg-white px-4 py-3 text-sm text-[#173d32] outline-none focus:border-[#b58b43]";

const RESULT_EVENTS = [
  { id: "elocution", title: "MCC NATIONAL ELOCUTION (ARABIC)" },
  { id: "paper-presentation", title: "PAPER PRESENTATION (ARABIC)" },
  { id: "vlog-making", title: "VLOG-MAKING (ARABIC)" },
  { id: "calligraphy", title: "CALLIGRAPHY (ARABIC)" },
  { id: "quiz", title: "QUIZ COMPETITION (GENERAL)" },
];

const EMPTY_RESULT = {
  first: { name: "", college: "" },
  second: { name: "", college: "" },
  third: { name: "", college: "" },
};

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(rows) {
  const headers = [
    "Registration ID", "Name", "Email", "Mobile", "College", "University",
    "Department", "Course", "Year", "Events", "Paper Topic", "Vlog Link",
    "Quiz Team", "Second Member", "Second Member Mobile", "Paper Topic Status", "Vlog Link Status", "Status",
  ];

  const lines = rows.map((row) => [
    row.registrationId, row.name, row.email, row.mobile, row.college,
    row.university, row.department, row.course, row.year, row.events,
    row.paperTopic, row.vlogLink, row.quizTeam?.teamName,
    row.quizTeam?.member2Name, row.quizTeam?.member2Mobile,
    (row.events || []).includes("PAPER PRESENTATION (ARABIC)") ? (String(row.paperTopic || "").trim() ? "Submitted" : "Pending") : "Not Applicable",
    (row.events || []).includes("VLOG-MAKING (ARABIC)") ? (String(row.vlogLink || "").trim() ? "Submitted" : "Pending") : "Not Applicable",
    row.status,
  ].map(csvCell).join(","));

  const csv = "\uFEFF" + [headers.map(csvCell).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MCC-Literature-Fest-Registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadRegistrationBackup(rows) {
  const backup = {
    backupType: "MCC Literature Festival 2026 Registration Backup",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    totalRegistrations: rows.length,
    registrations: rows,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MCC-Literature-Fest-Registration-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Admin({ onBack }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All Events");
  const [detailsFilter, setDetailsFilter] = useState("All Details");
  const [results, setResults] = useState({});
  const [resultDrafts, setResultDrafts] = useState({});
  const [savingResult, setSavingResult] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || user.uid !== ADMIN_UID) {
      setRows([]);
      return;
    }

    let active = true;
    async function loadRegistrations() {
      setLoading(true);
      setError("");
      try {
        const registrationsQuery = query(
          collection(db, "registrations"),
          orderBy("submittedAt", "desc")
        );
        const snapshot = await getDocs(registrationsQuery);
        if (!active) return;
        setRows(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })));

        const resultSnapshot = await getDocs(collection(db, "festivalResults"));
        if (!active) return;
        const savedResults = {};
        const drafts = {};
        resultSnapshot.docs.forEach((item) => {
          const data = item.data();
          savedResults[item.id] = data;
          drafts[item.id] = {
            first: { ...EMPTY_RESULT.first, ...(data.first || {}) },
            second: { ...EMPTY_RESULT.second, ...(data.second || {}) },
            third: { ...EMPTY_RESULT.third, ...(data.third || {}) },
          };
        });
        RESULT_EVENTS.forEach(({ id }) => {
          if (!drafts[id]) drafts[id] = structuredClone(EMPTY_RESULT);
        });
        setResults(savedResults);
        setResultDrafts(drafts);
      } catch (err) {
        if (active) {
          setError(
            "Could not load registrations. Check that the Admin Firestore Rules are published and try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRegistrations();
    return () => { active = false; };
  }, [user]);

  const getPendingDetails = (row) => {
    const events = row.events || [];
    return {
      paper: events.includes("PAPER PRESENTATION (ARABIC)") && !String(row.paperTopic || "").trim(),
      vlog: events.includes("VLOG-MAKING (ARABIC)") && !String(row.vlogLink || "").trim(),
    };
  };

  const pendingCounts = useMemo(() => {
    return rows.reduce((counts, row) => {
      const pending = getPendingDetails(row);
      if (pending.paper) counts.paper += 1;
      if (pending.vlog) counts.vlog += 1;
      if (pending.paper || pending.vlog) counts.any += 1;
      return counts;
    }, { paper: 0, vlog: 0, any: 0 });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !term || [
        row.name, row.registrationId, row.college, row.email, row.mobile,
      ].some((value) => String(value || "").toLowerCase().includes(term));
      const matchesEvent =
        eventFilter === "All Events" || (row.events || []).includes(eventFilter);
      const pending = getPendingDetails(row);
      const matchesDetails =
        detailsFilter === "All Details" ||
        (detailsFilter === "Pending Paper Topic" && pending.paper) ||
        (detailsFilter === "Pending Vlog Link" && pending.vlog) ||
        (detailsFilter === "Any Pending Details" && (pending.paper || pending.vlog));
      return matchesSearch && matchesEvent && matchesDetails;
    });
  }, [rows, search, eventFilter, detailsFilter]);

  const eventCounts = useMemo(() => {
    return EVENT_OPTIONS.map((event) => ({
      event,
      count: rows.filter((row) => (row.events || []).includes(event)).length,
    }));
  }, [rows]);
const updateResultDraft = (eventId, placeKey, field, value) => {
  setResultDrafts((current) => ({
    ...current,
    [eventId]: {
      ...(current[eventId] || EMPTY_RESULT),
      [placeKey]: {
        ...((current[eventId] || EMPTY_RESULT)[placeKey] || {}),
        [field]: value,
      },
    },
  }));
};

const saveEventResult = async (event) => {
  if (!user || user.uid !== ADMIN_UID) {
    setResultMessage("You are not authorized to publish results.");
    return;
  }

  const draft = resultDrafts[event.id] || EMPTY_RESULT;
  const cleanPlace = (place) => ({
    name: String(draft[place]?.name || "").trim(),
    college: String(draft[place]?.college || "").trim(),
  });

  const payload = {
    eventId: event.id,
    eventTitle: event.title,
    first: cleanPlace("first"),
    second: cleanPlace("second"),
    third: cleanPlace("third"),
    published: true,
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  };

  setSavingResult(event.id);
  setResultMessage("");
  try {
    await setDoc(doc(db, "festivalResults", event.id), payload, { merge: true });
    setResults((current) => ({
      ...current,
      [event.id]: {
        ...payload,
        updatedAt: new Date(),
      },
    }));
    setResultMessage(`${event.title}: results saved successfully.`);
  } catch (error) {
    console.error("Saving festival results failed:", error);
    setResultMessage("Could not save results. Please check your Firestore Rules and try again.");
  } finally {
    setSavingResult("");
  }
};

const unpublishEventResult = async (event) => {
  if (!user || user.uid !== ADMIN_UID) {
    setResultMessage("You are not authorized to unpublish results.");
    return;
  }
  if (!results[event.id]) return;
  setSavingResult(event.id);
  setResultMessage("");
  try {
    await updateDoc(doc(db, "festivalResults", event.id), {
      published: false,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
    setResults((current) => ({
      ...current,
      [event.id]: { ...current[event.id], published: false },
    }));
    setResultMessage(`${event.title}: results unpublished. They are no longer visible publicly.`);
  } catch (error) {
    console.error("Unpublishing festival results failed:", error);
    setResultMessage("Could not unpublish results. Please check your Firestore Rules and try again.");
  } finally {
    setSavingResult("");
  }
};

const deleteEventResult = async (event) => {
  if (!user || user.uid !== ADMIN_UID) {
    setResultMessage("You are not authorized to delete results.");
    return;
  }
  if (!results[event.id]) return;
  const confirmed = window.confirm(`Permanently delete saved results for ${event.title}? This cannot be undone.`);
  if (!confirmed) return;
  setSavingResult(event.id);
  setResultMessage("");
  try {
    await deleteDoc(doc(db, "festivalResults", event.id));
    setResults((current) => {
      const next = { ...current };
      delete next[event.id];
      return next;
    });
    setResultDrafts((current) => ({ ...current, [event.id]: structuredClone(EMPTY_RESULT) }));
    setResultMessage(`${event.title}: saved results permanently deleted.`);
  } catch (error) {
    console.error("Deleting festival results failed:", error);
    setResultMessage("Could not delete results. Please check your Firestore Rules and try again.");
  } finally {
    setSavingResult("");
  }
};

const resetPassword = async () => {
  setError("");

  if (!email.trim()) {
    setError("Please enter your admin email address first.");
    return;
  }

  setLoading(true);

  try {
    await sendPasswordResetEmail(auth, email.trim());
    setError("Password reset link sent. Please check your inbox and spam folder.");
  } catch (error) {
    setError("Could not send reset email. Please check your email address.");
  } finally {
    setLoading(false);
  }
};
  const login = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user.uid !== ADMIN_UID) {
        await signOut(auth);
        setError("This account is not authorized as the Admin.");
      } else {
        setPassword("");
      }
    } catch {
      setError("Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setRows([]);
    setSearch("");
    setEventFilter("All Events");
    setDetailsFilter("All Details");
  };

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#f4f0e6] p-8 text-center text-[#173d32]">
        Loading Admin...
      </main>
    );
  }

  if (!user || user.uid !== ADMIN_UID) {
    return (
      <main className="min-h-screen bg-[#f4f0e6] px-4 py-12">
        <section className="mx-auto max-w-md rounded-3xl border border-[#e0d6c3] bg-white p-6 shadow-xl sm:p-9">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.22em] text-[#a17b35]">
              MCC LITERATURE FESTIVAL 2026
            </p>
            <h1 className="mt-3 text-3xl font-black text-[#173d32]">Admin Login</h1>
            <p className="mt-2 text-sm text-[#756b59]">Authorized administrators only</p>
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form onSubmit={login} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#29483c]">
                Admin Email
              </label>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#29483c]">
                Password
              </label>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              disabled={loading}
              className="w-full rounded-xl bg-[#173d32] px-5 py-3.5 font-bold text-white transition hover:bg-[#245846] disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Login to Dashboard"}
            </button>
            <button
  type="button"
  onClick={resetPassword}
  disabled={loading}
  className="w-full text-center text-sm font-semibold text-[#98743c] underline"
>
  Forgot Password?
</button>
          </form>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 w-full rounded-xl border border-[#d8cfbd] px-4 py-3 text-sm font-bold text-[#29483c]"
          >
            Back to Festival Website
          </button>
          <p className="mt-4 text-center text-xs text-[#8a806e]">
            Madeenathul Uloom Arabic College, Pulikkal
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e6] px-4 py-8 text-[#173d32] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-br from-[#205747] via-[#174b3d] to-[#10392f] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#e2cc9c]">
              MCC LITERATURE FESTIVAL 2026
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-white/75">Signed in as {user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Website
            </button>
            <button
              onClick={logout}
              className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#756b59]">Total Registrations</p>
            <p className="mt-2 text-4xl font-black">{rows.length}</p>
          </div>
          {eventCounts.map(({ event, count }) => (
            <div key={event} className="rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold leading-relaxed text-[#756b59]">{event}</p>
              <p className="mt-2 text-3xl font-black">{count}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-800">Pending Paper Topics</p>
            <p className="mt-1 text-3xl font-black text-amber-900">{pendingCounts.paper}</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-bold text-orange-800">Pending Vlog Links</p>
            <p className="mt-1 text-3xl font-black text-orange-900">{pendingCounts.vlog}</p>
          </div>
          <div className="rounded-2xl border border-[#e0d6c3] bg-white p-4">
            <p className="text-xs font-bold text-[#756b59]">Students With Pending Details</p>
            <p className="mt-1 text-3xl font-black text-[#173d32]">{pendingCounts.any}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              className={`${inputClass} flex-1`}
              placeholder="Search name, Registration ID, college, email or mobile..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className={`${inputClass} lg:max-w-xs`}
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option>All Events</option>
              {EVENT_OPTIONS.map((event) => <option key={event}>{event}</option>)}
            </select>
            <select
              className={`${inputClass} lg:max-w-xs`}
              value={detailsFilter}
              onChange={(event) => setDetailsFilter(event.target.value)}
            >
              <option>All Details</option>
              <option>Any Pending Details</option>
              <option>Pending Paper Topic</option>
              <option>Pending Vlog Link</option>
            </select>
            <button
              onClick={() => exportCsv(filteredRows)}
              disabled={!filteredRows.length}
              className="rounded-xl bg-[#b58b43] px-5 py-3 text-sm font-bold text-[#173d32] transition hover:bg-[#c6a66b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => downloadRegistrationBackup(rows)}
              disabled={!rows.length || user?.uid !== ADMIN_UID}
              className="rounded-xl border border-[#205747] bg-[#edf4ef] px-5 py-3 text-sm font-bold text-[#173d32] transition hover:bg-[#dcebe1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download JSON Backup
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#756b59]">
            <span>Showing {filteredRows.length} of {rows.length} registrations · JSON backup includes all registrations, regardless of filters.</span>
            <button
              onClick={() => { setSearch(""); setEventFilter("All Events"); setDetailsFilter("All Details"); }}
              className="font-bold text-[#98743c] underline"
            >
              Clear filters
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#d9c9a8] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-[#98743c]">FESTIVAL CONTROL</p>
              <h2 className="mt-1 text-xl font-black text-[#173d32]">Results Management</h2>
              <p className="mt-1 text-xs leading-5 text-[#756b59]">
                Enter the First, Second and Third place winners for each competition. Leave a position blank until it is confirmed.
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#f5eedc] px-3 py-1.5 text-[10px] font-bold text-[#806d50]">
              {Object.keys(results).length} / {RESULT_EVENTS.length} competitions saved
            </span>
          </div>

          {resultMessage && (
            <p role="status" className="mb-4 rounded-xl border border-[#e5dcc9] bg-[#faf8f1] p-3 text-xs font-semibold text-[#29483c]">
              {resultMessage}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {RESULT_EVENTS.map((event) => {
              const draft = resultDrafts[event.id] || EMPTY_RESULT;
              const isSaved = Boolean(results[event.id]);
              return (
                <article key={event.id} className="overflow-hidden rounded-2xl border border-[#e5dcc9]">
                  <div className="bg-gradient-to-r from-[#205747] to-[#10392f] px-4 py-3 text-white">
                    <p className="text-[9px] font-black tracking-[0.18em] text-[#e5c98f]">COMPETITION</p>
                    <h3 className="mt-1 text-xs font-black leading-5 sm:text-sm">{event.title}</h3>
                  </div>
                  <div className="space-y-4 p-4">
                    {[
                      { key: "first", label: "First Prize" },
                      { key: "second", label: "Second Prize" },
                      { key: "third", label: "Third Prize" },
                    ].map((place) => (
                      <div key={place.key} className="rounded-xl bg-[#faf8f1] p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-[#98743c]">{place.label}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className={inputClass}
                            placeholder="Winner name"
                            value={draft[place.key]?.name || ""}
                            onChange={(e) => updateResultDraft(event.id, place.key, "name", e.target.value)}
                          />
                          <input
                            className={inputClass}
                            placeholder="College"
                            value={draft[place.key]?.college || ""}
                            onChange={(e) => updateResultDraft(event.id, place.key, "college", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold ${isSaved && results[event.id]?.published !== false ? "text-emerald-700" : "text-[#756b59]"}`}>
                        {isSaved ? (results[event.id]?.published === false ? "Saved · Unpublished" : "Published publicly") : "Not published yet"}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {isSaved && results[event.id]?.published !== false && (
                          <button
                            type="button"
                            onClick={() => unpublishEventResult(event)}
                            disabled={savingResult === event.id}
                            className="rounded-xl border border-[#b58b43] px-3 py-2.5 text-xs font-bold text-[#80612f] hover:bg-[#faf4e6] disabled:opacity-50"
                          >
                            Unpublish
                          </button>
                        )}
                        {isSaved && (
                          <button
                            type="button"
                            onClick={() => deleteEventResult(event)}
                            disabled={savingResult === event.id}
                            className="rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => saveEventResult(event)}
                          disabled={savingResult === event.id}
                          className="rounded-xl bg-[#b58b43] px-4 py-2.5 text-xs font-black text-[#173d32] transition hover:bg-[#c6a66b] disabled:opacity-50"
                        >
                          {savingResult === event.id ? "Saving..." : isSaved && results[event.id]?.published === false ? "Update & Publish" : "Save & Publish"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e0d6c3] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e7dfd0] px-5 py-4">
            <h2 className="text-lg font-black">Student Registrations</h2>
            {loading && <span className="text-xs font-semibold text-[#98743c]">Loading...</span>}
          </div>

          {loading && rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#756b59]">Fetching registrations...</p>
          ) : filteredRows.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#756b59]">No registrations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-[#f4f0e6] text-xs uppercase tracking-wide text-[#756b59]">
                  <tr>
                    <th className="px-4 py-3">Registration ID</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">College / University</th>
                    <th className="px-4 py-3">Course / Year</th>
                    <th className="px-4 py-3">Mobile / Email</th>
                    <th className="px-4 py-3">Events & Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-[#eee8dc] align-top hover:bg-[#fcfaf5]">
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-[#98743c]">
                        {row.registrationId || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold">{row.name || "—"}</p>
                        <p className="mt-1 text-xs text-[#8a806e]">{row.department || ""}</p>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(row)}
                          className="mt-2 rounded-lg border border-[#b58b43] px-3 py-1.5 text-[11px] font-bold text-[#80612f] transition hover:bg-[#faf4e6]"
                        >
                          View Details
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{row.college || "—"}</p>
                        <p className="mt-1 text-xs text-[#8a806e]">{row.university || ""}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p>{row.course || "—"}</p>
                        <p className="mt-1 text-xs text-[#8a806e]">{row.year || ""}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p>{row.mobile || "—"}</p>
                        <p className="mt-1 text-xs text-[#8a806e]">{row.email || ""}</p>
                      </td>
                      <td className="max-w-sm px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(row.events || []).map((event) => (
                            <span key={event} className="rounded-full bg-[#eee9dc] px-2.5 py-1 text-[10px] font-bold text-[#29483c]">
                              {event}
                            </span>
                          ))}
                        </div>
                        {getPendingDetails(row).paper && (
                          <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">Paper Topic Pending</p>
                        )}
                        {getPendingDetails(row).vlog && (
                          <p className="mt-2 inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-800">Vlog Link Pending</p>
                        )}
                        {row.paperTopic && <p className="mt-2 text-xs"><b>Paper:</b> {row.paperTopic}</p>}
                        {row.vlogLink && <p className="mt-2 break-all text-xs"><b>Vlog:</b> <a className="text-blue-700 underline" href={row.vlogLink} target="_blank" rel="noreferrer">Open link</a></p>}
                        {row.quizTeam && <div className="mt-2 text-xs leading-5">
                          <p><b>Quiz Team:</b> {row.quizTeam.teamName}</p>
                          <p><b>Member 2:</b> {row.quizTeam.member2Name} · {row.quizTeam.member2Mobile}</p>
                          {row.quizTeam.member2UniqueId && <p><b>Unique ID:</b> {row.quizTeam.member2UniqueId}</p>}
                        </div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#102d25]/70 p-3 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-details-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedStudent(null);
            }}
          >
            <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#d9c9a8] bg-[#fffefa] shadow-2xl">
              <header className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl bg-gradient-to-r from-[#205747] to-[#10392f] px-5 py-5 text-white sm:px-7">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-[#e5c98f]">STUDENT REGISTRATION</p>
                  <h2 id="student-details-title" className="mt-1 text-xl font-black sm:text-2xl">{selectedStudent.name || "Student Details"}</h2>
                  <p className="mt-1 text-xs text-white/75">Registration ID: {selectedStudent.registrationId || selectedStudent.id || "—"}</p>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} aria-label="Close student details" className="rounded-xl border border-white/30 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">✕</button>
              </header>

              <div className="space-y-5 p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#e8e0d2] bg-white p-4">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-[#98743c]">Personal Information</h3>
                    <dl className="space-y-2.5 text-sm">
                      <div><dt className="text-xs text-[#8a806e]">Full Name</dt><dd className="font-semibold">{selectedStudent.name || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8a806e]">Email</dt><dd className="break-all font-semibold">{selectedStudent.email || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8a806e]">Mobile</dt><dd className="font-semibold">{selectedStudent.mobile || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8a806e]">Registration ID</dt><dd className="font-semibold">{selectedStudent.registrationId || selectedStudent.id || "—"}</dd></div>
                    </dl>
                  </div>
                  <div className="rounded-2xl border border-[#e8e0d2] bg-white p-4">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-[#98743c]">Academic Information</h3>
                    <dl className="space-y-2.5 text-sm">
                      <div><dt className="text-xs text-[#8a806e]">College</dt><dd className="font-semibold">{selectedStudent.college || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8a806e]">University</dt><dd className="font-semibold">{selectedStudent.university || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8a806e]">Department</dt><dd className="font-semibold">{selectedStudent.department || "—"}</dd></div>
                      <div><dt className="text-xs text-[#8a806e]">Course / Year</dt><dd className="font-semibold">{[selectedStudent.course, selectedStudent.year].filter(Boolean).join(" / ") || "—"}</dd></div>
                    </dl>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e8e0d2] bg-white p-4">
                  <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-[#98743c]">Competition Details</h3>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(selectedStudent.events || []).length ? selectedStudent.events.map((event) => (
                      <span key={event} className="rounded-full bg-[#eee9dc] px-3 py-1.5 text-[11px] font-bold text-[#29483c]">{event}</span>
                    )) : <span className="text-sm text-[#8a806e]">No events listed</span>}
                  </div>
                  {(selectedStudent.events || []).includes("PAPER PRESENTATION (ARABIC)") && (
                    <div className="mb-3 rounded-xl bg-[#faf8f1] p-3">
                      <p className="text-xs font-bold text-[#80612f]">Paper Presentation Topic</p>
                      <p className="mt-1 break-words text-sm">{selectedStudent.paperTopic || "Pending – not submitted yet"}</p>
                    </div>
                  )}
                  {(selectedStudent.events || []).includes("VLOG-MAKING (ARABIC)") && (
                    <div className="mb-3 rounded-xl bg-[#faf8f1] p-3">
                      <p className="text-xs font-bold text-[#80612f]">Vlog Link</p>
                      {selectedStudent.vlogLink ? <a className="mt-1 block break-all text-sm text-blue-700 underline" href={selectedStudent.vlogLink} target="_blank" rel="noreferrer">{selectedStudent.vlogLink}</a> : <p className="mt-1 text-sm">Pending – not submitted yet</p>}
                    </div>
                  )}
                  {selectedStudent.quizTeam && (
                    <div className="rounded-xl bg-[#faf8f1] p-3">
                      <p className="mb-2 text-xs font-bold text-[#80612f]">Quiz Team Information</p>
                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs text-[#8a806e]">Team Name</dt><dd className="font-semibold">{selectedStudent.quizTeam.teamName || "—"}</dd></div>
                        <div><dt className="text-xs text-[#8a806e]">Second Member</dt><dd className="font-semibold">{selectedStudent.quizTeam.member2Name || "—"}</dd></div>
                        <div><dt className="text-xs text-[#8a806e]">Member 2 Mobile</dt><dd className="font-semibold">{selectedStudent.quizTeam.member2Mobile || "—"}</dd></div>
                        <div><dt className="text-xs text-[#8a806e]">Member 2 Unique ID</dt><dd className="font-semibold">{selectedStudent.quizTeam.member2UniqueId || "—"}</dd></div>
                      </dl>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee8dc] pt-4">
                  <p className="text-xs text-[#8a806e]">
                    Submitted: {selectedStudent.submittedAt?.toDate ? selectedStudent.submittedAt.toDate().toLocaleString() : selectedStudent.submittedAt instanceof Date ? selectedStudent.submittedAt.toLocaleString() : "Date not available"}
                  </p>
                  <button type="button" onClick={() => setSelectedStudent(null)} className="rounded-xl bg-[#173d32] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#245846]">Close Details</button>
                </div>
              </div>
            </section>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-[#8a806e]">
          Admin access is restricted to the authorized Firebase account.
        </p>
      </div>
    </main>
  );
}
