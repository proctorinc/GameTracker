import { eq } from "drizzle-orm";
import { faker } from "@faker-js/faker";
import * as schema from "../db/schema"; // Adjust this path to your actual schema file location
import { db } from "../db";
import { addPlayerToGame, createGame } from "../db/store/game.store";
import { backfillMissingPlayerRankResults } from "../db/store/player-rank.store";

const DEMO_ADMIN_EMAIL = "admin@demo.com";

function createTitlePreviewUrl(input: {
  title: string;
  accent: string;
  background: string;
}) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${input.background}" />
          <stop offset="100%" stop-color="${input.accent}" />
        </linearGradient>
      </defs>
      <rect width="640" height="420" rx="36" fill="url(#bg)" />
      <circle cx="520" cy="84" r="98" fill="rgba(255,255,255,0.15)" />
      <circle cx="96" cy="356" r="144" fill="rgba(255,255,255,0.12)" />
      <text
        x="56"
        y="230"
        fill="white"
        font-family="Arial, sans-serif"
        font-size="60"
        font-weight="700"
      >${input.title}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function runDevSeed() {
  console.log("⏳ Seeding database...");

  // Optional: Clear existing data before seeding (Triggers cascades cleanly if set up)
  // Ordered from child tables to parent tables to avoid foreign key constraints during wipe
  await db.delete(schema.gameRoundScores);
  await db.delete(schema.gameRounds);
  await db.delete(schema.gameWinners);
  await db.delete(schema.gamePlayers);
  await db.delete(schema.invitations);
  await db.delete(schema.friendships);
  await db.delete(schema.cardDrops);
  await db.delete(schema.games);
  await db.delete(schema.userGameTitle);
  await db.delete(schema.gameTitle);
  await db.delete(schema.users);

  // --- 2. Seed Main User ---
  const [mainUser] = await db
    .insert(schema.users)
    .values({
      firstName: "Matt",
      lastName: "Proctor",
      color: "#FF5733",
      role: "admin",
      email: DEMO_ADMIN_EMAIL,
      isProfileComplete: true,
      isGuest: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  console.log(`✅ Main user created: ${mainUser.firstName}`);
  console.log(`   Demo email: ${DEMO_ADMIN_EMAIL}`);

  // --- 3. Seed Friends (Other Registered Users) ---
  const totalFriends = 15;
  const friendUsers = [];

  for (let i = 0; i < totalFriends; i++) {
    const [friend] = await db
      .insert(schema.users)
      .values({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        color: faker.color.rgb(),
        isProfileComplete: true,
        isGuest: false,
        createdAt: faker.date.past().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    friendUsers.push(friend);
  }

  // Establish friendships with the main user
  for (const friend of friendUsers) {
    const isInviter = faker.datatype.boolean();
    await db.insert(schema.friendships).values({
      user1Id: mainUser.id,
      user2Id: friend.id,
      inviterId: isInviter ? mainUser.id : friend.id,
      createdAt: faker.date.past().toISOString(),
    });
  }
  console.log(`✅ Seeded ${totalFriends} friends and friendship connections.`);

  for (const friend of faker.helpers.arrayElements(friendUsers, 4)) {
    await db.insert(schema.invitations).values({
      inviterUserId: mainUser.id,
      targetType: "user",
      inviteeUserId: friend.id,
      kind: "friend",
      status: "pending",
      createdAt: faker.date.recent().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // --- 4. Seed Guests ---
  const totalGuests = 5;
  for (let i = 0; i < totalGuests; i++) {
    await db.insert(schema.users).values({
      firstName: `Guest-${faker.person.firstName()}`,
      color: "#888888",
      isProfileComplete: false,
      isGuest: true,
      created_by_user_id: mainUser.id, // Main user generated these guests
      createdAt: new Date().toISOString(),
    });
  }
  console.log(`✅ Seeded ${totalGuests} temporary guest profiles.`);

  // --- 6. Seed Game Titles ---
  const titles = [
    {
      title: "Skyjo",
      color: "#38bdf8",
      defaultScoringMode: "lowest_wins" as const,
      defaultEndingMode: "score_threshold" as const,
      defaultScoreThreshold: 100,
      defaultScoreThresholdDirection: "at_least" as const,
    },
    {
      title: "Wingspan",
      color: "#22c55e",
      defaultScoringMode: "highest_wins" as const,
      defaultEndingMode: "score_threshold" as const,
      defaultScoreThreshold: 21,
      defaultScoreThresholdDirection: "at_least" as const,
    },
    {
      title: "Bananagrams",
      color: "#ef4444",
      defaultScoringMode: "highest_wins" as const,
      defaultEndingMode: "none" as const,
    },
    {
      title: "Uno",
      color: "#f59e0b",
      imageUrl: createTitlePreviewUrl({
        title: "Uno",
        accent: "#f59e0b",
        background: "#7c2d12",
      }),
      defaultScoringMode: "highest_wins" as const,
      defaultEndingMode: "round_count" as const,
      defaultTargetRounds: 7,
    },
  ];
  const gameTitleIdsByName = new Map<string, string>();
  for (const title of titles) {
    const [gameTitle] = await db
      .insert(schema.gameTitle)
      .values({
        title: title.title,
        normalizedTitle: title.title.trim().replace(/\s+/g, " ").toLowerCase(),
        color: title.color,
        imageUrl: title.imageUrl,
        defaultScoringMode: title.defaultScoringMode ?? null,
        defaultEndingMode: title.defaultEndingMode ?? null,
        defaultTargetRounds: title.defaultTargetRounds ?? null,
        defaultScoreThreshold: title.defaultScoreThreshold ?? null,
        defaultScoreThresholdDirection:
          title.defaultScoreThresholdDirection ?? null,
        isUniversal: true,
        createdAt: new Date().toISOString(),
      })
      .returning();

    gameTitleIdsByName.set(title.title, gameTitle.id);
    await db.insert(schema.userGameTitle).values({
      userId: mainUser.id,
      gameTitleId: gameTitle.id,
      source: "admin_seed",
      acquiredAt: new Date().toISOString(),
    });
  }

  // --- 8. Seed Games & Game Players ---
  // Let's create 8 historical games
  for (let i = 0; i < 8; i++) {
    const randomTitle = faker.helpers.arrayElement(titles).title;
    const creator = faker.helpers.arrayElement(friendUsers);
    const isCompleted = faker.datatype.boolean();
    const seededWinnerId = faker.helpers.arrayElement([
      mainUser.id,
      creator.id,
    ]);

    const game = await createGame({
      gameTitleId: gameTitleIdsByName.get(randomTitle)!,
      creatorId: creator.id,
      version: "v1",
      scoringMode: "lowest_wins",
      endingMode: "score_threshold",
      scoreThreshold: 100,
      scoreThresholdDirection: "at_least",
      completedRounds: isCompleted ? faker.number.int({ min: 1, max: 10 }) : 0,
      createdAt: faker.date.past().toISOString(),
      completedAt: isCompleted ? new Date().toISOString() : null,
    });

    // Add Players to this game (Always include mainUser + 2 random friends)
    const currentMatchPlayers = [
      mainUser,
      creator,
      ...faker.helpers.arrayElements(
        friendUsers.filter((friend) => friend.id !== creator.id),
        2,
      ),
    ];

    for (const p of currentMatchPlayers) {
      const gamePlayer = await addPlayerToGame(game.id, p.id);

      if (isCompleted) {
        await db
          .update(schema.gamePlayers)
          .set({
            score: faker.number.int({ min: 10, max: 500 }),
          })
          .where(eq(schema.gamePlayers.id, gamePlayer.id));
      }
    }

    if (isCompleted) {
      await db.insert(schema.gameWinners).values({
        gameId: game.id,
        userId: seededWinnerId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const playerRankBackfill = await backfillMissingPlayerRankResults();
  console.log(
    `✅ Backfilled Player Rank results for ${playerRankBackfill.processedGameCount} completed seeded games.`,
  );

  // --- 5. Create Standard Deck Cards for All Users ---
  // const createStandardCards = async (userId: string) => {
  //   const cards: typeof schema.cards.$inferSelect[] = [];

  //   for (let value = -2; value <= 12; value++) {
  //     for (const suit of ["DARK_BLUE", "LIGHT_BLUE", "GREEN", "YELLOW", "RED"] as const) {
  //       const insertResult = await db.insert(schema.cards).values({
  //         ownerId: userId,
  //         deckName: "standard",
  //         value,
  //         suit,
  //         weight: value * 100,
  //         modifier: "Basic",
  //         probability: (value + 2) * 123 + 456,
  //         suitProbability: 1,
  //         createdAt: new Date().toISOString(),
  //       }).returning();

  //       cards.push(insertResult[0]!);
  //     }
  //   }

  //   // Assign first card as profile card
  //   const firstCard = cards.find(c => c.value === -2 && c.suit === "DARK_BLUE");
  //   if (firstCard) {
  //     await db.update(schema.users).set({
  //       profileCardId: firstCard.id,
  //       isProfileComplete: true,
  //     }).where(eq(schema.users.id, userId));
  //   }

  //   return cards;
  // };

  // const allCards = await Promise.all([
  //   createStandardCards(mainUser.id),
  //   ...friendUsers.map(friend => createStandardCards(friend.id)),
  // ]);

  // // --- 9. Seed Card Drops (Skipping Decks/Cards, but mapping to User & Game) ---
  // for (let i = 0; i < 8; i++) {
  //   const randomTitle = faker.helpers.arrayElement(titles);
  //   const game = await createGame({
  //       gameTitleId: randomTitle,
  //       name: `${randomTitle} Arena Showdown`,
  //       creatorId: faker.helpers.arrayElement(friendUsers).id,
  //       createdAt: faker.date.past().toISOString(),
  //     });

  //   const currentMatchPlayers = [
  //     mainUser,
  //     ...faker.helpers.arrayElements(friendUsers, 2),
  //   ];

  //   for (const p of currentMatchPlayers) {
  //     await db.insert(schema.gamePlayers).values({
  //       gameId: game.id,
  //       userId: p.id,
  //       score: faker.number.int({ min: 10, max: 500 }),
  //     });
  //   }

  //   // Create card drops for this game
  //   await db.insert(schema.cardDrops).values({
  //     userId: mainUser.id,
  //     gameId: game.id,
  //     cardCount: faker.number.int({ min: 1, max: 3 }),
  //     deckName: "standard",
  //   });
  // }

  console.log("✅ Seeded matches, scores, and title definitions.");
  // console.log(
  //   `✅ Created ${allCards.reduce((sum, c) => sum + c.length, 0)} cards total.`,
  // );
  console.log("🚀 Database seeding completed successfully!");
}
