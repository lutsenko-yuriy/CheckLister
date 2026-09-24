import { pluralCategory } from './plural';

describe('pluralCategory', () => {
  it.each`
    n      | category
    ${0}   | ${'other'}
    ${1}   | ${'one'}
    ${2}   | ${'other'}
    ${7}   | ${'other'}
    ${11}  | ${'other'}
    ${21}  | ${'other'}
    ${1.5} | ${'other'}
  `('en $n → $category', ({ n, category }) => {
    expect(pluralCategory('en', n)).toBe(category);
  });

  it.each`
    n     | category
    ${0}  | ${'other'}
    ${1}  | ${'one'}
    ${2}  | ${'other'}
    ${21} | ${'other'}
  `('de $n → $category', ({ n, category }) => {
    expect(pluralCategory('de', n)).toBe(category);
  });

  it.each`
    n      | category
    ${0}   | ${'one'}
    ${1}   | ${'one'}
    ${1.5} | ${'one'}
    ${2}   | ${'other'}
    ${7}   | ${'other'}
    ${21}  | ${'other'}
  `('fr $n → $category', ({ n, category }) => {
    expect(pluralCategory('fr', n)).toBe(category);
  });

  // CLDR ru cardinal samples: one = 1, 21, 31, 101…; few = 2~4, 22~24…;
  // many = 0, 5~20, 25~30, 111~114…; other = decimals.
  it.each`
    n      | category
    ${0}   | ${'many'}
    ${1}   | ${'one'}
    ${2}   | ${'few'}
    ${4}   | ${'few'}
    ${5}   | ${'many'}
    ${11}  | ${'many'}
    ${12}  | ${'many'}
    ${14}  | ${'many'}
    ${20}  | ${'many'}
    ${21}  | ${'one'}
    ${22}  | ${'few'}
    ${25}  | ${'many'}
    ${101} | ${'one'}
    ${111} | ${'many'}
    ${112} | ${'many'}
    ${122} | ${'few'}
    ${1.5} | ${'other'}
  `('ru $n → $category', ({ n, category }) => {
    expect(pluralCategory('ru', n)).toBe(category);
  });

  it('uses the absolute value for negative counts', () => {
    expect(pluralCategory('en', -1)).toBe('one');
    expect(pluralCategory('ru', -22)).toBe('few');
  });
});
