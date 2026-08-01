import { Wrench, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      {/* Premium Glassmorphic Card */}
      <div className="relative max-w-lg w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
        {/* Decorative Background Gradients */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl" />

        {/* Maintenance Icon with Rotating Ring */}
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-8 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
          <div className="absolute inset-0 rounded-2xl border border-dashed border-primary/40 animate-spin [animation-duration:15s]" />
          <Wrench className="w-10 h-10 text-primary animate-bounce [animation-duration:2s]" />
        </div>

        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-slate-50 tracking-tight mb-4">
          Under Maintenance
        </h1>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
          We are currently upgrading Room & Mess Finder to improve your experience. 
          We'll be back online shortly. Thank you for your patience!
        </p>

        {/* Back Contact Support / Status Info */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500 font-mono">Status: Upgrading Systems (503)</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs rounded-xl gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Admin Login
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs rounded-xl"
              onClick={() => window.location.reload()}
            >
              Check Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
