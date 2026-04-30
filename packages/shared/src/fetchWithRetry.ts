export interface FetchRetryOptions {
   /** Maximum number of retry attempts after the initial request. Default: 3 */
   maxRetries?: number;
   /** Base delay in milliseconds for exponential backoff. Default: 1000 */
   baseDelay?: number;
   /** Maximum delay cap in milliseconds (applied to both backoff and Retry-After). Default: 30000 */
   maxDelay?: number;
   /** Set of HTTP status codes that should trigger a retry. Default: 408, 429, 500, 502, 503, 504 */
   retryableStatus?: Set<number> | number[];
}

const DEFAULT_RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function parseRetryAfter(value: string): number | undefined {
   const seconds = Number(value);
   if (!isNaN(seconds) && seconds >= 0) return seconds * 1000;

   const date = new Date(value);
   if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());

   return undefined;
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
   return new Promise((resolve, reject) => {
      if (signal?.aborted) {
         reject(signal.reason);
         return;
      }

      const id = setTimeout(resolve, ms);
      signal?.addEventListener(
         'abort',
         () => {
            clearTimeout(id);
            reject(signal.reason);
         },
         { once: true },
      );
   });
}

export async function fetchWithRetry(
   input: RequestInfo | URL,
   init?: RequestInit,
   options: FetchRetryOptions = {},
): Promise<Response> {
   const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      retryableStatus = DEFAULT_RETRYABLE_STATUS,
   } = options;

   const statusSet =
      retryableStatus instanceof Set
         ? retryableStatus
         : new Set(retryableStatus);

   const signal = init?.signal;

   let lastResponse: Response | undefined;

   for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
         const exponentialDelay = Math.min(
            baseDelay * Math.pow(2, attempt - 1),
            maxDelay,
         );

         const retryAfterHeader = lastResponse?.headers.get('Retry-After');
         const retryAfterDelay =
            retryAfterHeader != null
               ? parseRetryAfter(retryAfterHeader)
               : undefined;
         const delay =
            retryAfterDelay !== undefined
               ? Math.min(retryAfterDelay, maxDelay)
               : exponentialDelay;

         await sleep(delay, signal);
      }

      // Clone Request objects so the body can be replayed on each retry attempt.
      const fetchInput = input instanceof Request ? input.clone() : input;

      try {
         const response = await fetch(fetchInput, init);

         if (!statusSet.has(response.status) || attempt === maxRetries) {
            return response;
         }

         // Free connection resources before discarding this response.
         lastResponse = response;
         await response.body?.cancel();
      } catch (error) {
         if (error instanceof DOMException && error.name === 'AbortError')
            throw error;
         if (attempt === maxRetries) throw error;
      }
   }

   // Unreachable: the loop always returns or throws on the last attempt.
   throw new Error('fetchWithRetry: unreachable');
}
