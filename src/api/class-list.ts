/**
 * Internal helpers for reading, tokenizing, and writing the `class` attribute.
 *
 * @module cheerio/class-list
 * @internal
 */

import type { AnyNode, Element } from 'domhandler';
import { isTag } from 'domhandler';

/**
 * Matches runs of whitespace used to separate tokens in a class list.
 */
const rspace = /\s+/;

/**
 * Splits a whitespace-separated class string into individual tokens.
 *
 * Class names coming from user arguments are split as-is, preserving any
 * empty tokens produced by leading, trailing, or repeated whitespace.
 * Tokens read from an element's `class` attribute are trimmed first, so no
 * empty tokens are produced. The two rules share a single implementation;
 * the difference is expressed via `trimInput`.
 *
 * @internal
 * @param names - Class string to split.
 * @param trimInput - Whether to trim the string before splitting.
 * @returns The split class tokens.
 */
export function splitClassNames(
  names: string | undefined,
  trimInput: boolean,
): string[] {
  return names ? (trimInput ? names.trim() : names).split(rspace) : [];
}

/**
 * Reads an element's raw `class` attribute.
 *
 * @internal
 * @param elem - Node to read from.
 * @returns The raw class string, or `undefined` for non-tag nodes.
 */
export function classListValue(elem: AnyNode): string | undefined;
/**
 * Checks whether an element has the given class, without allocating arrays
 * or intermediate strings, stopping as soon as a token boundary match is
 * found.
 *
 * @internal
 * @param elem - Node to check.
 * @param className - Class name to look for.
 * @returns Whether the element has the class.
 */
export function classListValue(elem: AnyNode, className: string): boolean;
export function classListValue(
  elem: AnyNode,
  className?: string,
): string | undefined | boolean {
  if (isTag(elem)) {
    const clazz = elem.attribs['class'];

    // Read form: return the raw class string.
    if (className === undefined) {
      return clazz;
    }

    // Predicate form: allocation-free token boundary matching.
    if (clazz && className.length > 0) {
      for (
        let idx = clazz.indexOf(className);
        idx > -1;
        idx = clazz.indexOf(className, idx + 1)
      ) {
        const end = idx + className.length;

        if (
          (idx === 0 || rspace.test(clazz[idx - 1])) &&
          (end === clazz.length || rspace.test(clazz[end]))
        ) {
          return true;
        }
      }
    }
  }

  return className === undefined ? undefined : false;
}

/**
 * Modifies a single element's class list.
 *
 * The `class` attribute is written at most once per call, and only when the
 * element's classes actually change (except for `add`, which preserves the
 * historical behavior of re-serializing existing class lists).
 *
 * @internal
 * @param el - Element to modify.
 * @param action - Whether to add, remove, toggle the classes, or remove all of them.
 * @param value - Whitespace-separated class tokens to apply.
 * @param stateVal - For `toggle`, force adding (`true`) or removing (`false`).
 */
export function updateClassList(
  el: Element,
  action: 'add' | 'remove' | 'toggle' | 'remove-all',
  value: string,
  stateVal?: boolean,
): void {
  if (action === 'remove-all') {
    el.attribs['class'] = '';
    return;
  }

  if (action === 'add') {
    const classNames = splitClassNames(value, false);
    const current = classListValue(el);

    if (current) {
      let setClass = ` ${current} `;

      for (const cn of classNames) {
        const appendClass = `${cn} `;
        if (setClass.includes(` ${appendClass}`)) continue;
        setClass += appendClass;
      }

      el.attribs['class'] = setClass.trim();
    } else {
      el.attribs['class'] = classNames.join(' ').trim();
    }

    return;
  }

  if (action === 'remove') {
    const classNames = splitClassNames(value, true);
    const numClasses = classNames.length;
    const elementClasses = splitClassNames(classListValue(el), true);
    let changed = false;

    for (let j = 0; j < numClasses; j++) {
      const index = elementClasses.indexOf(classNames[j]);

      if (index !== -1) {
        elementClasses.splice(index, 1);
        changed = true;

        /*
         * We have to do another pass to ensure that there are not duplicate
         * classes listed
         */
        j--;
      }
    }

    if (changed) {
      el.attribs['class'] = elementClasses.join(' ');
    }

    return;
  }

  const classNames = splitClassNames(value, false);
  const numClasses = classNames.length;
  const state = typeof stateVal === 'boolean' ? (stateVal ? 1 : -1) : 0;
  const elementClasses = splitClassNames(classListValue(el), true);

  for (let j = 0; j < numClasses; j++) {
    const index = elementClasses.indexOf(classNames[j]);

    if (state >= 0 && index === -1) {
      elementClasses.push(classNames[j]);
    } else if (state <= 0 && index !== -1) {
      elementClasses.splice(index, 1);
    }
  }

  el.attribs['class'] = elementClasses.join(' ');
}
