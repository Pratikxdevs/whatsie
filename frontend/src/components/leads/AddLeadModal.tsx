import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { leadFormSchema, type LeadFormInput } from '../../schemas/leads';
import { PhoneInput } from '../ui/PhoneInput';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: { name: string; phone: string; email: string; source: string; status: string; botId: string; attributes: Record<string, string> }) => void;
  botOptions: Array<{ id: string; name: string }>;
}

const SOURCES = ['whatsapp', 'telegram', 'discord', 'messenger', 'instagram', 'ms_teams', 'twitter', 'website', 'referral', 'manual'] as const;
const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

export function AddLeadModal({ isOpen, onClose, onSave, botOptions }: AddLeadModalProps) {
  const [source, setSource] = useState('manual');
  const [status, setStatus] = useState('new');
  const [botId, setBotId] = useState('');
  const [attrKey, setAttrKey] = useState('');
  const [attrValue, setAttrValue] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormInput>({
    resolver: zodResolver(leadFormSchema),
  });

  if (!isOpen) return null;

  const handleAddAttr = () => {
    if (!attrKey.trim()) return;
    setAttributes({ ...attributes, [attrKey.trim()]: attrValue });
    setAttrKey('');
    setAttrValue('');
  };

  const handleRemoveAttr = (key: string) => {
    const next = { ...attributes };
    delete next[key];
    setAttributes(next);
  };

  const onSubmit = (data: LeadFormInput) => {
    onSave({ name: data.name, phone: data.phone || '', email: data.email || '', source, status, botId, attributes });
    reset();
    setSource('manual'); setStatus('new'); setBotId(''); setAttributes({});
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0f0f11] border border-white/10 rounded-xl z-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[#EBEBF0]">Add Lead</h2>
          <button onClick={onClose} className="text-[#7D7D8A] hover:text-[#EBEBF0] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-[#7D7D8A] font-medium mb-1 block">Name *</label>
            <input {...register('name')} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10" placeholder="Full name" />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium mb-1 block">Phone</label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Phone number"
                  />
                )}
              />
              {errors.phone && <p className="text-[10px] text-red-400 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium mb-1 block">Email</label>
              <input {...register('email')} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none focus:border-white/10" placeholder="email@example.com" />
              {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium mb-1 block">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium mb-1 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none capitalize">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7D7D8A] font-medium mb-1 block">Bot</label>
              <select value={botId} onChange={(e) => setBotId(e.target.value)} className="w-full bg-[#1c1c20] border border-white/5 rounded-lg px-3 py-2 text-sm text-[#EBEBF0] focus:outline-none">
                <option value="">None</option>
                {botOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Custom Attributes */}
          <div>
            <label className="text-xs text-[#7D7D8A] font-medium mb-2 block">Custom Attributes</label>
            {Object.entries(attributes).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1.5 group">
                <span className="text-xs text-[#7D7D8A] capitalize min-w-[80px]">{k}</span>
                <span className="text-sm text-[#CCCCD4] flex-1">{v}</span>
                <button type="button" onClick={() => handleRemoveAttr(k)} className="opacity-0 group-hover:opacity-100 text-[#7D7D8A] hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input value={attrKey} onChange={(e) => setAttrKey(e.target.value)} placeholder="Key" className="flex-1 bg-[#1c1c20] border border-white/5 rounded px-2 py-1.5 text-xs text-[#EBEBF0] focus:outline-none focus:border-white/10" />
              <input value={attrValue} onChange={(e) => setAttrValue(e.target.value)} placeholder="Value" className="flex-1 bg-[#1c1c20] border border-white/5 rounded px-2 py-1.5 text-xs text-[#EBEBF0] focus:outline-none focus:border-white/10" />
              <button type="button" onClick={handleAddAttr} className="text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#7D7D8A] hover:text-[#CCCCD4] transition-colors">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} className="bg-white text-[#09090b] text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">Add Lead</button>
        </div>
      </div>
    </>
  );
}
