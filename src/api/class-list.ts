/**
 * Internal helpers for reading, splitting and modifying an element's
 * space-separated class list.
 *
 * @module cheerio/class-list
 */

import { type AnyNode, type Element, isTag } from 'domhandler';

const rspace = /\s+/;

/**
 * Splits a whitespace-separated list of names into individual tokens.
 *
 * Two tokenization rules are in use:
 *
 * - Values read from an element's attribute are trimmed before splitting.
 * - Values passed as an argument are split as-is, keeping empty leading and
 *   trailing tokens.
 *
 * @param names - Whitespace-separated names to split.
 * @param trimInput - Whether to trim `names` before splitting.
 * @returns The split names.
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
 * @param elem - Element to read the class list of.
 * @returns The element's class attribute, or `undefined` if it is not set.
 */
export function getClass(elem: AnyNode): string | undefined;
/**
 * Checks whether an element has the given class name. The lookup happens on
 * the raw attribute string and does not allocate any arrays or intermediate
 * strings, so this is safe to use on hot read paths.
 *
 * @param elem - Element to check.
 * @param className - Class name to look for.
 * @returns Whether the element has the given class.
 */
export function getClass(elem: AnyNode, className: string): boolean;
export function getClass(
  elem: AnyNode,
  className?: string,
): string | boolean | undefined {
  if (!isTag(elem)) return className === undefined ? undefined : false;

  const clazz = elem.attribs?.['class'];

  // Return the raw class attribute if no specific class was requested.
  if (className === undefined) return clazz;

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

  return false;
}

/** Kind of class-list modification applied by {@link modifyClass}. */
export type ClassOperation = 'add' | 'remove' | 'toggle';

/**
 * Applies a class-list modification to a single element. The element's `class`
 * attribute is written at most once (or not at all, when nothing changed).
 *
 * @param el - Element to modify.
 * @param classNames - Tokens to add or remove. `undefined` removes all classes.
 * @param operation - Kind of modification.
 * @param state - Toggle state. `1` forces adding, `-1` forces removing, `0`
 *   toggles based on presence.
 */
export function modifyClass(
  el: Element,
  classNames: string[] | undefined,
  operation: ClassOperation,
  state: -1 | 0 | 1 = 0,
): void {
  el.attribs ??= {};

  // Removing without a list of names clears the class attribute entirely.
  if (operation === 'remove' && classNames === undefined) {
    el.attribs['class'] = '';
    return;
  }

  const names = classNames ?? [];
  const current = getClass(el);

  if (operation === 'add') {
    if (current) {
      let setClass = ` ${current} `;

      // Check if class already exists
      for (const className of names) {
        const appendClass = `${className} `;
        if (!setClass.includes(` ${appendClass}`)) setClass += appendClass;
      }

      el.attribs['class'] = setClass.trim();
    } else {
      el.attribs['class'] = names.join(' ').trim();
    }
  } else if (operation === 'remove') {
    const elementClasses = splitClassNames(current, true);
    let changed = false;

    for (let j = 0; j < names.length; j++) {
      const index = elementClasses.indexOf(names[j]);

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
  } else {
    const elementClasses = splitClassNames(current, true);

    // Check if class already exists
    for (let j = 0; j < names.length; j++) {
      // Check if the class name is currently defined
      const index = elementClasses.indexOf(names[j]);

      // Add if stateValue === true or we are toggling and there is no value
      if (state >= 0 && index === -1) {
        elementClasses.push(names[j]);
      } else if (state <= 0 && index !== -1) {
        // Otherwise remove but only if the item exists
        elementClasses.splice(index, 1);
      }
    }

    el.attribs['class'] = elementClasses.join(' ');
  }
}
