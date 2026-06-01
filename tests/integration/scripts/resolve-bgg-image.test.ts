import { describe, expect, it } from "vitest";
import {
  chooseBestSearchResult,
  extractPicIdFromUrl,
  matchesPicId,
  parseSearchResults,
  parseThingImage,
} from "../../../scripts/resolve-bgg-image";

describe("resolve-bgg-image helpers", () => {
  it("extracts the pic id from a geekdo thumbnail url", () => {
    expect(
      extractPicIdFromUrl(
        "https://cf.geekdo-images.com/NMNeoJY6aU6C2EJz67YEfA__micro@2x/img/rJtwiOkQksggrFtIzO5ymNXPRPI=/fit-in/128x128/filters:strip_icc()/pic4559127.jpg",
      ),
    ).toBe(4559127);
  });

  it("parses the original image and thumbnail from a thing response", () => {
    const xml = `
      <items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
        <item type="boardgame" id="174430">
          <thumbnail>https://cf.geekdo-images.com/example__thumb/img/thumb=/fit-in/200x150/filters:strip_icc()/pic2634104.jpg</thumbnail>
          <image>https://cf.geekdo-images.com/example__original/img/original=/0x0/filters:format(jpeg)/pic2634104.jpg</image>
          <name type="primary" sortindex="1" value="Gloomhaven" />
        </item>
      </items>
    `;

    expect(parseThingImage(xml)).toEqual({
      id: 174430,
      name: "Gloomhaven",
      thumbnail:
        "https://cf.geekdo-images.com/example__thumb/img/thumb=/fit-in/200x150/filters:strip_icc()/pic2634104.jpg",
      image:
        "https://cf.geekdo-images.com/example__original/img/original=/0x0/filters:format(jpeg)/pic2634104.jpg",
    });
  });

  it("parses search results and prefers the closest title match", () => {
    const xml = `
      <items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
        <item type="boardgame" id="1">
          <name type="primary" value="Skyjo" />
          <yearpublished value="2015" />
        </item>
        <item type="boardgame" id="2">
          <name type="primary" value="Skyjo Action" />
          <yearpublished value="2021" />
        </item>
      </items>
    `;

    const results = parseSearchResults(xml);
    expect(results).toEqual([
      { id: 1, name: "Skyjo", yearPublished: 2015 },
      { id: 2, name: "Skyjo Action", yearPublished: 2021 },
    ]);

    expect(chooseBestSearchResult("Skyjo", results)).toEqual(results[0]);
  });

  it("matches the expected pic id against either the original or thumbnail url", () => {
    expect(
      matchesPicId(
        {
          image:
            "https://cf.geekdo-images.com/example__original/img/original=/0x0/filters:format(jpeg)/pic4559127.jpg",
          thumbnail:
            "https://cf.geekdo-images.com/example__thumb/img/thumb=/fit-in/200x150/filters:strip_icc()/pic4559127.jpg",
        },
        4559127,
      ),
    ).toBe(true);

    expect(
      matchesPicId(
        {
          image:
            "https://cf.geekdo-images.com/example__original/img/original=/0x0/filters:format(jpeg)/pic1111111.jpg",
          thumbnail:
            "https://cf.geekdo-images.com/example__thumb/img/thumb=/fit-in/200x150/filters:strip_icc()/pic1111111.jpg",
        },
        4559127,
      ),
    ).toBe(false);
  });
});
