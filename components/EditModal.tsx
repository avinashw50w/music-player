
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export interface SuggestionItem {
    text: string;
    subtext?: string;
    image?: string;
    id?: string;
}

interface EditModalProps {
  title: string;
  onClose: () => void;
  onSave: (data: any, ids?: Record<string, string>) => Promise<void> | void;
  fields: { name: string; label: string; value: string; isMulti?: boolean; suggestions?: (string | SuggestionItem)[] }[];
  onFieldChange?: (name: string, value: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ title, onClose, onSave, fields, onFieldChange }) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: field.value }), {})
  );
  
  const [selectedIds, setSelectedIds] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fieldContainersRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (focusedField) {
            const container = fieldContainersRef.current[focusedField];
            if (container && !container.contains(event.target as Node)) {
                setFocusedField(null);
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [focusedField]);

  const handleSuggestionClick = (fieldName: string, suggestionValue: string, id?: string) => {
      const field = fields.find(f => f.name === fieldName);
      let newValue = suggestionValue;

      if (field?.isMulti) {
          const parts = (formData[fieldName] || '').split(',');
          parts.pop(); 
          parts.push(suggestionValue); 
          newValue = parts.map(p => p.trim()).filter(Boolean).join(', ') + ', ';
      }

      setFormData(prev => ({ ...prev, [fieldName]: newValue }));
      
      if (id && !field?.isMulti) {
          setSelectedIds(prev => ({ ...prev, [fieldName]: id }));
      }
      
      if (field?.isMulti) {
          const inputEl = inputRefs.current[fieldName];
          if (inputEl) {
              requestAnimationFrame(() => {
                  inputEl.focus();
                  inputEl.setSelectionRange(newValue.length, newValue.length);
              });
          }
      } else {
          setFocusedField(null);
      }
      
      if (onFieldChange) onFieldChange(fieldName, newValue);
  };

  const handleSave = async () => {
      if (isLoading) return;
      setIsLoading(true);
      try {
          await onSave(formData, selectedIds);
      } catch (e) {
          console.error(e);
          setIsLoading(false);
      }
  };

  const getSuggestionText = (s: string | SuggestionItem) => typeof s === 'string' ? s : s.text;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={() => !isLoading && onClose()}
      />
      
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200" ref={wrapperRef}>
        <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
        <div className="space-y-6 mb-8">
          {fields.map(field => {
            const currentValue = formData[field.name] || '';
            const searchTerm = field.isMulti 
                ? currentValue.split(',').pop()?.trim() || ''
                : currentValue.trim();

            const showSuggestions = focusedField === field.name && 
                                    field.suggestions && 
                                    field.suggestions.length > 0 && 
                                    searchTerm.length > 0;

            const filteredSuggestions = showSuggestions 
                ? field.suggestions!.filter(s => {
                    const text = getSuggestionText(s);
                    return text.toLowerCase().includes(searchTerm.toLowerCase());
                  }).slice(0, 5) 
                : [];

            return (
                <div 
                    key={field.name} 
                    className="relative"
                    ref={el => { fieldContainersRef.current[field.name] = el; }}
                >
                <label className="block text-sm font-medium text-slate-400 mb-2">{field.label}</label>
                <input
                    ref={(el) => { inputRefs.current[field.name] = el; }}
                    type="text"
                    value={currentValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, [field.name]: val }));
                        if (focusedField !== field.name) setFocusedField(field.name);
                        if (!field.isMulti && selectedIds[field.name]) {
                            const newIds = { ...selectedIds };
                            delete newIds[field.name];
                            setSelectedIds(newIds);
                        }
                        if (onFieldChange) onFieldChange(field.name, val);
                    }}
                    onFocus={() => setFocusedField(field.name)}
                    disabled={isLoading}
                    className={`w-full bg-black/50 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    autoComplete="off"
                />
                
                {filteredSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full mt-2 bg-[#2c2c2e] border border-white/10 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredSuggestions.map((suggestion, idx) => {
                            const text = getSuggestionText(suggestion);
                            const subtext = typeof suggestion !== 'string' ? suggestion.subtext : null;
                            const image = typeof suggestion !== 'string' ? suggestion.image : null;
                            const id = typeof suggestion !== 'string' ? suggestion.id : undefined;
                            
                            return (
                                <li 
                                    key={idx}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); 
                                        handleSuggestionClick(field.name, text, id);
                                    }}
                                    className="px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer text-sm transition-colors border-b border-white/5 last:border-0 flex items-center gap-3"
                                >
                                    {image ? (
                                        <img src={image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white/5" />
                                    ) : null}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="truncate font-medium text-white">{text}</span>
                                        {subtext && <span className="text-xs text-slate-500 truncate">{subtext}</span>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                </>
            ) : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
