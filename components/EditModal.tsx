import React, { useState } from 'react';

interface EditModalProps {
  title: string;
  onClose: () => void;
  onSave: (data: any) => void;
  fields: { name: string; label: string; value: string }[];
}

export const EditModal: React.FC<EditModalProps> = ({ title, onClose, onSave, fields }) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: field.value }), {})
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
        <div className="space-y-4 mb-8">
          {fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-400 mb-2">{field.label}</label>
              <input
                type="text"
                value={formData[field.name]}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                className="w-full bg-black/50 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2 text-slate-300 hover:text-white font-medium">Cancel</button>
          <button onClick={() => onSave(formData)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold">Save Changes</button>
        </div>
      </div>
    </div>
  );
};