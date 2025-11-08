import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString) as (xml: string, options?: any) => Promise<any>;

export interface ParsedJob {
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  type?: string;
  region?: string;
  externalId: string;
  publishedDate?: Date;
}

export class ParserService {
  static async parseXMLToJSON(xmlData: string): Promise<ParsedJob[]> {
    try {
      const result: any = await parseXML(xmlData, {
        explicitArray: false,
        mergeAttrs: true,
      });

      const jobs: ParsedJob[] = [];

      if (result.rss && result.rss.channel) {
        const channel = result.rss.channel;
        const items = Array.isArray(channel.item) ? channel.item : [channel.item];

        for (const item of items) {
          if (!item) continue;

          const job = this.parseJobItem(item);
          if (job) {
            jobs.push(job);
          }
        }
      } else if (result.feed && result.feed.entry) {
        const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];

        for (const entry of entries) {
          if (!entry) continue;

          const job = this.parseFeedEntry(entry);
          if (job) {
            jobs.push(job);
          }
        }
      }

      return jobs;
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static parseJobItem(item: any): ParsedJob | null {
    try {
      const title = item.title?._ || item.title || '';
      const company = item.company?._ || item.company || item['dc:creator']?._ || item['dc:creator'] || 'Unknown';
      const description = item.description?._ || item.description || item.summary?._ || item.summary || '';
      const url = item.link?._ || item.link || item.guid?._ || item.guid || '';
      const pubDate = item.pubDate || item.published || item['dc:date'] || '';

      const externalId = item.guid?._ || item.guid || item.id || url || `${title}-${company}`;

      if (!title || !company) {
        return null;
      }

      const category = item.category?._ || item.category || '';
      const type = item['job:type']?._ || item['job:type'] || '';
      const location = item.location?._ || item.location || '';

      return {
        title: this.cleanText(title),
        company: this.cleanText(company),
        location: this.cleanText(location),
        description: this.cleanText(description),
        url: url,
        category: this.cleanText(category),
        type: this.cleanText(type),
        externalId: this.generateId(externalId),
        publishedDate: pubDate ? new Date(pubDate) : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  private static parseFeedEntry(entry: any): ParsedJob | null {
    try {
      const title = entry.title?._ || entry.title || '';
      const company = entry.author?.name || entry['dc:creator']?._ || entry['dc:creator'] || 'Unknown';
      const description = entry.summary?._ || entry.summary || entry.content?._ || entry.content || '';
      const url = entry.link?.$.href || entry.link || entry.id || '';
      const pubDate = entry.published || entry.updated || entry['dc:date'] || '';

      const externalId = entry.id || url || `${title}-${company}`;

      if (!title || !company) {
        return null;
      }

      return {
        title: this.cleanText(title),
        company: this.cleanText(company),
        description: this.cleanText(description),
        url: url,
        externalId: this.generateId(externalId),
        publishedDate: pubDate ? new Date(pubDate) : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  private static cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private static generateId(id: string): string {
    return Buffer.from(id).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
  }
}

