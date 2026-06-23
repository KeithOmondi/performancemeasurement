import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft, ShieldCheck, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { login, requestOTP, reset } from "../../store/slices/auth/authSlice";

/* ─── ROUTE PARAMETERS ───────────────────────────────────────────────────── */
const HOME_ROUTES: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  examiner: "/examiner/dashboard",
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
    <div className="flex min-h-screen items-center justify-center bg-stone-50 font-sans antialiased">
      <div className="w-full max-w-[420px] rounded-lg bg-white p-8 md:p-10 shadow-lg ring-1 ring-stone-200/60">
        
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E4620] text-[#C29B38]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight font-serif text-stone-900 uppercase">Office of the Registrar</h1>
          <p className="mt-1 text-xs font-semibold tracking-wider font-serif text-[#A37F2B] uppercase">High Court of Kenya</p>
        </div>

        {/* Error banner - using toast instead */}
        {isError && message && (
          <div className="mb-5 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-700 rounded-r-md">
            <span>{message}</span>
          </div>
        )}

        {!otpSent ? (
          // Step 1: Request OTP
          <form onSubmit={handleRequestOTP} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pjNumber" className="text-xs font-serif font-bold text-stone-700 uppercase tracking-wider">
                PJ / Personnel Number
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  id="pjNumber"
                  type="text"
                  placeholder="e.g., PJ1001"
                  value={pjNumber}
                  onChange={(e) => setPjNumber(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded border border-stone-300 bg-white pl-10 pr-3 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#1E4620] focus:ring-1 focus:ring-[#1E4620] disabled:bg-stone-50 disabled:text-stone-400"
                  required
                  autoFocus
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full rounded bg-[#1E4620] font-serif py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#163317] focus:outline-none focus:ring-2 focus:ring-[#1E4620] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Processing Request...
                </>
              ) : (
                'Request Access Code'
              )}
            </button>
          </form>
        ) : (
          // Step 2: Verify OTP
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="border-l-4 border-[#1E4620] bg-emerald-50/60 p-3 text-sm text-[#1E4620] rounded-r-md flex items-center justify-between">
              <p className="leading-relaxed text-xs">
                A secure 6‑digit verification code has been sent to your email.
              </p>
              <button
                type="button"
                onClick={handleBack}
                className="text-xs font-bold text-[#1E4620] hover:text-[#163317] transition-colors flex items-center gap-1 whitespace-nowrap ml-4"
              >
                <ArrowLeft size={14} /> Change
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="otpCode" className="text-xs font-serif font-bold text-stone-700 uppercase tracking-wider">
                Verification Token
              </label>
              <input
                id="otpCode"
                type="text"
                placeholder="0 0 0 0 0 0"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-center text-xl font-bold tracking-[0.3em] text-stone-900 outline-none transition placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-stone-400 focus:border-[#1E4620] focus:ring-1 focus:ring-[#1E4620] disabled:bg-stone-50 disabled:text-stone-400"
                required
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading || otp.length !== 6} 
              className="w-full font-serif rounded bg-[#1E4620] py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#163317] focus:outline-none focus:ring-2 focus:ring-[#1E4620] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Verifying...
                </>
              ) : (
                'Verify & Grant Access'
              )}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleBack}
              className="mt-1 text-center font-serif text-xs text-stone-500 underline transition hover:text-[#A37F2B] disabled:no-underline"
            >
              Modify PJ Number Entry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;