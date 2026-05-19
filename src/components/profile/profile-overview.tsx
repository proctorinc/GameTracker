"use client";

import { useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Camera, MapPin, Plus, Save, Sparkles, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthMeGroup, AuthMeUser } from "@/lib/auth/auth-me";

type ReferralStatus = "pending" | "accepted" | "declined";

interface ReferralGroupSummary {
  id: string;
  city: string | null;
  region: string | null;
  display_location: string | null;
  users: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
}

interface ReferralRelationship {
  id: string;
  referrer_group_id: string;
  referee_group_id: string;
  status: ReferralStatus;
}

export interface ProfileOverviewProps {
  user: AuthMeUser;
  group: AuthMeGroup;
  network: {
    groups: ReferralGroupSummary[];
    referrals: ReferralRelationship[];
  };
  pendingReferrals: ReferralRelationship[];
}

const FALLBACK_CITIES = [
  "Los Angeles, CA",
  "San Diego, CA",
  "San Francisco, CA",
  "Sacramento, CA",
  "Seattle, WA",
  "Portland, OR",
  "Phoenix, AZ",
  "Denver, CO",
  "Austin, TX",
  "Chicago, IL",
  "New York, NY",
  "Nashville, TN",
];

function formatUserName(user: Pick<AuthMeUser, "first_name" | "last_name">) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || "Your profile";
}

function getInitials(user: Pick<AuthMeUser, "first_name" | "last_name" | "phone_last4">) {
  const letters = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return letters || user.phone_last4.slice(0, 2);
}

function formatGroupLabel(group: ReferralGroupSummary | undefined) {
  if (!group) {
    return "Unknown connection";
  }

  const names = group.users
    .map((member) => [member.first_name, member.last_name].filter(Boolean).join(" ").trim())
    .filter(Boolean);

  if (names.length > 0) {
    return names.join(", ");
  }

  const fallbackLocation =
    group.display_location ?? [group.city, group.region].filter(Boolean).join(", ");

  return fallbackLocation || "Unnamed group";
}

function formatLocation(group: Pick<AuthMeGroup, "display_location" | "city" | "region" | "country">) {
  const fallbackLocation = [group.city, group.region ?? group.country]
    .filter(Boolean)
    .join(", ");

  return group.display_location ?? fallbackLocation;
}

function formatStatusLabel(status: ReferralStatus) {
  if (status === "accepted") {
    return "Connected";
  }

  if (status === "pending") {
    return "Pending";
  }

  return "Declined";
}

function getStatusClasses(status: ReferralStatus) {
  if (status === "accepted") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  }

  if (status === "pending") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }

  return "border-slate-400/20 bg-slate-500/10 text-slate-700";
}

function buildCityOptions(groups: ReferralGroupSummary[], currentGroup: AuthMeGroup) {
  const values = new Set(FALLBACK_CITIES);

  for (const group of groups) {
    const location = group.display_location ?? [group.city, group.region].filter(Boolean).join(", ");
    if (location) {
      values.add(location);
    }
  }

  const currentLocation = formatLocation(currentGroup);
  if (currentLocation) {
    values.add(currentLocation);
  }

  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function buildConnectionEntries(input: {
  currentGroupId: string;
  groups: ReferralGroupSummary[];
  referrals: ReferralRelationship[];
  pendingReferrals: ReferralRelationship[];
  direction: "incoming" | "outgoing";
}) {
  const allRelationships = [...input.referrals, ...input.pendingReferrals];
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const seen = new Set<string>();

  return allRelationships.flatMap((relationship) => {
    const isIncoming = relationship.referee_group_id === input.currentGroupId;
    const isOutgoing = relationship.referrer_group_id === input.currentGroupId;

    if (input.direction === "incoming" && !isIncoming) {
      return [];
    }

    if (input.direction === "outgoing" && !isOutgoing) {
      return [];
    }

    if (seen.has(relationship.id)) {
      return [];
    }

    seen.add(relationship.id);
    const otherGroupId = isIncoming
      ? relationship.referrer_group_id
      : relationship.referee_group_id;

    return [
      {
        id: relationship.id,
        label: formatGroupLabel(groupsById.get(otherGroupId)),
        status: relationship.status,
      },
    ];
  });
}

function AddConnectionForm({
  value,
  onChange,
  onAdd,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-foreground/15 bg-background/70 p-3 sm:flex-row">
      <input
        aria-label={label}
        className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAdd();
          }
        }}
        placeholder={label}
        value={value}
      />
      <Button className="h-11 rounded-xl px-4" onClick={onAdd} type="button">
        <Plus />
        Add
      </Button>
    </div>
  );
}

export function ProfileOverview({
  user,
  group,
  network,
  pendingReferrals,
}: ProfileOverviewProps) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [location, setLocation] = useState(formatLocation(group));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [incomingDraft, setIncomingDraft] = useState("");
  const [outgoingDraft, setOutgoingDraft] = useState("");
  const cityListId = useId();

  const cityOptions = useMemo(
    () => buildCityOptions(network.groups, group),
    [group, network.groups],
  );
  const initialIncoming = useMemo(
    () =>
      buildConnectionEntries({
        currentGroupId: group.id,
        groups: network.groups,
        referrals: network.referrals,
        pendingReferrals,
        direction: "incoming",
      }),
    [group.id, network.groups, network.referrals, pendingReferrals],
  );
  const initialOutgoing = useMemo(
    () =>
      buildConnectionEntries({
        currentGroupId: group.id,
        groups: network.groups,
        referrals: network.referrals,
        pendingReferrals,
        direction: "outgoing",
      }),
    [group.id, network.groups, network.referrals, pendingReferrals],
  );
  const [incomingConnections, setIncomingConnections] = useState(initialIncoming);
  const [outgoingConnections, setOutgoingConnections] = useState(initialOutgoing);

  const profileName = [firstName, lastName].filter(Boolean).join(" ").trim() || formatUserName(user);
  const initials = getInitials({ first_name: firstName, last_name: lastName, phone_last4: user.phone_last4 });

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
  }

  function addIncomingConnection() {
    const value = incomingDraft.trim();
    if (!value) {
      return;
    }

    setIncomingConnections((current) => [
      ...current,
      {
        id: `incoming-${value}-${current.length}`,
        label: value,
        status: "pending",
      },
    ]);
    setIncomingDraft("");
  }

  function addOutgoingConnection() {
    const value = outgoingDraft.trim();
    if (!value) {
      return;
    }

    setOutgoingConnections((current) => [
      ...current,
      {
        id: `outgoing-${value}-${current.length}`,
        label: value,
        status: "pending",
      },
    ]);
    setOutgoingDraft("");
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(255,196,112,0.28),transparent_35%),linear-gradient(180deg,#fffaf2_0%,#ffffff_48%,#f7f8fb_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-black/8 bg-white/90 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.4)] backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(14,165,233,0.14),rgba(248,250,252,0))]" />
          <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-300/20 blur-3xl" />

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[360px_1fr] lg:p-10">
            <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.84))] p-6 text-center shadow-sm">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100/70 px-3 py-1 text-xs font-medium tracking-[0.18em] text-amber-900 uppercase">
                <Sparkles className="size-3.5" />
                Profile
              </div>

              <label className="group relative mb-5 block cursor-pointer">
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                  type="file"
                />
                <div className="relative h-40 w-40 overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(145deg,#f59e0b,#fb7185,#38bdf8)] p-[3px] shadow-[0_16px_40px_-18px_rgba(15,23,42,0.5)]">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.8rem] bg-slate-950 text-white">
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${profileName} profile`}
                        className="h-full w-full object-cover"
                        src={photoPreview}
                      />
                    ) : (
                      <span className="text-5xl font-semibold tracking-tight">{initials}</span>
                    )}
                  </div>
                </div>
                <div className="absolute inset-x-4 bottom-3 flex items-center justify-center gap-2 rounded-full bg-slate-950/80 px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                  <Camera className="size-3.5" />
                  Upload photo
                </div>
              </label>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{profileName}</h1>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                Put a face to your Skyjo profile and make it easier for your network to know who is who.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Member ending in {user.phone_last4}
                </span>
                {location ? (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                    {location}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="mb-6 max-w-2xl">
                <p className="mb-3 text-sm font-medium tracking-[0.2em] text-slate-500 uppercase">
                  Make it yours
                </p>
                <h2 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Keep your Skyjo profile front and center.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Add the basics now so people can recognize you, place you, and understand how your Skyjo connections came together.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">First name</span>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-12 w-full rounded-2xl border border-border bg-white px-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="First name"
                      value={firstName}
                    />
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Last name</span>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-12 w-full rounded-2xl border border-border bg-white px-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Last name"
                      value={lastName}
                    />
                  </div>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Location</span>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-12 w-full rounded-2xl border border-border bg-white px-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5"
                      list={cityListId}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Search for your city"
                      value={location}
                    />
                    <datalist id={cityListId}>
                      {cityOptions.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button className="h-11 rounded-xl px-5" type="button">
                  <Save />
                  Save changes
                </Button>
                <p className="text-sm text-slate-500">
                  This gives you a clean starting point for onboarding and referrals.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[1.75rem] border border-black/8 bg-white/90 py-0 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)]">
            <CardHeader className="border-b border-black/6 px-6 py-6">
              <CardTitle className="text-xl text-slate-950">
                Who referred or bought Skyjo for you
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Track the people who introduced you, gifted the game, or helped bring you in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-6">
              {incomingConnections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 p-5 text-sm text-slate-500">
                  No one has been added yet.
                </div>
              ) : (
                incomingConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{connection.label}</p>
                        <p className="text-sm text-slate-500">Incoming connection</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(connection.status)}`}
                    >
                      {formatStatusLabel(connection.status)}
                    </span>
                  </div>
                ))
              )}

              <AddConnectionForm
                label="Add a name, household, or note"
                onAdd={addIncomingConnection}
                onChange={setIncomingDraft}
                value={incomingDraft}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border border-black/8 bg-white/90 py-0 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)]">
            <CardHeader className="border-b border-black/6 px-6 py-6">
              <CardTitle className="text-xl text-slate-950">
                Who did you buy or refer Skyjo to
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Keep a lightweight list of the people you have introduced, gifted, or sent into the network.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-6">
              {outgoingConnections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 p-5 text-sm text-slate-500">
                  No outgoing referrals or purchases added yet.
                </div>
              ) : (
                outgoingConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{connection.label}</p>
                        <p className="text-sm text-slate-500">Outgoing connection</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(connection.status)}`}
                    >
                      {formatStatusLabel(connection.status)}
                    </span>
                  </div>
                ))
              )}

              <AddConnectionForm
                label="Add someone you referred or bought for"
                onAdd={addOutgoingConnection}
                onChange={setOutgoingDraft}
                value={outgoingDraft}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
