"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { UserFullRow } from "@/lib/auth/user-store";

export interface ProfileOverviewProps {
  user: UserFullRow;
}

function EditableHeadline({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className: string;
}) {
  return (
    <label className={`block rounded-[1.75rem] border-4 border-white p-4 shadow-[0_10px_0_rgba(255,255,255,0.9)] ${className}`}>
      <span className="mb-2 block text-[10px] font-black tracking-[0.25em] text-black uppercase">
        {label}
      </span>
      <input
        className="w-full bg-transparent text-3xl font-black tracking-tight text-slate-950 placeholder:text-slate-500 outline-none"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function CompleteProfile({
  user,
}: ProfileOverviewProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [isPending, setIsPending] = useState(false);


  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      await updateUserProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
      });
      
      router.push("/card/pull");
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="h-screen overflow-clip flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <section
            className="relative overflow-hidden rounded-[2rem] p-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.4)] bg-[linear-gradient(135deg,#5ec8f8_0%,#4f7cff_18%,#6dd56d_36%,#ffe34d_58%,#ff8a5b_78%,#ef5da8_100%)]"
        >
            <form
              onSubmit={handleCompleteProfile}
              className="relative overflow-hidden rounded-[1.85rem] px-4 py-5 bg-white/50"
            >
                    <div className="flex flex-col gap-5">
                        <div className="mb-4 flex items-start gap-3">
                        <h1 className="text-4xl text-black font-black">Complete your profile</h1>
                    </div>

                    <div className="grid gap-8">
                        <EditableHeadline
                            className="rotate-[-2deg] bg-white/60"
                            label="First"
                            onChange={setFirstName}
                            placeholder=">"
                            value={firstName}
                        />
                        <EditableHeadline
                            className="rotate-[1.5deg] bg-white/60"
                            label="Last"
                            onChange={setLastName}
                            placeholder=">"
                            value={lastName}
                        />
                    </div>
                    <div className="w-full pt-10 flex justify-center">
                        <Button type="submit" size="lg" disabled={firstName === "" || lastName === ""} className="text-xl">
                          {isPending ? "Loading..." : "Continue"}
                        </Button>
                    </div>
                </div>
            </form>
        </section>
      </div>
    </div>
  );
}
