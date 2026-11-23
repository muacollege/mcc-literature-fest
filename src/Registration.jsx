
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const EVENTS = [
  "MCC NATIONAL ELOCUTION (ARABIC)",
  "PAPER PRESENTATION (ARABIC)",
  "VLOG-MAKING (ARABIC)",
  "QUIZ COMPETITION (GENERAL)",
  "CALLIGRAPHY (ARABIC)",
];

const DEADLINE = new Date("2026-12-10T23:59:00+05:30");

export default function Registration() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("signup");
  const [registered, setRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState("");

  const [account, setAccount] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
  });

  const [profile, setProfile] = useState({
    name: "",
    mobile: "",
    college: "",
    department: "",
    course: "",
    year: "",
    district: "",
    events: [],
    teamName: "",
    member2Name: "",
    member2College: "",
    member2Mobile: "",
  });

  const quizSelected = profile.events.includes(
    "QUIZ COMPETITION (GENERAL)"
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const snapshot = await getDoc(
            doc(db, "registrations", currentUser.uid)
          );

          if (snapshot.exists()) {
            const data = snapshot.data();

            setProfile((previous) => ({
              ...previous,
              ...data,
              events: data.events || [],
            }));

            if (data.registrationId) {
              setRegistrationId(data.registrationId);
              setRegistered(true);
            }
          } else {
            setProfile((previous) => ({
              ...previous,
              name: currentUser.displayName || "",
              mobile: "",
            }));
          }
        } catch (error) {
          setMessage("Could not load your profile. Please try again.");
        }
      } else {
        setRegistered(false);
        setRegistrationId("");
      }
    });

    return () => unsubscribe();
  }, []);

  const updateAccount = (field, value) => {
    setAccount((previous) => ({ ...previous, [field]: value }));
  };

  const updateProfile = (field, value) => {
    setProfile((previous) => ({ ...previous, [field]: value }));
  };

  const toggleEvent = (event) => {
    setProfile((previous) => ({
      ...previous,
      events: previous.events.includes(event)
        ? previous.events.filter((item) => item !== event)
        : [...previous.events, event],
    }));
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!account.name.trim() || !account.mobile.trim()) {
      setMessage("Please enter your name and mobile number.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(account.mobile.trim())) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (new Date() > DEADLINE) {
      setMessage("Registration deadline has passed.");
      return;
    }

    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        account.email.trim(),
        account.password
      );

      await setDoc(doc(db, "registrations", result.user.uid), {
  uid: result.user.uid,
  name: account.name.trim(),
  mobile: account.mobile.trim(),
  email: account.email.trim(),
  createdAt: serverTimestamp(),
});

      setProfile((previous) => ({
        ...previous,
        name: account.name.trim(),
        mobile: account.mobile.trim(),
      }));

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
      await signInWithEmailAndPassword(
        auth,
        account.email.trim(),
        account.password
      );
      setMessage("Login successful.");
    } catch (error) {
      setMessage("Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!user) return;

    if (new Date() > DEADLINE) {
      setMessage("Registration deadline has passed.");
      return;
    }

    const requiredFields = [
      profile.name,
      profile.mobile,
      profile.college,
      profile.department,
      profile.course,
      profile.year,
      profile.district,
    ];

    if (requiredFields.some((value) => !String(value || "").trim())) {
      setMessage("Please complete all profile fields.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(profile.mobile.trim())) {
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    if (profile.events.length === 0) {
      setMessage("Please select at least one event.");
      return;
    }

    if (
      quizSelected &&
      (!profile.teamName.trim() ||
        !profile.member2Name.trim() ||
        !profile.member2College.trim() ||
        !/^[6-9]\d{9}$/.test(profile.member2Mobile.trim()))
    ) {
      setMessage("Please complete all General Quiz team details.");
      return;
    }

    setLoading(true);

    try {
      const existing = await getDoc(
        doc(db, "registrations", user.uid)
      );

      const id =
        existing.exists() && existing.data().registrationId
          ? existing.data().registrationId
          : `MCC26-${user.uid.slice(0, 8).toUpperCase()}`;

      const registrationData = {
        registrationId: id,
        uid: user.uid,
        name: profile.name.trim(),
        mobile: profile.mobile.trim(),
        email: user.email,
        college: profile.college.trim(),
        department: profile.department.trim(),
        course: profile.course.trim(),
        year: profile.year,
        district: profile.district.trim(),
        events: profile.events,
        quizTeam: quizSelected
          ? {
              teamName: profile.teamName.trim(),
              member2Name: profile.member2Name.trim(),
              member2College: profile.member2College.trim(),
              member2Mobile: profile.member2Mobile.trim(),
            }
          : null,
        status: "Submitted",
        submittedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "registrations", user.uid),
        registrationData,
        { merge: true }
      );

      setRegistrationId(id);
      setRegistered(true);
      setMessage("Your registration has been submitted successfully.");
    } catch (error) {
      setMessage(
        "Registration could not be submitted. Please try again. " +
          error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setMessage("You have been logged out.");
  };

  const inputClass =
    "w-full rounded-lg border border-[#d8cfbd] bg-white px-4 py-3 text-sm text-[#173d32] outline-none focus:border-[#b18a43]";

  const labelClass =
    "mb-1.5 block text-sm font-semibold text-[#29483c]";

  return (
    <main className="min-h-screen bg-[#f4f0e6] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-[#a17b35]">
            MADEENATHUL ULOOM ARABIC COLLEGE, PULIKKAL
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#173d32] sm:text-4xl">
            Student Registration
          </h1>
          <p className="mt-2 text-sm text-[#756b59]">
            MCC Literature Festival 2026
          </p>
          <p className="mt-3 text-xs font-semibold text-[#9a7130]">
            Registration closes: 10 December 2026, 11:59 PM
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-[#d8cfbd] bg-white p-4 text-sm text-[#29483c]">
            {message}
          </div>
        )}

        {!user ? (
          <section className="rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                  mode === "signup"
                    ? "bg-[#173d32] text-white"
                    : "bg-[#eee9dc] text-[#173d32]"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                  mode === "login"
                    ? "bg-[#173d32] text-white"
                    : "bg-[#eee9dc] text-[#173d32]"
                }`}
              >
                Login
              </button>
            </div>

            <form
              onSubmit={mode === "signup" ? createAccount : login}
              className="space-y-4"
            >
              {mode === "signup" && (
                <>
                  <div>
                    <label className={labelClass}>Student Name</label>
                    <input
                      className={inputClass}
                      value={account.name}
                      onChange={(e) =>
                        updateAccount("name", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input
                      className={inputClass}
                      type="tel"
                      maxLength={10}
                      value={account.mobile}
                      onChange={(e) =>
                        updateAccount("mobile", e.target.value)
                      }
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
                  onChange={(e) =>
                    updateAccount("email", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <input
                  className={inputClass}
                  type="password"
                  minLength={6}
                  value={account.password}
                  onChange={(e) =>
                    updateAccount("password", e.target.value)
                  }
                  required
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-lg bg-[#173d32] px-5 py-3.5 font-bold text-white transition hover:bg-[#245846] disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : mode === "signup"
                    ? "Create My Account"
                    : "Login"}
              </button>
            </form>
          </section>
        ) : registered ? (
          <section className="rounded-2xl border border-[#e0d6c3] bg-white p-6 text-center shadow-sm sm:p-9">
            <div className="text-4xl">✓</div>
            <h2 className="mt-3 text-2xl font-bold text-[#173d32]">
              Registration Submitted!
            </h2>
            <p className="mt-2 text-sm text-[#756b59]">
              Your registration details have been saved.
            </p>
            <div className="my-6 rounded-xl bg-[#f4f0e6] p-5">
              <p className="text-xs font-bold tracking-widest text-[#8b744d]">
                YOUR REGISTRATION ID
              </p>
              <p className="mt-2 text-2xl font-black tracking-wider text-[#173d32]">
                {registrationId}
              </p>
            </div>
            <p className="text-sm text-[#756b59]">
              Please save your Registration ID for future reference.
            </p>
            <button
              onClick={logout}
              className="mt-6 rounded-lg border border-[#173d32] px-6 py-3 text-sm font-bold text-[#173d32]"
            >
              Logout
            </button>
          </section>
        ) : (
          <form
            onSubmit={submitRegistration}
            className="space-y-6 rounded-2xl border border-[#e0d6c3] bg-white p-5 shadow-sm sm:p-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#173d32]">
                  Complete Your Profile
                </h2>
                <p className="mt-1 text-xs text-[#756b59]">
                  Logged in as {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-bold text-[#9a7130] underline"
              >
                Logout
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Student Name</label>
                <input
                  className={inputClass}
                  value={profile.name}
                  onChange={(e) =>
                    updateProfile("name", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Mobile Number</label>
                <input
                  className={inputClass}
                  maxLength={10}
                  value={profile.mobile}
                  onChange={(e) =>
                    updateProfile("mobile", e.target.value)
                  }
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>College Name</label>
                <input
                  className={inputClass}
                  value={profile.college}
                  onChange={(e) =>
                    updateProfile("college", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Department</label>
                <input
                  className={inputClass}
                  value={profile.department}
                  onChange={(e) =>
                    updateProfile("department", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Course / Programme</label>
                <input
                  className={inputClass}
                  placeholder="BA, MA, BSc..."
                  value={profile.course}
                  onChange={(e) =>
                    updateProfile("course", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Year of Study</label>
                <select
                  className={inputClass}
                  value={profile.year}
                  onChange={(e) =>
                    updateProfile("year", e.target.value)
                  }
                  required
                >
                  <option value="">Select year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="Research Scholar">Research Scholar</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>District</label>
                <input
                  className={inputClass}
                  value={profile.district}
                  onChange={(e) =>
                    updateProfile("district", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="border-t border-[#e7dfd0] pt-5">
              <h3 className="text-lg font-bold text-[#173d32]">
                Select Events
              </h3>
              <p className="mb-4 mt-1 text-xs text-[#756b59]">
                You can select one or more events.
              </p>

              <div className="space-y-3">
                {EVENTS.map((event, index) => (
                  <label
                    key={event}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e4dccd] p-4 transition hover:bg-[#f8f5ed]"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#173d32]"
                      checked={profile.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                    />
                    <span className="text-sm font-semibold text-[#29483c]">
                      <span className="mr-2 text-[#a17b35]">
                        0{index + 1}
                      </span>
                      {event}
                      {index === 3 && (
                        <span className="mt-1 block text-xs font-normal text-[#9a7130]">
                          Team event – exactly 2 members
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {quizSelected && (
              <div className="space-y-4 rounded-xl border border-[#d9c59e] bg-[#faf7ef] p-5">
                <h3 className="font-bold text-[#173d32]">
                  General Quiz – Team Details
                </h3>
                <p className="text-xs text-[#756b59]">
                  The team must contain exactly two members. You are the
                  team captain.
                </p>

                <div>
                  <label className={labelClass}>Team Name</label>
                  <input
                    className={inputClass}
                    value={profile.teamName}
                    onChange={(e) =>
                      updateProfile("teamName", e.target.value)
                    }
                    required
                  />
                </div>

                <h4 className="text-sm font-bold text-[#29483c]">
                  Second Member Details
                </h4>

                <div>
                  <label className={labelClass}>Member Name</label>
                  <input
                    className={inputClass}
                    value={profile.member2Name}
                    onChange={(e) =>
                      updateProfile("member2Name", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Member College</label>
                  <input
                    className={inputClass}
                    value={profile.member2College}
                    onChange={(e) =>
                      updateProfile("member2College", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Member Mobile Number</label>
                  <input
                    className={inputClass}
                    type="tel"
                    maxLength={10}
                    value={profile.member2Mobile}
                    onChange={(e) =>
                      updateProfile("member2Mobile", e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#173d32] px-5 py-4 font-bold text-white transition hover:bg-[#245846] disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>

            <p className="text-center text-xs text-[#8a806e]">
              Please verify your details before submitting.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
