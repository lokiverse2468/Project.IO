import axios from 'axios';

export class FetchService {
  static async fetchJobsFromUrl(url: string): Promise<string> {
    const fetchStart = Date.now();
    console.log(`[FetchService] [${url}] Fetch started`);
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/xml, text/xml, */*',
        },
        validateStatus: (status) => status < 500, // Accept 4xx errors but not 5xx
      });
      const duration = Date.now() - fetchStart;
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const payloadSize = typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length;
      console.log(
        `[FetchService] [${url}] Fetch completed in ${duration}ms (status ${response.status}, bytes ~${payloadSize})`
      );
      return response.data;
    } catch (error) {
      const duration = Date.now() - fetchStart;
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response 
          ? `HTTP ${error.response.status}: ${error.response.statusText}`
          : error.request
          ? 'Network error: No response received'
          : error.message;
        console.error(`[FetchService] [${url}] Fetch failed in ${duration}ms: ${errorMessage}`);
        throw new Error(`Failed to fetch from ${url}: ${errorMessage}`);
      }
      console.error(`[FetchService] [${url}] Fetch failed in ${duration}ms: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  static getJobApiUrls(): string[] {
    return [
      'https://jobicy.com/?feed=job_feed',
      'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
      'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
      'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
      'https://jobicy.com/?feed=job_feed&job_categories=data-science',
      'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
      'https://jobicy.com/?feed=job_feed&job_categories=business',
      'https://jobicy.com/?feed=job_feed&job_categories=management',
      'https://www.higheredjobs.com/rss/articleFeed.cfm',
    ];
  }
}

