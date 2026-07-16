"use client";

import type { ReactNode } from "react";
import type { DashboardPageData } from "@/app/actions/pages/dashboard";
import { getDisplayName } from "@/app/(protected)/friends/_components/utils";
import ProfilePicture from "@/components/profile/profile-picture";
import RankChip from "@/components/player-rank/RankChip";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  Map,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  DashboardPageProvider,
  useDashboardPage,
} from "./dashboard-page-provider";
import {
  formatGameDate,
  getOrdinalLabel,
  getPlayerLabel,
  getPlayerPlacementDisplay,
  getPlayersOrderedByPlacement,
} from "./utils";
import {
  AdventureTextureProvider,
  ExpeditionMaterialsAtelier,
  MaterialIcon,
  TreasureMapArtwork,
  WaxSeal,
} from "./adventure-sandbox-ui";
import styles from "./dashboard-style-demo.module.css";

type MaterialIconName = "compass" | "crown" | "map" | "scroll" | "swords" | "trophy";

function DemoStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: MaterialIconName;
}) {
  return (
    <div className={styles.stat}>
      <MaterialIcon name={icon} />
      <p>{label}</p>
      <p>{value}</p>
    </div>
  );
}

function DemoSection({
  title,
  eyebrow,
  icon,
  seal,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: MaterialIconName;
  seal?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(styles.panel, styles.sectionPanel)}>
      <div className={styles.sectionHeading}>
        <MaterialIcon name={icon} />
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className={styles.paperInset}>{children}</div>
      {seal ? <WaxSeal mark={seal} className={styles.sectionSeal} /> : null}
    </section>
  );
}

function EmptyState({ title, copy }: { title: string; copy?: string }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {copy ? <p>{copy}</p> : null}
    </div>
  );
}

function QuestRow({
  title,
  subtitle,
  status,
  href,
}: {
  title: string;
  subtitle: string;
  status: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className={styles.row}>
      <MaterialIcon name="swords" />
      <div className="min-w-0">
        <p className={styles.rowTitle}>{title}</p>
        <p className={styles.rowSubtitle}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {status}
        <ArrowRight className={styles.rowArrow} aria-hidden="true" />
      </div>
    </Link>
  );
}

function DashboardStyleDemoContent() {
  const {
    user,
    incomingInvitations,
    canViewPlayerRank,
    playerRankPosition,
    playerRankTotal,
    playerRankRecentChangeSummary,
    recentActiveGames,
    recentCompletedGames,
    recentGameTitles,
    handleAcceptInvitation,
    handleDeclineInvitation,
    isPending,
  } = useDashboardPage();

  const activePreviewGames = recentActiveGames.slice(0, 3);
  const completedPreviewGames = recentCompletedGames.slice(0, 3);
  const recentTitlePreview = recentGameTitles.slice(0, 4);

  return (
    <AdventureTextureProvider>
      <div className={styles.shell}>
        <div className={styles.content}>
          <Link href="/admin" className={styles.backLink}>
            <Map className="size-3.5" aria-hidden="true" />
            Back to admin
          </Link>

          <section className={cn(styles.board, styles.hero)}>
            <div className={styles.heroCopy}>
              <div className={styles.badges}>
                <span className={styles.badge}>Admin-only preview</span>
                <span className={cn(styles.badge, styles.badgeWax)}>Treasure-map sandbox</span>
              </div>
              <p className={cn(styles.eyebrow, "mt-5")}>The cartographer&apos;s ledger</p>
              <h1>{user.firstName}, the next game is somewhere beyond the ink.</h1>
              <p className={styles.heroDescription}>
                Your live table has been redrawn as an expedition desk: parchment carries the story,
                dark timber holds the weight, and worn gold marks every prize worth chasing.
              </p>
              <div className={styles.statGrid}>
                <DemoStat
                  label="Current standing"
                  value={canViewPlayerRank && playerRankPosition ? `#${playerRankPosition}` : "Unranked"}
                  icon="crown"
                />
                <DemoStat label="Active routes" value={String(recentActiveGames.length)} icon="swords" />
                <DemoStat label="Sealed messages" value={String(incomingInvitations.length)} icon="scroll" />
              </div>
              <WaxSeal mark="SL" className={styles.heroSeal} />
            </div>

            <div className={styles.heroMap}>
              <TreasureMapArtwork />
            </div>
          </section>

          <ExpeditionMaterialsAtelier />

          <div className={styles.dashboardGrid}>
            <div className={styles.column}>
              <DemoSection title="Quest path" eyebrow="Active games" icon="compass" seal="I">
                <div className={styles.list}>
                  {activePreviewGames.length > 0 ? (
                    activePreviewGames.map((game) => {
                      const placement = getPlayerPlacementDisplay(game, user.id, "");
                      const orderedPlayers = getPlayersOrderedByPlacement(game)
                        .slice(0, 3)
                        .map((player) => getPlayerLabel(player, user.id))
                        .join(" • ");

                      return (
                        <QuestRow
                          key={game.id}
                          href={`/game/${game.id}/play`}
                          title={game.gameTitle?.title ?? "Untitled game"}
                          subtitle={orderedPlayers || "A new party is gathering"}
                          status={
                            <span className={styles.statusBadge}>
                              {placement?.label ?? "Waiting"}
                            </span>
                          }
                        />
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No routes have been charted."
                      copy="Start a game to press the first waypoint into the map."
                    />
                  )}
                </div>
              </DemoSection>

              <DemoSection title="Archive ledger" eyebrow="Completed games" icon="scroll" seal="II">
                <div className={styles.list}>
                  {completedPreviewGames.length > 0 ? (
                    completedPreviewGames.map((game) => {
                      const placement = getPlayerPlacementDisplay(game, user.id, "");
                      return (
                        <Link key={game.id} href={`/game/${game.id}/play`} className={styles.row}>
                          <MaterialIcon name="map" />
                          <div className="min-w-0">
                            <p className={styles.rowTitle}>{game.gameTitle?.title ?? "Untitled game"}</p>
                            <p className={styles.rowSubtitle}>
                              Finished {formatGameDate(game.completedAt)} · Party of {game.players.length}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {game.currentUserRankDelta ? (
                              <RankChip
                                delta={game.currentUserRankDelta.deltaFormatted}
                                size="sm"
                                className="border-[#6c471d] bg-[#dfbd73] text-[#2b190c] dark:bg-[#dfbd73] dark:text-[#2b190c]"
                              />
                            ) : placement ? (
                              <span className={styles.statusBadge}>{placement.label}</span>
                            ) : null}
                            <ArrowRight className={styles.rowArrow} aria-hidden="true" />
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <EmptyState title="No finished chronicles yet." />
                  )}
                </div>
              </DemoSection>

              <DemoSection title="Recent titles" eyebrow="The map shelf" icon="map">
                {recentTitlePreview.length > 0 ? (
                  <div className={styles.titleGrid}>
                    {recentTitlePreview.map((title) => (
                      <Link
                        key={title.id}
                        href={`/titles/${title.id}`}
                        className={styles.titleCard}
                        aria-label={`Open ${title.title}`}
                      >
                        <div
                          className={styles.titleImage}
                          style={{
                            backgroundColor: title.color ?? "#5b3a1c",
                            backgroundImage: title.imageUrl
                              ? `linear-gradient(rgba(45,22,8,.08), rgba(27,11,4,.62)), url("${title.imageUrl}")`
                              : "linear-gradient(135deg,#8b642d,#3b1c0c)",
                            backgroundPosition: `center ${title.imageVerticalFocus ?? 50}%`,
                          }}
                          aria-hidden="true"
                        />
                        <div className={styles.titleInfo}>
                          <div>
                            <strong>{title.title}</strong>
                            <span>Open chart and records</span>
                          </div>
                          <ArrowRight className="size-4 text-[#e8ba57]" aria-hidden="true" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No titles have reached the shelf." />
                )}
              </DemoSection>
            </div>

            <div className={styles.column}>
              <DemoSection title="Message scrolls" eyebrow="Invitations" icon="scroll" seal="III">
                <div className={styles.list}>
                  {incomingInvitations.length > 0 ? (
                    incomingInvitations.map((invitation) => (
                      <div key={invitation.id} className={cn(styles.row, styles.invitationRow)}>
                        <ProfilePicture user={invitation.inviter} size="sm" />
                        <div className={styles.invitationCopy}>
                          <span className={styles.rowTitle}>{getDisplayName(invitation.inviter)}</span>
                          <p className={styles.rowSubtitle}>
                            {invitation.kind === "claim_guest"
                              ? "Wants to claim guest history"
                              : "Sent a friend invitation"}
                          </p>
                        </div>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            disabled={isPending}
                            className={styles.iconButton}
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            aria-label="Accept invitation"
                          >
                            <Check className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            className={cn(styles.iconButton, styles.iconButtonSecondary)}
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            aria-label="Decline invitation"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="The scroll tube is empty."
                      copy="No invitations are waiting at the expedition desk."
                    />
                  )}
                </div>
              </DemoSection>

              <DemoSection title="Begin an expedition" eyebrow="Quest launcher" icon="swords">
                <div className={styles.questLaunch}>
                  <h3>Set a fresh course.</h3>
                  <p>
                    Choose a title, gather the crew, and mark a new route using the same setup flow as the live dashboard.
                  </p>
                  <Link href="/game/create/settings" className={styles.primaryAction}>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Start a new game
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </DemoSection>

              <DemoSection title="Treasure tally" eyebrow="Player rank" icon="trophy">
                <div>
                  <p className={styles.rowTitle}>The quartermaster&apos;s count</p>
                  <p className={styles.rowSubtitle}>
                    Your live standing is stamped into the expedition ledger.
                  </p>
                  <div className={styles.rankGrid}>
                    <div className={styles.rankCell}>
                      <p>Position</p>
                      <p>{playerRankPosition ? getOrdinalLabel(playerRankPosition) : "TBD"}</p>
                    </div>
                    <div className={styles.rankCell}>
                      <p>Total</p>
                      <p>{playerRankTotal ?? "0"}</p>
                    </div>
                  </div>
                  {playerRankRecentChangeSummary?.netChange ? (
                    <div className="mt-4">
                      <RankChip
                        delta={playerRankRecentChangeSummary.netChange.deltaFormatted}
                        size="sm"
                        className="border-[#6c471d] bg-[#d7ad58] text-[#2b190c] dark:bg-[#d7ad58] dark:text-[#2b190c]"
                      />
                    </div>
                  ) : null}
                </div>
              </DemoSection>
            </div>
          </div>
        </div>
      </div>
    </AdventureTextureProvider>
  );
}

export function DashboardStyleDemoView({ data }: { data: DashboardPageData }) {
  return (
    <DashboardPageProvider data={data}>
      <DashboardStyleDemoContent />
    </DashboardPageProvider>
  );
}
