/**
 * Mandate Gateway — Merchant Canonicalization & Anti-Typosquatting Engine
 */

export class MerchantVerificationService {
  /**
   * Extract canonical host domain from URL or merchant name/domain string
   */
  canonicalizeDomain(input) {
    if (!input || typeof input !== 'string') return '';
    let str = input.trim().toLowerCase();

    // Remove protocol
    str = str.replace(/^(?:https?:\/\/)/i, '');
    // Remove authentication if present
    str = str.replace(/^[^/@]+@/, '');
    // Take host before path/query/fragment
    str = str.split('/')[0].split('?')[0].split('#')[0];
    // Remove port if present
    str = str.split(':')[0];
    // Strip leading www.
    str = str.replace(/^www\./i, '');

    return str.trim();
  }

  /**
   * Detect Unicode homoglyphs, non-ASCII spoofing, or punycode attempts
   */
  detectHomoglyphsOrPunycode(domain) {
    if (!domain) return false;
    // Check punycode
    if (domain.includes('xn--')) return true;
    // Check non-ASCII characters in domain
    if (/[^\u0000-\u007F]/.test(domain)) return true;
    return false;
  }

  /**
   * Check if domain is a typosquatting variant of an authentic merchant
   */
  isTyposquattingVariant(domain, authenticDomain) {
    const d = this.canonicalizeDomain(domain);
    const auth = this.canonicalizeDomain(authenticDomain);
    if (!d || !auth || d === auth) return false;

    // Detect hyphenated lookalikes (e.g. amzon-india-secure.co or amazon-secure.net)
    if (d.includes(auth.split('.')[0]) && d !== auth) {
      const suspiciousWords = ['secure', 'login', 'verify', 'support', 'pay', 'checkout', 'direct', 'portal'];
      if (suspiciousWords.some(w => d.includes(w))) {
        return true;
      }
    }

    // Levenshtein distance
    const dist = this.levenshtein(d, auth);
    if (dist > 0 && dist <= 2 && d.length > 5) {
      return true;
    }

    return false;
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Verify merchant against allowed and blocked merchant definitions
   */
  evaluateMerchant({ merchantName, listingUrl, allowedMerchants = [], blockedMerchants = [] }) {
    const canonicalFromUrl = this.canonicalizeDomain(listingUrl);
    const canonicalFromName = this.canonicalizeDomain(merchantName);

    // Default untrusted domains
    const defaultBlocklist = [
      'ebay.com',
      'techbazaar.in',
      'unverified-portal.xyz',
      'amzon-india-secure.co',
      'darknet-goods.onion'
    ];

    const allBlocked = [...blockedMerchants, ...defaultBlocklist].map(b => this.canonicalizeDomain(b));

    // 1. Homoglyph / Punycode check
    if (this.detectHomoglyphsOrPunycode(canonicalFromUrl) || this.detectHomoglyphsOrPunycode(canonicalFromName)) {
      return {
        isAllowed: false,
        isBlocked: true,
        reason: `Homoglyph or internationalized domain spoofing detected in merchant "${merchantName}". Access blocked.`
      };
    }

    // 2. Explicit Blocklist check
    const matchesBlock = allBlocked.some(blocked => {
      if (canonicalFromUrl && (canonicalFromUrl === blocked || canonicalFromUrl.endsWith('.' + blocked))) return true;
      if (canonicalFromName && (canonicalFromName === blocked || canonicalFromName.endsWith('.' + blocked))) return true;
      const lowerName = merchantName.toLowerCase();
      if (lowerName.includes(blocked)) return true;
      return false;
    });

    if (matchesBlock) {
      return {
        isAllowed: false,
        isBlocked: true,
        reason: `Merchant "${merchantName}" is on the restricted/untrusted merchant blocklist.`
      };
    }

    // 3. Typosquatting check against standard allowed merchants
    const knownAuthentic = ['amazon.in', 'amazon.com', 'croma.com', 'apple.com', 'dell.com', 'logitech.com'];
    for (const auth of knownAuthentic) {
      if (this.isTyposquattingVariant(canonicalFromUrl, auth) || this.isTyposquattingVariant(canonicalFromName, auth)) {
        return {
          isAllowed: false,
          isBlocked: true,
          reason: `Lookalike domain / typosquatting detected ("${canonicalFromUrl || canonicalFromName}" spoofing "${auth}").`
        };
      }
    }

    // 4. Whitelist matching
    if (allowedMerchants.length > 0) {
      const allowedCanonical = allowedMerchants.map(m => ({
        raw: m,
        canon: this.canonicalizeDomain(m)
      }));

      const isAllowed = allowedCanonical.some(item => {
        const lowerName = merchantName.toLowerCase();
        const lowerItem = item.raw.toLowerCase();
        if (lowerName === lowerItem || lowerName.includes(lowerItem) || lowerItem.includes(lowerName)) {
          return true;
        }
        if (item.canon && canonicalFromUrl && (canonicalFromUrl === item.canon || canonicalFromUrl.endsWith('.' + item.canon))) {
          return true;
        }
        return false;
      });

      if (!isAllowed) {
        return {
          isAllowed: false,
          isBlocked: true,
          reason: `Merchant "${merchantName}" is not included in the mandate allowed merchants list [${allowedMerchants.join(', ')}].`
        };
      }
    }

    return {
      isAllowed: true,
      isBlocked: false,
      canonicalDomain: canonicalFromUrl || canonicalFromName
    };
  }
}

export const merchantVerificationService = new MerchantVerificationService();

