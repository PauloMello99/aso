import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bumpSemver,
  compareSemver,
  isValidSemver,
  parseSemver,
} from "./semver.mjs";

test("isValidSemver aceita só MAJOR.MINOR.PATCH", () => {
  assert.equal(isValidSemver("1.2.3"), true);
  assert.equal(isValidSemver("0.0.0"), true);
  for (const bad of ["1.2", "1.2.3.4", "v1.2.3", "1.2.3-beta", "", "a.b.c", null, 1]) {
    assert.equal(isValidSemver(bad), false, String(bad));
  }
});

test("parseSemver converte e lança se inválido", () => {
  assert.deepEqual(parseSemver("1.2.3"), { major: 1, minor: 2, patch: 3 });
  assert.throws(() => parseSemver("1.2"));
});

test("compareSemver retorna -1, 0 ou 1", () => {
  assert.equal(compareSemver("1.2.3", "1.2.3"), 0);
  assert.equal(compareSemver("1.2.3", "1.2.4"), -1);
  assert.equal(compareSemver("1.3.0", "1.2.9"), 1);
  assert.equal(compareSemver("2.0.0", "1.9.9"), 1);
  assert.equal(compareSemver("1.10.0", "1.9.0"), 1);
});

test("bumpSemver zera minor/patch conforme o tipo", () => {
  assert.equal(bumpSemver("1.2.3", "major"), "2.0.0");
  assert.equal(bumpSemver("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpSemver("1.2.3", "patch"), "1.2.4");
  assert.throws(() => bumpSemver("1.2.3", "huge"));
});
