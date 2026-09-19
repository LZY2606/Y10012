import type { Element } from 'domhandler';
import { describe, expect, it } from 'vitest';
import { load } from '../index.js';

function xml(
  source: string,
  mutate: ($: ReturnType<typeof load>) => void,
): string {
  const $ = load(source, { xmlMode: true });
  mutate($);
  return $.html();
}

describe('class-list', () => {
  describe('removeClass() vs removeClass(undefined) vs callback', () => {
    it('classlist: removeClass() creates an empty class attribute when absent', () => {
      expect(xml('<div/>', ($) => $('div').removeClass())).toBe(
        '<div class=""/>',
      );
    });

    it('classlist: removeClass() resets an existing class attribute to empty', () => {
      expect(xml('<div class="a b"/>', ($) => $('div').removeClass())).toBe(
        '<div class=""/>',
      );
    });

    it('classlist: removeClass(undefined) leaves a missing attribute untouched', () => {
      expect(xml('<div/>', ($) => $('div').removeClass(undefined))).toBe(
        '<div/>',
      );
    });

    it('classlist: removeClass(undefined) leaves existing classes untouched', () => {
      expect(
        xml('<div class="a b"/>', ($) => $('div').removeClass(undefined)),
      ).toBe('<div class="a b"/>');
    });

    it('classlist: removeClass(fn) returning undefined falls back to the explicit-undefined branch', () => {
      expect(
        xml('<div class="a b"/>', ($) => $('div').removeClass(() => undefined)),
      ).toBe('<div class="a b"/>');
      expect(xml('<div/>', ($) => $('div').removeClass(() => undefined))).toBe(
        '<div/>',
      );
    });

    it('classlist: removeClass(fn) returning a string removes the returned classes', () => {
      expect(
        xml('<div class="a b c"/>', ($) => $('div').removeClass(() => 'a c')),
      ).toBe('<div class="b"/>');
      expect(
        xml('<div class="a"/>', ($) => $('div').removeClass(() => '  ')),
      ).toBe('<div class="a"/>');
    });
  });

  describe('absent class attribute', () => {
    it('classlist: the six write calls create exactly the attributes the old implementation did', () => {
      expect(xml('<div/>', ($) => $('div').addClass('x'))).toBe(
        '<div class="x"/>',
      );
      expect(xml('<div/>', ($) => $('div').removeClass())).toBe(
        '<div class=""/>',
      );
      expect(xml('<div/>', ($) => $('div').removeClass('x'))).toBe('<div/>');
      expect(xml('<div/>', ($) => $('div').toggleClass('x'))).toBe(
        '<div class="x"/>',
      );
      expect(xml('<div/>', ($) => $('div').toggleClass('x', false))).toBe(
        '<div class=""/>',
      );
      expect(xml('<div/>', ($) => $('div').toggleClass())).toBe('<div/>');
    });

    it('classlist: toggleClass(x, false) removes x and reserializes when present', () => {
      expect(
        xml('<div class="x"/>', ($) => $('div').toggleClass('x', false)),
      ).toBe('<div class=""/>');
    });
  });

  describe('whitespace in the class argument', () => {
    it('classlist: addClass trims argument edges and keeps single separators when no attribute exists', () => {
      expect(xml('<div/>', ($) => $('div').addClass('  foo   bar  '))).toBe(
        '<div class="foo bar"/>',
      );
      expect(xml('<div/>', ($) => $('div').addClass(' '.repeat(3)))).toBe(
        '<div class=""/>',
      );
    });

    it('classlist: addClass preserves existing attribute whitespace and uses a single separator for new classes', () => {
      expect(
        xml('<div class="a b"/>', ($) => $('div').addClass('  foo   bar  ')),
      ).toBe('<div class="a b  foo bar"/>');
      expect(
        xml('<div class="a"/>', ($) => $('div').addClass(' '.repeat(3))),
      ).toBe('<div class="a"/>');
    });

    it('classlist: addClass keeps existing argument-derived duplicates out via space matching', () => {
      expect(
        xml('<div class="a b"/>', ($) => $('div').addClass('  a   b  ')),
      ).toBe('<div class="a b"/>');
    });

    it('classlist: removeClass does not create an attribute when absent', () => {
      expect(xml('<div/>', ($) => $('div').removeClass('  foo   bar  '))).toBe(
        '<div/>',
      );
    });

    it('classlist: removeClass reserializes only the remaining tokens after trimming its argument', () => {
      expect(
        xml('<div class="a b"/>', ($) => $('div').removeClass('  a   b  ')),
      ).toBe('<div class=""/>');
      expect(
        xml('<div class="a b c"/>', ($) => $('div').removeClass('  a   c  ')),
      ).toBe('<div class="b"/>');
    });

    it('classlist: removeClass leaves the attribute byte-identical when nothing matches', () => {
      expect(
        xml('<div class="a b"/>', ($) => $('div').removeClass('  x   y  ')),
      ).toBe('<div class="a b"/>');
    });

    it('classlist: toggleClass joins trimmed tokens with single spaces', () => {
      expect(xml('<div/>', ($) => $('div').toggleClass('  foo   bar  '))).toBe(
        '<div class="foo bar"/>',
      );
      expect(
        xml('<div class="a b"/>', ($) => $('div').toggleClass('  a   b  ')),
      ).toBe('<div class=""/>');
      expect(
        xml('<div class="a b"/>', ($) => $('div').toggleClass('  a   c  ')),
      ).toBe('<div class="b c"/>');
      expect(xml('<div/>', ($) => $('div').toggleClass(' '.repeat(3)))).toBe(
        '<div class=""/>',
      );
    });
  });
});

describe('class-list element whitespace', () => {
  it('classlist: removeClass collapses internal whitespace only when something is removed', () => {
    expect(
      xml('<div class="a  b   c"/>', ($) => $('div').removeClass('b')),
    ).toBe('<div class="a c"/>');
    expect(
      xml('<div class="a  b   c"/>', ($) => $('div').removeClass('x')),
    ).toBe('<div class="a  b   c"/>');
  });

  it('classlist: toggleClass always reserializes, changed or not', () => {
    expect(
      xml('<div class="a  b   c"/>', ($) => $('div').toggleClass('b')),
    ).toBe('<div class="a c"/>');
    expect(
      xml('<div class="a  b   c"/>', ($) => $('div').toggleClass('x')),
    ).toBe('<div class="a b c x"/>');
  });

  it('classlist: addClass keeps internal whitespace on a no-op and on an addition', () => {
    expect(xml('<div class="a  b   c"/>', ($) => $('div').addClass('b'))).toBe(
      '<div class="a  b   c"/>',
    );
    expect(xml('<div class="a  b   c"/>', ($) => $('div').addClass('d'))).toBe(
      '<div class="a  b   c d"/>',
    );
  });

  it('classlist: leading and trailing whitespace survives a miss but is trimmed on a change', () => {
    expect(
      xml('<div class="  a  b  "/>', ($) => $('div').removeClass('b')),
    ).toBe('<div class="a"/>');
    expect(
      xml('<div class="  a  b  "/>', ($) => $('div').removeClass('x')),
    ).toBe('<div class="  a  b  "/>');
    expect(
      xml('<div class="  a  b  "/>', ($) => $('div').toggleClass('b')),
    ).toBe('<div class="a"/>');
  });
});

describe('class-list duplicates', () => {
  it('classlist: removeClass removes every repeated occurrence of the class', () => {
    expect(
      xml('<div class="a b a c a"/>', ($) => $('div').removeClass('a')),
    ).toBe('<div class="b c"/>');
  });

  it('classlist: removeClass handles duplicates across several class arguments', () => {
    expect(
      xml('<div class="a b a b a"/>', ($) => $('div').removeClass('a b')),
    ).toBe('<div class=""/>');
  });
});

function hasClassOf(source: string, className: string): boolean {
  return load(source, { xmlMode: true })('div').hasClass(className);
}

describe('class-list hasClass boundaries', () => {
  it('classlist: tokens separated by tabs, newlines and other whitespace match', () => {
    expect(hasClassOf('<div class="a\tb"/>', 'b')).toBe(true);
    expect(hasClassOf('<div class="a\nb"/>', 'b')).toBe(true);
    expect(hasClassOf('<div class="a\u{D}b"/>', 'b')).toBe(true);
    expect(hasClassOf('<div class="a\u{B}b"/>', 'b')).toBe(true);
    expect(hasClassOf('<div class="a\u{C}b"/>', 'b')).toBe(true);
    expect(hasClassOf('<div class="a\u{A0}b"/>', 'b')).toBe(true);
  });

  it('classlist: empty string never matches', () => {
    expect(hasClassOf('<div class="a b"/>', '')).toBe(false);
    expect(hasClassOf('<div class=""/>', 'a')).toBe(false);
  });

  it('classlist: prefixes and substrings do not match', () => {
    expect(hasClassOf('<div class="abc"/>', 'ab')).toBe(false);
    expect(hasClassOf('<div class="abc"/>', 'bc')).toBe(false);
    expect(hasClassOf('<div class="a bb c"/>', 'b')).toBe(false);
  });

  it('classlist: whitespace inside the argument must line up with token boundaries', () => {
    expect(hasClassOf('<div class="a b"/>', 'a b')).toBe(true);
  });

  it('classlist: matching short-circuits across the whole set', () => {
    expect(hasClassOf('<div class="a"/><div class="b"/>', 'b')).toBe(true);
    expect(hasClassOf('<div class="a"/><div class="b"/>', 'z')).toBe(false);
    expect(hasClassOf('<div/>', 'x')).toBe(false);
    expect(hasClassOf('text', 'x')).toBe(false);
  });
});

function runClassCallback(
  method: 'addClass' | 'removeClass' | 'toggleClass',
  stateVal?: boolean,
): { calls: [number, string, unknown][]; html: string } {
  const calls: [number, string, unknown][] = [];
  const $ = load('<root>text0<i class="a">x</i>text1<b>y</b>text2</root>');

  const contents = $('root').contents();
  const push = (index: number, className: string, state?: boolean) => {
    calls.push([index, className, state]);
  };

  if (method === 'addClass') {
    contents.addClass((index, className) => {
      push(index, className);
      return;
    });
  } else if (method === 'removeClass') {
    contents.removeClass((index, className) => {
      push(index, className);
      return;
    });
  } else {
    contents.toggleClass((index, className, state) => {
      push(index, className, state);
      return 'z';
    }, stateVal);
  }

  return { calls, html: $.html() };
}

describe('class-list function arguments over mixed content', () => {
  it('classlist: addClass(fn) fires only for tags with indices of the full selection', () => {
    const { calls, html } = runClassCallback('addClass');
    expect(calls).toEqual([
      [1, 'a', undefined],
      [3, '', undefined],
    ]);
    expect(html).toBe(
      '<html><head></head><body><root>text0<i class="a">x</i>text1<b>y</b>text2</root></body></html>',
    );
  });

  it('classlist: removeClass(fn) fires only for tags and returns undefined leaves classes alone', () => {
    const { calls, html } = runClassCallback('removeClass');
    expect(calls).toEqual([
      [1, 'a', undefined],
      [3, '', undefined],
    ]);
    expect(html).toBe(
      '<html><head></head><body><root>text0<i class="a">x</i>text1<b>y</b>text2</root></body></html>',
    );
  });

  it('classlist: toggleClass(fn) forwards the state argument and applies the returned classes', () => {
    const { calls, html } = runClassCallback('toggleClass', true);
    expect(calls).toEqual([
      [1, 'a', true],
      [3, '', true],
    ]);
    expect(html).toBe(
      '<html><head></head><body><root>text0<i class="a z">x</i>text1<b class="z">y</b>text2</root></body></html>',
    );
  });

  it('classlist: callbacks receive the element as this and per-element indices', () => {
    const $ = load('<div class="a"></div><div class="b"></div>');
    const results: [string, number, string][] = [];
    $('div').addClass(function (this: Element, index, current) {
      results.push([this.tagName, index, current]);
      return;
    });
    expect(results).toEqual([
      ['div', 0, 'a'],
      ['div', 1, 'b'],
    ]);
  });
});
