import type { AnyNode } from 'domhandler';
import { describe, expect, it } from 'vitest';
import { cheerio, mixedText } from '../__fixtures__/fixtures.js';
import { addClass, hasClass, removeClass, toggleClass } from './attributes.js';

function make(html: string) {
  const $ = cheerio.load(html);
  return $;
}

function classAttrib($: ReturnType<typeof make>): {
  hasOwn: boolean;
  value: string | undefined;
} {
  const el = $('body')[0]?.children[0] as {
    attribs: Record<string, string>;
  };
  return {
    hasOwn: Object.hasOwn(el.attribs, 'class'),
    value: el.attribs['class'],
  };
}

describe('class-list', () => {
  it('classlist: removeClass() and removeClass(undefined) differ', () => {
    const all = make('<div class="a b"></div>');
    all('div').removeClass();
    expect(classAttrib(all)).toEqual({ hasOwn: true, value: '' });
    expect(all.html()).toBe(
      '<html><head></head><body><div class=""></div></body></html>',
    );

    const undef = make('<div class="a b"></div>');
    undef('div').removeClass(undefined);
    expect(classAttrib(undef)).toEqual({ hasOwn: true, value: 'a b' });
    expect(undef.html()).toBe(
      '<html><head></head><body><div class="a b"></div></body></html>',
    );
  });

  it('classlist: removeClass(fn) callback returning undefined removes nothing', () => {
    const $ = make('<div class="a b"></div>');
    $('div').removeClass(() => undefined);
    expect(classAttrib($)).toEqual({ hasOwn: true, value: 'a b' });
    expect($.html()).toBe(
      '<html><head></head><body><div class="a b"></div></body></html>',
    );
  });

  it('classlist: writes on elements without a class attribute', () => {
    const add = make('<div></div>');
    add('div').addClass('x');
    expect(classAttrib(add)).toEqual({ hasOwn: true, value: 'x' });

    const removeAll = make('<div></div>');
    removeAll('div').removeClass();
    expect(classAttrib(removeAll)).toEqual({ hasOwn: true, value: '' });

    const remove = make('<div></div>');
    remove('div').removeClass('x');
    expect(classAttrib(remove)).toEqual({
      hasOwn: false,
      value: undefined,
    });

    const toggle = make('<div></div>');
    toggle('div').toggleClass('x');
    expect(classAttrib(toggle)).toEqual({ hasOwn: true, value: 'x' });

    const toggleFalse = make('<div></div>');
    toggleFalse('div').toggleClass('x', false);
    expect(classAttrib(toggleFalse)).toEqual({ hasOwn: true, value: '' });

    const toggleNone = make('<div></div>');
    toggleNone('div').toggleClass();
    expect(classAttrib(toggleNone)).toEqual({
      hasOwn: false,
      value: undefined,
    });
  });

  it('classlist: whitespace in input without existing class', () => {
    const add = make('<div></div>');
    add('div').addClass('  foo   bar  ');
    expect(classAttrib(add)).toEqual({ hasOwn: true, value: 'foo bar' });
    expect(add.html()).toBe(
      '<html><head></head><body><div class="foo bar"></div></body></html>',
    );

    const toggle = make('<div></div>');
    toggle('div').toggleClass('  foo   bar  ');
    expect(classAttrib(toggle)).toEqual({ hasOwn: true, value: 'foo bar' });
  });

  it('classlist: whitespace in input with existing class', () => {
    const add = make('<div class="base"></div>');
    add('div').addClass('  foo   bar  ');
    expect(classAttrib(add)).toEqual({ hasOwn: true, value: 'base  foo bar' });
    expect(add.html()).toBe(
      '<html><head></head><body><div class="base  foo bar"></div></body></html>',
    );

    const addPadded = make('<div class="  base  "></div>');
    addPadded('div').addClass('  foo   bar  ');
    expect(classAttrib(addPadded)).toEqual({
      hasOwn: true,
      value: 'base   foo bar',
    });
    expect(addPadded.html()).toBe(
      '<html><head></head><body><div class="base   foo bar"></div></body></html>',
    );

    const remove = make('<div class="foo bar baz"></div>');
    remove('div').removeClass('  foo   bar  ');
    expect(classAttrib(remove)).toEqual({ hasOwn: true, value: 'baz' });

    const toggle = make('<div class="foo"></div>');
    toggle('div').toggleClass('  foo   bar  ');
    expect(classAttrib(toggle)).toEqual({ hasOwn: true, value: 'bar' });
  });

  it('classlist: internal consecutive whitespace under removeClass', () => {
    const hit = make('<div class="a  b"></div>');
    hit('div').removeClass('a');
    expect(classAttrib(hit)).toEqual({ hasOwn: true, value: 'b' });
    expect(hit.html()).toBe(
      '<html><head></head><body><div class="b"></div></body></html>',
    );

    const miss = make('<div class="a  b"></div>');
    miss('div').removeClass('zzz');
    expect(classAttrib(miss)).toEqual({ hasOwn: true, value: 'a  b' });
    expect(miss.html()).toBe(
      '<html><head></head><body><div class="a  b"></div></body></html>',
    );
  });

  it('classlist: internal consecutive whitespace under toggleClass', () => {
    const add = make('<div class="a  b"></div>');
    add('div').toggleClass('c');
    expect(classAttrib(add)).toEqual({ hasOwn: true, value: 'a b c' });
    expect(add.html()).toBe(
      '<html><head></head><body><div class="a b c"></div></body></html>',
    );

    const remove = make('<div class="a  b"></div>');
    remove('div').toggleClass('a');
    expect(classAttrib(remove)).toEqual({ hasOwn: true, value: 'b' });
    expect(remove.html()).toBe(
      '<html><head></head><body><div class="b"></div></body></html>',
    );

    const forceTrueExisting = make('<div class="a  b"></div>');
    forceTrueExisting('div').toggleClass('a', true);
    expect(classAttrib(forceTrueExisting)).toEqual({
      hasOwn: true,
      value: 'a b',
    });
    expect(forceTrueExisting.html()).toBe(
      '<html><head></head><body><div class="a b"></div></body></html>',
    );

    const forceFalseAbsent = make('<div class="a  b"></div>');
    forceFalseAbsent('div').toggleClass('x', false);
    expect(classAttrib(forceFalseAbsent)).toEqual({
      hasOwn: true,
      value: 'a b',
    });
    expect(forceFalseAbsent.html()).toBe(
      '<html><head></head><body><div class="a b"></div></body></html>',
    );

    const forceTrueAbsent = make('<div class="a  b"></div>');
    forceTrueAbsent('div').toggleClass('x', true);
    expect(classAttrib(forceTrueAbsent)).toEqual({
      hasOwn: true,
      value: 'a b x',
    });
  });

  it('classlist: repeated class names on one element', () => {
    const remove = make('<div class="a b a c a"></div>');
    remove('div').removeClass('a');
    expect(classAttrib(remove)).toEqual({ hasOwn: true, value: 'b c' });

    const add = make('<div class="a b a"></div>');
    add('div').addClass('a d');
    expect(classAttrib(add)).toEqual({ hasOwn: true, value: 'a b a d' });

    const toggle = make('<div class="a b a"></div>');
    toggle('div').toggleClass('a');
    expect(classAttrib(toggle)).toEqual({ hasOwn: true, value: 'b a' });
  });

  it('classlist: hasClass token boundaries', () => {
    expect(cheerio('<div class="a\tb\nc"></div>').hasClass('a')).toBe(true);
    expect(cheerio('<div class="a\tb\nc"></div>').hasClass('b')).toBe(true);
    expect(cheerio('<div class="a\tb\nc"></div>').hasClass('c')).toBe(true);
    expect(cheerio('<div class="a b"></div>').hasClass('')).toBe(false);
    expect(cheerio('<div class=""></div>').hasClass('')).toBe(false);
    expect(cheerio('<div></div>').hasClass('')).toBe(false);
    expect(cheerio('<div class="apple"></div>').hasClass('app')).toBe(false);
    expect(cheerio('<div class="apple banana"></div>').hasClass('anana')).toBe(
      false,
    );
    expect(cheerio('<div class="apple banana"></div>').hasClass('bana')).toBe(
      false,
    );
    expect(cheerio('<div class="apple banana"></div>').hasClass('banana')).toBe(
      true,
    );
    expect(cheerio('<div class="a b"></div>').hasClass('a b')).toBe(true);
    expect(cheerio('<div class="ab"></div>').hasClass('b')).toBe(false);
    expect(cheerio('<div class="ab"></div>').hasClass('a')).toBe(false);
  });

  it('classlist: hasClass short-circuits on the first matching element', () => {
    const $ = make('<div class="a"></div><div></div>');
    let visited = 0;
    const second = $('div').toArray()[1];
    Object.defineProperty(second, 'attribs', {
      get() {
        visited++;
        return {};
      },
    });
    expect($('div').hasClass('a')).toBe(true);
    expect(visited).toBe(0);
  });

  it('classlist: function callbacks fire only for tags with full-set indexes', () => {
    const trace = (
      method: 'addClass' | 'removeClass' | 'toggleClass',
      stateVal?: boolean,
    ) => {
      const $ = cheerio.load(mixedText);
      const calls: [number, string, string, unknown][] = [];
      const contents = $('body').contents();

      if (method === 'addClass') {
        contents.addClass((i, current) => {
          calls.push([i, current, contents[i]?.type ?? '', undefined]);
          return 'x';
        });
      } else if (method === 'removeClass') {
        contents.removeClass((i, current) => {
          calls.push([i, current, contents[i]?.type ?? '', undefined]);
          return 'x';
        });
      } else {
        contents.toggleClass((i, current, state) => {
          calls.push([i, current, contents[i]?.type ?? '', state]);
          return 'x';
        }, stateVal);
      }

      return { length: contents.length, calls, html: $.html() };
    };

    const added = trace('addClass');
    expect(added.length).toBe(3);
    expect(added.calls).toEqual([
      [0, '', 'tag', undefined],
      [2, '', 'tag', undefined],
    ]);
    expect(added.html).toBe(
      '<html><head></head><body><a class="x">1</a>TEXT<b class="x">2</b></body></html>',
    );

    const removed = trace('removeClass');
    expect(removed.calls).toEqual([
      [0, '', 'tag', undefined],
      [2, '', 'tag', undefined],
    ]);
    expect(removed.html).toBe(
      '<html><head></head><body><a>1</a>TEXT<b>2</b></body></html>',
    );

    const toggled = trace('toggleClass');
    expect(toggled.calls).toEqual([
      [0, '', 'tag', undefined],
      [2, '', 'tag', undefined],
    ]);
    expect(toggled.html).toBe(
      '<html><head></head><body><a class="x">1</a>TEXT<b class="x">2</b></body></html>',
    );

    const toggledTrue = trace('toggleClass', true);
    expect(toggledTrue.calls).toEqual([
      [0, '', 'tag', true],
      [2, '', 'tag', true],
    ]);
  });

  it('classlist: function callbacks receive the raw untrimmed class string', () => {
    const $ = make('<div class="a  b"></div>');
    let seen = '';
    $('div').addClass((_i, current) => {
      seen = `[${current}]`;
      return 'c';
    });
    expect(seen).toBe('[a  b]');
    expect(classAttrib($)).toEqual({ hasOwn: true, value: 'a  b c' });
  });

  it('classlist: methods run on bare arrays via Method.call', () => {
    const $ = cheerio.load(mixedText);
    const anchor = $('a')[0];

    addClass.call([anchor], 'fruit');
    expect($(anchor).attr('class')).toBe('fruit');

    addClass.call([anchor], () => 'red');
    expect($(anchor).attr('class')).toBe('fruit red');

    removeClass.call([anchor], () => 'fruit');
    expect($(anchor).attr('class')).toBe('red');

    removeClass.call([anchor], 'red');
    expect($(anchor).attr('class')).toBe('');

    toggleClass.call([anchor], () => 'green', true);
    expect($(anchor).attr('class')).toBe('green');

    toggleClass.call([anchor], 'green');
    expect($(anchor).attr('class')).toBe('');
  });

  it('classlist: removeAttr keeps using the same tokenizer', () => {
    const spaced = make('<div class="a b" id="d"></div>');
    spaced('div').removeAttr('  class    id ');
    expect(spaced.html()).toBe(
      '<html><head></head><body><div></div></body></html>',
    );

    const plain = make('<div class="a b" id="d"></div>');
    plain('div').removeAttr('class id');
    expect(plain.html()).toBe(
      '<html><head></head><body><div></div></body></html>',
    );
  });

  it('classlist: non-tag nodes are skipped by all four methods', () => {
    const nodes: AnyNode[] = [
      { type: 'text', data: 'hello', parent: null } as never,
    ];
    const hasClassOnArray = hasClass as (
      this: ArrayLike<AnyNode>,
      className: string,
    ) => boolean;
    expect(hasClassOnArray.call(nodes, 'hello')).toBe(false);
    expect(addClass.call(nodes, 'x')).toBe(nodes);
    expect(removeClass.call(nodes)).toBe(nodes);
    expect(toggleClass.call(nodes, 'x')).toBe(nodes);
  });
});
