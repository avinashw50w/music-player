
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Loader2, Key } from 'lucide-react';
import * as api from '../services/api';

const SettingField = ({ label, name, value, onChange, placeholder }: any) => {
    const [show, setShow] = useState(false);
    
    return (
        <div className="mb-6">
            <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">{label}</label>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all placeholder:text-slate-600 font-mono text-sm"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

const Settings: React.FC = () => {
    const [settings, setSettings] = useState({
        ACOUSTID_CLIENT_ID: '',
        SPOTIFY_CLIENT_ID: '',
        SPOTIFY_CLIENT_SECRET: '',
        GEMINI_API_KEY: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        api.getSettings().then(data => {
            setSettings(prev => ({ ...prev, ...data }));
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        try {
            await api.saveSettings(settings);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-10 pb-20 max-w-4xl mx-auto min-h-screen">
            <div className="mb-10 animate-fade-in-up">
                <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
                <p className="text-slate-400 text-lg">Configure external API keys for enhanced features.</p>
            </div>

            <div className="bg-[#1c1c1e] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden animate-fade-in-up delay-100">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="relative z-10">
                        <div className="grid gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                    <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">API Credentials</h3>
                                </div>

                                <SettingField
                                    label="AcoustID Client ID"
                                    name="ACOUSTID_CLIENT_ID"
                                    value={settings.ACOUSTID_CLIENT_ID}
                                    onChange={handleChange}
                                    placeholder="Required for audio fingerprinting"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SettingField
                                        label="Spotify Client ID"
                                        name="SPOTIFY_CLIENT_ID"
                                        value={settings.SPOTIFY_CLIENT_ID}
                                        onChange={handleChange}
                                        placeholder="Required for Spotify metadata"
                                    />
                                    <SettingField
                                        label="Spotify Client Secret"
                                        name="SPOTIFY_CLIENT_SECRET"
                                        value={settings.SPOTIFY_CLIENT_SECRET}
                                        onChange={handleChange}
                                        placeholder="Required for Spotify metadata"
                                    />
                                </div>

                                <SettingField
                                    label="Gemini API Key"
                                    name="GEMINI_API_KEY"
                                    value={settings.GEMINI_API_KEY}
                                    onChange={handleChange}
                                    placeholder="Required for AI metadata refinement"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 mt-12 pt-6 border-t border-white/5">
                            {success && (
                                <span className="text-green-400 font-medium animate-in fade-in slide-in-from-right-2">
                                    Settings saved successfully!
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Settings;
