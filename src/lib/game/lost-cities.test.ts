import { describe, expect, it } from "vitest";
import { buildLostCitiesGameSettingsTemplate } from "./lost-cities";

describe("Lost Cities itemized defaults", () => {
  it("uses five expeditions by default", () => {
    const settings = buildLostCitiesGameSettingsTemplate();

    expect(settings.itemizedCategories).toHaveLength(5);
    expect(settings.itemizedCategories.map((category) => category.id)).not.toContain(
      "purple_expedition",
    );
    expect(settings.itemizedCategories[0]).toMatchObject({
      id: "yellow_expedition",
      name: "Yellow Expedition",
      inputMode: "multi",
    });
    expect(settings.playerConfig).toMatchObject({ minPlayers: 2, maxPlayers: 2 });
  });

  it("adds the purple expedition when six are selected", () => {
    const settings = buildLostCitiesGameSettingsTemplate(6);

    expect(settings.itemizedCategories).toHaveLength(6);
    expect(settings.itemizedCategories.at(-1)?.id).toBe("purple_expedition");
  });
});
