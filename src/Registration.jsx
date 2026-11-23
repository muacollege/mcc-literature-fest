import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

  const inputClass = "w-full rounded-lg border border-[#d8cfbd] bg-white px-4 py-3 text-sm text-[#173d32] outline-none focus:border-[#b18a43]";
  const labelClass = "mb-1.5 block text-sm font-semibold text-[#29483c]";

  return (
    <main className="min-h-screen bg-[#f4f0e6] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#a17b35]">MADEENATHUL ULOOM ARABIC COLLEGE, PULIKKAL</p>
          <h1 className="mt-3 text-3xl font-black text-[#173d32] sm:text-4xl">Student Registration</h1>
          <p className="mt-2 text-sm text-[#756b59]">MCC Literature Festival 2026</p>
          <p className="mt-3 text-xs font-semibold text-[#9a7130]">Registration closes: 29 November 2026, 11:59 PM</p>
        </div>

        {message && <div className="mb-5 rounded-lg border border-[#d8cfbd] bg-white p-4 text-sm text-[#29483c]">{message}</div>}

        {!user ? (
          <section className="rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex gap-3">
              <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-lg py-3 text-sm font-bold ${mode === "signup" ? "bg-[#173d32] text-white" : "bg-[#eee9dc] text-[#173d32]"}`}>Create Account</button>
              <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded-lg py-3 text-sm font-bold ${mode === "login" ? "bg-[#173d32] text-white" : "bg-[#eee9dc] text-[#173d32]"}`}>Login</button>
            </div>
            <form onSubmit={mode === "signup" ? createAccount : login} className="space-y-4">
              {mode === "signup" && <>
                <div><label className={labelClass}>Student Name</label><input className={inputClass} value={account.name} onChange={(e) => updateAccount("name", e.target.value)} required /></div>
                <div><label className={labelClass}>WhatsApp Mobile Number</label><input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={account.mobile} onChange={(e) => updateAccount("mobile", e.target.value.replace(/\D/g, ""))} required /></div>
              </>}
              <div><label className={labelClass}>Email Address</label><input className={inputClass} type="email" value={account.email} onChange={(e) => updateAccount("email", e.target.value)} required /></div>
              <div><label className={labelClass}>Password</label><input className={inputClass} type="password" minLength={6} value={account.password} onChange={(e) => updateAccount("password", e.target.value)} required /></div>
              <button disabled={loading} className="w-full rounded-lg bg-[#173d32] px-5 py-3.5 font-bold text-white transition hover:bg-[#245846] disabled:opacity-50">{loading ? "Please wait..." : mode === "signup" ? "Create My Account" : "Login"}</button>
            </form>
          </section>
        ) : registered ? (
          <section className="rounded-2xl border border-[#e0d6c3] bg-white p-6 text-center shadow-sm sm:p-9">
            <div className="text-4xl">✓</div>
            <h2 className="mt-3 text-2xl font-bold text-[#173d32]">Registration Submitted!</h2>
            <p className="mt-2 text-sm text-[#756b59]">Your registration details have been saved.</p>
            <div className="my-6 rounded-xl bg-[#f4f0e6] p-5">
              <p className="text-xs font-bold tracking-widest text-[#8b744d]">YOUR REGISTRATION ID</p>
              <p className="mt-2 text-2xl font-black tracking-wider text-[#173d32]">{registrationId}</p>
            </div>
            <p className="text-sm text-[#756b59]">Please save your Registration ID for future reference.</p>
            <button onClick={logout} className="mt-6 rounded-lg border border-[#173d32] px-6 py-3 text-sm font-bold text-[#173d32]">Logout</button>
          </section>
        ) : (
          <form onSubmit={submitRegistration} className="space-y-6 rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-[#173d32]">Complete Your Profile</h2><p className="mt-1 text-xs text-[#756b59]">Logged in as {user.email}</p></div>
              <button type="button" onClick={logout} className="text-xs font-bold text-[#9a7130] underline">Logout</button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelClass}>Name</label><input className={inputClass} value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} required /></div>
              <div><label className={labelClass}>Mobile Number (WhatsApp)</label><input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={profile.mobile} onChange={(e) => updateProfile("mobile", e.target.value.replace(/\D/g, ""))} required /></div>
              <div className="sm:col-span-2"><label className={labelClass}>College Name</label><input className={inputClass} value={profile.college} onChange={(e) => updateProfile("college", e.target.value)} required /></div>
              <div><label className={labelClass}>University</label><input className={inputClass} value={profile.university} onChange={(e) => updateProfile("university", e.target.value)} required /></div>
              <div><label className={labelClass}>Department</label><input className={inputClass} value={profile.department} onChange={(e) => updateProfile("department", e.target.value)} required /></div>
              <div>
                <label className={labelClass}>Course / Programme</label>
                <select className={inputClass} value={profile.course} onChange={(e) => setProfile((previous) => ({ ...previous, course: e.target.value, otherCourse: e.target.value === "Other" ? previous.otherCourse : "" }))} required>
                  <option value="">Select Course / Programme</option>
                  {COURSES.map((course) => <option key={course} value={course}>{course}</option>)}
                </select>
              </div>
              {profile.course === "Other" && <div><label className={labelClass}>Enter Your Course / Programme</label><input className={inputClass} value={profile.otherCourse} onChange={(e) => updateProfile("otherCourse", e.target.value)} placeholder="Enter course name" required /></div>}
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

            <div className="border-t border-[#e7dfd0] pt-5">
              <h3 className="text-lg font-bold text-[#173d32]">Select Events</h3>
              <p className="mb-1 mt-1 text-xs text-[#756b59]">Select up to two individual events. Quiz may be selected in addition.</p>
              <p className="mb-4 text-xs font-semibold text-[#9a7130]">Individual events selected: {individualCount}/2</p>
              <div className="space-y-3">
                {EVENTS.map((event, index) => <div key={event} className="rounded-lg border border-[#e4dccd] p-4 transition hover:bg-[#f8f5ed]">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#173d32]" checked={profile.events.includes(event)} onChange={() => toggleEvent(event)} />
                    <span className="text-sm font-semibold text-[#29483c]"><span className="mr-2 text-[#a17b35]">0{index + 1}</span>{event}
                      {event === QUIZ && <span className="mt-1 block text-xs font-normal text-[#9a7130]">Team event – you may also select up to two individual events</span>}
                    </span>
                  </label>

                  {event === "PAPER PRESENTATION (ARABIC)" && paperSelected && <div className="mt-4 border-t border-[#e4dccd] pt-4">
                    <label className={labelClass}>Paper Presentation Topic</label>
                    <textarea className={inputClass} rows={3} value={profile.paperTopic} onChange={(e) => updateProfile("paperTopic", e.target.value)} placeholder="Enter your paper topic based on one of the brochure themes" required />
                  </div>}

                  {event === "VLOG-MAKING (ARABIC)" && vlogSelected && <div className="mt-4 border-t border-[#e4dccd] pt-4">
                    <label className={labelClass}>Vlog Link</label>
                    <input className={inputClass} type="url" value={profile.vlogLink} onChange={(e) => updateProfile("vlogLink", e.target.value)} placeholder="https://..." required />
                  </div>}

                  {event === QUIZ && quizSelected && <div className="mt-4 space-y-4 border-t border-[#e4dccd] pt-4">
                    <h3 className="font-bold text-[#173d32]">General Quiz – Team Details</h3>
                    <div><label className={labelClass}>Team Name</label><input className={inputClass} value={profile.teamName} onChange={(e) => updateProfile("teamName", e.target.value)} required /></div>
                    <h4 className="text-sm font-bold text-[#29483c]">Second Member Details</h4>
                    <div><label className={labelClass}>Name of the Member</label><input className={inputClass} value={profile.member2Name} onChange={(e) => updateProfile("member2Name", e.target.value)} required /></div>
                    <div><label className={labelClass}>Mobile Number of the Member</label><input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={profile.member2Mobile} onChange={(e) => updateProfile("member2Mobile", e.target.value.replace(/\D/g, ""))} required /></div>
                    <div><label className={labelClass}>Unique ID (if registered for event)</label><input className={inputClass} value={profile.member2UniqueId} onChange={(e) => updateProfile("member2UniqueId", e.target.value)} placeholder="Optional" /></div>
                  </div>}
                </div>)}
              </div>
            </div>

            <div className="border-t border-[#e7dfd0] pt-5">
              <h3 className="mb-3 text-lg font-bold text-[#173d32]">Declaration</h3>
              <p className="mb-4 text-xs text-[#756b59]">All declarations are compulsory. Please tick all three boxes to submit.</p>
              <div className="space-y-4">
                {DECLARATIONS.map(({ key, text }) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e4dccd] p-4">
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#173d32]" checked={profile.declarations[key]} onChange={(e) => updateDeclaration(key, e.target.checked)} />
                  <span className="text-sm leading-6 text-[#29483c]">{text}</span>
                </label>)}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#173d32] px-5 py-4 font-bold text-white transition hover:bg-[#245846] disabled:opacity-50">{loading ? "Submitting..." : "Submit Registration"}</button>
            <p className="text-center text-xs text-[#8a806e]">Please verify your details before submitting.</p>
          </form>
        )}
      </div>
    </main>
  );
}
