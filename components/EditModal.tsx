
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface EditModalProps {
  title: string;
  onClose: () => void;
  onSave: (data: any) => void;
  fields: { name: string; label: string; value: string; suggestions?: string[] }[];
  onFieldChange?: (name: string, value: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ title, onClose, onSave, fields, onFieldChange }) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: field.value }), {})
  );
  
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setFocusedField(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (fieldName: string, value: string) => {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
      setFocusedField(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200" ref={wrapperRef}>
        <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
        <div className="space-y-6 mb-8">
          {fields.map(field => {
            const currentValue = formData[field.name] || '';
            // Filter suggestions: case-insensitive match, exclude exact match
            const showSuggestions = focusedField === field.name && field.suggestions && field.suggestions.length > 0;
            const filteredSuggestions = showSuggestions 
                ? field.suggestions!.filter(s => 
                    s.toLowerCase().includes(currentValue.toLowerCase()) && 
                    s.toLowerCase() !== currentValue.toLowerCase()
                  ).slice(0, 5) 
                : [];

            return (
                <div key={field.name} className="relative">
                <label className="block text-sm font-medium text-slate-400 mb-2">{field.label}</label>
                <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, [field.name]: val }));
                        if (onFieldChange) onFieldChange(field.name, val);
                    }}
                    onFocus={() => setFocusedField(field.name)}
                    className="w-full bg-black/50 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    autoComplete="off"
                />
                
                {/* Suggestions Dropdown */}
                {filteredSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full mt-2 bg-[#2c2c2e] border border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredSuggestions.map((suggestion, idx) => (
                            <li 
                                key={idx}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur before click
                                    handleSuggestionClick(field.name, suggestion);
                                }}
                                className="px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer text-sm transition-colors border-b border-white/5 last:border-0"
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                )}
                </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2 text-slate-300 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-colors shadow-lg shadow-indigo-500/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
