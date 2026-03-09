import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { login, reset } from "../../store/slices/auth/authSlice";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { email, password } = formData;
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isLoading, isError, message } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      toast.success(`Welcome back, ${user.name}`);
      const origin = location.state?.from?.pathname || 
                    (user.role === "superadmin" ? "/superadmin/dashboard" : "/admin/dashboard");
      navigate(origin, { replace: true });
    }

    if (isError && message) {
      toast.error(message);
      dispatch(reset());
    }
    // Cleanup removed to prevent clearing 'user' during navigation
  }, [user, isError, message, navigate, dispatch]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-5">
        <div className="text-center mb-8">
            <Landmark className="mx-auto text-[#1a2c2c] mb-2" size={32} />
            <h2 className="text-xl font-bold">PMMU Portal</h2>
        </div>
        
        <input 
          name="email" type="email" value={email} 
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full p-2.5 border rounded-lg" placeholder="Email" required 
        />
        <input 
          name="password" type="password" value={password} 
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          className="w-full p-2.5 border rounded-lg" placeholder="Password" required 
        />

        <button 
          disabled={isLoading}
          className="w-full bg-[#eab308] py-3 rounded-lg font-bold"
        >
          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "SIGN IN"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;