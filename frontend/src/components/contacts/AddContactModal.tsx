import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, type ContactFormInput } from "../../schemas/contacts";
import { X, Loader2 } from "lucide-react";
import { PhoneInput } from "../ui/PhoneInput";

interface AddContactModalProps {
  onClose: () => void;
  onSave: (contact: ContactFormInput & { tags: string[] }) => void;
}

export function AddContactModal({ onClose, onSave }: AddContactModalProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      company: "",
    },
  });

  const onSubmit = async (data: ContactFormInput) => {
    onSave({
      ...data,
      tags: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f0f11] border border-white/10 rounded-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Add Contact</h3>
          <button onClick={onClose} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Full Name</label>
            <input
              type="text"
              {...register("name")}
              placeholder="John Smith"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Phone</label>
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
            {errors.phone && (
              <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Email</label>
            <input
              type="email"
              {...register("email")}
              placeholder="john@company.com"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Company</label>
            <input
              type="text"
              {...register("company")}
              placeholder="Acme Corp"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
            {errors.company && (
              <p className="mt-1 text-xs text-red-400">{errors.company.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Tags</label>
            <input
              type="text"
              placeholder="vip, enterprise, lead (comma-separated)"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
