"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfileCard, updateUserProfile } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { UserFullRow } from "@/lib/auth/user-store";
import SkyboCard, { getCardVariant } from "../card/SkyboCard";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";


export interface ProfilePageProps {
  user: UserFullRow;
}

export function ProfileOverview({ user }: ProfilePageProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [activeCardId, setActiveCardId] = useState(user.profile_card_id ?? "");
  const [isPending, setIsPending] = useState(false);

  // Derive active card details safely from relation arrays if needed
  const activeCardDetails = user.activeProfileCard || user.cards?.find(c => c.id === activeCardId);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      await updateUserProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsPending(false);
    }
  }

  async function handleUpdateProfileCard(cardId: string) {
    if (cardId === activeCardId) return;
    setActiveCardId(cardId);

    try {
      await updateProfileCard(user.id, {
        profileCardId: cardId,
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  }
  
  const cardVariant = activeCardDetails ? getCardVariant(activeCardDetails) : null

  return (
    <div className="min-h-screen px-4 py-8 overflow-y-auto pb-24">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <section className={cn("relative overflow-hidden rounded-[2rem] p-1", cardVariant?.shellClassName)}>
            <div className={cn("relative overflow-hidden rounded-[1.85rem] px-5 py-6", cardVariant?.innerClassName)}>
                <div className="flex gap-4 text-black">
                    <div 
                        className="absolute inset-0 opacity-[0.20] mix-blend-overlay bg-white/70"
                        style={{
                            backgroundImage: cardVariant?.backgroundImage,
                            backgroundSize: cardVariant?.backgroundSize,
                        }}
                    />
                    {activeCardDetails && <SkyboCard card={activeCardDetails} />}
                    {!activeCardDetails && (
                        <div className="text-center py-6 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full border-3 border-dashed border-slate-400 flex items-center justify-center font-black text-slate-400 text-xl">
                                ?
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">No Profile Card Selected</h3>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <h2 className="text-4xl text-black font-black tracking-tight">{user.first_name}</h2>
                            <h2 className="text-4xl text-black font-black tracking-tight">{user.last_name}</h2>
                        </div>
                        <p>
                            User since {new Date(user.created_at as string).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric"
                            })}
                        </p>
                        <p>
                            {user.group?.display_location}
                        </p>
                        <p>
                            {user.phone_e164}
                        </p>
                    </div>
                </div>
            </div>
        </section>


        {/* {!activeCardDetails && (
            <section className="relative overflow-hidden bg-white/80 rounded-[2rem] p-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.4)]">
                <div className="text-center py-6 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-dashed border-slate-400 flex items-center justify-center font-black text-slate-400 text-xl">
                    ?
                    </div>
                    <div>
                    <h3 className="text-lg font-black text-slate-900">No Profile Card Selected</h3>
                    <p className="text-xs font-bold text-slate-500 max-w-[240px] mx-auto mt-1">
                        Link a card below to customize what people see when you connect.
                    </p>
                    </div>
                </div>
            </section>
        )} */}

        <Link href="/card/pull">
            <section className="flex flex-col bg-white rounded-[2rem] p-4 gap-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-lg">Draw a card</h3>
                    <Button size="lg" variant="ghost">
                        Draw now
                        <ArrowRight />
                    </Button>
                </div>
            </section>
        </Link>

        <section className="flex flex-col bg-white rounded-[2rem] p-4 gap-2">
            <div className="flex justify-between items-center">
                <h3 className="font-black text-lg">My Cards</h3>
                <Button variant="ghost" size="lg">
                    View all
                    <ArrowRight />
                </Button>
            </div>
            <div className="flex flex-row overflow-x-auto">
                {user.cards && user.cards.map((card) => (
                    <div key={card.id} onClick={() => handleUpdateProfileCard(card.id)}>
                        <SkyboCard card={card} className="shadow-none" />
                    </div>
                ))}
            </div>
        </section>

        {/* <section className="border-2 border-dashed rounded-[2rem] p-4">
            My Family
        </section> */}

        {/* <div className="rounded-2xl border-4 border-slate-200 bg-slate-100/50 p-4 flex flex-col gap-2 text-xs text-slate-600 font-bold mx-1">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="uppercase tracking-wider text-slate-400 text-[10px]">Phone</span>
                <span className="font-mono text-slate-800">{user.phone_e164}</span>
            </div>
            <div className="flex justify-between pt-0.5">
                <span className="uppercase tracking-wider text-slate-400 text-[10px]">Status</span>
                <span>
                {user.is_profile_complete ? (
                    <span className="text-emerald-600">✓ Complete</span>
                ) : (
                    <span className="text-amber-600">⚠ Action Needed</span>
                )}
                </span>
            </div>
        </div> */}

        {/* --- SECTION 3: EDIT PROFILE FORM --- */}
        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-6 mt-2">
          {/* <div className="grid gap-6">
            <EditableHeadline
              className="rotate-[-1.5deg] bg-white"
              label="First Name"
              onChange={setFirstName}
              placeholder="Enter first name"
              value={firstName}
            />
            <EditableHeadline
              className="rotate-[1deg] bg-white"
              label="Last Name"
              onChange={setLastName}
              placeholder="Enter last name"
              value={lastName}
            />
          </div> */}

            {/* <div className="w-full pt-4 flex justify-center">
                <Button 
                type="submit" 
                size="lg" 
                disabled={isPending || firstName === "" || lastName === ""} 
                className="text-xl w-full max-w-[240px] shadow-[0_6px_0_#000] border-2 border-black"
                >
                {isPending ? "Saving..." : "Save Changes"}
                </Button>
            </div> */}

          {/* {user.cards && user.cards.length > 0 && (
            <div className="flex flex-col gap-2 px-2 mt-2">
              <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">Choose From Your Cards</span>
              <div className="grid grid-cols-3">
                {user.cards.map((card) => {
                  const isSelected = activeCardId === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleUpdateProfileCard(card.id)}
                      className={`w-full flex justify-center items-center rounded-xl font-bold text-sm transition-all ${
                        isSelected && "bg-yellow-200 text-white shadow-yellow-100 shadow-[0_4px_0_#000]" 
                      }`}
                    >
                      <SkyboCard card={card} className="scale-75" />
                    </div>
                  );
                })}
              </div>
            </div>
          )} */}
        </form>

      </div>
    </div>
  );
}