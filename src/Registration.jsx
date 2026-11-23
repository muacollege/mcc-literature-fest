import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

const EVENTS = [
  "MCC NATIONAL ELOCUTION (ARABIC)",
  "PAPER PRESENTATION (ARABIC)",
  "VLOG-MAKING (ARABIC)",
  "CALLIGRAPHY (ARABIC)",
  "QUIZ COMPETITION (GENERAL)",
];
const QUIZ = "QUIZ COMPETITION (GENERAL)";
const INDIVIDUAL_EVENTS = EVENTS.filter((event) => event !== QUIZ);
const COURSES = [
  "BA Afzal Ul Ulama in Arabic (Honours)",
  "BA Functional Arabic (Honours)",
  "Post Graduation in Arabic",
  "Preliminary Arabic",
  "Other",
];
const DEADLINE = new Date("2026-11-29T23:59:00+05:30");
const DECLARATIONS = [
  { key: "regularStudent", text: "I declare that I am a regular student of a recognized State/Central University, Government, Aided, or Affiliated College in India." },
  { key: "proofAvailable", text: "I agree to produce my College ID Card or Bonafide Certificate as proof of student status, if required." },
  { key: "informationCorrect", text: "I confirm that all the information provided is true and correct. I understand that any false information may result in the cancellation of my registration." },
];
const EMPTY_PROFILE = {
  name: "", mobile: "", college: "", university: "", department: "",
  course: "", otherCourse: "", year: "", events: [], paperTopic: "",
  vlogLink: "", teamName: "", member2Name: "", member2Mobile: "",
  member2UniqueId: "",
  declarations: { regularStudent: false, proofAvailable: false, informationCorrect: false },
};

export default function Registration() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  const [account, setAccount] = useState({ name: "", mobile: "", email: "", password: "" });
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  const quizSelected = profile.events.includes(QUIZ);
  const paperSelected = profile.events.includes("PAPER PRESENTATION (ARABIC)");
  const vlogSelected = profile.events.includes("VLOG-MAKING (ARABIC)");
  const individualCount = profile.events.filter((event) => INDIVIDUAL_EVENTS.includes(event)).length;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setRegistered(false);
        setRegistrationId("");
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "registrations", currentUser.uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile((previous) => ({
            ...previous, ...data,
            declarations: { ...EMPTY_PROFILE.declarations, ...(data.declarations || {}) },
            events: data.events || [],
          }));
          if (data.registrationId) {
            setRegistrationId(data.registrationId);
            setRegistered(true);
          }
        } else {
          setProfile((previous) => ({ ...previous, name: currentUser.displayName || "" }));
        }
      } catch {
        setMessage("Could not load your profile. Please try again.");
      }
    });
    return () => unsubscribe();
  }, []);

  const updateAccount = (field, value) => setAccount((previous) => ({ ...previous, [field]: value }));
  const updateProfile = (field, value) => setProfile((previous) => ({ ...previous, [field]: value }));
  const updateDeclaration = (key, checked) => setProfile((previous) => ({
    ...previous, declarations: { ...previous.declarations, [key]: checked },
  }));

  const toggleEvent = (event) => {
    setProfile((previous) => {
      const selected = previous.events.includes(event);
      const count = previous.events.filter((item) => INDIVIDUAL_EVENTS.includes(item)).length;
      if (!selected && INDIVIDUAL_EVENTS.includes(event) && count >= 2) {
        setMessage("You can select a maximum of two individual events. Quiz can be selected in addition.");
        return previous;
      }
      setMessage("");
      return {
        ...previous,
        events: selected ? previous.events.filter((item) => item !== event) : [...previous.events, event],
      };
    });
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!account.name.trim() || !account.mobile.trim()) {
      setMessage("Please enter your name and WhatsApp mobile number.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(account.mobile.trim())) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (new Date() >= DEADLINE) {
      setMessage("Registration deadline has passed.");
      return;
    }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, account.email.trim(), account.password);
      await setDoc(doc(db, "registrations", result.user.uid), {
        uid: result.user.uid, name: account.name.trim(), mobile: account.mobile.trim(),
        email: account.email.trim(), createdAt: serverTimestamp(),
      });
      setProfile((previous) => ({ ...previous, name: account.name.trim(), mobile: account.mobile.trim() }));
      setMessage("Account created successfully. Complete your profile below.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };
const resetPassword = async () => {
  setMessage("");

  if (!account.email.trim()) {
    setMessage("Please enter your email address first.");
    return;
  }

  setLoading(true);

  try {
    await sendPasswordResetEmail(auth, account.email.trim());
    setMessage(
      "Password reset link sent. Please check your email inbox and spam folder."
    );
  } catch (error) {
    setMessage(
      "Could not send reset email. Please check your email address."
    );
  } finally {
    setLoading(false);
  }
};
  const login = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, account.email.trim(), account.password);
      setMessage("Login successful.");
    } catch {
      setMessage("Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!user) return;
    if (new Date() >= DEADLINE) {
      setMessage("Registration deadline has passed.");
      return;
    }

    const courseValue = profile.course === "Other" ? profile.otherCourse.trim() : profile.course.trim();
    const required = [profile.name, profile.mobile, profile.college, profile.university,
      profile.department, profile.course, courseValue, profile.year];
    if (required.some((value) => !String(value || "").trim())) {
      setMessage("Please complete all required profile fields.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(profile.mobile.trim())) {
      setMessage("Enter a valid 10-digit WhatsApp mobile number.");
      return;
    }
    if (!profile.events.length) {
      setMessage("Please select at least one event.");
      return;
    }
    if (individualCount > 2) {
      setMessage("You can select a maximum of two individual events.");
      return;
    }
    if (paperSelected && !profile.paperTopic.trim()) {
      setMessage("Please enter your Paper Presentation topic.");
      return;
    }
    if (vlogSelected) {
      try {
        const url = new URL(profile.vlogLink.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid URL");
      } catch {
        setMessage("Please enter a valid Vlog URL beginning with https://");
        return;
      }
    }
    if (quizSelected && (!profile.teamName.trim() || !profile.member2Name.trim() ||
      !/^[6-9]\d{9}$/.test(profile.member2Mobile.trim()))) {
      setMessage("Please complete the Quiz team name and second member details.");
      return;
    }
    if (!DECLARATIONS.every(({ key }) => profile.declarations[key] === true)) {
      setMessage("Please accept all three declarations before submitting.");
      return;
    }

    setLoading(true);
    try {
      const ref = doc(db, "registrations", user.uid);
      const existing = await getDoc(ref);
      const id = existing.exists() && existing.data().registrationId
        ? existing.data().registrationId
        : `MCC26-${user.uid.slice(0, 8).toUpperCase()}`;

      const data = {
        registrationId: id, uid: user.uid, name: profile.name.trim(),
        mobile: profile.mobile.trim(), email: user.email,
        college: profile.college.trim(), university: profile.university.trim(),
        department: profile.department.trim(), course: courseValue,
        courseOption: profile.course, year: profile.year, events: profile.events,
        paperTopic: paperSelected ? profile.paperTopic.trim() : "",
        vlogLink: vlogSelected ? profile.vlogLink.trim() : "",
        quizTeam: quizSelected ? {
          teamName: profile.teamName.trim(), member2Name: profile.member2Name.trim(),
          member2Mobile: profile.member2Mobile.trim(),
          member2UniqueId: profile.member2UniqueId.trim(),
        } : null,
        declarations: profile.declarations, status: "Submitted",
        submittedAt: serverTimestamp(),
      };
      await setDoc(ref, data, { merge: true });
      setRegistrationId(id);
      setRegistered(true);
      setMessage("Your registration has been submitted successfully.");
    } catch (error) {
      setMessage("Registration could not be submitted. Please try again. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setMessage("You have been logged out.");
  };

  const inputClass =
    "w-full min-w-0 rounded-xl border border-[#ded5c3] bg-[#fffefa] px-4 py-3.5 text-sm text-[#173d32] shadow-sm outline-none transition placeholder:text-[#a79b86] hover:border-[#c8b486] focus:border-[#b58b43] focus:ring-4 focus:ring-[#b58b43]/10";
  const labelClass = "mb-2 block text-xs font-bold tracking-wide text-[#29483c] sm:text-sm";
  const sectionClass = "rounded-2xl border border-[#e6ddcc] bg-white/95 p-4 shadow-[0_8px_24px_rgba(23,61,50,0.045)] sm:rounded-3xl sm:p-6";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f5ed] px-4 py-6 text-[#173d32] sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#b58b43]/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[28rem] h-80 w-80 rounded-full bg-[#205747]/[0.07] blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-6 overflow-hidden rounded-3xl border border-[#d9c9a8] bg-gradient-to-br from-[#123d32] via-[#1c5544] to-[#10372e] text-white shadow-[0_18px_45px_rgba(23,61,50,0.16)] sm:mb-8">
          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-[#e5c98f]/20" />
            <div className="pointer-events-none absolute right-8 top-5 h-40 w-40 rounded-full border border-[#e5c98f]/15" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#e5c98f]/50 bg-white p-2 shadow-lg sm:h-[4.5rem] sm:w-[4.5rem]">
                  <img src="/college-logo.png" alt="Madeenathul Uloom Arabic College logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e5c98f] sm:text-[10px]">
                    Madeenathul Uloom Arabic College, Pulikkal
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-white/70 sm:text-xs">
                    Accredited by NAAC with A+ (CGPA 3.36)
                  </p>
                </div>
              </div>
              <div className="hidden h-12 w-px bg-white/15 sm:block" />
              <div className="sm:ml-auto sm:text-right">
                <p className="text-[9px] font-black tracking-[0.25em] text-[#e5c98f] sm:text-[10px]">
                  MCC LITERATURE FESTIVAL 2026
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Student Registration
                </h1>
                <p className="mt-1 text-xs text-white/70 sm:text-sm">
                  Be part of the celebration
                </p>
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e5c98f]/30 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold text-[#f3dfb3] sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e5c98f]" />
                Registration closes: 29 November 2026, 11:59 PM
              </span>
              <span className="text-[9px] font-semibold tracking-[0.16em] text-white/50">
                OFFICIAL STUDENT PORTAL
              </span>
            </div>
          </div>
        </header>

        {message && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-[#d9c9a8] bg-white px-4 py-3.5 text-sm leading-6 text-[#29483c] shadow-sm"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4ecd9] text-xs font-black text-[#98743c]">
              !
            </span>
            <p className="min-w-0 break-words">{message}</p>
          </div>
        )}

        {!user ? (
          <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-[#e2d7c2] bg-white shadow-[0_18px_45px_rgba(23,61,50,0.08)]">
            <div className="border-b border-[#eee6d7] bg-gradient-to-r from-[#fbf8ef] to-[#f3eddf] px-5 py-5 sm:px-7">
              <p className="text-[9px] font-black tracking-[0.24em] text-[#98743c]">
                STUDENT ACCESS
              </p>
              <h2 className="mt-1 text-xl font-black text-[#173d32] sm:text-2xl">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#756b59] sm:text-sm">
                {mode === "signup"
                  ? "Start your festival registration with a student account."
                  : "Login to continue or manage your registration."}
              </p>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f2eee4] p-1">
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setMessage(""); }}
                  className={`rounded-lg px-3 py-3 text-xs font-extrabold transition sm:text-sm ${
                    mode === "signup"
                      ? "bg-[#173d32] text-white shadow-md"
                      : "text-[#6f6758] hover:text-[#173d32]"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setMessage(""); }}
                  className={`rounded-lg px-3 py-3 text-xs font-extrabold transition sm:text-sm ${
                    mode === "login"
                      ? "bg-[#173d32] text-white shadow-md"
                      : "text-[#6f6758] hover:text-[#173d32]"
                  }`}
                >
                  Login
                </button>
              </div>

              <form onSubmit={mode === "signup" ? createAccount : login} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div>
                      <label className={labelClass}>Student Name</label>
                      <input
                        className={inputClass}
                        value={account.name}
                        onChange={(e) => updateAccount("name", e.target.value)}
                        autoComplete="name"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>WhatsApp Mobile Number</label>
                      <input
                        className={inputClass}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={account.mobile}
                        onChange={(e) => updateAccount("mobile", e.target.value.replace(/\D/g, ""))}
                        autoComplete="tel-national"
                        placeholder="10-digit mobile number"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    className={inputClass}
                    type="email"
                    value={account.email}
                    onChange={(e) => updateAccount("email", e.target.value)}
                    autoComplete="email"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <input
                    className={inputClass}
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={account.password}
                    onChange={(e) => updateAccount("password", e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="At least 6 characters"
                    required
                  />
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#756b59]">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="h-4 w-4 accent-[#173d32]"
                    />
                    Show Password
                  </label>
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#173d32] to-[#245846] px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(23,61,50,0.18)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Please wait..." : mode === "signup" ? "Create My Account" : "Login to My Account"}
                </button>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={resetPassword}
                    disabled={loading}
                    className="w-full py-2 text-center text-xs font-bold text-[#98743c] underline underline-offset-4 disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                )}
              </form>
            </div>
          </section>
        ) : registered ? (
          <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-[#d8c69d] bg-white text-center shadow-[0_18px_45px_rgba(23,61,50,0.08)]">
            <div className="bg-gradient-to-br from-[#123d32] to-[#205747] px-6 py-8 text-white sm:py-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#e5c98f]/50 bg-white/10 text-3xl text-[#e5c98f]">
                ✓
              </div>
              <p className="mt-4 text-[9px] font-black tracking-[0.25em] text-[#e5c98f]">
                MCC LITERATURE FESTIVAL 2026
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Registration Submitted!</h2>
              <p className="mt-2 text-sm text-white/75">
                Your registration details have been saved successfully.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-[9px] font-black tracking-[0.2em] text-[#98743c]">
                YOUR REGISTRATION ID
              </p>
              <p className="mt-2 break-all rounded-2xl border border-[#e8ddc7] bg-[#faf7ef] px-4 py-5 text-xl font-black tracking-wider text-[#173d32] sm:text-2xl">
                {registrationId}
              </p>
              <p className="mt-4 text-xs leading-5 text-[#756b59]">
                Please save your Registration ID for future reference.
              </p>
              <button
                onClick={logout}
                className="mt-6 rounded-xl border border-[#b58b43] px-7 py-3 text-sm font-bold text-[#173d32] transition hover:bg-[#173d32] hover:text-white"
              >
                Logout
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={submitRegistration} className="space-y-5 sm:space-y-6">
            <section className="rounded-2xl border border-[#d9c9a8] bg-white px-4 py-4 shadow-sm sm:rounded-3xl sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.22em] text-[#98743c]">ACCOUNT CONNECTED</p>
                  <h2 className="mt-1 text-lg font-black text-[#173d32] sm:text-xl">Complete Your Profile</h2>
                  <p className="mt-1 break-all text-xs text-[#756b59]">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full rounded-xl border border-[#d8c9ad] px-4 py-2.5 text-xs font-bold text-[#806d50] transition hover:border-[#173d32] hover:bg-[#f7f4eb] sm:w-auto"
                >
                  Logout
                </button>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4ecd9] text-sm font-black text-[#98743c]">01</span>
                <div>
                  <h3 className="text-base font-black text-[#173d32] sm:text-lg">Student Details</h3>
                  <p className="text-[11px] text-[#8a806e]">Enter your academic and contact information.</p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input className={inputClass} value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} autoComplete="name" required />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp Mobile Number</label>
                  <input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={profile.mobile} onChange={(e) => updateProfile("mobile", e.target.value.replace(/\D/g, ""))} autoComplete="tel-national" required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>College Name</label>
                  <input className={inputClass} value={profile.college} onChange={(e) => updateProfile("college", e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>University</label>
                  <input className={inputClass} value={profile.university} onChange={(e) => updateProfile("university", e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input className={inputClass} value={profile.department} onChange={(e) => updateProfile("department", e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Course / Programme</label>
                  <select className={inputClass} value={profile.course} onChange={(e) => setProfile((previous) => ({ ...previous, course: e.target.value, otherCourse: e.target.value === "Other" ? previous.otherCourse : "" }))} required>
                    <option value="">Select Course / Programme</option>
                    {COURSES.map((course) => <option key={course} value={course}>{course}</option>)}
                  </select>
                </div>
                {profile.course === "Other" && (
                  <div>
                    <label className={labelClass}>Enter Your Course / Programme</label>
                    <input className={inputClass} value={profile.otherCourse} onChange={(e) => updateProfile("otherCourse", e.target.value)} placeholder="Enter course name" required />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Year of Study</label>
                  <select className={inputClass} value={profile.year} onChange={(e) => updateProfile("year", e.target.value)} required>
                    <option value="">Select year</option>
                    <option value="First Year">First Year</option>
                    <option value="Second Year">Second Year</option>
                    <option value="Third Year">Third Year</option>
                    <option value="Fourth Year">Fourth Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4ecd9] text-sm font-black text-[#98743c]">02</span>
                  <div>
                    <h3 className="text-base font-black text-[#173d32] sm:text-lg">Select Events</h3>
                    <p className="text-[11px] text-[#8a806e]">Choose your festival competitions.</p>
                  </div>
                </div>
                <span className="w-fit rounded-full border border-[#dfd0ad] bg-[#faf5e8] px-3 py-1.5 text-[10px] font-extrabold text-[#80612f]">
                  Individual events: {individualCount}/2
                </span>
              </div>
              <p className="mb-4 rounded-xl bg-[#f7f4eb] px-3 py-2.5 text-xs leading-5 text-[#756b59]">
                Select up to two individual events. Quiz may be selected in addition.
              </p>

              <div className="space-y-3">
                {EVENTS.map((event, index) => {
                  const selected = profile.events.includes(event);
                  return (
                    <div
                      key={event}
                      className={`rounded-2xl border p-4 transition-all ${
                        selected
                          ? "border-[#b58b43] bg-gradient-to-r from-[#fbf7eb] to-white shadow-[0_5px_18px_rgba(181,139,67,0.10)]"
                          : "border-[#e8e0d2] bg-white hover:border-[#cbb98f] hover:bg-[#fdfcf8]"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 accent-[#173d32]"
                          checked={selected}
                          onChange={() => toggleEvent(event)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold leading-5 text-[#29483c]">
                            <span className="text-[10px] font-black tracking-wider text-[#a17b35]">0{index + 1}</span>
                            {event}
                            {selected && <span className="rounded-full bg-[#e8f0e9] px-2 py-0.5 text-[9px] font-black text-[#205747]">SELECTED</span>}
                          </span>
                          {event === QUIZ && (
                            <span className="mt-1 block text-[11px] leading-5 text-[#98743c]">
                              Team event – you may also select up to two individual events.
                            </span>
                          )}
                        </span>
                      </label>

                      {event === "PAPER PRESENTATION (ARABIC)" && paperSelected && (
                        <div className="mt-4 border-t border-[#e8ddc7] pt-4">
                          <label className={labelClass}>Paper Presentation Topic</label>
                          <textarea className={inputClass} rows={3} value={profile.paperTopic} onChange={(e) => updateProfile("paperTopic", e.target.value)} placeholder="Enter your paper topic based on one of the brochure themes" required />
                        </div>
                      )}

                      {event === "VLOG-MAKING (ARABIC)" && vlogSelected && (
                        <div className="mt-4 border-t border-[#e8ddc7] pt-4">
                          <label className={labelClass}>Vlog Link</label>
                          <input className={inputClass} type="url" value={profile.vlogLink} onChange={(e) => updateProfile("vlogLink", e.target.value)} placeholder="https://..." required />
                        </div>
                      )}

                      {event === QUIZ && quizSelected && (
                        <div className="mt-4 space-y-4 border-t border-[#e8ddc7] pt-4">
                          <h4 className="text-sm font-black text-[#173d32]">General Quiz – Team Details</h4>
                          <div>
                            <label className={labelClass}>Team Name</label>
                            <input className={inputClass} value={profile.teamName} onChange={(e) => updateProfile("teamName", e.target.value)} required />
                          </div>
                          <div>
                            <label className={labelClass}>Name of the Second Member</label>
                            <input className={inputClass} value={profile.member2Name} onChange={(e) => updateProfile("member2Name", e.target.value)} required />
                          </div>
                          <div>
                            <label className={labelClass}>Second Member Mobile Number</label>
                            <input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={profile.member2Mobile} onChange={(e) => updateProfile("member2Mobile", e.target.value.replace(/\D/g, ""))} required />
                          </div>
                          <div>
                            <label className={labelClass}>Unique ID (if registered for event)</label>
                            <input className={inputClass} value={profile.member2UniqueId} onChange={(e) => updateProfile("member2UniqueId", e.target.value)} placeholder="Optional" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4ecd9] text-sm font-black text-[#98743c]">03</span>
                <div>
                  <h3 className="text-base font-black text-[#173d32] sm:text-lg">Student Declaration</h3>
                  <p className="text-[11px] text-[#8a806e]">Please read and accept all declarations.</p>
                </div>
              </div>
              <div className="space-y-3">
                {DECLARATIONS.map(({ key, text }) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e8e0d2] bg-[#fdfcf8] p-3.5 transition hover:border-[#cbb98f] sm:p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[#173d32]"
                      checked={profile.declarations[key]}
                      onChange={(e) => updateDeclaration(key, e.target.checked)}
                    />
                    <span className="text-xs leading-6 text-[#40584d] sm:text-sm">{text}</span>
                  </label>
                ))}
              </div>
            </section>

            <div className="rounded-2xl border border-[#d9c9a8] bg-gradient-to-r from-[#f8f1df] to-[#fffdf8] p-4 sm:p-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#173d32] to-[#245846] px-5 py-4 text-sm font-black tracking-wide text-white shadow-[0_10px_22px_rgba(23,61,50,0.18)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Registration"}
              </button>
              <p className="mt-3 text-center text-[10px] leading-5 text-[#756b59] sm:text-xs">
                Please verify your details before submitting. All required fields must be completed.
              </p>
            </div>
          </form>
        )}

        <footer className="mt-8 border-t border-[#d9c9a8] pt-5 text-center">
          <p className="text-[10px] font-bold text-[#173d32]">Madeenathul Uloom Arabic College, Pulikkal</p>
          <p className="mt-1 text-[9px] text-[#8a806e]">© 2026 MCC Literature Festival · Designed by Navas Kolathikkal</p>
        </footer>
      </div>
    </main>
  );
}
