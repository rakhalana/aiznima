import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'br',
  'p',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
  'span',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

let hookRegistered = false;

function ensureExternalLinkHook(): void {
  if (hookRegistered || typeof DOMPurify.addHook !== 'function') {
    return;
  }

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (!/^https?:\/\//i.test(href)) {
        node.removeAttribute('href');
      } else {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  hookRegistered = true;
}

export function sanitizeHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml) {
    return '';
  }

  ensureExternalLinkHook();

  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  });
}
