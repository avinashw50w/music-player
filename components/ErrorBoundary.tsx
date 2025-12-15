
import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

const ErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "An unexpected error has occurred.";
  let errorDetails = "";

  if (isRouteErrorResponse(error)) {
    errorMessage = error.status === 404 ? "Page Not Found" : "Error Loading Page";
    errorDetails = error.statusText || error.data?.message;
  } else if (error instanceof Error) {
    errorMessage = "Application Error";
    errorDetails = error.message;
  } else if (typeof error === 'string') {
    errorDetails = error;
  } else {
      console.error(error);
      errorDetails = "Check console for details";
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden font-sans">
       {/* Ambient Background */}
       <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-900/20 blur-[150px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px]"></div>
      </div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 text-rose-500 shadow-xl shadow-rose-900/10 border border-rose-500/20">
            <AlertTriangle className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 tracking-tight">{errorMessage}</h1>
        <p className="text-slate-400 mb-10 text-lg font-medium leading-relaxed break-words max-w-full">
            {errorDetails || "Something went wrong while rendering this page."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button 
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold text-white group"
            >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Reload
            </button>
            <button 
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 transition-all font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
            >
                <Home className="w-5 h-5" />
                Home
            </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
