import { describe, expect, it } from '@jest/globals';

import { appLanguages } from './languages';

type Tree = { [key: string]: string | Tree };
const flat = (tree: Tree, prefix = ''): [string, string][] =>
  Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [[prefix + k, v] as [string, string]] : flat(v, `${prefix}${k}.`)));
const holes = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
// English's singular forms are its own: the other languages word counts to read right for any number.
const english = flat(appLanguages[0].strings as Tree).filter(([key]) => !key.endsWith('_one'));

describe.each(appLanguages.slice(1).map((l) => [l.name, l] as const))('%s', (_, language) => {
  const strings = Object.fromEntries(flat(language.strings as Tree));
  it("has every one of the app's own strings, with English's placeholders", () => {
    expect(english.filter(([key]) => !strings[key]).map(([key]) => key)).toEqual([]);
    expect(english.filter(([key, text]) => strings[key] && holes(strings[key]).join() !== holes(text).join()).map(([key]) => key)).toEqual([]);
  });
});
