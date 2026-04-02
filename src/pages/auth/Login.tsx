import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft, ShieldCheck, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { login, requestOTP, reset } from "../../store/slices/auth/authSlice";

const HOME_ROUTES: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  examiner: "/admin/dashboard",
  user: "/user/dashboard",
};

const LoginPage = () => {
  const [pjNumber, setPjNumber] = useState("");
  const [otp, setOtp] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { user, isLoading, isError, message, otpSent } = useAppSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (user) {
      toast.success(`Welcome back, ${user.name}!`);
      const origin =
        location.state?.from?.pathname || HOME_ROUTES[user.role] || "/login";
      navigate(origin, { replace: true });
    }
  }, [user, navigate, location]);

  useEffect(() => {
    if (isError && message) {
      toast.error(message);
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pjNumber.trim();
    if (!trimmed) return toast.error("Please enter your PJ Number.");
    dispatch(requestOTP(trimmed));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = otp.trim();
    if (!trimmed) return toast.error("Please enter the verification code.");
    if (trimmed.length !== 6) return toast.error("Verification code must be 6 digits.");
    dispatch(login({ pjNumber: pjNumber.trim(), otp: trimmed }));
  };

  const handleBack = () => {
    setOtp("");
    dispatch(reset());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="text-center mb-8 space-y-2">
        <div className="flex justify-center mb-4">
          <span className="flex items-center gap-2 bg-slate-200/50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-300">
            <ShieldCheck size={14} className="text-[#2d5a43]" /> PMMU Portal
          </span>
        </div>
        <h1 className="text-3xl md:text-2xl font-serif font-bold text-[#2d5a43] tracking-tight uppercase">
          Office of the Registrar
        </h1>
        <p className="text-[#b19149] font-serif font-bold tracking-[0.3em] text-xs uppercase">
          High Court of Kenya
        </p>
      </div>

      {/* Card */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border-t-4 border-[#2d5a43]">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800 font-serif">
              LOGIN PAGE
            </h2>
            <p className="text-slate-500 font-serif text-sm mt-1">
              {otpSent
                ? "Verification code sent to your email."
                : "Enter your PJ Number to access resources."}
            </p>
          </div>

          {!otpSent ? (
            // ── Phase 1: PJ Number ────────────────────────────────────────
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <label className="block font-serif text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  PJ Number
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={pjNumber}
                    onChange={(e) => setPjNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b19149] focus:bg-white outline-none transition-all placeholder:text-slate-300"
                    placeholder="e.g. 12345"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full font-serif bg-[#2d5a43] hover:bg-[#1f3f2e] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    SEND VERIFICATION CODE
                    <ArrowLeft
                      size={16}
                      className="rotate-180 group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>
          ) : (
            // ── Phase 2: OTP Entry ────────────────────────────────────────
            <form onSubmit={handleLogin} className="space-y-6">
              <button
                type="button"
                onClick={handleBack}
                className="group text-xs font-bold text-[#2d5a43] flex items-center gap-1 hover:opacity-70 transition-opacity mb-4"
              >
                <ArrowLeft size={14} /> BACK TO PJ NUMBER
              </button>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-3xl tracking-[0.4em] font-serif font-bold text-[#2d5a43] focus:ring-2 focus:ring-[#2d5a43] outline-none"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-[#b19149] hover:bg-[#8e743a] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold tracking-widest text-xs transition-all shadow-lg flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "VERIFY & ACCESS PORTAL"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-slate-200 pt-4 w-64 text-center">
        <p className="text-[10px] font-serif text-slate-400 font-medium">
          © 2026 PMMU PORTAL | SECURE ACCESS
        </p>
      </div>
    </div>
  );
};

export default LoginPage;