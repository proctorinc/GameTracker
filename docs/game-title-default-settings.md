# Choosing and inserting game title defaults

This guide turns a game's official rules into the default settings used by Score Loser. After following it, a title's settings should open in the game-creation UI exactly as intended and produce the correct play and scoring flow.

Title defaults are a starting configuration. Players can change editable settings while creating a game, and changing a title's defaults does not update games that already exist.

## Where defaults are stored

Defaults belong to an existing row in the `game_title` table:

- `default_settings_version` must be `v2`.
- `default_settings_json` must contain a complete, valid `GameSettingsV2` object.
- The six legacy `default_*` columns are compatibility fields. V2 game creation reads the version and JSON, but a direct write should also store the equivalent projection so older readers and administrative queries do not disagree with V2. The typed update below keeps both representations aligned.

The canonical definitions are in:

- `src/lib/game/v2.ts` for the V2 shape, builder, normalization, and validation.
- `src/components/game/game-settings-v2.ts` and `game-settings-v2-editor.tsx` for the choices exposed by the UI.
- `src/lib/game/itemized-scoring.ts` for score-category formulas.
- `src/lib/db/schema.ts` for the `game_title` columns.

Do not add or edit a migration to set title data. Migrations are for schema changes, and this project requires Drizzle to generate them.

## Start with a rules worksheet

Read the official rules completely before selecting settings. Record the answers to these questions, quoting the relevant rule or page number in your working notes:

1. What fact determines the winner: a numeric total, a selected winner, or the last player remaining?
2. Is score entered repeatedly, or only once when the play-through ends?
3. If play repeats, what does Score Loser need to record after each repetition: each player's score change, one round winner, or eliminated players?
4. Does the overall game end after a fixed count, at a score/win target, or when the group chooses to finish?
5. For numeric scoring, does the highest or lowest final score win?
6. What score does every player start with?
7. Can the official outcome be tied? If not, how do the rules resolve it?
8. What are the official minimum and maximum player counts?
9. Can the official score sheet be represented by named integer inputs and formulas?
10. Does every participant need Score Loser manager access, or should only the creator/managers control play?

Keep a distinction between the rulebook's vocabulary and the app's behavior. A rulebook may call a turn, deal, hand, or phase a “round.” In Score Loser, **Multiple Rounds** means the app records repeated scoring units and maintains an overall result across them. Choose **No rounds** when the app should collect one final result, even if the physical game contains many turns or phases.

## Decision process

Make the decisions in this order. Later choices depend on earlier ones.

### 1. Choose Game Scoring

| Official result | UI choice | Stored `scoringType` | App behavior |
| --- | --- | --- | --- |
| Players gain/lose numeric points | Score points | `points` | Enter score changes or a calculated score breakdown. |
| The rules identify a winner without a meaningful numeric score | Choose the winner | `winner_selection` | Select one winner per round or play-through; a round win adds one to the player's overall score. |
| Players are knocked out until one remains | Elimination | `elimination` | Mark eliminations; with rounds, the last player in a round earns one overall win. |

Do not use **Choose the winner** merely because the rulebook names a winner. Use it only when Score Loser should not track the game's native points. Do not model lives, health, or a descending point total as elimination if the app still needs to compare numeric scores; use **Score points** instead.

### 2. Choose Gameplay

Choose **Multiple Rounds** (`roundConfig.enabled: true`) when the app should close one scoring unit and begin another while retaining overall scores or round wins. Examples include best-of-N play, first-to-N round wins, or a match made of several independently scored hands.

Choose **No rounds** (`roundConfig.enabled: false`) when the app should enter or select the result once at the end. Itemized end-game tallying is a no-round points game.

Important normalization rules:

- A no-round points game always becomes `manual_finish`; target rounds and thresholds are cleared.
- A no-round choose-winner game becomes `manual_finish` and requires one manually selected winner.
- A no-round elimination game becomes `player_eliminated` with `last_man_standing` as its win metric.

### 3. Choose the winner rule

For **Score points**, use `highest_score` when the greatest total wins and `lowest_score` when the smallest total wins.

The other game-scoring choices set this internally:

- Choose winner uses `highest_score`, because each selected round win adds one point.
- Elimination with rounds uses `highest_score`, because each round win adds one point.
- Elimination without rounds uses `last_man_standing`.

`objective_fulfilled` exists in the type vocabulary but is rejected by current validation and must not be stored.

### 4. Choose the end condition

This section is available in the UI only for Multiple Rounds.

| Official ending | UI choice | Stored trigger | Required value |
| --- | --- | --- | --- |
| The group plays until it decides to stop | Free play | `manual_finish` | None |
| The match always ends after N scoring units | Fixed number of rounds | `rounds_exhausted` | Positive `targetRounds` |
| The match ends when a player reaches a score or number of wins | Score threshold / Win target | `points_threshold_reached` | Positive threshold |

For point scoring, the builder derives threshold direction from the winner rule:

- Highest score: `at_least` — end when a score reaches or exceeds the threshold.
- Lowest score: `at_most` — end when a score falls to or below the threshold.

For Choose winner or round-based Elimination, a threshold is a number of round wins and uses `at_least`.

Use Free play when the official ending depends on a deck, board state, objective, or other condition the app cannot observe. `resource_pool_depleted` is currently rejected, so the players must tell the app when such a game is finished.

### 5. Set the initial score

This value applies only to point-scoring games and may be zero, positive, or negative. Use the official starting total. Use zero when scores are accumulated from zero or when an itemized score sheet calculates a final total.

Choose winner and Elimination always normalize the initial score to `0`.

### 6. Decide tie behavior

The current settings editor does not show a tie control, but saved defaults retain `tiePolicy` and gameplay enforces it.

- If the official rules permit a shared result, use `{ "allowTies": true, "resolution": "allow" }`.
- If the official rules require one winner, use `{ "allowTies": false, "resolution": "manual_winner_override" }`. At an automatic ending, tied leaders prevent completion until play produces or a manager supplies a unique winner.
- No-round Elimination always normalizes to `{ "allowTies": false, "resolution": "manual_placement_override" }`.
- No-round Choose winner always normalizes to `{ "allowTies": false, "resolution": "manual_winner_override" }`.

When the rulebook contains a tie-break sequence that Score Loser cannot calculate, set `allowTies` to `false` and let the players apply that sequence before selecting the winner. If the rulebook is silent, prefer allowing ties rather than inventing a rule.

### 7. Set player rules

Use the published supported player count, not a preferred community count:

- Exact N players: set both `minPlayers` and `maxPlayers` to N.
- A range: set both ends of the range.
- Only one bound is official: set that bound and leave the other `null`.
- No reliable official bound: leave both `null`.

Both values must be positive integers, and the minimum cannot exceed the maximum. The app blocks joining above the maximum, blocks starting below the minimum, and protects an active roster from being reduced below the minimum.

`allPlayersAreManagers` is an app permission decision, not usually an official game rule. Set it to `true` only when every participant should be able to manage play and score entry. Otherwise use `false`. Player limits and this manager flag are editable only in the admin title-defaults layout.

### 8. Decide whether to use itemized scoring

Itemized categories are optional and work only with `points`. Use them when the official score can be captured more accurately as a small score sheet than as a single manually entered total. With No rounds, the itemized screen acts as an end-game tally; with Multiple Rounds, it can calculate repeated score entries.

An empty `itemizedCategories` array means ordinary numeric score entry. When Score points is first selected in the defaults editor, the UI may add a starter category as an editing convenience; remove it if the title does not need a score sheet.

For each category define:

- A stable, unique `id` such as `yellow_expedition`. Use lowercase letters, digits, and underscores. Custom play screens can depend on this key.
- A player-facing `name`.
- `optional: false` when every player should enter it, or `true` when it may be omitted and should use its configured defaults.
- A zero-based `sortOrder`.
- `inputMode: "single"` with exactly one input, or `"multi"` with at least two inputs.
- One or more inputs, each with a unique formula-safe `key`, a label, and an integer `defaultValue`.
- A formula using only that category's input keys.
- Optional short `helpText`.

Formulas support `+`, `-`, `*`, `/`, `%`, comparisons (`<`, `<=`, `>`, `>=`, `==`, `!=`), parentheses, and the helpers `abs`, `bonus_if_ge`, `ceil`, `floor`, `if`, `max`, `min`, and `round`. Formula results and entered values are stored as integers. Validate representative low, high, zero, bonus, and penalty cases manually. In particular, make sure no permitted input can divide or modulo by zero.

The title-default action restricts custom itemized scoring and player-rule defaults to admins. A direct database write bypasses that authorization check, so treat review by an admin as required.

## Build the settings with application code

Do not hand-compose the final JSON. Use `buildCreateGameSettingsFromTemplate` (or `validateGameSettingsV2` for an exceptional configuration) so the same normalization and validation as the UI runs before the database changes.

This example represents a highest-score game played over exactly six rounds:

```ts
const settings = buildCreateGameSettingsFromTemplate({
  template: "point_scoring",
  roundsEnabled: true,
  endConditionMode: "fixed_rounds",
  winMetric: "highest_score",
  targetRounds: 6,
  initialPlayerScore: 0,
  allowTies: true,
  playerConfig: {
    minPlayers: 2,
    maxPlayers: 4,
    allPlayersAreManagers: false,
  },
  itemizedCategories: [],
});
```

Common alternatives are:

```ts
// One selected winner per round; first to five round wins.
buildCreateGameSettingsFromTemplate({
  template: "choose_winner",
  roundsEnabled: true,
  endConditionMode: "score_threshold",
  thresholdValue: 5,
  allowTies: false,
});

// One play-through in which eliminated players receive placements.
buildCreateGameSettingsFromTemplate({
  template: "elimination",
  roundsEnabled: false,
});

// One final, lowest-score tally. An itemized score sheet may be supplied.
buildCreateGameSettingsFromTemplate({
  template: "point_scoring",
  roundsEnabled: false,
  winMetric: "lowest_score",
  initialPlayerScore: 0,
  allowTies: true,
  itemizedCategories: [],
});
```

## Insert the defaults directly into the database

In most cases this is an **update** to an existing `game_title` row, not an insert of a new row. If the title does not exist, add it first with `npm run db:titles:import -- path/to/titles.json`, then run the defaults update.

Use a temporary TypeScript script so the write is validated, parameterized, compatible with local SQLite and remote libSQL, and keeps the legacy columns in sync. Create `scripts/set-game-title-defaults.ts` with the following skeleton, replace the title and settings block, review the database target, run it once, and then remove the temporary script:

```ts
import {
  getGameTitleByNormalizedTitle,
  updateGameTitleDefaults,
} from "../src/lib/db/store/game.store";
import {
  buildCreateGameSettingsFromTemplate,
  parseGameSettingsV2,
  projectV2SettingsToLegacy,
  serializeGameSettingsV2,
} from "../src/lib/game/v2";
import { normalizeGameTitleDefaults } from "../src/lib/game/title-defaults";

async function main() {
  const titleName = "Example Game";
  const normalizedTitle = titleName.trim().replace(/\s+/g, " ").toLowerCase();

  const settings = buildCreateGameSettingsFromTemplate({
    template: "point_scoring",
    roundsEnabled: true,
    endConditionMode: "fixed_rounds",
    winMetric: "highest_score",
    targetRounds: 6,
    initialPlayerScore: 0,
    allowTies: true,
    playerConfig: {
      minPlayers: 2,
      maxPlayers: 4,
      allPlayersAreManagers: false,
    },
    itemizedCategories: [],
  });

  const title = await getGameTitleByNormalizedTitle(normalizedTitle);
  if (!title) {
    throw new Error(`No active game title found for "${normalizedTitle}"`);
  }

  const projected = projectV2SettingsToLegacy(settings);
  const updated = await updateGameTitleDefaults(
    title.id,
    normalizeGameTitleDefaults({
      defaultScoringMode: projected.scoringMode,
      defaultEndingMode: projected.endingMode,
      defaultTrackRounds: projected.trackRounds,
      defaultTargetRounds: projected.targetRounds,
      defaultScoreThreshold: projected.scoreThreshold,
      defaultScoreThresholdDirection: projected.scoreThresholdDirection,
    }),
    settings,
  );

  if (!updated) throw new Error("The title disappeared during the update");

  const stored = parseGameSettingsV2(updated.defaultSettingsJson);
  if (
    !stored ||
    serializeGameSettingsV2(stored) !== serializeGameSettingsV2(settings)
  ) {
    throw new Error("Stored defaults did not round-trip correctly");
  }

  console.log({
    databaseTitle: updated.title,
    id: updated.id,
    version: updated.defaultSettingsVersion,
    settings: stored,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

For the normal local development database (`file:./data/dev.sqlite`):

```bash
node --import tsx scripts/set-game-title-defaults.ts
```

For a configured production database, load the production environment explicitly:

```bash
node --env-file=.env.production --import tsx scripts/set-game-title-defaults.ts
```

Before a production write, back up the database using the database provider's supported backup mechanism and confirm that `DATABASE_URL` identifies the intended environment. Never point a development command at production by casually overriding `DATABASE_URL` in the shell.

## Verification checklist

Complete all of these checks before considering a title finished:

1. The script prints the expected title ID and `version: "v2"`.
2. The printed settings match the worksheet after normalization. Pay special attention to no-round endings, tie policy, threshold direction, and cleared fields.
3. Open the title in the admin title-defaults page. Confirm its summary, scoring choice, gameplay choice, winner, ending, initial score, player limits, and itemized categories.
4. Start a new game from the title. Confirm the settings are marked as title defaults and the correct play screen opens.
5. Exercise one realistic game through completion. For itemized scoring, calculate at least one player by hand and compare every category and the total.
6. Test boundaries: minimum roster, maximum roster, ending exactly at the round/score target, a tie, and any official tie-break path.
7. Confirm an older game using the same title was not changed.

If the admin page fails to load after the write, treat the defaults as invalid even if the database accepted the text. Restore the prior values or correct the settings through the validated script; do not patch migration files.

## Final review standard

A default is valid only when all three statements are true:

1. **Rules-correct:** it represents the official winner, scoring, repetition, ending, ties, and player count without inventing behavior.
2. **UI-correct:** the game-creation summary and play screen communicate the intended flow using Score Loser's meaning of rounds and scoring.
3. **Data-correct:** `validateGameSettingsV2` accepts it, the legacy columns match the V2 projection, and a stored/read-back value is unchanged.

When the app cannot observe an official condition, prefer a truthful manual action over an automatic setting that only approximates the rule.
