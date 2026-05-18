import { fakerEN_US as faker } from "@faker-js/faker";

/** Documented hub account for exploring referral networks. */
export const DEMO_HUB_PHONE = "+15550009999";

function runWithSeed<T>(seq: number, salt: number, fn: () => T): T {
  faker.seed(seq * 9973 + salt);
  faker.setDefaultRefDate(new Date("2024-06-01"));
  return fn();
}

/** Demo phones: +1555000XXXX (e.g. +15550001001). */
export function demoPhone(seq: number): string {
  return `+1555000${String(seq).padStart(4, "0")}`;
}

export function demoName(seq: number): { first_name: string; last_name: string } {
  return runWithSeed(seq, 1, () => ({
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
  }));
}

export interface DemoLocation {
  city: string;
  region: string;
  latitude: number;
  longitude: number;
}

export function demoLocation(seq: number): DemoLocation {
  return runWithSeed(seq, 2, () => ({
    city: faker.location.city(),
    region: faker.location.state({ abbreviated: true }),
    latitude: Number(faker.location.latitude({ max: 49, min: 25 })),
    longitude: Number(faker.location.longitude({ max: -66, min: -125 })),
  }));
}
